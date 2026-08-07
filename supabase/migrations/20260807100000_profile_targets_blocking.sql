-- Session — first live-testing punch list
-- Not applied yet — review before running.
--
-- Covers: unique/moderated nicknames, named targets, friends can see
-- each other's targets (previously fully private), and blocking.

-- =========================================================================
-- users: nickname (display_name) uniqueness + a basic content filter
-- =========================================================================
--
-- Every friend showed as "Angler" because display_name was never
-- editable anywhere — this makes it a real nickname: unique
-- (case-insensitive, so "Curtis" and "curtis" can't both exist), and
-- filtered against an obvious-abuse denylist. This is a best-effort
-- filter on a small fixed word list, not a real moderation system — it
-- catches the blunt, obvious cases. If abuse becomes a real problem at
-- scale, replace this with a proper moderation API rather than growing
-- the list by hand.

create unique index uq_users_display_name_ci on public.users (lower(display_name))
  where display_name is not null;

create function public.is_display_name_allowed(p_name text)
returns boolean
language sql
immutable
as $$
  select p_name !~* '(fuck|shit|cunt|nigger|nigga|paki|retard|faggot|whore|bitch|rape)';
$$;

create function public.enforce_display_name_policy()
returns trigger
language plpgsql
as $$
begin
  if new.display_name is not null then
    if length(trim(new.display_name)) = 0 then
      new.display_name := null;
    elsif length(new.display_name) > 24 then
      raise exception 'Nickname must be 24 characters or fewer.';
    elsif not public.is_display_name_allowed(new.display_name) then
      raise exception 'That nickname isn''t allowed.';
    end if;
  end if;
  return new;
end;
$$;

create trigger enforce_display_name_policy before insert or update of display_name on public.users
  for each row execute function public.enforce_display_name_policy();

-- =========================================================================
-- targets: a real name, and visible to friends (was fully owner-only)
-- =========================================================================
--
-- Ben's punch list: "all target fish will be named, even if it's just
-- 'the big common'" — target_sub_type alone (a fixed mirror/common/etc
-- chip set) was standing in for a name and couldn't hold one. name is the
-- primary identifier now; target_sub_type stays as an optional refinement
-- alongside it, not a replacement.

alter table public.targets add column name text;

-- Friend profile pages ("view profile" → their targets) need read access
-- that didn't exist at all before — targets_all_owner (FOR ALL) already
-- covers every command for the owner; this adds a second, purely
-- additive SELECT policy. Postgres ORs multiple permissive policies
-- together for the same command, so owner access is unchanged.
create policy "targets_select_friends" on public.targets
  for select using (public.is_friends_with(owner_id));

-- =========================================================================
-- blocking
-- =========================================================================
--
-- friendships_delete (existing) already lets either party unfriend at
-- will — that part of "remove people" needed no schema change, just a UI
-- button. Blocking is the missing piece: a standing record that survives
-- unfriending and stops a new request from either direction.

create table public.blocked_users (
  blocker_id uuid not null references public.users (id) on delete cascade,
  blocked_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocked_users_no_self_block check (blocker_id <> blocked_id)
);

alter table public.blocked_users enable row level security;

create index idx_blocked_users_blocked_id on public.blocked_users (blocked_id);

create policy "blocked_users_select_own" on public.blocked_users
  for select using (blocker_id = auth.uid());

create policy "blocked_users_insert_own" on public.blocked_users
  for insert with check (blocker_id = auth.uid());

create policy "blocked_users_delete_own" on public.blocked_users
  for delete using (blocker_id = auth.uid());

-- One action from the UI: drop any existing friendship (either
-- direction), then record the block. Atomic so a failure partway through
-- can't leave a block recorded with the old friendship still intact.
create function public.block_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.friendships
  where (requester_id = auth.uid() and addressee_id = p_user_id)
     or (requester_id = p_user_id and addressee_id = auth.uid());

  insert into public.blocked_users (blocker_id, blocked_id)
  values (auth.uid(), p_user_id)
  on conflict do nothing;
end;
$$;

-- Neither direction of an existing block can file a fresh friend request.
drop policy "friendships_insert_requester" on public.friendships;

create policy "friendships_insert_requester" on public.friendships
  for insert with check (
    requester_id = auth.uid()
    and not exists (
      select 1 from public.blocked_users
      where (blocker_id = requester_id and blocked_id = addressee_id)
         or (blocker_id = addressee_id and blocked_id = requester_id)
    )
  );

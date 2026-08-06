-- Session — group invite links, with owner approval
-- Not applied yet — review before running.
--
-- Answers the open question from Ben's punch list: "add via UserID (will
-- we have UserIDs or can we add by email address?)" — no. Same reasoning
-- as users.invite_code (Section 3, "How a friend actually gets found"):
-- no public search/directory, so nothing about groups should be
-- discoverable via a raw ID or an email lookup either. This gives groups
-- their own shareable code, mirroring the user one exactly.
--
-- Two ways to end up in a group, deliberately different in friction:
-- 1. Owner picks a friend from their own friends list (existing
--    useAddGroupMember flow, group_members_insert_owner policy) — auto
--    joins immediately, no accept step. Already trusted: both the
--    friendship and the owner's own deliberate pick vouch for it.
-- 2. Someone has the group's invite code (shared outside the app — text,
--    in person) and enters it — this is NOT a direct personal invite, so
--    it becomes a pending group_join_requests row the owner has to
--    approve before membership is granted. A code can be forwarded
--    beyond who the owner meant it for, so this path stays gated.

-- =========================================================================
-- groups: invite_code
-- =========================================================================

alter table public.groups add column invite_code text;

create function public.generate_group_invite_code()
returns text
language plpgsql
as $$
declare
  code text;
begin
  loop
    code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from public.groups where invite_code = code);
  end loop;
  return code;
end;
$$;

update public.groups set invite_code = public.generate_group_invite_code() where invite_code is null;

alter table public.groups alter column invite_code set not null;
alter table public.groups add constraint uq_groups_invite_code unique (invite_code);

-- Stamp a code on every new group too, alongside the existing created_by
-- stamp (supabase/migrations/20260806100000_stamp_group_created_by.sql).
create or replace function public.stamp_created_by()
returns trigger
language plpgsql
as $$
begin
  new.created_by := auth.uid();
  new.invite_code := public.generate_group_invite_code();
  return new;
end;
$$;

-- groups_select_members already covers a group's own creator/members
-- seeing every column including invite_code (20260806110000). The one
-- narrow crack, same shape as find_user_id_by_invite_code: given a code, a
-- non-member can resolve just the group's id and name, enough to show
-- "Request to join [name]?" before they've actually joined anything.
create function public.find_group_by_invite_code(p_code text)
returns table (id uuid, name text)
language sql
stable
security definer
set search_path = public
as $$
  select id, name from public.groups where invite_code = upper(p_code);
$$;

-- =========================================================================
-- group_join_requests
-- =========================================================================

create type group_join_request_status_enum as enum ('pending', 'approved', 'declined');

create table public.group_join_requests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  status group_join_request_status_enum not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

alter table public.group_join_requests enable row level security;

create index idx_group_join_requests_group_id on public.group_join_requests (group_id);
create index idx_group_join_requests_user_id on public.group_join_requests (user_id);

-- Only one live request per person per group at a time — a partial index
-- rather than a plain unique constraint so a declined (or approved, then
-- later left) request doesn't permanently block asking again.
create unique index uq_group_join_requests_pending on public.group_join_requests (group_id, user_id)
  where status = 'pending';

create policy "group_join_requests_insert_self" on public.group_join_requests
  for insert with check (
    user_id = auth.uid() and not public.is_group_member(group_id)
  );

-- Own requests (to see their own status), or the group owner reviewing
-- what's pending on their group.
create policy "group_join_requests_select" on public.group_join_requests
  for select using (
    user_id = auth.uid() or public.is_group_owner(group_id)
  );

-- Owner declines (or the requester withdraws) via a status update; approval
-- goes through approve_group_join_request below instead, since that also
-- has to create the group_members row atomically.
create policy "group_join_requests_update_owner" on public.group_join_requests
  for update using (public.is_group_owner(group_id)) with check (public.is_group_owner(group_id));

create policy "group_join_requests_delete_own_pending" on public.group_join_requests
  for delete using (user_id = auth.uid() and status = 'pending');

-- Approving is two writes (mark the request approved, add the membership)
-- that need to succeed together — group_members_insert_owner already
-- allows this since the caller is the group owner either way, but doing
-- it as one security definer function means the app can't leave a request
-- marked approved with no matching membership row if the second write
-- ever failed.
create function public.approve_group_join_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
  v_user_id uuid;
begin
  select group_id, user_id into v_group_id, v_user_id
  from public.group_join_requests
  where id = p_request_id and status = 'pending';

  if v_group_id is null then
    raise exception 'No pending request found.';
  end if;

  if not public.is_group_owner(v_group_id) then
    raise exception 'Only the group owner can approve requests.';
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (v_group_id, v_user_id, 'member')
  on conflict (group_id, user_id) do nothing;

  update public.group_join_requests
  set status = 'approved', responded_at = now()
  where id = p_request_id;
end;
$$;

-- Session — the missing wiring for actual sharing
-- Not applied yet — review before running.
--
-- Everything the sharing model needed already existed at the schema/RLS
-- layer (groups, group_members, spots.visibility, can_view_spot honoring
-- group_id) but nothing in the app could actually reach it end to end:
-- there was no way to add a friend (no searchable identifier), no way to
-- add a member to a group once created, and no way to create a
-- group-owned lake at all. This migration adds the one missing piece —
-- a short, shareable invite code per user — everything else (group
-- membership, group-owned lakes, spot visibility) was already legal
-- under the existing RLS policies and just needed app code.
--
-- =========================================================================
-- users: invite_code
-- =========================================================================

alter table public.users add column invite_code text;

create function public.generate_invite_code()
returns text
language plpgsql
as $$
declare
  code text;
begin
  loop
    code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from public.users where invite_code = code);
  end loop;
  return code;
end;
$$;

-- Backfill any users created before this migration.
update public.users set invite_code = public.generate_invite_code() where invite_code is null;

alter table public.users alter column invite_code set not null;
alter table public.users add constraint uq_users_invite_code unique (invite_code);

-- Every new signup gets a code too, not just at signup time via the app —
-- extends the existing handle_new_user trigger rather than replacing its
-- behaviour.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, invite_code) values (new.id, public.generate_invite_code());
  return new;
end;
$$;

-- users_select (Phase 1 RLS) only exposes a row to its owner, groupmates,
-- friends, or a direct-share counterpart — a stranger's invite code can't
-- be reverse-looked-up through the users table itself. This is the one
-- narrow, safe crack in that wall: given a code, resolve just the id, so
-- the friend-request flow has someone to send the request to. No other
-- column is exposed by this function.
create function public.find_user_id_by_invite_code(p_code text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.users where invite_code = upper(p_code);
$$;

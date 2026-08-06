-- Session — the real fix for "groups create" RLS failures
-- Not applied yet — review before running.
--
-- The diagnostic confirmed auth.uid() resolves correctly everywhere —
-- the created_by trigger from the previous migration was solving a
-- problem that never actually existed. The real failure: the client
-- does .insert({ name }).select().single(), which PostgREST compiles to
-- INSERT ... RETURNING *. Postgres enforces the table's SELECT policy
-- against that RETURNING output, not just the INSERT policy's WITH
-- CHECK. groups_select_members only granted visibility via
-- is_group_member(id) — a group_members row that doesn't exist yet at
-- RETURNING-time, since it's only created by the handle_new_group AFTER
-- INSERT trigger, which fires strictly after RETURNING is evaluated. So
-- the creator was briefly not allowed to see the group they just made.
-- Every other table (lakes, spots, sessions, tickets) avoids this
-- because their SELECT policies check owner_id/created_by directly on
-- the row itself, with no dependency on a second table's row existing
-- yet. This brings groups in line with that same pattern.

-- Restore the real trigger function (the previous migration's temporary
-- diagnostic version always raised an exception instead of stamping).
create or replace function public.stamp_created_by()
returns trigger
language plpgsql
as $$
begin
  new.created_by := auth.uid();
  return new;
end;
$$;

drop policy "groups_select_members" on public.groups;

create policy "groups_select_members" on public.groups
  for select using (created_by = auth.uid() or public.is_group_member(id));

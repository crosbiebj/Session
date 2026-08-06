-- Session — fix: groups insert rejected by RLS (42501)
-- Not applied yet — review before running.
--
-- groups_insert_self requires created_by = auth.uid(), and the client
-- sends exactly that (the freshly-fetched current user's id) — the two
-- should never actually diverge, but live testing hit "new row violates
-- row-level security policy for table 'groups'" regardless, without a
-- way to inspect the live session to see why. Rather than keep guessing,
-- this makes the mismatch structurally impossible: a BEFORE INSERT
-- trigger stamps created_by from auth.uid() itself, so whatever the
-- client sends (or omits) is irrelevant — the value the RLS check
-- compares against is always the same value that produced it.

create function public.stamp_created_by()
returns trigger
language plpgsql
as $$
begin
  new.created_by := auth.uid();
  return new;
end;
$$;

create trigger stamp_groups_created_by
  before insert on public.groups
  for each row execute function public.stamp_created_by();

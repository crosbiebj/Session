-- Session — spots: swims, far bank marker, rod length
-- Additive follow-up to the spots table (already live). Not applied yet —
-- review before running.
--
-- 1. swims — a lake's swims/pegs have their own naming scheme (e.g. Arrow
--    Pit's "Mollie Moo's") that anglers know by name, not a free-text
--    field re-typed per spot. First-class entity, lake-scoped, manually
--    maintained: Lake > Swim > that swim's saved spots.
-- 2. far_bank_marker — what you physically cast towards (e.g. "the twin
--    pylons"), distinct from the spot's own name — a spot can be
--    nicknamed one thing ("The Willow Swim") while being cast towards
--    something else entirely on the far bank. name stays as the spot's
--    own nickname; this is the aiming reference.
-- 3. rod_length_ft — a "wrap" is only meaningful relative to the rod it
--    was counted on (line wrapped around the exposed section between
--    reel and a marker point) — a wrap on a 9ft rod covers less distance
--    than a wrap on a 13ft rod. Without this, distance_wraps alone is
--    ambiguous.

-- =========================================================================
-- swims
-- =========================================================================

create table public.swims (
  id uuid primary key default gen_random_uuid(),
  lake_id uuid not null references public.lakes (id) on delete cascade,
  name text not null,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.swims enable row level security;

create trigger set_updated_at before update on public.swims
  for each row execute function public.set_updated_at();

create index idx_swims_lake_id on public.swims (lake_id);

-- Case-insensitive so "Mollie Moo's" and "mollie moo's" can't both get
-- added as separate swims by accident.
create unique index uq_swims_lake_name on public.swims (lake_id, lower(name));

-- Reuses can_view_lake / can_contribute_to_lake (already defined in the
-- Phase 1 RLS migration) — a swim is just a named location within a lake,
-- same viewer/contributor rules as the lake itself, no separate
-- visibility concept of its own (spots within it still carry their own
-- private/group visibility).
create policy "swims_select" on public.swims
  for select using (public.can_view_lake(lake_id));

create policy "swims_insert_contributor" on public.swims
  for insert with check (
    created_by = auth.uid() and public.can_contribute_to_lake(lake_id)
  );

create policy "swims_update_creator" on public.swims
  for update using (created_by = auth.uid()) with check (
    created_by = auth.uid() and public.can_contribute_to_lake(lake_id)
  );

create policy "swims_delete_creator" on public.swims
  for delete using (created_by = auth.uid());

-- =========================================================================
-- spots: swim relation, far bank marker, rod length
-- =========================================================================

alter table public.spots add column swim_id uuid references public.swims (id) on delete set null;

alter table public.spots add column far_bank_marker text;

alter table public.spots add column rod_length_ft smallint
  check (rod_length_ft between 6 and 16);

create index idx_spots_swim_id on public.spots (swim_id);

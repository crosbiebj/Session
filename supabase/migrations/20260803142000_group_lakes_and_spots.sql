-- Session — Group-owned lakes + in-lake spot marking (Tier 1)
-- Additive follow-up to 20260803140000_phase1_schema.sql, which is
-- ALREADY APPLIED to the live project. This migration only adds new
-- things — it never touches existing data, and existing rows are
-- unaffected (new columns are nullable, defaults kick in automatically).
--
-- Adds:
-- 1. lakes.group_id — a lake can now be owned by a group, not just an
--    individual, so group members share the same lake page (Section 3,
--    "Shared group lakes"). Replaces the old owner-only name uniqueness
--    with two scoped versions (personal vs. group).
-- 2. known_fish.group_id — 'group'-visibility fish are scoped to one
--    specific group, not "any group the adder belongs to."
-- 3. spots table — In-lake spot marking, Tier 1 (Section 3): bearing +
--    distance (wraps or estimate) + notes, private or shared to the
--    parent lake's group.
--
-- This migration has NOT been applied yet — review before running.

-- =========================================================================
-- lakes: group ownership
-- =========================================================================

-- The original unique constraint was table-level `unique (owner_id, name)`
-- with no explicit name, so Postgres auto-named it
-- "lakes_owner_id_name_key" — IF EXISTS makes this safe even if that guess
-- is ever wrong (it just becomes a no-op instead of erroring).
alter table public.lakes drop constraint if exists lakes_owner_id_name_key;

alter table public.lakes add column group_id uuid references public.groups (id) on delete set null;

create index idx_lakes_group_id on public.lakes (group_id);

-- Name uniqueness is now scoped separately for personal vs. group lakes —
-- your own "Broom Big Pit" and your group's "Broom Big Pit" are different
-- rows and shouldn't collide.
create unique index uq_lakes_personal_name on public.lakes (owner_id, name)
  where group_id is null;
create unique index uq_lakes_group_name on public.lakes (group_id, name)
  where group_id is not null;

-- =========================================================================
-- known_fish: scoped group visibility
-- =========================================================================

alter table public.known_fish add column group_id uuid references public.groups (id) on delete set null;

alter table public.known_fish add constraint known_fish_group_visibility_check check (
  (visibility = 'group' and group_id is not null) or
  (visibility = 'private' and group_id is null)
);

create index idx_known_fish_group_id on public.known_fish (group_id);

-- =========================================================================
-- spots
-- Section 3 (In-lake spot marking, Tier 1). group_id is not stored here —
-- a spot's group visibility always means "the parent lake's own
-- group_id," not an independently chosen group (see the RLS migration).
-- =========================================================================

create table public.spots (
  id uuid primary key default gen_random_uuid(),
  lake_id uuid not null references public.lakes (id) on delete cascade,
  created_by uuid references public.users (id) on delete set null,
  name text,
  bearing_degrees smallint check (bearing_degrees between 0 and 359),
  distance_wraps integer,
  distance_estimate_m numeric(6, 1),
  depth_m numeric(4, 1),
  bottom_type text,
  notes text,
  visibility fish_visibility_enum not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.spots enable row level security;

create trigger set_updated_at before update on public.spots
  for each row execute function public.set_updated_at();

create index idx_spots_lake_id on public.spots (lake_id);

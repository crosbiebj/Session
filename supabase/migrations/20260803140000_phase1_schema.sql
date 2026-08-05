-- Session — Phase 1 schema
-- Generated from CLAUDE.md sections 3 (Phase 1 Feature Set), 4 (Tech Stack /
-- Scale considerations), and 12 (User Account Tiers).
--
-- Security note: every table below has Row Level Security ENABLED with no
-- policies attached yet. That means nothing is readable/writable via the
-- Supabase client until a follow-up migration adds the sharing-model
-- policies (groups, share_links, shared_items, no_publicity warnings, etc).
-- This is deliberate: locked-down-by-default beats open-by-default while
-- that policy work is pending. Do not treat "no policies" as a bug.
--
-- ALREADY APPLIED to the live Supabase project. Do not re-run this file —
-- it will error with things like "type already exists" since these
-- tables/types are already there. Kept as a record of what's live. Any
-- further schema changes belong in a new migration file, not edits here.

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- =========================================================================
-- Enums
-- =========================================================================

-- Section 12: owner-granted only, defaults to standard for every signup.
create type account_tier_enum as enum (
  'standard',
  'free_for_life',
  'beta_tester',
  'ambassador'
);

-- Section 3 (Catch logging): stored unit-agnostic in grams; this only
-- controls rendering.
create type unit_preference_enum as enum ('lb_oz', 'kg');

-- Section 3 (Publicity & governance safeguards): must default to
-- no_publicity — an angler opts a lake INTO "open", never the reverse.
create type publicity_policy_enum as enum ('open', 'no_publicity');

-- Section 3 (Catch logging): flat sibling sub-types, not nested under mirror.
create type fish_sub_type_enum as enum (
  'common', 'mirror', 'linear', 'fully_scaled', 'leather', 'grass', 'koi', 'ghost'
);

-- Section 3 (Target fish list / Publicity): known_fish visibility, and the
-- before/after values audited in fish_visibility_log.
create type fish_visibility_enum as enum ('private', 'group');

-- Section 3 (Syndicate tickets).
create type ticket_status_enum as enum ('held', 'wanted');

create type friendship_status_enum as enum ('pending', 'accepted', 'declined');

create type group_member_role_enum as enum ('owner', 'member');

-- =========================================================================
-- users
-- Section 12: account_tier. Profile row mirrors auth.users 1:1; email stays
-- in auth.users rather than being duplicated here.
-- =========================================================================

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  unit_preference unit_preference_enum not null default 'lb_oz',
  account_tier account_tier_enum not null default 'standard',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;

-- Standard Supabase pattern: auto-create the profile row when a new auth
-- user signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Shared updated_at trigger, reused by every mutable table below.
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.users
  for each row execute function public.set_updated_at();

-- =========================================================================
-- groups / group_members
-- Section 3 (Sharing model, tier 1: Groups).
-- Created ahead of lakes/catches/sessions so later tables can reference
-- groups.id (e.g. sessions.visible_to_group_id, shared_items).
-- =========================================================================

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.groups enable row level security;

create trigger set_updated_at before update on public.groups
  for each row execute function public.set_updated_at();

create index idx_groups_created_by on public.groups (created_by);

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  role group_member_role_enum not null default 'member',
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);

alter table public.group_members enable row level security;

-- Section 4 (Scale considerations): "index group_members.user_id ... from
-- the start" — every share/RLS check walks this table by user.
create index idx_group_members_user_id on public.group_members (user_id);
create index idx_group_members_group_id on public.group_members (group_id);

-- =========================================================================
-- lakes
-- Section 2/3: personal/free-text entity in Phase 1 (owner-scoped, not a
-- shared global table yet). publicity_policy defaults to no_publicity.
-- Coordinates back the GPS auto-suggest and the weather/moon auto-fetch.
-- =========================================================================

create table public.lakes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  publicity_policy publicity_policy_enum not null default 'no_publicity',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, name)
);

alter table public.lakes enable row level security;

create trigger set_updated_at before update on public.lakes
  for each row execute function public.set_updated_at();

create index idx_lakes_owner_id on public.lakes (owner_id);

-- =========================================================================
-- known_fish
-- Section 3 (Target fish list): scoped per lake, not global.
-- =========================================================================

create table public.known_fish (
  id uuid primary key default gen_random_uuid(),
  lake_id uuid not null references public.lakes (id) on delete cascade,
  name text,
  notes text,
  added_by uuid references public.users (id) on delete set null,
  added_at timestamptz not null default now(),
  visibility fish_visibility_enum not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.known_fish enable row level security;

create trigger set_updated_at before update on public.known_fish
  for each row execute function public.set_updated_at();

create index idx_known_fish_lake_id on public.known_fish (lake_id);

-- =========================================================================
-- catches
-- Section 3 (Catch logging + Weather & moon phase auto-fetch). Every field
-- is optional except date (occurred_at) and at least one photo — the photo
-- requirement is enforced application-side during the create-catch
-- transaction, not by a DB constraint (a catch must exist before a
-- catch_photos row can reference it).
-- =========================================================================

create table public.catches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users (id) on delete cascade,
  lake_id uuid references public.lakes (id) on delete set null,

  occurred_at timestamptz not null,
  weight_grams integer,

  -- Location tile
  swim_peg text,

  -- Fish details tile
  sub_type fish_sub_type_enum,

  -- Tackle tile
  rig_used text,
  hookbait text,
  hook_pattern_size text,
  baiting_strategy text,
  wraps_or_distance text,

  -- Conditions tile — auto-fetched by the Edge Function on save, editable
  -- after. Column names match Section 3's auto-fetch list verbatim
  -- (air_temp_c, air_pressure_hpa, wind_direction, wind_speed).
  air_temp_c numeric(4, 1),
  air_pressure_hpa numeric(6, 1),
  wind_direction smallint check (wind_direction between 0 and 359),
  wind_speed numeric(5, 1),
  moon_phase numeric(4, 3) check (moon_phase between 0 and 1),
  bottom_type text,
  -- Deliberately excluded from the default form (Section 3) — column stays
  -- nullable/unused in case future demand justifies surfacing it.
  water_temp_c numeric(4, 1),

  -- Session tile
  duration_hours numeric(6, 2),
  session_notes text,

  -- Story tile
  story text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.catches enable row level security;

create trigger set_updated_at before update on public.catches
  for each row execute function public.set_updated_at();

create index idx_catches_owner_id on public.catches (owner_id);
create index idx_catches_lake_id on public.catches (lake_id);

-- Section 3 (The Book): cursor-based pagination on the personal feed from
-- day one, not "load everything."
create index idx_catches_owner_feed on public.catches (owner_id, occurred_at desc, id desc);

-- =========================================================================
-- catch_photos
-- Section 3/4: multiple photos per catch from V1; two-tier storage keeps an
-- untouched original alongside a compressed display version.
-- =========================================================================

create table public.catch_photos (
  id uuid primary key default gen_random_uuid(),
  catch_id uuid not null references public.catches (id) on delete cascade,
  storage_path_original text not null,
  storage_path_display text not null,
  width smallint,
  height smallint,
  position smallint not null default 0,
  created_at timestamptz not null default now()
);

alter table public.catch_photos enable row level security;

create index idx_catch_photos_catch_id on public.catch_photos (catch_id);

-- =========================================================================
-- targets
-- Section 3 (Target fish list). The doc's "species (nullable)" field is
-- implemented as target_sub_type instead — Session is carp-only and
-- explicitly has no species field anywhere in the schema (Section 3,
-- Catch logging), so a general goal like "30lb+ common from Broom" is
-- expressed via fish_sub_type_enum, not a free species field.
-- achieved_at "linking back to the catch" is modeled as an explicit FK
-- (achieved_catch_id) rather than only a timestamp.
-- =========================================================================

create table public.targets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users (id) on delete cascade,
  known_fish_id uuid references public.known_fish (id) on delete set null,
  lake_id uuid references public.lakes (id) on delete set null,
  target_sub_type fish_sub_type_enum,
  notes text,
  achieved_catch_id uuid references public.catches (id) on delete set null,
  achieved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.targets enable row level security;

create trigger set_updated_at before update on public.targets
  for each row execute function public.set_updated_at();

create index idx_targets_owner_id on public.targets (owner_id);
create index idx_targets_known_fish_id on public.targets (known_fish_id);
create index idx_targets_lake_id on public.targets (lake_id);

-- =========================================================================
-- tickets
-- Section 3 (Syndicate tickets): personal tracking only in Phase 1, not
-- tied to verified syndicate admin accounts (that's Phase 3).
-- =========================================================================

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users (id) on delete cascade,
  lake_id uuid references public.lakes (id) on delete set null,
  syndicate_name text,
  status ticket_status_enum not null default 'wanted',
  renewal_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tickets_reference_check check (lake_id is not null or syndicate_name is not null)
);

alter table public.tickets enable row level security;

create trigger set_updated_at before update on public.tickets
  for each row execute function public.set_updated_at();

create index idx_tickets_owner_id on public.tickets (owner_id);
create index idx_tickets_lake_id on public.tickets (lake_id);

-- =========================================================================
-- sessions
-- Section 3 (Upcoming sessions / planned trips). visible_to_group_id is
-- forward-compat for Phase 2's group calendar overlap detection (Section
-- 2) — unused by any Phase 1 logic, included now because retrofitting it
-- later is the expensive path per Section 4/11.
-- =========================================================================

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users (id) on delete cascade,
  lake_id uuid not null references public.lakes (id) on delete cascade,
  planned_start timestamptz not null,
  planned_end timestamptz not null,
  notes text,
  visible_to_group_id uuid references public.groups (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sessions_end_after_start check (planned_end >= planned_start)
);

alter table public.sessions enable row level security;

create trigger set_updated_at before update on public.sessions
  for each row execute function public.set_updated_at();

create index idx_sessions_owner_id on public.sessions (owner_id);
create index idx_sessions_lake_id on public.sessions (lake_id);
create index idx_sessions_visible_to_group_id on public.sessions (visible_to_group_id);

-- =========================================================================
-- friendships
-- Section 3 (Sharing model, precursor to Groups/direct shares).
-- =========================================================================

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.users (id) on delete cascade,
  addressee_id uuid not null references public.users (id) on delete cascade,
  status friendship_status_enum not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friendships_no_self_friend check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);

alter table public.friendships enable row level security;

create index idx_friendships_requester_id on public.friendships (requester_id);
create index idx_friendships_addressee_id on public.friendships (addressee_id);

-- =========================================================================
-- share_links
-- Section 3 (Sharing model, tier 2: temporary album access). Guest-pass —
-- no account/follow relationship required on the viewer's side.
-- =========================================================================

create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users (id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.share_links enable row level security;

create index idx_share_links_owner_id on public.share_links (owner_id);
-- Supports a cleanup job purging/ignoring expired links.
create index idx_share_links_expires_at on public.share_links (expires_at);

-- =========================================================================
-- shared_items
-- Section 3 (Sharing model, tier 3: individual/group spot sharing) — a
-- specific catch/intel shared directly, independent of the full album.
-- Exactly one of shared_with_user_id / shared_with_group_id must be set.
-- =========================================================================

create table public.shared_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users (id) on delete cascade,
  catch_id uuid not null references public.catches (id) on delete cascade,
  shared_with_user_id uuid references public.users (id) on delete cascade,
  shared_with_group_id uuid references public.groups (id) on delete cascade,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint shared_items_single_destination check (
    (shared_with_user_id is not null and shared_with_group_id is null) or
    (shared_with_user_id is null and shared_with_group_id is not null)
  )
);

alter table public.shared_items enable row level security;

create index idx_shared_items_owner_id on public.shared_items (owner_id);
create index idx_shared_items_catch_id on public.shared_items (catch_id);
-- Section 4 (Scale considerations): "index ... shared_items.shared_with_user_id
-- ... from the start" — this is the hot path for "what's been shared with me."
create index idx_shared_items_shared_with_user_id on public.shared_items (shared_with_user_id);
create index idx_shared_items_shared_with_group_id on public.shared_items (shared_with_group_id);

-- =========================================================================
-- fish_visibility_log
-- Section 3 (Publicity & governance safeguards): audit trail for every
-- visibility change on a known_fish record. Queried rarely (dispute/admin
-- lookup only) — index fish_id only, not on every fish view.
-- =========================================================================

create table public.fish_visibility_log (
  id uuid primary key default gen_random_uuid(),
  fish_id uuid not null references public.known_fish (id) on delete cascade,
  changed_by uuid references public.users (id) on delete set null,
  old_visibility fish_visibility_enum not null,
  new_visibility fish_visibility_enum not null,
  changed_at timestamptz not null default now()
);

alter table public.fish_visibility_log enable row level security;

create index idx_fish_visibility_log_fish_id on public.fish_visibility_log (fish_id);

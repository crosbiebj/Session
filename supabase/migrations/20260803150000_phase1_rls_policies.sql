-- Session — Phase 1 RLS policies
-- Follow-up to 20260803140000_phase1_schema.sql, which enabled RLS on every
-- table with zero policies (locked down by default). This migration
-- implements CLAUDE.md §3's sharing model: "nothing is visible to anyone
-- by default. Every single view of another angler's data traces back to
-- one of these three explicit records existing" (groups, share_links,
-- shared_items) — plus full owner access to your own data, always.
--
-- Four design notes — #1 is settled (per instruction), #2-4 are still
-- assumptions worth confirming:
--
-- 1. known_fish.visibility = 'group' is scoped to the specific
--    known_fish.group_id column (added in the schema migration) — visible
--    only to members of that one group, not any group the adder belongs
--    to. The schema enforces group_id is set iff visibility = 'group'.
--
-- 2. share_links (tier 2, temporary album access) is NOT implemented as a
--    table RLS policy on `catches`. The doc is explicit that the guest
--    viewer needs "no account/follow relationship" — they may have no
--    Supabase session at all, so auth.uid()-based RLS can't gate their
--    access. Instead, get_shared_album(token) is a SECURITY DEFINER RPC
--    that validates the token server-side and returns catch data,
--    callable by the anon role. It currently returns catch fields only —
--    photo delivery (signed Storage URLs) is a follow-up once Storage
--    buckets/policies exist.
--
-- 3. The original schema migration created fish_visibility_log but nothing
--    wrote to it. Added a trigger here so every known_fish.visibility
--    change is auto-logged — that's the whole point of the audit table.
--
-- 4. targets, tickets, and sessions have no sharing rule in Section 3, so
--    they stay fully owner-private (no group/friend read policies).
--
-- 5. lakes can now be group-owned (lakes.group_id, from the schema
--    migration's "Shared group lakes" addition) — any group member can add
--    known_fish/spots/catches at that lake, but changing publicity_policy
--    on a group lake is restricted to the group's owner role via a
--    trigger (RLS alone can't gate one specific column). spots.visibility
--    = 'group' always means "the parent lake's own group_id," never an
--    independently chosen group.
--
-- This migration has NOT been applied yet — review before running.

-- =========================================================================
-- Helper functions (SECURITY DEFINER, STABLE)
--
-- Written as SECURITY DEFINER so they bypass the RLS of the tables they
-- inspect (group_members, friendships, shared_items) — otherwise a policy
-- on table A calling a function that queries table B would itself be
-- filtered by B's RLS as the calling user, which is usually not what you
-- want for a reusable "can this user see X" check. search_path is pinned
-- to prevent search-path hijacking on a SECURITY DEFINER function.
-- =========================================================================

create function public.is_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = auth.uid()
  );
$$;

create function public.is_group_owner(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = auth.uid() and role = 'owner'
  );
$$;

create function public.shares_group_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm_self
    join public.group_members gm_other
      on gm_other.group_id = gm_self.group_id
    where gm_self.user_id = auth.uid()
      and gm_other.user_id = p_user_id
  );
$$;

create function public.is_friends_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.friendships
    where status = 'accepted'
      and (
        (requester_id = auth.uid() and addressee_id = p_user_id) or
        (addressee_id = auth.uid() and requester_id = p_user_id)
      )
  );
$$;

-- Section 3 (Sharing model, tier 3): owner_id = auth.uid() covers full
-- owner access; the shared_items branch covers a direct share to the
-- viewer or to a group the viewer belongs to.
create function public.can_view_catch(p_catch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.catches c
    where c.id = p_catch_id and c.owner_id = auth.uid()
  ) or exists (
    select 1 from public.shared_items si
    where si.catch_id = p_catch_id
      and si.revoked_at is null
      and (
        si.shared_with_user_id = auth.uid() or
        (si.shared_with_group_id is not null and public.is_group_member(si.shared_with_group_id))
      )
  );
$$;

-- See decision (1) above: scoped to the fish's own group_id, not any
-- group the adder happens to belong to.
create function public.can_view_known_fish(p_fish_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.known_fish kf
    where kf.id = p_fish_id
      and (
        kf.added_by = auth.uid() or
        (kf.visibility = 'group' and public.is_group_member(kf.group_id))
      )
  );
$$;

-- A lake's own row (name, publicity_policy) needs to be readable by anyone
-- who can see a catch or known_fish tied to it, not just its owner —
-- otherwise a shared catch would show a location the viewer can't resolve.
-- A group-owned lake is also directly visible to every group member, with
-- or without a catch/known_fish tied to it yet — that's the whole point
-- of a shared group lake page (Section 3, "Shared group lakes").
create function public.can_view_lake(p_lake_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.lakes l
    where l.id = p_lake_id
      and (
        l.owner_id = auth.uid() or
        (l.group_id is not null and public.is_group_member(l.group_id))
      )
  ) or exists (
    select 1 from public.catches c
    where c.lake_id = p_lake_id and public.can_view_catch(c.id)
  ) or exists (
    select 1 from public.known_fish kf
    where kf.lake_id = p_lake_id and public.can_view_known_fish(kf.id)
  );
$$;

-- Section 3 (Shared group lakes): can this user add to this lake at all —
-- known_fish, spots, or tag a catch to it? True for the personal owner,
-- or any member of the lake's group when it's group-owned.
create function public.can_contribute_to_lake(p_lake_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.lakes l
    where l.id = p_lake_id
      and (
        l.owner_id = auth.uid() or
        (l.group_id is not null and public.is_group_member(l.group_id))
      )
  );
$$;

-- Section 3 (In-lake spot marking): mirrors can_view_known_fish, but a
-- spot's 'group' visibility is always the parent lake's own group_id —
-- there's no independent spots.group_id to choose a different group.
create function public.can_view_spot(p_spot_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.spots s
    where s.id = p_spot_id
      and (
        s.created_by = auth.uid() or
        (s.visibility = 'group' and exists (
          select 1 from public.lakes l
          where l.id = s.lake_id
            and l.group_id is not null
            and public.is_group_member(l.group_id)
        ))
      )
  );
$$;

-- =========================================================================
-- users
-- =========================================================================

-- Self, groupmates, friends, or anyone on the other end of a direct share
-- (Section 3 tier 3 lets you share "to an individual by their ID/username"
-- without requiring an existing friendship first).
create policy "users_select" on public.users
  for select using (
    id = auth.uid() or
    public.shares_group_with(id) or
    public.is_friends_with(id) or
    exists (
      select 1 from public.shared_items si
      where (si.owner_id = auth.uid() and si.shared_with_user_id = id) or
            (si.owner_id = id and si.shared_with_user_id = auth.uid())
    )
  );

create policy "users_update_self" on public.users
  for update using (id = auth.uid()) with check (id = auth.uid());

-- No insert/delete policy: rows are created by the handle_new_user
-- trigger (SECURITY DEFINER) and removed via the auth.users cascade.

-- =========================================================================
-- groups / group_members
-- =========================================================================

create policy "groups_select_members" on public.groups
  for select using (public.is_group_member(id));

create policy "groups_insert_self" on public.groups
  for insert with check (created_by = auth.uid());

create policy "groups_update_owner" on public.groups
  for update using (public.is_group_owner(id));

create policy "groups_delete_owner" on public.groups
  for delete using (public.is_group_owner(id));

-- Auto-add the creator as the group's first member (role owner). Without
-- this, groups_select_members would hide a group from its own creator
-- immediately after creation.
create function public.handle_new_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.group_members (group_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

create trigger on_group_created
  after insert on public.groups
  for each row execute function public.handle_new_group();

create policy "group_members_select" on public.group_members
  for select using (public.is_group_member(group_id));

create policy "group_members_insert_owner" on public.group_members
  for insert with check (public.is_group_owner(group_id));

create policy "group_members_update_owner" on public.group_members
  for update using (public.is_group_owner(group_id));

-- Owner can remove anyone; a member can remove themself (leave).
create policy "group_members_delete" on public.group_members
  for delete using (user_id = auth.uid() or public.is_group_owner(group_id));

-- =========================================================================
-- lakes
-- =========================================================================

create policy "lakes_select" on public.lakes
  for select using (owner_id = auth.uid() or public.can_view_lake(id));

-- Creator must actually belong to the group they're creating a shared
-- lake for.
create policy "lakes_insert" on public.lakes
  for insert with check (
    owner_id = auth.uid() and
    (group_id is null or public.is_group_member(group_id))
  );

-- Any group member can edit a group lake's own fields (name, coordinates)
-- — note WITH CHECK deliberately does NOT require owner_id = auth.uid():
-- that would reject every non-creator member's edit, since owner_id is
-- the original creator and doesn't change on a normal update. Column-level
-- restrictions (who can reassign ownership, who can change privacy) live
-- in the enforce_lake_update_rules trigger below instead, since RLS
-- USING/WITH CHECK apply to the whole row, not individual columns.
create policy "lakes_update" on public.lakes
  for update using (
    owner_id = auth.uid() or
    (group_id is not null and public.is_group_member(group_id))
  ) with check (
    group_id is null or public.is_group_member(group_id)
  );

-- Deleting a group lake removes shared intel for everyone at once, so
-- it's restricted to the group owner role, not any member — matches the
-- same reasoning as the privacy-policy restriction.
create policy "lakes_delete" on public.lakes
  for delete using (
    (group_id is null and owner_id = auth.uid()) or
    (group_id is not null and public.is_group_owner(group_id))
  );

-- Column-level guards RLS can't express on its own (it's row-level, not
-- column-level):
-- 1. Only the lake's own creator can reassign it between personal/group,
--    or change owner_id itself — otherwise any group member could quietly
--    convert a shared lake into looking like their own personal one, or
--    move it to a different group.
-- 2. Section 3 ("Changing a group lake's publicity_policy is restricted
--    to the group's owner role") — any member can update the row per
--    lakes_update above, but not this specific column.
create function public.enforce_lake_update_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.group_id is distinct from old.group_id or new.owner_id is distinct from old.owner_id)
     and old.owner_id <> auth.uid() then
    raise exception 'Only the lake''s creator can change its ownership';
  end if;

  if new.publicity_policy is distinct from old.publicity_policy
     and old.group_id is not null
     and not public.is_group_owner(old.group_id) then
    raise exception 'Only the group owner can change privacy settings for a shared group lake';
  end if;

  return new;
end;
$$;

create trigger enforce_lake_update_rules
  before update on public.lakes
  for each row execute function public.enforce_lake_update_rules();

-- =========================================================================
-- known_fish
-- =========================================================================

create policy "known_fish_select" on public.known_fish
  for select using (public.can_view_known_fish(id));

-- Any contributor to the lake can add or edit known_fish (personal owner,
-- or any member on a group lake — Section 3, "any group member can add to
-- a group lake"). A known_fish record is treated as shared/collaborative
-- knowledge once it's on a group lake — like a fish's own little wiki
-- page, editable by whoever in the group has something to add. group_id,
-- when set, must be a group the adder is actually in — otherwise a fish
-- could be "shared" to a group with no way for anyone to see it.
create policy "known_fish_insert_contributor" on public.known_fish
  for insert with check (
    added_by = auth.uid() and
    public.can_contribute_to_lake(lake_id) and
    (group_id is null or public.is_group_member(group_id))
  );

create policy "known_fish_update_contributor" on public.known_fish
  for update using (
    public.can_contribute_to_lake(lake_id)
  ) with check (
    public.can_contribute_to_lake(lake_id) and
    (group_id is null or public.is_group_member(group_id))
  );

-- Deletion is narrower than edit/insert — a group member can add to or
-- correct a known_fish record, but removing it entirely is limited to
-- whoever created it, or the group's owner role for moderation. Prevents
-- one groupmate accidentally (or not) wiping out a carefully-documented
-- target fish another member built up.
create policy "known_fish_delete_creator_or_group_owner" on public.known_fish
  for delete using (
    added_by = auth.uid() or
    (group_id is not null and public.is_group_owner(group_id))
  );

-- added_by is a creation-time fact (who originally documented this fish),
-- not an editable field — without this, any contributor's update could
-- silently reassign authorship. Same reasoning as the lakes owner_id
-- guard above.
create function public.enforce_known_fish_added_by_immutable()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.added_by is distinct from old.added_by then
    raise exception 'added_by cannot be changed after creation';
  end if;
  return new;
end;
$$;

create trigger enforce_known_fish_added_by_immutable
  before update on public.known_fish
  for each row execute function public.enforce_known_fish_added_by_immutable();

-- See decision (3) above: log every visibility change automatically.
create function public.log_fish_visibility_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.visibility is distinct from new.visibility then
    insert into public.fish_visibility_log (fish_id, changed_by, old_visibility, new_visibility)
    values (new.id, auth.uid(), old.visibility, new.visibility);
  end if;
  return new;
end;
$$;

create trigger log_known_fish_visibility_change
  after update on public.known_fish
  for each row execute function public.log_fish_visibility_change();

-- =========================================================================
-- spots
-- Section 3 (In-lake spot marking, Tier 1). Same contributor model as
-- known_fish for insert, but narrower for update/delete — a spot is
-- someone's personal find (bearing, distance, notes), not a collaborative
-- record, so only its creator can edit or remove it. No group-owner
-- moderation override here (unlike known_fish/lakes) — see CLAUDE.md
-- Section 3, "no separate moderation role for spots in Phase 1."
-- =========================================================================

create policy "spots_select" on public.spots
  for select using (public.can_view_spot(id));

-- visibility = 'group' is only meaningful (and only allowed) on a lake
-- that actually has a group_id — a spot on a personal lake can only ever
-- be private.
create policy "spots_insert_contributor" on public.spots
  for insert with check (
    created_by = auth.uid() and
    public.can_contribute_to_lake(lake_id) and
    (
      visibility = 'private' or
      exists (select 1 from public.lakes l where l.id = lake_id and l.group_id is not null)
    )
  );

create policy "spots_update_creator" on public.spots
  for update using (created_by = auth.uid()) with check (
    created_by = auth.uid() and
    public.can_contribute_to_lake(lake_id) and
    (
      visibility = 'private' or
      exists (select 1 from public.lakes l where l.id = lake_id and l.group_id is not null)
    )
  );

create policy "spots_delete_creator" on public.spots
  for delete using (created_by = auth.uid());

-- =========================================================================
-- catches / catch_photos
-- =========================================================================

create policy "catches_select" on public.catches
  for select using (public.can_view_catch(id));

-- lake_id, when set, must be a lake you can actually contribute to — your
-- own personal lake, or a group lake you're a member of. Closes a gap
-- that existed even before group lakes: nothing previously stopped a
-- catch referencing an arbitrary lake_id you had no relationship to.
create policy "catches_insert_owner" on public.catches
  for insert with check (
    owner_id = auth.uid() and
    (lake_id is null or public.can_contribute_to_lake(lake_id))
  );

create policy "catches_update_owner" on public.catches
  for update using (owner_id = auth.uid()) with check (
    owner_id = auth.uid() and
    (lake_id is null or public.can_contribute_to_lake(lake_id))
  );

create policy "catches_delete_owner" on public.catches
  for delete using (owner_id = auth.uid());

create policy "catch_photos_select" on public.catch_photos
  for select using (public.can_view_catch(catch_id));

create policy "catch_photos_insert_owner" on public.catch_photos
  for insert with check (
    exists (select 1 from public.catches c where c.id = catch_id and c.owner_id = auth.uid())
  );

create policy "catch_photos_update_owner" on public.catch_photos
  for update using (
    exists (select 1 from public.catches c where c.id = catch_id and c.owner_id = auth.uid())
  );

create policy "catch_photos_delete_owner" on public.catch_photos
  for delete using (
    exists (select 1 from public.catches c where c.id = catch_id and c.owner_id = auth.uid())
  );

-- =========================================================================
-- targets / tickets / sessions
-- See decision (4) above: no sharing rule specified, so these stay fully
-- owner-private in Phase 1.
-- =========================================================================

create policy "targets_all_owner" on public.targets
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "tickets_all_owner" on public.tickets
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "sessions_all_owner" on public.sessions
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- =========================================================================
-- friendships
-- =========================================================================

create policy "friendships_select" on public.friendships
  for select using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "friendships_insert_requester" on public.friendships
  for insert with check (requester_id = auth.uid());

-- Either party can update: addressee accepts/declines, requester can also
-- change their own pending request.
create policy "friendships_update" on public.friendships
  for update using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "friendships_delete" on public.friendships
  for delete using (requester_id = auth.uid() or addressee_id = auth.uid());

-- =========================================================================
-- share_links
-- Management of your own links only — see decision (2) above for how the
-- guest actually reads the shared album (get_shared_album RPC, not RLS).
-- =========================================================================

create policy "share_links_all_owner" on public.share_links
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create or replace function public.get_shared_album(p_token text)
returns table (
  catch_id uuid,
  occurred_at timestamptz,
  weight_grams integer,
  sub_type fish_sub_type_enum,
  swim_peg text,
  story text,
  lake_name text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
begin
  select owner_id into v_owner_id
  from public.share_links
  where token = p_token
    and expires_at > now()
    and revoked_at is null;

  if v_owner_id is null then
    return; -- invalid, expired, or revoked token — empty result, no error
  end if;

  return query
    select c.id, c.occurred_at, c.weight_grams, c.sub_type, c.swim_peg, c.story, l.name
    from public.catches c
    left join public.lakes l on l.id = c.lake_id
    where c.owner_id = v_owner_id
    order by c.occurred_at desc;
end;
$$;

grant execute on function public.get_shared_album(text) to anon, authenticated;

-- =========================================================================
-- shared_items
-- =========================================================================

create policy "shared_items_select" on public.shared_items
  for select using (
    owner_id = auth.uid() or
    shared_with_user_id = auth.uid() or
    (shared_with_group_id is not null and public.is_group_member(shared_with_group_id))
  );

create policy "shared_items_insert_owner" on public.shared_items
  for insert with check (
    owner_id = auth.uid() and
    exists (select 1 from public.catches c where c.id = catch_id and c.owner_id = auth.uid()) and
    (shared_with_group_id is null or public.is_group_member(shared_with_group_id))
  );

create policy "shared_items_update_owner" on public.shared_items
  for update using (owner_id = auth.uid());

create policy "shared_items_delete_owner" on public.shared_items
  for delete using (owner_id = auth.uid());

-- =========================================================================
-- fish_visibility_log
-- Append-only audit trail, populated only by log_known_fish_visibility_change
-- above. No client insert/update/delete policy at all. Readable by the
-- fish's owner for dispute/admin lookup — matches the "queried rarely"
-- framing in the schema migration.
-- =========================================================================

create policy "fish_visibility_log_select_owner" on public.fish_visibility_log
  for select using (
    exists (
      select 1 from public.known_fish kf
      where kf.id = fish_id and kf.added_by = auth.uid()
    )
  );

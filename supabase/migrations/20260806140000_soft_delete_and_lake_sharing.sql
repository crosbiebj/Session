-- Session — soft delete (with recovery) for lakes/spots/sessions/tickets,
-- plus direct lake sharing (mirrors spot sharing)
-- Not applied yet — review before running.
--
-- Part 1: soft delete. "Delete" now sets deleted_at instead of removing
-- the row outright, so there's a real recovery path if someone taps it
-- by mistake — the app also gets a confirmation dialog first, but this
-- is the backstop, not a replacement for asking. Every existing SELECT
-- policy stays as-is (still governs *access*); a fresh policy per table
-- additionally filters out soft-deleted rows from normal listing/reading
-- once deleted_at is set. Restoring is just clearing deleted_at back to
-- null — same UPDATE policy already in place handles that, no new
-- policy needed for restore itself.

alter table public.lakes add column deleted_at timestamptz;
alter table public.spots add column deleted_at timestamptz;
alter table public.sessions add column deleted_at timestamptz;
alter table public.tickets add column deleted_at timestamptz;

-- Partial indexes — the common case ("give me the live rows") should
-- never have to scan soft-deleted ones.
create index idx_lakes_not_deleted on public.lakes (owner_id) where deleted_at is null;
create index idx_spots_not_deleted on public.spots (lake_id) where deleted_at is null;
create index idx_sessions_not_deleted on public.sessions (owner_id) where deleted_at is null;
create index idx_tickets_not_deleted on public.tickets (owner_id) where deleted_at is null;

-- Safety net, not the primary filter — the app's own list queries still
-- explicitly filter deleted_at is null for normal screens and deleted_at
-- is not null for the trash screen. This is what stops a soft-deleted
-- group lake/spot from leaking to other group members regardless of
-- whether every app query remembered to filter correctly: a RESTRICTIVE
-- policy ANDs with every permissive one, so nobody but the row's own
-- owner can see it at all once deleted_at is set — which is exactly who
-- the trash/recovery screen needs to keep working for.
create policy "lakes_hide_deleted" on public.lakes as restrictive
  for select using (deleted_at is null or owner_id = auth.uid());

create policy "spots_hide_deleted" on public.spots as restrictive
  for select using (deleted_at is null or created_by = auth.uid());

create policy "sessions_hide_deleted" on public.sessions as restrictive
  for select using (deleted_at is null or owner_id = auth.uid());

create policy "tickets_hide_deleted" on public.tickets as restrictive
  for select using (deleted_at is null or owner_id = auth.uid());

-- Part 2: direct lake sharing (Tier 3), mirroring the spot_sharing
-- migration exactly — shared_items already carries spot_id; this adds
-- lake_id the same way.

alter table public.shared_items add column lake_id uuid references public.lakes (id) on delete cascade;

alter table public.shared_items drop constraint shared_items_single_item;

alter table public.shared_items add constraint shared_items_single_item check (
  (catch_id is not null and spot_id is null and lake_id is null) or
  (catch_id is null and spot_id is not null and lake_id is null) or
  (catch_id is null and spot_id is null and lake_id is not null)
);

create index idx_shared_items_lake_id on public.shared_items (lake_id);

drop policy "shared_items_insert_owner" on public.shared_items;

create policy "shared_items_insert_owner" on public.shared_items
  for insert with check (
    owner_id = auth.uid() and
    (
      (catch_id is not null and exists (
        select 1 from public.catches c where c.id = catch_id and c.owner_id = auth.uid()
      )) or
      (spot_id is not null and exists (
        select 1 from public.spots s where s.id = spot_id and s.created_by = auth.uid()
      )) or
      (lake_id is not null and exists (
        select 1 from public.lakes l where l.id = lake_id and l.owner_id = auth.uid()
      ))
    ) and
    (shared_with_group_id is null or public.is_group_member(shared_with_group_id))
  );

create or replace function public.can_view_lake(p_lake_id uuid)
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
  ) or exists (
    select 1 from public.shared_items si
    where si.lake_id = p_lake_id
      and si.revoked_at is null
      and (
        si.shared_with_user_id = auth.uid() or
        (si.shared_with_group_id is not null and public.is_group_member(si.shared_with_group_id))
      )
  );
$$;

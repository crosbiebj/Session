-- Session — direct spot sharing (Tier 3 of the sharing model)
-- Not applied yet — review before running.
--
-- shared_items already existed for exactly this ("a specific piece of
-- intel... shared directly, independent of sharing the whole album") but
-- was hardcoded to catches only (catch_id not null). This extends it to
-- also carry a spot, so a specific spot can be shared with one named
-- friend — distinct from spots.visibility='group', which is always tied
-- to the lake's own group (Tier 1) and can't target an arbitrary person
-- or a different group.

alter table public.shared_items alter column catch_id drop not null;

alter table public.shared_items add column spot_id uuid references public.spots (id) on delete cascade;

alter table public.shared_items add constraint shared_items_single_item check (
  (catch_id is not null and spot_id is null) or
  (catch_id is null and spot_id is not null)
);

create index idx_shared_items_spot_id on public.shared_items (spot_id);

-- Replaces shared_items_insert_owner (was catch-only) with a version that
-- accepts either a catch the owner owns or a spot they created.
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
      ))
    ) and
    (shared_with_group_id is null or public.is_group_member(shared_with_group_id))
  );

-- can_view_spot now also grants access via a live (non-revoked) direct
-- share, independent of the lake-group visibility path above it.
create or replace function public.can_view_spot(p_spot_id uuid)
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
  ) or exists (
    select 1 from public.shared_items si
    where si.spot_id = p_spot_id
      and si.revoked_at is null
      and (
        si.shared_with_user_id = auth.uid() or
        (si.shared_with_group_id is not null and public.is_group_member(si.shared_with_group_id))
      )
  );
$$;

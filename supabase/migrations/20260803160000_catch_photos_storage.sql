-- Session — catch-photos Storage bucket + policies
-- Milestone 1 (sign in → log a catch → see it in your Book). Photos are
-- required for a catch, so this is the first thing that needs Storage,
-- not just tables.
--
-- Path convention: {owner_id}/{catch_id}/{filename} — everything below
-- reads that structure via storage.foldername(name), which returns the
-- path split into an array: [1] = owner_id, [2] = catch_id.
--
-- Read access reuses the same public.can_view_catch() function already
-- live from the RLS migration — "can you see the catch" and "can you see
-- its photos" should always be the same answer, so this is one source of
-- truth reused across two different permission systems (table RLS and
-- Storage RLS), not two separate rules to keep in sync by hand.
--
-- Single-tier storage for this milestone (see the plan) — every catch
-- photo is one file in this bucket; the schema's separate
-- storage_path_original/storage_path_display columns both point at it
-- for now. Client-side compression and a real second tier is a later,
-- self-contained follow-up.
--
-- This migration has NOT been applied yet — review before running.

insert into storage.buckets (id, name, public)
values ('catch-photos', 'catch-photos', false)
on conflict (id) do nothing;

create policy "catch_photos_storage_select" on storage.objects
  for select using (
    bucket_id = 'catch-photos' and
    public.can_view_catch(((storage.foldername(name))[2])::uuid)
  );

-- Path's owner segment must match the uploader, and the catch_id segment
-- must actually be one of their own catches — belt-and-braces beyond just
-- trusting the path, since the path itself is client-supplied.
create policy "catch_photos_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'catch-photos' and
    (storage.foldername(name))[1] = auth.uid()::text and
    exists (
      select 1 from public.catches c
      where c.id = ((storage.foldername(name))[2])::uuid
        and c.owner_id = auth.uid()
    )
  );

-- Covers upsert-on-retry (supabase-js upload with upsert: true behaves
-- like an update on conflict), same check as insert.
create policy "catch_photos_storage_update" on storage.objects
  for update using (
    bucket_id = 'catch-photos' and
    (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'catch-photos' and
    (storage.foldername(name))[1] = auth.uid()::text and
    exists (
      select 1 from public.catches c
      where c.id = ((storage.foldername(name))[2])::uuid
        and c.owner_id = auth.uid()
    )
  );

create policy "catch_photos_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'catch-photos' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

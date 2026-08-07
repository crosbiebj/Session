-- Session — user + group avatars (group banner included)
-- Not applied yet — review before running.
--
-- Ben: "we'd like to have that at the top of the group page as a
-- banner" — plus personal profile pictures, since users.avatar_url has
-- sat unused in the schema since the original migration.
--
-- One private bucket, two path prefixes, same shape as catch-photos
-- (storage.foldername(name) split, signed URLs client-side, no public
-- bucket): 'user/{user_id}/avatar.{ext}' and 'group/{group_id}/avatar.{ext}'.
-- Fixed filename per id (not timestamped) so a re-upload overwrites the
-- same object via upsert rather than piling up old ones.

alter table public.groups add column avatar_url text;

-- Same visibility as users_select (self, groupmates, friends, direct
-- share) — pulled out into a reusable function so the storage policy
-- below doesn't have to duplicate that logic by hand and risk drifting
-- from the table's own rule over time.
create function public.can_view_user(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_user_id = auth.uid() or
    public.shares_group_with(p_user_id) or
    public.is_friends_with(p_user_id) or
    exists (
      select 1 from public.shared_items si
      where (si.owner_id = auth.uid() and si.shared_with_user_id = p_user_id) or
            (si.owner_id = p_user_id and si.shared_with_user_id = auth.uid())
    );
$$;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do nothing;

create policy "avatars_storage_select" on storage.objects
  for select using (
    bucket_id = 'avatars' and (
      ((storage.foldername(name))[1] = 'user' and public.can_view_user(((storage.foldername(name))[2])::uuid)) or
      ((storage.foldername(name))[1] = 'group' and public.is_group_member(((storage.foldername(name))[2])::uuid))
    )
  );

create policy "avatars_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (
      ((storage.foldername(name))[1] = 'user' and (storage.foldername(name))[2] = auth.uid()::text) or
      ((storage.foldername(name))[1] = 'group' and public.is_group_owner(((storage.foldername(name))[2])::uuid))
    )
  );

-- Covers upsert-on-retry (supabase-js upload with upsert: true behaves
-- like an update on conflict), same check as insert.
create policy "avatars_storage_update" on storage.objects
  for update using (
    bucket_id = 'avatars' and (
      ((storage.foldername(name))[1] = 'user' and (storage.foldername(name))[2] = auth.uid()::text) or
      ((storage.foldername(name))[1] = 'group' and public.is_group_owner(((storage.foldername(name))[2])::uuid))
    )
  ) with check (
    bucket_id = 'avatars' and (
      ((storage.foldername(name))[1] = 'user' and (storage.foldername(name))[2] = auth.uid()::text) or
      ((storage.foldername(name))[1] = 'group' and public.is_group_owner(((storage.foldername(name))[2])::uuid))
    )
  );

create policy "avatars_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'avatars' and (
      ((storage.foldername(name))[1] = 'user' and (storage.foldername(name))[2] = auth.uid()::text) or
      ((storage.foldername(name))[1] = 'group' and public.is_group_owner(((storage.foldername(name))[2])::uuid))
    )
  );

import { decode } from 'base64-arraybuffer';

import { supabase } from '@/lib/supabase';

// Path convention {owner_id}/{catch_id}/{filename} matches what the
// catch-photos Storage policies expect (supabase/migrations/
// 20260803160000_catch_photos_storage.sql) — changing this here without
// updating that migration would break upload/read access.
export async function uploadCatchPhoto(params: {
  ownerId: string;
  catchId: string;
  base64: string;
  fileExtension: string;
}): Promise<string> {
  const { ownerId, catchId, base64, fileExtension } = params;
  const filename = `${Date.now()}-${Math.floor(Math.random() * 1e6)}.${fileExtension}`;
  const path = `${ownerId}/${catchId}/${filename}`;
  const contentType = fileExtension === 'jpg' ? 'image/jpeg' : `image/${fileExtension}`;

  const { error } = await supabase.storage
    .from('catch-photos')
    .upload(path, decode(base64), { contentType });

  if (error) throw error;
  return path;
}

// catch-photos is a private bucket (access gated by can_view_catch, same
// as the tables) — getPublicUrl() would silently return an unusable URL
// since the bucket isn't public. Signed URLs are the correct approach and
// need to be requested per-viewer, per-session; batched here since a
// single Book page can have many photos across many catches.
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour — plenty for one viewing session

export async function getCatchPhotoSignedUrls(
  paths: string[]
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};

  const { data, error } = await supabase.storage
    .from('catch-photos')
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

  if (error) throw error;

  const urlsByPath: Record<string, string> = {};
  for (const entry of data) {
    if (entry.signedUrl && !entry.error) {
      urlsByPath[entry.path ?? ''] = entry.signedUrl;
    }
  }
  return urlsByPath;
}

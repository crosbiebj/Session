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

// Personal avatars and group banners share one bucket, split by a fixed
// 'user/{id}/avatar.ext' or 'group/{id}/avatar.ext' path (see
// supabase/migrations/20260807120000_avatars_storage.sql) — a fixed
// filename per id, not timestamped, so a re-upload overwrites the same
// object via upsert instead of leaving old ones behind.
export async function uploadAvatar(params: {
  scope: 'user' | 'group';
  id: string;
  base64: string;
  fileExtension: string;
}): Promise<string> {
  const { scope, id, base64, fileExtension } = params;
  const path = `${scope}/${id}/avatar.${fileExtension}`;
  const contentType = fileExtension === 'jpg' ? 'image/jpeg' : `image/${fileExtension}`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, decode(base64), { contentType, upsert: true });

  if (error) throw error;
  return path;
}

const AVATAR_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24; // 24h — avatars are cheap to re-sign but no need to on every render

export async function getAvatarSignedUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from('avatars').createSignedUrl(path, AVATAR_SIGNED_URL_TTL_SECONDS);
  if (error) return null;
  return data.signedUrl;
}

// "Whip out my ticket for the bailiff" — quality stays high (no
// compression down to catch-photo levels) since a blurry QR just doesn't
// scan. Path '{owner_id}/{ticket_id}.ext', same idiom as catch-photos.
export async function uploadTicketQrCode(params: {
  ownerId: string;
  ticketId: string;
  base64: string;
  fileExtension: string;
}): Promise<string> {
  const { ownerId, ticketId, base64, fileExtension } = params;
  const path = `${ownerId}/${ticketId}.${fileExtension}`;
  const contentType = fileExtension === 'jpg' ? 'image/jpeg' : `image/${fileExtension}`;

  const { error } = await supabase.storage
    .from('ticket-qr-codes')
    .upload(path, decode(base64), { contentType, upsert: true });

  if (error) throw error;
  return path;
}

export async function getTicketQrSignedUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from('ticket-qr-codes')
    .createSignedUrl(path, AVATAR_SIGNED_URL_TTL_SECONDS);
  if (error) return null;
  return data.signedUrl;
}

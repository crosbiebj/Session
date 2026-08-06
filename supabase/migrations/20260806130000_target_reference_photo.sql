-- Session — attach a reference photo to a target
-- Not applied yet — review before running.
--
-- Lets an angler pick a photo from one of their own already-logged
-- catches to represent a target fish/species — not a new upload, a
-- reference to an existing catch_photos row. Scoped to the angler's own
-- catches only for now (the picker only ever queries catches they own,
-- enforced client-side plus the existing catch_photos RLS as a
-- backstop) — deliberately not "any catch you have access to," since
-- that would mean one angler's target book could carry a friend's photo
-- (their likeness, on a fish they caught) without a clear consent story.
-- Revisit once there's an actual Terms of Service to anchor that in.

alter table public.targets add column reference_photo_id uuid
  references public.catch_photos (id) on delete set null;

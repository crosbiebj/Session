-- Session — syndicate ticket QR code
-- Not applied yet — review before running.
--
-- Ben: "I want to be able to add my syndicate ticket's QR code from my
-- syndicate home page to the app... so I can use that to whip out my
-- ticket for the bailiff." A screenshot of whatever QR their syndicate
-- already issues (its own app, a membership card, an email), attached to
-- the matching tickets row, shown full-screen on demand. Tickets have no
-- sharing model at all (tickets_all_owner is owner-only, full stop), so
-- this is the simplest of the storage buckets so far — no group/friend
-- read path to account for, unlike catch-photos or avatars.

alter table public.tickets add column qr_code_path text;

insert into storage.buckets (id, name, public)
values ('ticket-qr-codes', 'ticket-qr-codes', false)
on conflict (id) do nothing;

-- Path convention '{owner_id}/{ticket_id}.{ext}' — same storage.foldername
-- idiom as catch-photos/avatars. Owner-only for every operation; a ticket
-- has no group/friend visibility to account for.
create policy "ticket_qr_storage_select" on storage.objects
  for select using (
    bucket_id = 'ticket-qr-codes' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "ticket_qr_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'ticket-qr-codes' and
    (storage.foldername(name))[1] = auth.uid()::text and
    exists (
      select 1 from public.tickets t
      where t.id = ((storage.foldername(name))[2])::uuid and t.owner_id = auth.uid()
    )
  );

create policy "ticket_qr_storage_update" on storage.objects
  for update using (
    bucket_id = 'ticket-qr-codes' and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'ticket-qr-codes' and
    (storage.foldername(name))[1] = auth.uid()::text and
    exists (
      select 1 from public.tickets t
      where t.id = ((storage.foldername(name))[2])::uuid and t.owner_id = auth.uid()
    )
  );

create policy "ticket_qr_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'ticket-qr-codes' and (storage.foldername(name))[1] = auth.uid()::text
  );

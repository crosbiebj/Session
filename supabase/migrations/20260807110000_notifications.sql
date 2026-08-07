-- Session — in-app notifications (v1, no push/APNs)
-- Not applied yet — review before running.
--
-- Ben: "Notifications in app?! Where dey at?" Scoped to what already
-- happens silently in the app today: a friend request lands, a friend
-- request gets accepted, a group join request lands (owner), a group
-- join request gets approved. Push notifications (APNs/Expo push tokens)
-- are a separate, bigger lift needing Apple provisioning — this is
-- in-app only, surfaced via a bell icon + list, refetched on open rather
-- than realtime-pushed for now.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  data jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create index idx_notifications_user_id on public.notifications (user_id, created_at desc);

create policy "notifications_select_own" on public.notifications
  for select using (user_id = auth.uid());

create policy "notifications_update_own" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Deliberately no insert policy — every row is written by a SECURITY
-- DEFINER trigger below, never directly by a client. That's the whole
-- point: nobody can spoof a notification into someone else's tray.

create function public.notify_friend_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requester_name text;
begin
  if new.status = 'pending' then
    select coalesce(display_name, 'An angler') into v_requester_name from public.users where id = new.requester_id;
    insert into public.notifications (user_id, type, title, body, data)
    values (
      new.addressee_id,
      'friend_request',
      'Friend request',
      v_requester_name || ' wants to connect',
      jsonb_build_object('requester_id', new.requester_id)
    );
  end if;
  return new;
end;
$$;

create trigger on_friend_request_created after insert on public.friendships
  for each row execute function public.notify_friend_request();

create function public.notify_friend_request_accepted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_addressee_name text;
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    select coalesce(display_name, 'An angler') into v_addressee_name from public.users where id = new.addressee_id;
    insert into public.notifications (user_id, type, title, body, data)
    values (
      new.requester_id,
      'friend_request_accepted',
      'Friend request accepted',
      v_addressee_name || ' accepted your request',
      jsonb_build_object('friend_id', new.addressee_id)
    );
  end if;
  return new;
end;
$$;

create trigger on_friend_request_accepted after update on public.friendships
  for each row execute function public.notify_friend_request_accepted();

create function public.notify_group_join_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requester_name text;
  v_group_name text;
begin
  if new.status = 'pending' then
    select coalesce(display_name, 'An angler') into v_requester_name from public.users where id = new.user_id;
    select name into v_group_name from public.groups where id = new.group_id;

    insert into public.notifications (user_id, type, title, body, data)
    select gm.user_id,
           'group_join_request',
           'Group join request',
           v_requester_name || ' wants to join ' || coalesce(v_group_name, 'your group'),
           jsonb_build_object('group_id', new.group_id)
    from public.group_members gm
    where gm.group_id = new.group_id and gm.role = 'owner';
  end if;
  return new;
end;
$$;

create trigger on_group_join_request_created after insert on public.group_join_requests
  for each row execute function public.notify_group_join_request();

create function public.notify_group_join_approved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_name text;
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    select name into v_group_name from public.groups where id = new.group_id;
    insert into public.notifications (user_id, type, title, body, data)
    values (
      new.user_id,
      'group_join_approved',
      'Request approved',
      'You''re in — welcome to ' || coalesce(v_group_name, 'the group'),
      jsonb_build_object('group_id', new.group_id)
    );
  end if;
  return new;
end;
$$;

create trigger on_group_join_request_approved after update on public.group_join_requests
  for each row execute function public.notify_group_join_approved();

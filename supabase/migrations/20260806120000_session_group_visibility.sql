-- Session — wire up sessions.visible_to_group_id (pulled forward from
-- Phase 2's group calendar plan, CLAUDE.md §2)
-- Not applied yet — review before running.
--
-- The column has existed since the original schema ("data foundation is
-- ready when this gets built") but nothing ever read or wrote it —
-- sessions_all_owner restricts every operation, including select, to the
-- owner only. This adds the missing read path: a group member can see a
-- session if its owner chose to share it with that group, without
-- touching insert/update/delete (still owner-only — sharing visibility
-- isn't the same as letting someone edit your plans). Multiple permissive
-- policies for the same command are OR'd together, so this is additive,
-- not a replacement for the existing owner policy.

create policy "sessions_select_group_visible" on public.sessions
  for select using (
    visible_to_group_id is not null and public.is_group_member(visible_to_group_id)
  );

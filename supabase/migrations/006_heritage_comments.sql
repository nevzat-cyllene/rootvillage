-- Let archival records collect source notes, oral histories and corrections.

alter table public.comments
  drop constraint if exists comments_target_type_check;

alter table public.comments
  add constraint comments_target_type_check
  check (target_type in ('village', 'family', 'person', 'heritage'));

-- Person profile photos
alter table public.people
  add column if not exists avatar_url text;

comment on column public.people.avatar_url is 'Optional portrait URL (Supabase Storage or external)';

-- Storage bucket for person avatars (run in SQL editor; ignore if already exists)
insert into storage.buckets (id, name, public)
values ('person-avatars', 'person-avatars', true)
on conflict (id) do nothing;

drop policy if exists "person_avatars_public_read" on storage.objects;
create policy "person_avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'person-avatars');

drop policy if exists "person_avatars_auth_upload" on storage.objects;
create policy "person_avatars_auth_upload"
  on storage.objects for insert
  with check (bucket_id = 'person-avatars' and auth.uid() is not null);

drop policy if exists "person_avatars_auth_update" on storage.objects;
create policy "person_avatars_auth_update"
  on storage.objects for update
  using (bucket_id = 'person-avatars' and auth.uid() is not null);

drop policy if exists "person_avatars_auth_delete" on storage.objects;
create policy "person_avatars_auth_delete"
  on storage.objects for delete
  using (bucket_id = 'person-avatars' and auth.uid() is not null);

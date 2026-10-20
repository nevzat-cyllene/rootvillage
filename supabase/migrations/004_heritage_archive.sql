-- RootVillage shared heritage archive and bilingual village names

alter table public.villages
  add column if not exists name_tr text;

comment on column public.villages.name_tr is
  'Optional Turkish or official counterpart for the primary/local village name';

create table if not exists public.heritage_entries (
  id uuid primary key default gen_random_uuid(),
  entry_type text not null check (entry_type in (
    'region', 'city', 'district', 'village', 'hamlet', 'monument',
    'historic_site', 'event', 'story', 'quote', 'cultural_practice', 'person'
  )),
  title text not null,
  title_tr text,
  slug text not null unique,
  summary text,
  content text,
  location_text text,
  year_start int,
  year_end int,
  source_note text,
  parent_id uuid references public.heritage_entries (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists heritage_entries_type_idx
  on public.heritage_entries (entry_type) where deleted_at is null;
create index if not exists heritage_entries_title_idx
  on public.heritage_entries (title) where deleted_at is null;
create index if not exists heritage_entries_parent_idx
  on public.heritage_entries (parent_id) where deleted_at is null;

drop trigger if exists heritage_entries_updated_at on public.heritage_entries;
create trigger heritage_entries_updated_at before update on public.heritage_entries
  for each row execute function public.set_updated_at();

alter table public.heritage_entries enable row level security;

drop policy if exists "heritage_entries_select" on public.heritage_entries;
create policy "heritage_entries_select" on public.heritage_entries
  for select using (deleted_at is null or auth.uid() is not null);

drop policy if exists "heritage_entries_insert" on public.heritage_entries;
create policy "heritage_entries_insert" on public.heritage_entries
  for insert with check (auth.uid() is not null);

drop policy if exists "heritage_entries_update" on public.heritage_entries;
create policy "heritage_entries_update" on public.heritage_entries
  for update using (auth.uid() is not null);

drop policy if exists "heritage_entries_delete" on public.heritage_entries;
create policy "heritage_entries_delete" on public.heritage_entries
  for delete using (public.is_admin());

grant select on public.heritage_entries to anon, authenticated;
grant insert, update on public.heritage_entries to authenticated;

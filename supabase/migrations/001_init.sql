-- RootVillage initial schema
create extension if not exists "pgcrypto";

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Villages
create table if not exists public.villages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists villages_slug_idx on public.villages (slug) where deleted_at is null;
create index if not exists villages_name_idx on public.villages (name) where deleted_at is null;

-- Families
create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  village_id uuid not null references public.villages (id) on delete cascade,
  name text not null,
  aka text,
  notes text,
  is_incomplete boolean not null default true,
  disputed boolean not null default false,
  map_x double precision,
  map_z double precision,
  map_seed int,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists families_village_idx on public.families (village_id) where deleted_at is null;

-- People
create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  full_name text not null,
  birth_year int,
  death_year int,
  gender text check (gender is null or gender in ('male', 'female', 'other', 'unknown')),
  notes text,
  avatar_url text,
  disputed boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists people_family_idx on public.people (family_id) where deleted_at is null;

-- Parent / spouse relations
create table if not exists public.person_relations (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  related_person_id uuid not null references public.people (id) on delete cascade,
  relation_type text not null check (relation_type in ('parent', 'spouse')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (person_id, related_person_id, relation_type)
);

-- Comments (author_id → profiles so PostgREST can embed author)
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('village', 'family', 'person')),
  target_id uuid not null,
  body text not null,
  author_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists comments_target_idx on public.comments (target_type, target_id) where deleted_at is null;

-- Edit proposals (corrections / delete requests)
create table if not exists public.edit_proposals (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('village', 'family', 'person', 'relation')),
  target_id uuid not null,
  action text not null check (action in ('update', 'delete')),
  payload jsonb,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  proposed_by uuid not null references auth.users (id) on delete cascade,
  resolved_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists edit_proposals_status_idx on public.edit_proposals (status);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      nullif(
        trim(
          concat_ws(
            ' ',
            new.raw_user_meta_data->>'first_name',
            new.raw_user_meta_data->>'last_name'
          )
        ),
        ''
      ),
      new.email
    ),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    )
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists villages_updated_at on public.villages;
create trigger villages_updated_at before update on public.villages
  for each row execute function public.set_updated_at();

drop trigger if exists families_updated_at on public.families;
create trigger families_updated_at before update on public.families
  for each row execute function public.set_updated_at();

drop trigger if exists people_updated_at on public.people;
create trigger people_updated_at before update on public.people
  for each row execute function public.set_updated_at();

drop trigger if exists comments_updated_at on public.comments;
create trigger comments_updated_at before update on public.comments
  for each row execute function public.set_updated_at();

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Admin check
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.villages enable row level security;
alter table public.families enable row level security;
alter table public.people enable row level security;
alter table public.person_relations enable row level security;
alter table public.comments enable row level security;
alter table public.edit_proposals enable row level security;

-- Profiles policies
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id or public.is_admin());

-- Villages: public read, auth write
drop policy if exists "villages_select" on public.villages;
create policy "villages_select" on public.villages
  for select using (deleted_at is null or auth.uid() is not null);

drop policy if exists "villages_insert" on public.villages;
create policy "villages_insert" on public.villages
  for insert with check (auth.uid() is not null);

drop policy if exists "villages_update" on public.villages;
create policy "villages_update" on public.villages
  for update using (auth.uid() is not null);

drop policy if exists "villages_delete" on public.villages;
create policy "villages_delete" on public.villages
  for delete using (public.is_admin());

-- Families
drop policy if exists "families_select" on public.families;
create policy "families_select" on public.families
  for select using (deleted_at is null or auth.uid() is not null);

drop policy if exists "families_insert" on public.families;
create policy "families_insert" on public.families
  for insert with check (auth.uid() is not null);

drop policy if exists "families_update" on public.families;
create policy "families_update" on public.families
  for update using (auth.uid() is not null);

drop policy if exists "families_delete" on public.families;
create policy "families_delete" on public.families
  for delete using (public.is_admin());

-- People
drop policy if exists "people_select" on public.people;
create policy "people_select" on public.people
  for select using (deleted_at is null or auth.uid() is not null);

drop policy if exists "people_insert" on public.people;
create policy "people_insert" on public.people
  for insert with check (auth.uid() is not null);

drop policy if exists "people_update" on public.people;
create policy "people_update" on public.people
  for update using (auth.uid() is not null);

drop policy if exists "people_delete" on public.people;
create policy "people_delete" on public.people
  for delete using (public.is_admin());

-- Relations
drop policy if exists "relations_select" on public.person_relations;
create policy "relations_select" on public.person_relations
  for select using (deleted_at is null or auth.uid() is not null);

drop policy if exists "relations_insert" on public.person_relations;
create policy "relations_insert" on public.person_relations
  for insert with check (auth.uid() is not null);

drop policy if exists "relations_update" on public.person_relations;
create policy "relations_update" on public.person_relations
  for update using (auth.uid() is not null);

drop policy if exists "relations_delete" on public.person_relations;
create policy "relations_delete" on public.person_relations
  for delete using (public.is_admin());

-- Comments
drop policy if exists "comments_select" on public.comments;
create policy "comments_select" on public.comments
  for select using (deleted_at is null);

drop policy if exists "comments_insert" on public.comments;
create policy "comments_insert" on public.comments
  for insert with check (auth.uid() = author_id);

drop policy if exists "comments_update" on public.comments;
create policy "comments_update" on public.comments
  for update using (auth.uid() = author_id or public.is_admin());

drop policy if exists "comments_delete" on public.comments;
create policy "comments_delete" on public.comments
  for delete using (auth.uid() = author_id or public.is_admin());

-- Edit proposals
drop policy if exists "proposals_select" on public.edit_proposals;
create policy "proposals_select" on public.edit_proposals
  for select using (auth.uid() is not null);

drop policy if exists "proposals_insert" on public.edit_proposals;
create policy "proposals_insert" on public.edit_proposals
  for insert with check (auth.uid() = proposed_by);

drop policy if exists "proposals_update" on public.edit_proposals;
create policy "proposals_update" on public.edit_proposals
  for update using (public.is_admin() or auth.uid() = proposed_by);

-- Soft-delete helpers (authenticated users soft-delete via update)
-- Grant usage
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update on public.villages, public.families, public.people, public.person_relations, public.comments, public.edit_proposals to authenticated;
grant update on public.profiles to authenticated;
grant delete on public.comments to authenticated;

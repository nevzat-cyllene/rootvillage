-- Private genealogy access. Village names remain discoverable, but family,
-- person and relationship data requires an explicit approval from the owner.

create table if not exists public.tree_access (
  id uuid primary key default gen_random_uuid(),
  village_id uuid not null references public.villages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'viewer' check (role in ('viewer', 'contributor')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'revoked')),
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users (id) on delete set null,
  note text,
  unique (village_id, user_id)
);

create index if not exists tree_access_village_status_idx
  on public.tree_access (village_id, status);
create index if not exists tree_access_user_status_idx
  on public.tree_access (user_id, status);

-- The single data owner is fixed here, rather than trusting a mutable profile
-- role supplied by a browser client.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'nevzatkyak5@gmail.com';
$$;

create or replace function public.has_tree_access(target_village_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1 from public.tree_access a
      where a.village_id = target_village_id
        and a.user_id = auth.uid()
        and a.status = 'approved'
    );
$$;

create or replace function public.can_contribute_to_tree(target_village_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1 from public.tree_access a
      where a.village_id = target_village_id
        and a.user_id = auth.uid()
        and a.status = 'approved'
        and a.role = 'contributor'
    );
$$;

create or replace function public.can_propose_tree_edit(kind text, target uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  target_village_id uuid;
begin
  if kind = 'family' then
    select village_id into target_village_id from public.families where id = target;
  elsif kind = 'person' then
    select f.village_id into target_village_id
    from public.people p join public.families f on f.id = p.family_id
    where p.id = target;
  elsif kind = 'relation' then
    select f.village_id into target_village_id
    from public.person_relations r
    join public.people p on p.id = r.person_id
    join public.families f on f.id = p.family_id
    where r.id = target;
  end if;
  return target_village_id is not null and public.can_contribute_to_tree(target_village_id);
end;
$$;

-- Keep the UI's profile badge accurate, while making role escalation from the
-- client impossible. The email identity above remains the authorization source.
update public.profiles p
set role = case when lower(u.email) = 'nevzatkyak5@gmail.com' then 'admin' else 'member' end
from auth.users u
where u.id = p.id;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), nullif(new.raw_user_meta_data->>'name', ''), new.email),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    case when lower(new.email) = 'nevzatkyak5@gmail.com' then 'admin' else 'member' end
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url,
    role = excluded.role,
    updated_at = now();
  return new;
end;
$$;

create or replace function public.lock_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.role := case when exists (
    select 1 from auth.users u
    where u.id = new.id and lower(u.email) = 'nevzatkyak5@gmail.com'
  ) then 'admin' else 'member' end;
  return new;
end;
$$;

drop trigger if exists profiles_lock_role on public.profiles;
create trigger profiles_lock_role
  before update on public.profiles
  for each row execute function public.lock_profile_role();

alter table public.tree_access enable row level security;

drop policy if exists "tree_access_select" on public.tree_access;
create policy "tree_access_select" on public.tree_access
  for select using (public.is_admin() or auth.uid() = user_id);

drop policy if exists "tree_access_request" on public.tree_access;
create policy "tree_access_request" on public.tree_access
  for insert with check (
    auth.uid() = user_id and status = 'pending' and role = 'viewer'
  );

drop policy if exists "tree_access_admin_update" on public.tree_access;
create policy "tree_access_admin_update" on public.tree_access
  for update using (public.is_admin()) with check (public.is_admin());

grant select, insert, update on public.tree_access to authenticated;

-- Genealogy rows are never public. Direct writes remain owner-only; approved
-- contributors submit edit proposals which the owner reviews in the dashboard.
drop policy if exists "families_select" on public.families;
create policy "families_select" on public.families
  for select using (deleted_at is null and public.has_tree_access(village_id));
drop policy if exists "families_insert" on public.families;
create policy "families_insert" on public.families
  for insert with check (public.is_admin());
drop policy if exists "families_update" on public.families;
create policy "families_update" on public.families
  for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "families_delete" on public.families;
create policy "families_delete" on public.families for delete using (public.is_admin());

drop policy if exists "people_select" on public.people;
create policy "people_select" on public.people
  for select using (
    deleted_at is null and exists (
      select 1 from public.families f
      where f.id = people.family_id and public.has_tree_access(f.village_id)
    )
  );
drop policy if exists "people_insert" on public.people;
create policy "people_insert" on public.people for insert with check (public.is_admin());
drop policy if exists "people_update" on public.people;
create policy "people_update" on public.people
  for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "people_delete" on public.people;
create policy "people_delete" on public.people for delete using (public.is_admin());

drop policy if exists "relations_select" on public.person_relations;
create policy "relations_select" on public.person_relations
  for select using (
    deleted_at is null and exists (
      select 1 from public.people p join public.families f on f.id = p.family_id
      where p.id = person_relations.person_id and public.has_tree_access(f.village_id)
    )
  );
drop policy if exists "relations_insert" on public.person_relations;
create policy "relations_insert" on public.person_relations for insert with check (public.is_admin());
drop policy if exists "relations_update" on public.person_relations;
create policy "relations_update" on public.person_relations
  for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "relations_delete" on public.person_relations;
create policy "relations_delete" on public.person_relations for delete using (public.is_admin());

drop policy if exists "proposals_select" on public.edit_proposals;
create policy "proposals_select" on public.edit_proposals
  for select using (public.is_admin() or auth.uid() = proposed_by);
drop policy if exists "proposals_insert" on public.edit_proposals;
create policy "proposals_insert" on public.edit_proposals
  for insert with check (
    auth.uid() = proposed_by and public.can_propose_tree_edit(target_type, target_id)
  );
drop policy if exists "proposals_update" on public.edit_proposals;
create policy "proposals_update" on public.edit_proposals
  for update using (public.is_admin()) with check (public.is_admin());

-- Existing public comment policies could reveal names and relationships.
drop policy if exists "comments_select" on public.comments;
create policy "comments_select" on public.comments
  for select using (
    deleted_at is null and (
      target_type in ('village', 'heritage')
      or (target_type = 'family' and public.can_propose_tree_edit('family', target_id))
      or (target_type = 'person' and public.can_propose_tree_edit('person', target_id))
    )
  );
drop policy if exists "comments_insert" on public.comments;
create policy "comments_insert" on public.comments
  for insert with check (
    auth.uid() = author_id and (
      target_type in ('village', 'heritage')
      or (target_type = 'family' and public.can_propose_tree_edit('family', target_id))
      or (target_type = 'person' and public.can_propose_tree_edit('person', target_id))
    )
  );

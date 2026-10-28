-- Approved contributors edit the pedigree directly from the village canvas.
--
-- 009 made every genealogy write owner-only and routed contributors through
-- edit_proposals. The family-tree canvas lets contributors add people,
-- relations and families themselves, so insert/update (and relation delete)
-- open up to `can_contribute_to_tree(village)`. Deleting people / families
-- stays owner-only; viewers remain read-only and keep the proposal flow.

create or replace function public.can_contribute_to_family(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.families f
    where f.id = target_family_id
      and f.deleted_at is null
      and public.can_contribute_to_tree(f.village_id)
  );
$$;

create or replace function public.can_contribute_to_person(target_person_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.people p
    join public.families f on f.id = p.family_id
    where p.id = target_person_id
      and public.can_contribute_to_tree(f.village_id)
  );
$$;

-- families --------------------------------------------------------------
drop policy if exists "families_insert" on public.families;
create policy "families_insert" on public.families
  for insert with check (public.can_contribute_to_tree(village_id));

drop policy if exists "families_update" on public.families;
create policy "families_update" on public.families
  for update
  using (public.can_contribute_to_tree(village_id))
  with check (public.can_contribute_to_tree(village_id));

-- people ----------------------------------------------------------------
drop policy if exists "people_insert" on public.people;
create policy "people_insert" on public.people
  for insert with check (public.can_contribute_to_family(family_id));

drop policy if exists "people_update" on public.people;
create policy "people_update" on public.people
  for update
  using (public.can_contribute_to_family(family_id))
  with check (public.can_contribute_to_family(family_id));

-- person_relations ------------------------------------------------------
-- A contributor may link people as long as they can edit the child/first
-- person's village; the validate_person_relation trigger still guards
-- cycles, self-links and duplicates.
drop policy if exists "relations_insert" on public.person_relations;
create policy "relations_insert" on public.person_relations
  for insert with check (
    public.can_contribute_to_person(person_id)
    or public.can_contribute_to_person(related_person_id)
  );

drop policy if exists "relations_delete" on public.person_relations;
create policy "relations_delete" on public.person_relations
  for delete using (
    public.can_contribute_to_person(person_id)
    or public.can_contribute_to_person(related_person_id)
  );

grant execute on function public.can_contribute_to_family(uuid) to authenticated;
grant execute on function public.can_contribute_to_person(uuid) to authenticated;

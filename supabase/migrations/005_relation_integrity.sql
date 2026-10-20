-- Keep the genealogy graph internally consistent.
-- person_relations stores only child -> parent and spouse edges. Sibling,
-- aunt/uncle and in-law labels are derived by the application.

create or replace function public.validate_person_relation()
returns trigger
language plpgsql
as $$
begin
  if new.person_id = new.related_person_id then
    raise exception 'A person cannot be related to themselves';
  end if;

  if new.relation_type = 'spouse' and exists (
    select 1
    from public.person_relations r
    where r.relation_type = 'spouse'
      and (
        (r.person_id = new.person_id and r.related_person_id = new.related_person_id)
        or (r.person_id = new.related_person_id and r.related_person_id = new.person_id)
      )
      and r.id <> coalesce(new.id, gen_random_uuid())
  ) then
    raise exception 'This spouse connection already exists';
  end if;

  if new.relation_type = 'parent' and exists (
    with recursive lineage(id) as (
      select r.related_person_id
      from public.person_relations r
      where r.person_id = new.related_person_id
        and r.relation_type = 'parent'
      union
      select r.related_person_id
      from public.person_relations r
      join lineage l on l.id = r.person_id
      where r.relation_type = 'parent'
    )
    select 1 from lineage where id = new.person_id
  ) then
    raise exception 'This parent connection would create a family-tree cycle';
  end if;

  return new;
end;
$$;

drop trigger if exists person_relations_validate on public.person_relations;
create trigger person_relations_validate
  before insert or update of person_id, related_person_id, relation_type
  on public.person_relations
  for each row execute function public.validate_person_relation();

-- Relation removal is intentionally a hard delete: the table has a unique
-- relation key, so soft-deleting would prevent a corrected relation being re-added.
drop policy if exists "relations_delete" on public.person_relations;
create policy "relations_delete" on public.person_relations
  for delete using (auth.uid() is not null);

grant delete on public.person_relations to authenticated;

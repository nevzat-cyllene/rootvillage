-- Explicit family founder (root of generation + atlas bloom).
-- Wipes people/relations/families so trees can be re-entered cleanly.
-- Villages, profiles, heritage_entries are kept.

-- 1) Wipe family graph data (order matters for FKs)
delete from public.person_relations;
delete from public.comments
  where target_type in ('family', 'person');
delete from public.edit_proposals
  where target_type in ('family', 'person', 'relation');
delete from public.people;
delete from public.families;

-- 2) Founder column
alter table public.families
  add column if not exists founder_person_id uuid;

-- Drop then re-add FK so re-runs are safe
alter table public.families
  drop constraint if exists families_founder_person_id_fkey;

alter table public.families
  add constraint families_founder_person_id_fkey
  foreign key (founder_person_id)
  references public.people (id)
  on delete set null;

create index if not exists families_founder_person_idx
  on public.families (founder_person_id)
  where founder_person_id is not null and deleted_at is null;

comment on column public.families.founder_person_id is
  'Root person for generation numbering and atlas child bloom. Usually the first person added.';

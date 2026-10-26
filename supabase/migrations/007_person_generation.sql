-- Optional manual generation override per person (1 = founding generation).
-- When null, the app derives generation from parent edges within the family.

alter table public.people
  add column if not exists generation integer;

alter table public.people
  drop constraint if exists people_generation_check;

alter table public.people
  add constraint people_generation_check
  check (generation is null or (generation >= 1 and generation <= 20));

comment on column public.people.generation is
  'Manual generation number within the family (1 = founding). Null = derived from parent links.';

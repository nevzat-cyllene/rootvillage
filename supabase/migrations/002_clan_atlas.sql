-- Clan atlas positions for 3D village map
alter table public.families
  add column if not exists map_x double precision,
  add column if not exists map_z double precision,
  add column if not exists map_seed int;

comment on column public.families.map_x is 'Atlas island X position';
comment on column public.families.map_z is 'Atlas island Z position';
comment on column public.families.map_seed is 'Procedural island silhouette seed';

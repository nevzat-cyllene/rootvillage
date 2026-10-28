-- 1) Harden is_admin: JWT email OR profiles.role = admin
--    (admin UI uses profiles.role; RLS previously only checked JWT email)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    lower(coalesce(auth.jwt() ->> 'email', '')) = 'nevzatkyak5@gmail.com'
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    );
$$;

-- 2) Optional FK so PostgREST can embed profiles from tree_access if desired.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tree_access_user_profile_fkey'
  ) then
    alter table public.tree_access
      add constraint tree_access_user_profile_fkey
      foreign key (user_id) references public.profiles (id) on delete cascade;
  end if;
end $$;

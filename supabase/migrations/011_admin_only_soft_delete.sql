-- Soft-delete (deleted_at) for families and people stays admin-only.
-- Contributors may still update other fields; delete requests go through
-- edit_proposals and are applied by an admin.

drop policy if exists "families_update" on public.families;
create policy "families_update" on public.families
  for update
  using (public.is_admin() or public.can_contribute_to_tree(village_id))
  with check (
    public.is_admin()
    or (
      public.can_contribute_to_tree(village_id)
      and deleted_at is null
    )
  );

drop policy if exists "people_update" on public.people;
create policy "people_update" on public.people
  for update
  using (public.is_admin() or public.can_contribute_to_family(family_id))
  with check (
    public.is_admin()
    or (
      public.can_contribute_to_family(family_id)
      and deleted_at is null
    )
  );

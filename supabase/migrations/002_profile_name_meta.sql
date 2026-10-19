-- Profile display name: first/last + Google picture support
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

-- Run once after schema.sql. Thereafter the approved email can use Magic Link only.
create table if not exists public.admin_allowlist (
  email text primary key check (email = lower(email)),
  role text not null default 'artist' check (role in ('artist', 'admin'))
);

alter table public.admin_allowlist enable row level security;

insert into public.admin_allowlist (email, role)
values ('kamielkhajehpour@gmail.com', 'artist')
on conflict (email) do update set role = excluded.role;

create or replace function public.assign_allowlisted_role()
returns trigger language plpgsql security definer set search_path = public
as $$
declare approved_role text;
begin
  select role into approved_role from public.admin_allowlist where email = lower(new.email);
  if approved_role is not null then
    insert into public.profiles (id, display_name) values (new.id, 'The12thHouse') on conflict (id) do nothing;
    insert into public.user_roles (user_id, role) values (new.id, approved_role) on conflict (user_id) do update set role = excluded.role;
  end if;
  return new;
end;
$$;

drop trigger if exists assign_allowlisted_role_on_signup on auth.users;
create trigger assign_allowlisted_role_on_signup
after insert on auth.users
for each row execute function public.assign_allowlisted_role();

-- If the user already exists, backfill the role now:
insert into public.profiles (id, display_name)
select id, 'The12thHouse' from auth.users where lower(email) = 'kamielkhajehpour@gmail.com'
on conflict (id) do nothing;
insert into public.user_roles (user_id, role)
select id, 'artist' from auth.users where lower(email) = 'kamielkhajehpour@gmail.com'
on conflict (user_id) do update set role = excluded.role;

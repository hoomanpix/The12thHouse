-- The12thHouse: run in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('artist', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  cover_url text,
  release_date date,
  published boolean not null default false,
  created_by uuid not null references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tracks (
  id uuid primary key default gen_random_uuid(),
  album_id uuid references public.albums(id) on delete cascade,
  title text not null,
  slug text,
  audio_url text,
  cover_url text,
  description text,
  soundcloud_url text,
  spotify_url text,
  apple_music_url text,
  youtube_url text,
  track_order integer not null default 1,
  published boolean not null default false,
  play_count bigint not null default 0,
  created_by uuid not null references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.has_role(requested_role text)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = auth.uid() and role = requested_role); $$;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.albums enable row level security;
alter table public.tracks enable row level security;

create policy "public profiles are readable" on public.profiles for select using (true);
create policy "users can edit own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "users can read own role" on public.user_roles for select using (auth.uid() = user_id);
create policy "published albums are public" on public.albums for select using (published or public.has_role('artist') or public.has_role('admin'));
create policy "artists manage albums" on public.albums for all using (public.has_role('artist') or public.has_role('admin')) with check (public.has_role('artist') or public.has_role('admin'));
create policy "published tracks are public" on public.tracks for select using (published or public.has_role('artist') or public.has_role('admin'));
create policy "artists manage tracks" on public.tracks for all using (public.has_role('artist') or public.has_role('admin')) with check (public.has_role('artist') or public.has_role('admin'));

insert into storage.buckets (id, name, public) values ('audio', 'audio', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('covers', 'covers', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('artist-assets', 'artist-assets', true) on conflict (id) do nothing;

create policy "public can read published media" on storage.objects for select using (bucket_id in ('covers', 'artist-assets') or (bucket_id = 'audio' and exists (select 1 from public.tracks where audio_url like '%' || name and published = true)));
create policy "artists upload media" on storage.objects for insert with check ((public.has_role('artist') or public.has_role('admin')) and bucket_id in ('audio', 'covers', 'artist-assets'));
create policy "artists update media" on storage.objects for update using (public.has_role('artist') or public.has_role('admin')) with check (public.has_role('artist') or public.has_role('admin'));
create policy "artists delete media" on storage.objects for delete using (public.has_role('artist') or public.has_role('admin'));

-- After creating the artist account in Authentication > Users, run:
-- insert into public.profiles (id, display_name) values ('USER_UUID', 'The12thHouse') on conflict (id) do nothing;
-- insert into public.user_roles (user_id, role) values ('USER_UUID', 'artist') on conflict (user_id) do update set role = excluded.role;

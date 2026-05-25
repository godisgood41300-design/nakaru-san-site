create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  bio text,
  avatar_url text,
  banner_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  author text,
  type text not null default 'text',
  content text,
  media_url text,
  youtube_url text,
  youtube_embed_url text,
  likes integer not null default 0,
  comments_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author text,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  author text,
  text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.dm_threads (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  title text,
  created_at timestamptz not null default now()
);

create table if not exists public.dm_thread_members (
  thread_id uuid not null references public.dm_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);

create table if not exists public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.dm_threads(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_comments enable row level security;
alter table public.room_messages enable row level security;
alter table public.dm_threads enable row level security;
alter table public.dm_thread_members enable row level security;
alter table public.dm_messages enable row level security;

drop policy if exists "profiles readable by everyone" on public.profiles;
create policy "profiles readable by everyone"
on public.profiles for select
using (true);

drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "posts readable by everyone" on public.posts;
create policy "posts readable by everyone"
on public.posts for select
using (true);

drop policy if exists "users insert own posts" on public.posts;
create policy "users insert own posts"
on public.posts for insert
with check (auth.uid() = user_id);

drop policy if exists "users update own posts" on public.posts;
create policy "users update own posts"
on public.posts for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "users delete own posts" on public.posts;
create policy "users delete own posts"
on public.posts for delete
using (auth.uid() = user_id);

drop policy if exists "comments readable by everyone" on public.post_comments;
create policy "comments readable by everyone"
on public.post_comments for select
using (true);

drop policy if exists "users insert own comments" on public.post_comments;
create policy "users insert own comments"
on public.post_comments for insert
with check (auth.uid() = user_id);

drop policy if exists "room messages readable by everyone" on public.room_messages;
create policy "room messages readable by everyone"
on public.room_messages for select
using (true);

drop policy if exists "users insert own room messages" on public.room_messages;
create policy "users insert own room messages"
on public.room_messages for insert
with check (auth.uid() = user_id and length(trim(text)) > 0);

drop policy if exists "dm threads visible to members" on public.dm_threads;
create policy "dm threads visible to members"
on public.dm_threads for select
using (
  exists (
    select 1 from public.dm_thread_members members
    where members.thread_id = dm_threads.id
    and members.user_id = auth.uid()
  )
);

drop policy if exists "authenticated users create dm threads" on public.dm_threads;
create policy "authenticated users create dm threads"
on public.dm_threads for insert
with check (auth.uid() = created_by);

drop policy if exists "dm members see own rows" on public.dm_thread_members;
create policy "dm members see own rows"
on public.dm_thread_members for select
using (auth.uid() = user_id);

drop policy if exists "authenticated users add themselves to dm threads" on public.dm_thread_members;
create policy "authenticated users add themselves to dm threads"
on public.dm_thread_members for insert
with check (auth.uid() = user_id);

drop policy if exists "dm messages visible to thread members" on public.dm_messages;
create policy "dm messages visible to thread members"
on public.dm_messages for select
using (
  exists (
    select 1 from public.dm_thread_members members
    where members.thread_id = dm_messages.thread_id
    and members.user_id = auth.uid()
  )
);

drop policy if exists "users send own dm messages" on public.dm_messages;
create policy "users send own dm messages"
on public.dm_messages for insert
with check (
  auth.uid() = sender_id
  and length(trim(text)) > 0
  and exists (
    select 1 from public.dm_thread_members members
    where members.thread_id = dm_messages.thread_id
    and members.user_id = auth.uid()
  )
);

insert into storage.buckets (id, name, public)
values ('nakaru-media', 'nakaru-media', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "nakaru media readable" on storage.objects;
create policy "nakaru media readable"
on storage.objects for select
using (bucket_id = 'nakaru-media');

drop policy if exists "users upload nakaru media" on storage.objects;
create policy "users upload nakaru media"
on storage.objects for insert
with check (bucket_id = 'nakaru-media' and auth.role() = 'authenticated');

drop policy if exists "users update own nakaru media" on storage.objects;
create policy "users update own nakaru media"
on storage.objects for update
using (bucket_id = 'nakaru-media' and auth.role() = 'authenticated')
with check (bucket_id = 'nakaru-media' and auth.role() = 'authenticated');

select pg_notify('pgrst', 'reload schema');

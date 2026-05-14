create table if not exists accounts (
  id text primary key,
  username text not null,
  email text unique not null,
  password_hash text,
  provider text,
  provider_id text,
  created_at timestamptz default now()
);

create table if not exists sessions (
  id text primary key,
  account_id text references accounts(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  display_name text,
  bio text,
  avatar_url text,
  banner_url text,
  photo text,
  banner text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles add column if not exists username text;
alter table profiles add column if not exists display_name text;
alter table profiles add column if not exists bio text;
alter table profiles add column if not exists avatar_url text;
alter table profiles add column if not exists banner_url text;
alter table profiles add column if not exists photo text;
alter table profiles add column if not exists banner text;
alter table profiles add column if not exists created_at timestamptz default now();
alter table profiles add column if not exists updated_at timestamptz default now();

create table if not exists feed_posts (
  id text primary key,
  "from" text not null,
  text text not null,
  youtube_url text,
  "youtubeUrl" text,
  image text,
  at bigint not null,
  appropriate boolean default true
);

alter table feed_posts add column if not exists youtube_url text;
alter table feed_posts add column if not exists "youtubeUrl" text;
alter table feed_posts add column if not exists image text;
alter table feed_posts add column if not exists appropriate boolean default true;

create table if not exists public_messages (
  id text primary key,
  room text not null,
  "from" text not null,
  text text not null,
  at bigint not null
);

create table if not exists direct_messages (
  id text primary key,
  thread text not null,
  "from" text not null,
  text text not null,
  at bigint not null
);

create index if not exists feed_posts_at_idx on feed_posts(at desc);
create index if not exists public_messages_room_at_idx on public_messages(room, at);
create index if not exists direct_messages_thread_at_idx on direct_messages(thread, at);
create index if not exists profiles_username_idx on profiles(username);

insert into storage.buckets (id, name, public)
values ('nakaru-uploads', 'nakaru-uploads', true)
on conflict (id) do update set public = true;

drop policy if exists "Public uploads are readable" on storage.objects;
create policy "Public uploads are readable"
on storage.objects for select
using (bucket_id = 'nakaru-uploads');

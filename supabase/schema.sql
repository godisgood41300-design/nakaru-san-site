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

alter table public.profiles add column if not exists banner_url text;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  author text,
  post_type text not null default 'text',
  content text,
  media_url text,
  youtube_url text,
  youtube_embed_url text,
  likes integer not null default 0,
  comments_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.posts add column if not exists post_type text not null default 'text';
alter table public.posts add column if not exists media_url text;
alter table public.posts add column if not exists youtube_url text;
alter table public.posts add column if not exists youtube_embed_url text;
alter table public.posts add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
    and table_name = 'posts'
    and column_name = 'type'
  ) then
    update public.posts
    set post_type = coalesce(post_type, type)
    where post_type is null;
  end if;
end $$;

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

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references auth.users(id) on delete cascade,
  recipient_id uuid references auth.users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

alter table public.direct_messages add column if not exists sender_id uuid references auth.users(id) on delete cascade;
alter table public.direct_messages add column if not exists recipient_id uuid references auth.users(id) on delete cascade;
alter table public.direct_messages add column if not exists text text;
alter table public.direct_messages add column if not exists media_url text;
alter table public.direct_messages add column if not exists media_type text;
alter table public.direct_messages add column if not exists media_name text;
alter table public.direct_messages add column if not exists created_at timestamptz not null default now();

alter table public.room_messages add column if not exists media_url text;
alter table public.room_messages add column if not exists media_type text;
alter table public.room_messages add column if not exists media_name text;

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friend_requests_not_self check (sender_id <> receiver_id),
  constraint friend_requests_unique_pair unique (sender_id, receiver_id)
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint friendships_not_self check (user_id <> friend_id),
  constraint friendships_unique_pair unique (user_id, friend_id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  participant_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.messages add column if not exists media_url text;
alter table public.messages add column if not exists media_type text;
alter table public.messages add column if not exists media_name text;

create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  caller_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid references auth.users(id) on delete set null,
  call_type text not null default 'video' check (call_type in ('audio', 'video')),
  status text not null default 'ringing' check (status in ('ringing', 'accepted', 'declined', 'ended')),
  room_id text,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists public.live_rooms (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users(id) on delete cascade,
  room_name text not null,
  room_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists public.live_room_invites (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.live_rooms(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_comments enable row level security;
alter table public.room_messages enable row level security;
alter table public.dm_threads enable row level security;
alter table public.dm_thread_members enable row level security;
alter table public.dm_messages enable row level security;
alter table public.direct_messages enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.calls enable row level security;
alter table public.live_rooms enable row level security;
alter table public.live_room_invites enable row level security;

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
with check (auth.uid() = user_id and (length(trim(text)) > 0 or media_url is not null));

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

drop policy if exists "direct messages visible to sender or recipient" on public.direct_messages;
create policy "direct messages visible to sender or recipient"
on public.direct_messages for select
using (auth.uid() = sender_id or auth.uid() = recipient_id);

drop policy if exists "users send own direct messages" on public.direct_messages;
create policy "users send own direct messages"
on public.direct_messages for insert
with check (
  auth.uid() = sender_id
  and recipient_id is not null
  and (length(trim(text)) > 0 or media_url is not null)
  and exists (
    select 1 from public.friendships friends
    where friends.user_id = sender_id
    and friends.friend_id = recipient_id
  )
);

drop policy if exists "friend requests visible to sender or receiver" on public.friend_requests;
create policy "friend requests visible to sender or receiver"
on public.friend_requests for select
using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "users create own friend requests" on public.friend_requests;
create policy "users create own friend requests"
on public.friend_requests for insert
with check (
  auth.uid() = sender_id
  and sender_id <> receiver_id
  and status = 'pending'
);

drop policy if exists "receivers update friend requests" on public.friend_requests;
create policy "receivers update friend requests"
on public.friend_requests for update
using (auth.uid() = receiver_id)
with check (auth.uid() = receiver_id);

drop policy if exists "senders retry declined friend requests" on public.friend_requests;
create policy "senders retry declined friend requests"
on public.friend_requests for update
using (auth.uid() = sender_id and status = 'declined')
with check (auth.uid() = sender_id and status = 'pending');

drop policy if exists "friendships visible to members" on public.friendships;
create policy "friendships visible to members"
on public.friendships for select
using (auth.uid() = user_id or auth.uid() = friend_id);

drop policy if exists "users create own friendships" on public.friendships;
create policy "users create own friendships"
on public.friendships for insert
with check (
  auth.uid() = user_id
  or exists (
    select 1 from public.friend_requests requests
    where requests.status = 'accepted'
    and requests.receiver_id = auth.uid()
    and (
      (requests.sender_id = user_id and requests.receiver_id = friend_id)
      or
      (requests.receiver_id = user_id and requests.sender_id = friend_id)
    )
  )
);

drop policy if exists "conversations visible to participants" on public.conversations;
create policy "conversations visible to participants"
on public.conversations for select
using (auth.uid() = any(participant_ids));

drop policy if exists "participants create conversations" on public.conversations;
create policy "participants create conversations"
on public.conversations for insert
with check (auth.uid() = any(participant_ids) and cardinality(participant_ids) >= 2);

drop policy if exists "participants update conversations" on public.conversations;
create policy "participants update conversations"
on public.conversations for update
using (auth.uid() = any(participant_ids))
with check (auth.uid() = any(participant_ids));

drop policy if exists "messages visible to sender or receiver" on public.messages;
create policy "messages visible to sender or receiver"
on public.messages for select
using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "friends send messages" on public.messages;
create policy "friends send messages"
on public.messages for insert
with check (
  auth.uid() = sender_id
  and (length(trim(body)) > 0 or media_url is not null)
  and exists (
    select 1 from public.friendships friends
    where friends.user_id = sender_id
    and friends.friend_id = receiver_id
  )
);

drop policy if exists "participants update message read state" on public.messages;
create policy "participants update message read state"
on public.messages for update
using (auth.uid() = sender_id or auth.uid() = receiver_id)
with check (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "calls visible to participants" on public.calls;
create policy "calls visible to participants"
on public.calls for select
using (auth.uid() = caller_id or auth.uid() = receiver_id);

drop policy if exists "users create own calls" on public.calls;
create policy "users create own calls"
on public.calls for insert
with check (auth.uid() = caller_id);

drop policy if exists "call participants update calls" on public.calls;
create policy "call participants update calls"
on public.calls for update
using (auth.uid() = caller_id or auth.uid() = receiver_id)
with check (auth.uid() = caller_id or auth.uid() = receiver_id);

drop policy if exists "active live rooms readable by authenticated users" on public.live_rooms;
drop policy if exists "active live rooms readable by everyone" on public.live_rooms;
create policy "active live rooms readable by everyone"
on public.live_rooms for select
using (is_active = true or auth.uid() = host_id);

drop policy if exists "users create own live rooms" on public.live_rooms;
create policy "users create own live rooms"
on public.live_rooms for insert
with check (auth.uid() = host_id);

drop policy if exists "hosts update own live rooms" on public.live_rooms;
create policy "hosts update own live rooms"
on public.live_rooms for update
using (auth.uid() = host_id)
with check (auth.uid() = host_id);

drop policy if exists "live room invites visible to sender or receiver" on public.live_room_invites;
create policy "live room invites visible to sender or receiver"
on public.live_room_invites for select
using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "users create own live room invites" on public.live_room_invites;
create policy "users create own live room invites"
on public.live_room_invites for insert
with check (auth.uid() = sender_id);

drop policy if exists "invite receivers update invites" on public.live_room_invites;
create policy "invite receivers update invites"
on public.live_room_invites for update
using (auth.uid() = receiver_id)
with check (auth.uid() = receiver_id);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
    and schemaname = 'public'
    and tablename = 'room_messages'
  ) then
    alter publication supabase_realtime add table public.room_messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
    and schemaname = 'public'
    and tablename = 'direct_messages'
  ) then
    alter publication supabase_realtime add table public.direct_messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
    and schemaname = 'public'
    and tablename = 'friend_requests'
  ) then
    alter publication supabase_realtime add table public.friend_requests;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
    and schemaname = 'public'
    and tablename = 'friendships'
  ) then
    alter publication supabase_realtime add table public.friendships;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
    and schemaname = 'public'
    and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
    and schemaname = 'public'
    and tablename = 'calls'
  ) then
    alter publication supabase_realtime add table public.calls;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
    and schemaname = 'public'
    and tablename = 'live_rooms'
  ) then
    alter publication supabase_realtime add table public.live_rooms;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
    and schemaname = 'public'
    and tablename = 'live_room_invites'
  ) then
    alter publication supabase_realtime add table public.live_room_invites;
  end if;
end $$;

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

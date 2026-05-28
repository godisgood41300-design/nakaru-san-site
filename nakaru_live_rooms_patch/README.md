# Nakaru-San Live Rooms Patch

This zip adds a working Go Live and searchable live-room system.

It includes:

- Email/password auth
- Profile editor
- Create live room
- Search live rooms
- Join a room
- Go Live button
- Camera/microphone permission request
- Local camera preview
- End Live button
- Supabase database support for live rooms

## Important

This version makes Go Live functional as a creator preview and room system. A full public livestream where other users can watch the host's real-time video requires a streaming provider later, such as LiveKit, Daily, Agora, Mux, or WebRTC signaling server.

## Supabase setup

Create `.env.local`:

```bash
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Run this in Supabase SQL Editor:

```sql
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  username text,
  bio text,
  avatar_url text,
  banner_url text,
  updated_at timestamp with time zone default now()
);

alter table profiles enable row level security;

drop policy if exists "Users can view their own profile" on profiles;
drop policy if exists "Users can insert their own profile" on profiles;
drop policy if exists "Users can update their own profile" on profiles;

create policy "Users can view their own profile"
on profiles for select
using (auth.uid() = id);

create policy "Users can insert their own profile"
on profiles for insert
with check (auth.uid() = id);

create policy "Users can update their own profile"
on profiles for update
using (auth.uid() = id);

create table if not exists live_rooms (
  id uuid primary key default gen_random_uuid(),
  host_id uuid references auth.users(id) on delete cascade,
  title text not null,
  category text default 'Anime',
  description text default '',
  is_live boolean default false,
  viewer_count integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table live_rooms enable row level security;

drop policy if exists "Anyone signed in can view live rooms" on live_rooms;
drop policy if exists "Users can create their own live rooms" on live_rooms;
drop policy if exists "Hosts can update their own live rooms" on live_rooms;
drop policy if exists "Hosts can delete their own live rooms" on live_rooms;

create policy "Anyone signed in can view live rooms"
on live_rooms for select
to authenticated
using (true);

create policy "Users can create their own live rooms"
on live_rooms for insert
to authenticated
with check (auth.uid() = host_id);

create policy "Hosts can update their own live rooms"
on live_rooms for update
to authenticated
using (auth.uid() = host_id);

create policy "Hosts can delete their own live rooms"
on live_rooms for delete
to authenticated
using (auth.uid() = host_id);
```

## How to install in your repo

Copy the `src` folder into your project and merge carefully. If you already have `App.jsx`, copy the `LiveRooms.jsx` component and import it into your existing app.

Example:

```jsx
import LiveRooms from "./components/LiveRooms.jsx";

<LiveRooms user={session.user} />
```

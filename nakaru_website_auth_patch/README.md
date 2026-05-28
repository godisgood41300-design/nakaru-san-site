# Nakaru Website Auth Patch Kit

This zip gives you a clean working React/Vite website setup with:

- Email/password sign up
- Email/password sign in
- Working sign out
- Profile page
- Profile save button that does not break typing
- Persistent auth using Supabase
- Broken social login buttons removed

## How to use

### Option A: Test as a new project

1. Unzip this folder.
2. Open the folder in VS Code or Cursor.
3. Run:

```bash
npm install
npm run dev
```

### Option B: Add to your existing GitHub repo

Copy these files/folders into your repo:

```text
src/
index.html
package.json
.env.example
```

If your repo already has some of these files, do not overwrite blindly. Compare and merge.

## Supabase setup

1. Go to Supabase.
2. Create a free project.
3. Go to Project Settings > API.
4. Copy:
   - Project URL
   - anon public key
5. Create a file named `.env.local`.
6. Add:

```bash
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Database table for profiles

In Supabase SQL Editor, run:

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

create policy "Users can view their own profile"
on profiles for select
using (auth.uid() = id);

create policy "Users can insert their own profile"
on profiles for insert
with check (auth.uid() = id);

create policy "Users can update their own profile"
on profiles for update
using (auth.uid() = id);
```

## Important

Do not use fake localStorage password storage for real users. This kit uses Supabase instead.

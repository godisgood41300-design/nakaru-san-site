alter table accounts enable row level security;
alter table profiles enable row level security;
alter table posts enable row level security;
alter table feed_posts enable row level security;
alter table public_messages enable row level security;
alter table direct_messages enable row level security;

drop policy if exists "Accounts readable" on accounts;
drop policy if exists "Accounts insertable" on accounts;
drop policy if exists "Profiles readable" on profiles;
drop policy if exists "Profiles insert own row" on profiles;
drop policy if exists "Profiles update own row" on profiles;
drop policy if exists "Posts readable" on posts;
drop policy if exists "Posts insert own row" on posts;
drop policy if exists "Posts update own row" on posts;
drop policy if exists "Feed posts readable" on feed_posts;
drop policy if exists "Feed posts insertable" on feed_posts;
drop policy if exists "Public messages readable" on public_messages;
drop policy if exists "Public messages insertable" on public_messages;
drop policy if exists "Direct messages readable" on direct_messages;
drop policy if exists "Direct messages insertable" on direct_messages;

create policy "Accounts readable"
on accounts for select
to anon, authenticated
using (true);

create policy "Accounts insertable"
on accounts for insert
to anon, authenticated
with check (true);

create policy "Profiles readable"
on profiles for select
to anon, authenticated
using (true);

create policy "Profiles insert own row"
on profiles for insert
to authenticated
with check (auth.uid() = id);

create policy "Profiles update own row"
on profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Posts readable"
on posts for select
to anon, authenticated
using (true);

create policy "Posts insert own row"
on posts for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Posts update own row"
on posts for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Feed posts readable"
on feed_posts for select
to anon, authenticated
using (appropriate = true);

create policy "Feed posts insertable"
on feed_posts for insert
to anon, authenticated
with check (true);

create policy "Public messages readable"
on public_messages for select
to anon, authenticated
using (true);

create policy "Public messages insertable"
on public_messages for insert
to anon, authenticated
with check (true);

create policy "Direct messages readable"
on direct_messages for select
to anon, authenticated
using (true);

create policy "Direct messages insertable"
on direct_messages for insert
to anon, authenticated
with check (true);

drop policy if exists "Public uploads are readable" on storage.objects;
drop policy if exists "Public uploads are insertable" on storage.objects;

create policy "Public uploads are readable"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'nakaru-uploads');

create policy "Public uploads are insertable"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'nakaru-uploads');

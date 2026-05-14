alter table accounts enable row level security;
alter table feed_posts enable row level security;
alter table public_messages enable row level security;
alter table direct_messages enable row level security;

drop policy if exists "Accounts readable" on accounts;
drop policy if exists "Accounts insertable" on accounts;
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

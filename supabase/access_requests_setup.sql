create extension if not exists pgcrypto;

create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  name text,
  mobile text,
  email text not null unique,
  designation text,
  office text,
  status text not null default 'pending',
  createdat timestamptz not null default now(),
  updatedat timestamptz not null default now()
);

alter table public.access_requests enable row level security;

grant select, insert, update, delete on public.access_requests to anon, authenticated;

drop policy if exists "Anyone can submit pending access requests" on public.access_requests;
drop policy if exists "Anyone can read access requests for client admin portal" on public.access_requests;
drop policy if exists "Anyone can update access request status for client admin portal" on public.access_requests;
drop policy if exists "Anyone can delete access requests for client admin portal" on public.access_requests;

create policy "Anyone can submit pending access requests"
on public.access_requests
for insert
to anon, authenticated
with check (status = 'pending');

create policy "Anyone can read access requests for client admin portal"
on public.access_requests
for select
to anon, authenticated
using (true);

create policy "Anyone can update access request status for client admin portal"
on public.access_requests
for update
to anon, authenticated
using (true)
with check (status in ('pending', 'approved', 'rejected'));

create policy "Anyone can delete access requests for client admin portal"
on public.access_requests
for delete
to anon, authenticated
using (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'access_requests'
  ) then
    alter publication supabase_realtime add table public.access_requests;
  end if;
end $$;

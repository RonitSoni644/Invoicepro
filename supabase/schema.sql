drop table if exists public.admin_activity_logs;
drop table if exists public.admin_login_sessions;

create table if not exists public.kv_store_efa27997 (
  key text primary key,
  value jsonb not null default '{}'::jsonb
);

alter table public.kv_store_efa27997 enable row level security;

create index if not exists kv_store_efa27997_key_prefix_idx
  on public.kv_store_efa27997 (key text_pattern_ops);

drop policy if exists "Users can read their own kv rows" on public.kv_store_efa27997;
create policy "Users can read their own kv rows"
on public.kv_store_efa27997
for select
to authenticated
using (key like ('user:' || auth.uid()::text || ':%'));

drop policy if exists "Users can insert their own kv rows" on public.kv_store_efa27997;
create policy "Users can insert their own kv rows"
on public.kv_store_efa27997
for insert
to authenticated
with check (key like ('user:' || auth.uid()::text || ':%'));

drop policy if exists "Users can update their own kv rows" on public.kv_store_efa27997;
create policy "Users can update their own kv rows"
on public.kv_store_efa27997
for update
to authenticated
using (key like ('user:' || auth.uid()::text || ':%'))
with check (key like ('user:' || auth.uid()::text || ':%'));

drop policy if exists "Users can delete their own kv rows" on public.kv_store_efa27997;
create policy "Users can delete their own kv rows"
on public.kv_store_efa27997
for delete
to authenticated
using (key like ('user:' || auth.uid()::text || ':%'));

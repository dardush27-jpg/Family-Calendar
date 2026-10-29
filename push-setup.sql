create table push_subs (
  endpoint text primary key,
  user_id uuid default auth.uid(),
  name text,
  sub jsonb not null
);
alter table push_subs enable row level security;
create policy "family" on push_subs for all to authenticated using (true) with check (true);

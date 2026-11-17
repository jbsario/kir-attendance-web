-- KIR Attendance — run once in Supabase → SQL Editor → New query → Run

create table if not exists public.employees (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.att (
  id text primary key,            -- "<YYYY-MM-DD>_<employeeId>"
  date text not null,             -- YYYY-MM-DD (Asia/Manila)
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists att_date_idx on public.att (date);

create table if not exists public.logs (
  id text primary key,
  ts bigint not null,             -- epoch ms
  rec_id text,
  data jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists logs_ts_idx on public.logs (ts);
create index if not exists logs_rec_idx on public.logs (rec_id);

create table if not exists public.config (
  id text primary key,
  data jsonb not null
);

-- Only signed-in users (accounts you create in Authentication) can read or write.
alter table public.employees enable row level security;
alter table public.att       enable row level security;
alter table public.logs      enable row level security;
alter table public.config    enable row level security;

drop policy if exists "signed in full access" on public.employees;
drop policy if exists "signed in full access" on public.att;
drop policy if exists "signed in full access" on public.config;
drop policy if exists "signed in read logs"  on public.logs;
drop policy if exists "signed in add logs"   on public.logs;

create policy "signed in full access" on public.employees for all to authenticated using (true) with check (true);
create policy "signed in full access" on public.att       for all to authenticated using (true) with check (true);
create policy "signed in full access" on public.config    for all to authenticated using (true) with check (true);
-- Logs are append-only: no edits or deletes from the app (audit trail).
create policy "signed in read logs" on public.logs for select to authenticated using (true);
create policy "signed in add logs"  on public.logs for insert to authenticated with check (true);

-- Live updates across devices
do $$ begin
  begin alter publication supabase_realtime add table public.employees; exception when others then null; end;
  begin alter publication supabase_realtime add table public.att;       exception when others then null; end;
  begin alter publication supabase_realtime add table public.logs;      exception when others then null; end;
  begin alter publication supabase_realtime add table public.config;    exception when others then null; end;
end $$;

create extension if not exists pgcrypto;

do $$
begin
  create type public.user_role as enum ('student', 'librarian', 'admin');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.desk_status as enum ('free', 'occupied', 'away', 'abandoned', 'unavailable');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.session_status as enum ('active', 'away', 'ended', 'abandoned');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role public.user_role not null default 'student',
  citizenship_score integer not null default 82 check (citizenship_score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.desks (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  floor integer not null default 1,
  zone text not null,
  x numeric(6, 2) not null,
  y numeric(6, 2) not null,
  width numeric(6, 2) not null default 7,
  height numeric(6, 2) not null default 5,
  status public.desk_status not null default 'free',
  qr_token text not null unique,
  features text[] not null default '{}',
  is_accessible boolean not null default false,
  current_session_id uuid,
  status_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  desk_id uuid not null references public.desks(id) on delete cascade,
  status public.session_status not null default 'active',
  started_at timestamptz not null default now(),
  active_expires_at timestamptz,
  away_started_at timestamptz,
  away_expires_at timestamptz,
  last_confirmed_at timestamptz not null default now(),
  ended_at timestamptz,
  release_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role text not null default 'system',
  action text not null,
  desk_id uuid references public.desks(id) on delete set null,
  session_id uuid references public.sessions(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  type text not null default 'info',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists sessions_one_live_user
  on public.sessions(user_id)
  where status in ('active', 'away');

create unique index if not exists sessions_one_live_desk
  on public.sessions(desk_id)
  where status in ('active', 'away');

create index if not exists desks_floor_zone_idx on public.desks(floor, zone);
create index if not exists desks_status_idx on public.desks(status);
create index if not exists sessions_user_status_idx on public.sessions(user_id, status);
create index if not exists sessions_desk_status_idx on public.sessions(desk_id, status);
create index if not exists audit_created_idx on public.audit_logs(created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists desks_touch_updated_at on public.desks;
create trigger desks_touch_updated_at
before update on public.desks
for each row execute function public.touch_updated_at();

drop trigger if exists sessions_touch_updated_at on public.sessions;
create trigger sessions_touch_updated_at
before update on public.sessions
for each row execute function public.touch_updated_at();

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role::text from public.profiles where id = auth.uid()
$$;

create or replace function public.check_in_desk(
  p_user_id uuid,
  p_desk_id uuid,
  p_demo boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_desk public.desks%rowtype;
  v_existing uuid;
  v_session_id uuid;
  v_session_seconds integer;
begin
  select id
    into v_existing
    from public.sessions
   where user_id = p_user_id
     and status in ('active', 'away')
   limit 1;

  if v_existing is not null then
    raise exception 'ALREADY_ACTIVE';
  end if;

  select *
    into v_desk
    from public.desks
   where id = p_desk_id
   for update;

  if not found then
    raise exception 'DESK_NOT_FOUND';
  end if;

  if v_desk.status <> 'free' then
    raise exception 'DESK_NOT_FREE';
  end if;

  v_session_seconds := case when p_demo then 60 else 7200 end;

  insert into public.sessions (
    user_id,
    desk_id,
    status,
    active_expires_at,
    last_confirmed_at
  )
  values (
    p_user_id,
    p_desk_id,
    'active',
    now() + make_interval(secs => v_session_seconds),
    now()
  )
  returning id into v_session_id;

  update public.desks
     set status = 'occupied',
         current_session_id = v_session_id,
         status_changed_at = now()
   where id = p_desk_id;

  insert into public.audit_logs (actor_id, actor_role, action, desk_id, session_id, details)
  values (p_user_id, 'student', 'desk_checked_in', p_desk_id, v_session_id, jsonb_build_object('demo_mode', p_demo));

  return v_session_id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.desks enable row level security;
alter table public.sessions enable row level security;
alter table public.audit_logs enable row level security;
alter table public.notifications enable row level security;

drop policy if exists profiles_select_own_or_staff on public.profiles;
create policy profiles_select_own_or_staff
on public.profiles for select
to authenticated
using (id = auth.uid() or public.current_profile_role() in ('librarian', 'admin'));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists desks_select_authenticated on public.desks;
create policy desks_select_authenticated
on public.desks for select
to authenticated
using (true);

drop policy if exists sessions_select_own_or_staff on public.sessions;
create policy sessions_select_own_or_staff
on public.sessions for select
to authenticated
using (user_id = auth.uid() or public.current_profile_role() in ('librarian', 'admin'));

drop policy if exists audit_select_authenticated on public.audit_logs;
create policy audit_select_authenticated
on public.audit_logs for select
to authenticated
using (true);

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own
on public.notifications for select
to authenticated
using (user_id = auth.uid());

alter table public.desks replica identity full;
alter table public.sessions replica identity full;
alter table public.audit_logs replica identity full;
alter table public.notifications replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.desks;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.sessions;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.audit_logs;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

create extension if not exists pgcrypto;

create table if not exists public.desk_qr_displays (
  id uuid primary key default gen_random_uuid(),
  desk_id uuid not null references public.desks(id) on delete cascade,
  display_public_id text unique not null,
  display_name text not null,
  is_active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.desk_qr_challenges (
  id uuid primary key default gen_random_uuid(),
  desk_id uuid not null references public.desks(id) on delete cascade,
  display_id uuid references public.desk_qr_displays(id) on delete cascade,
  token_hash text unique not null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_desk_qr_challenges_token_hash
on public.desk_qr_challenges(token_hash);

create index if not exists idx_desk_qr_challenges_expires_at
on public.desk_qr_challenges(expires_at);

create index if not exists idx_desk_qr_challenges_desk_id
on public.desk_qr_challenges(desk_id);

create index if not exists idx_desk_qr_displays_desk_id
on public.desk_qr_displays(desk_id);

drop trigger if exists desk_qr_displays_touch_updated_at on public.desk_qr_displays;
create trigger desk_qr_displays_touch_updated_at
before update on public.desk_qr_displays
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, 'Student'), '@', 1)),
    'student'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

drop policy if exists profiles_update_own on public.profiles;

create or replace function public.is_librarian()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.profiles
     where id = auth.uid()
       and role in ('librarian', 'admin')
  );
$$;

alter table public.desk_qr_displays enable row level security;
alter table public.desk_qr_challenges enable row level security;

drop policy if exists desk_qr_displays_select_librarian on public.desk_qr_displays;
create policy desk_qr_displays_select_librarian
on public.desk_qr_displays for select
to authenticated
using (public.is_librarian());

drop policy if exists desk_qr_displays_write_librarian on public.desk_qr_displays;
create policy desk_qr_displays_write_librarian
on public.desk_qr_displays for all
to authenticated
using (public.is_librarian())
with check (public.is_librarian());

create or replace function public.expire_qr_challenges()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.desk_qr_challenges
     set revoked_at = now()
   where used_at is null
     and revoked_at is null
     and expires_at < now() - interval '5 minutes';

  delete from public.desk_qr_challenges
   where created_at < now() - interval '24 hours';
end;
$$;

alter table public.desk_qr_displays replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.desk_qr_displays;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

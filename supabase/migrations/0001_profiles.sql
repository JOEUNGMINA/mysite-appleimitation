-- profiles: auth.users 1:1 확장 테이블
-- auth.users 는 Supabase 관리 영역이므로 변경하지 않는다.

create table if not exists public.profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  email                text,
  full_name            text,
  display_name         text,
  avatar_url           text,
  role                 text        not null default 'user',
  onboarding_completed boolean     not null default false,
  terms_accepted_at    timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint profiles_role_check check (role in ('user', 'admin'))
);

create index if not exists profiles_role_idx  on public.profiles (role);
create index if not exists profiles_email_idx on public.profiles (email);

-- ---------------------------------------------------------------------------
-- is_admin(): 호출자가 관리자인지 판별한다.
--
-- profiles 의 RLS 정책이 관리자 여부를 알기 위해 profiles 를 조회해야 하는데,
-- 그 조회가 다시 같은 정책을 평가하면 무한 재귀가 발생한다.
-- SECURITY DEFINER 로 RLS 를 우회해 재귀를 끊는다.
-- search_path 를 비워 스키마 하이재킹을 막고 모든 객체를 수식해 참조한다.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- 가입 시 프로필 자동 생성.
-- 구글은 메타데이터 키가 계정에 따라 name / full_name, avatar_url / picture 로
-- 갈리므로 양쪽을 모두 확인한다.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 권한 상승 차단.
-- 본인 UPDATE 정책은 role 컬럼까지 허용하므로, 정책만으로는 사용자가 스스로를
-- admin 으로 바꾸는 것을 막을 수 없다. 관리자가 아닌 호출자의 role 변경은
-- 조용히 이전 값으로 되돌린다.
--
-- 단, 검사 대상은 '최종 사용자 요청'뿐이다. auth.uid() 가 비어 있으면
-- service_role 또는 postgres 의 관리 작업이며, 이 경로까지 되돌리면
-- 최초 관리자를 아무도 만들 수 없게 된다. 해당 경로는 애초에 RLS 정책이
-- 막고 있으므로(정책은 authenticated + auth.uid() = id 를 요구한다)
-- 통과시켜도 우회 통로가 되지 않는다.
-- ---------------------------------------------------------------------------
create or replace function public.protect_role_column()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    return new;
  end if;

  if new.role is distinct from old.role and not public.is_admin() then
    new.role := old.role;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_role_column();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- INSERT/DELETE 정책은 두지 않는다.
-- 행 생성은 handle_new_user() 트리거가, 삭제는 auth.users cascade 가 담당한다.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists profiles_select_own   on public.profiles;
drop policy if exists profiles_update_own   on public.profiles;
drop policy if exists profiles_select_admin on public.profiles;
drop policy if exists profiles_update_admin on public.profiles;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy profiles_select_admin on public.profiles
  for select to authenticated
  using (public.is_admin());

create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

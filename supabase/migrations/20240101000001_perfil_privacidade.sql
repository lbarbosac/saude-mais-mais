-- Privacy settings per profile category
-- This table controls which sections of a user's profile are visible to their friends.
-- If a user sets dados_fisicos = true, their physical data is hidden from friends.
-- Reciprocally, if a user has ANY category private, they also cannot see that category in friends' profiles.

create table if not exists public.perfil_privacidade (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade unique,
  dados_fisicos boolean not null default false,
  saude_mental  boolean not null default false,
  objetivos     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- RLS
alter table public.perfil_privacidade enable row level security;

-- Users can read their own settings
create policy "own privacy read"
  on public.perfil_privacidade for select
  using (auth.uid() = user_id);

-- Users can also read privacy settings of confirmed friends
-- (needed to enforce bidirectional privacy on friend profile view)
create policy "friends privacy read"
  on public.perfil_privacidade for select
  using (
    exists (
      select 1 from public.amizades a
      where a.status = 'aceito'
        and (
          (a.user_id = auth.uid() and a.amigo_id = perfil_privacidade.user_id)
          or
          (a.amigo_id = auth.uid() and a.user_id = perfil_privacidade.user_id)
        )
    )
  );

create policy "own privacy write"
  on public.perfil_privacidade for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function public.update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger perfil_privacidade_updated_at
  before update on public.perfil_privacidade
  for each row execute function public.update_updated_at();

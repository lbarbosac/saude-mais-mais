
ALTER TABLE public.perfil_usuario
  ADD COLUMN IF NOT EXISTS profile_private boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_habits boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_progress boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_streak boolean NOT NULL DEFAULT true;

ALTER TABLE public.preferencias_usuario
  ADD COLUMN IF NOT EXISTS favoritos_exercicios text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.perfil_usuario
  ADD COLUMN IF NOT EXISTS show_dados_fisicos boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_saude_mental boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_objetivos boolean NOT NULL DEFAULT true;
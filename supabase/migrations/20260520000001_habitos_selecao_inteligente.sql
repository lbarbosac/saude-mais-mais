-- Migration: sistema de seleção inteligente de hábitos
-- Adiciona categoria e controle de quando cada hábito foi exibido pela última vez

ALTER TABLE public.habitos
  ADD COLUMN IF NOT EXISTS categoria TEXT NOT NULL DEFAULT 'geral',
  ADD COLUMN IF NOT EXISTS ultima_exibicao DATE;

-- Índice para acelerar a query de seleção inteligente
CREATE INDEX IF NOT EXISTS idx_habitos_user_categoria
  ON public.habitos(user_id, categoria, ultima_exibicao);

COMMENT ON COLUMN public.habitos.categoria IS
  'Categoria do hábito: movimento, agua_alimentacao, sono_descanso, respiracao, social_gratidao, foco_aprendizado, humor_emocao';

COMMENT ON COLUMN public.habitos.ultima_exibicao IS
  'Data da última vez que este hábito foi exibido ao usuário. NULL = nunca exibido (alta prioridade).';

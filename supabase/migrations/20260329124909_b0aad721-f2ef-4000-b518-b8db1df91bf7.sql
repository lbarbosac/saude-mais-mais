
ALTER TABLE public.perfil_usuario ADD COLUMN IF NOT EXISTS sobre_voce text DEFAULT NULL;

ALTER TABLE public.preferencias_usuario 
  ADD COLUMN IF NOT EXISTS lucas_estilo text DEFAULT 'equilibrado',
  ADD COLUMN IF NOT EXISTS lucas_profundidade text DEFAULT 'moderado',
  ADD COLUMN IF NOT EXISTS lucas_tom text DEFAULT 'acolhedor',
  ADD COLUMN IF NOT EXISTS lucas_sugestoes text DEFAULT 'moderado';

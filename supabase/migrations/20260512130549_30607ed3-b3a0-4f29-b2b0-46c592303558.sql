CREATE TABLE public.streak_restauracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  data_restaurada date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, data_restaurada)
);
ALTER TABLE public.streak_restauracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY sr_select ON public.streak_restauracoes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY sr_insert ON public.streak_restauracoes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_sr_user_created ON public.streak_restauracoes(user_id, created_at);
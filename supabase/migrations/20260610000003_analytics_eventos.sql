-- Analytics de primeira parte (first-party) — conformidade LGPD
-- Registra eventos de uso agregados SEM dados pessoais sensíveis.
-- Não há cookies de terceiros, não há rastreamento cross-site.

CREATE TABLE IF NOT EXISTS public.analytics_eventos (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_name  TEXT NOT NULL,
  properties  JSONB NOT NULL DEFAULT '{}',
  app_version TEXT NOT NULL DEFAULT '1.0.0',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Usuário pode ver seus próprios eventos (portabilidade de dados LGPD)
ALTER TABLE public.analytics_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analytics_insert_own" ON public.analytics_eventos
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "analytics_select_own" ON public.analytics_eventos
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Índices para consultas de funil de ativação/retenção
CREATE INDEX IF NOT EXISTS idx_analytics_user_event ON public.analytics_eventos(user_id, event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_event_date ON public.analytics_eventos(event_name, created_at);

COMMENT ON TABLE public.analytics_eventos IS
  'Analytics de primeira parte — eventos de uso sem dados pessoais sensíveis. Conforme LGPD: usuário pode consultar e solicitar exclusão de seus próprios registros.';

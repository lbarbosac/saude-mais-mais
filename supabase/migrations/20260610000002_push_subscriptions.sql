-- Web Push real (RFC 8030/8291) — substitui o agendamento via setTimeout no
-- cliente, que não sobrevive ao fechamento do app/aba no mobile.
-- Esta tabela guarda a inscrição PushSubscription do navegador de cada
-- usuário, junto do horário de lembrete preferido.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  endpoint      TEXT NOT NULL,
  p256dh        TEXT NOT NULL,
  auth_key      TEXT NOT NULL,
  reminder_hour SMALLINT NOT NULL DEFAULT 8 CHECK (reminder_hour >= 0 AND reminder_hour <= 23),
  timezone_offset_minutes SMALLINT NOT NULL DEFAULT 180, -- BRT = UTC-3 = 180min de offset (positivo = atrás de UTC)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_sub_select_own" ON public.push_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "push_sub_insert_own" ON public.push_subscriptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_sub_update_own" ON public.push_subscriptions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "push_sub_delete_own" ON public.push_subscriptions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_push_sub_reminder ON public.push_subscriptions(reminder_hour, timezone_offset_minutes);

COMMENT ON TABLE public.push_subscriptions IS
  'Inscrições de Web Push (RFC 8030) por usuário. Usado pela Edge Function enviar-lembretes-diarios, disparada por pg_cron, para notificar mesmo com o app fechado.';

-- ═══════════════════════════════════════════════════════════════════════════
-- AÇÃO MANUAL NECESSÁRIA (não pode ser feita via migration SQL):
--
-- 1. Gerar par de chaves VAPID:
--      npx web-push generate-vapid-keys
--
-- 2. Configurar nos Secrets do Supabase (Project Settings > Edge Functions):
--      VAPID_PUBLIC_KEY=<chave pública gerada>
--      VAPID_PRIVATE_KEY=<chave privada gerada>
--      VAPID_SUBJECT=mailto:contato@seudominio.com
--
-- 3. Configurar VITE_VAPID_PUBLIC_KEY=<mesma chave pública> no .env do frontend
--
-- 4. Agendar a Edge Function enviar-lembretes-diarios via pg_cron
--    (Database > Cron Jobs no painel, ou SQL abaixo, executar 1x por hora):
--
--    SELECT cron.schedule(
--      'enviar-lembretes-diarios',
--      '0 * * * *', -- a cada hora, no minuto 0
--      $$
--      SELECT net.http_post(
--        url := 'https://SEU-PROJETO.supabase.co/functions/v1/enviar-lembretes-diarios',
--        headers := jsonb_build_object('Authorization', 'Bearer SEU_SERVICE_ROLE_KEY', 'Content-Type', 'application/json')
--      );
--      $$
--    );
-- ═══════════════════════════════════════════════════════════════════════════

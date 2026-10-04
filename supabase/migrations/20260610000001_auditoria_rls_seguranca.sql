-- ═══════════════════════════════════════════════════════════════════════════
-- AUDITORIA DE SEGURANÇA: garante RLS em todas as tabelas sensíveis
-- Idempotente — pode ser executada quantas vezes for necessário sem efeitos
-- colaterais. Serve como blindagem contra regressões futuras (ex: alguém
-- desabilitar RLS acidentalmente em uma migration nova).
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  t TEXT;
  sensitive_tables TEXT[] := ARRAY[
    'perfil_usuario',
    'checkin_diario',
    'habitos',
    'habito_registro',
    'conversas_lucas',
    'mensagens_lucas',
    'preferencias_usuario',
    'amizades',
    'desafios',
    'presenca_online',
    'consentimento_lgpd',
    'consentimento_usuario',
    'treino_perfil',
    'treinos',
    'treino_exercicios'
  ];
BEGIN
  FOREACH t IN ARRAY sensitive_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    END IF;
  END LOOP;
END $$;

-- Garante que mensagens_lucas e conversas_lucas (dados de saúde mental — sensíveis
-- pela LGPD) tenham policy de SELECT restrita ao próprio usuário, mesmo que uma
-- migration futura tente recriar a tabela sem essa policy.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'mensagens_lucas' AND policyname = 'msg_select'
  ) THEN
    CREATE POLICY "msg_select" ON public.mensagens_lucas
      FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'conversas_lucas' AND policyname = 'conv_select'
  ) THEN
    CREATE POLICY "conv_select" ON public.conversas_lucas
      FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

-- Trava extra: ninguém deve conseguir UPDATE em mensagens_lucas (histórico de
-- conversa não deve ser editável retroativamente — só inserção/leitura/exclusão).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'mensagens_lucas' AND policyname = 'msg_no_update'
  ) THEN
    CREATE POLICY "msg_no_update" ON public.mensagens_lucas
      FOR UPDATE TO authenticated USING (false);
  END IF;
END $$;

COMMENT ON TABLE public.mensagens_lucas IS
  'Histórico de conversas com o assistente Lucas — dado sensível de saúde mental (LGPD art. 5º II). RLS restrito ao próprio usuário, sem permissão de UPDATE.';
COMMENT ON TABLE public.conversas_lucas IS
  'Metadados de conversas com o assistente Lucas — dado sensível de saúde mental (LGPD art. 5º II). RLS restrito ao próprio usuário.';

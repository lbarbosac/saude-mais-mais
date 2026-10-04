-- LGPD: armazenar consentimento explícito dos usuários
-- Os dados de consentimento são salvos nos metadados do usuário (auth.users.raw_user_meta_data)
-- mas também criamos uma tabela dedicada para auditoria

CREATE TABLE IF NOT EXISTS public.consentimento_usuario (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  versao_termos TEXT NOT NULL DEFAULT '1.0',
  aceito_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_hash       TEXT,          -- hash do IP para auditoria (não o IP real)
  user_agent    TEXT,
  UNIQUE(user_id, versao_termos)
);

ALTER TABLE public.consentimento_usuario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios_veem_proprio_consentimento"
  ON public.consentimento_usuario FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "usuarios_inserem_proprio_consentimento"
  ON public.consentimento_usuario FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.consentimento_usuario IS
  'Registro de consentimento LGPD — data, versão dos termos aceitos e metadados de auditoria.';

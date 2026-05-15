
-- Tabela de auditoria de seguranca
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  resource text NOT NULL,
  details jsonb DEFAULT '{}',
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_insert" ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "audit_select_own" ON public.audit_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_audit_user ON public.audit_log(user_id);
CREATE INDEX idx_audit_created ON public.audit_log(created_at);
CREATE INDEX idx_audit_action ON public.audit_log(action);

-- Tabela de consentimento LGPD
CREATE TABLE public.consentimento_lgpd (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tipo text NOT NULL,
  aceito boolean NOT NULL DEFAULT false,
  versao text NOT NULL DEFAULT '1.0',
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.consentimento_lgpd ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consent_insert" ON public.consentimento_lgpd FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "consent_select" ON public.consentimento_lgpd FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_consent_user ON public.consentimento_lgpd(user_id);

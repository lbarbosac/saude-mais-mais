
-- =============== STORAGE BUCKETS ===============
INSERT INTO storage.buckets (id, name, public) VALUES ('sounds', 'sounds', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) VALUES ('provas-desafios', 'provas-desafios', false)
ON CONFLICT (id) DO NOTHING;

-- Sounds: public read, authenticated write
CREATE POLICY "sounds_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'sounds');
CREATE POLICY "sounds_auth_write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'sounds');

-- Provas-desafios: only participants can read/write their challenge files (path: <desafio_id>/<user_id>-<timestamp>.ext)
CREATE POLICY "provas_select" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'provas-desafios' AND
  EXISTS (
    SELECT 1 FROM public.desafios d
    WHERE d.id::text = (storage.foldername(name))[1]
      AND (d.criador_id = auth.uid() OR d.desafiado_id = auth.uid())
  )
);
CREATE POLICY "provas_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'provas-desafios' AND
  EXISTS (
    SELECT 1 FROM public.desafios d
    WHERE d.id::text = (storage.foldername(name))[1]
      AND (d.criador_id = auth.uid() OR d.desafiado_id = auth.uid())
  )
);

-- =============== ANTI-CHEAT DESAFIOS ===============
ALTER TABLE public.desafios
  ADD COLUMN IF NOT EXISTS confirmacao_criador boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS confirmacao_desafiado boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS prova_criador_url text,
  ADD COLUMN IF NOT EXISTS prova_desafiado_url text,
  ADD COLUMN IF NOT EXISTS flag_suspeito boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS motivo_flag text;

CREATE TABLE IF NOT EXISTS public.desafio_progresso_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  desafio_id uuid NOT NULL,
  user_id uuid NOT NULL,
  progresso_anterior integer NOT NULL,
  progresso_novo integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.desafio_progresso_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dpl_select" ON public.desafio_progresso_log FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.desafios d
    WHERE d.id = desafio_id AND (d.criador_id = auth.uid() OR d.desafiado_id = auth.uid())
  )
);
CREATE POLICY "dpl_insert" ON public.desafio_progresso_log FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Trigger anti-trapaça: flag se >3 incrementos em 1 minuto
CREATE OR REPLACE FUNCTION public.detect_suspicious_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count integer;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM public.desafio_progresso_log
  WHERE desafio_id = NEW.desafio_id
    AND user_id = NEW.user_id
    AND created_at > now() - interval '1 minute';
  
  IF recent_count >= 3 THEN
    UPDATE public.desafios
    SET flag_suspeito = true,
        motivo_flag = 'Múltiplos incrementos rápidos detectados'
    WHERE id = NEW.desafio_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_detect_suspicious ON public.desafio_progresso_log;
CREATE TRIGGER trg_detect_suspicious
AFTER INSERT ON public.desafio_progresso_log
FOR EACH ROW EXECUTE FUNCTION public.detect_suspicious_progress();

-- =============== TREINOS MODULE ===============
CREATE TABLE IF NOT EXISTS public.treino_perfil (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  objetivo text NOT NULL,
  dias_semana integer NOT NULL,
  local_treino text NOT NULL,
  nivel text NOT NULL,
  grupo_foco text NOT NULL,
  cardio text NOT NULL,
  tempo_treino integer NOT NULL,
  limitacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.treino_perfil ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tp_select" ON public.treino_perfil FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "tp_insert" ON public.treino_perfil FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tp_update" ON public.treino_perfil FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.treinos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  divisao text,
  dia_semana integer,
  ordem integer DEFAULT 0,
  ativo boolean DEFAULT true,
  gerado_por_ia boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.treinos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tr_select" ON public.treinos FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "tr_insert" ON public.treinos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tr_update" ON public.treinos FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "tr_delete" ON public.treinos FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.treino_exercicios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treino_id uuid NOT NULL REFERENCES public.treinos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  nome text NOT NULL,
  series integer NOT NULL DEFAULT 3,
  repeticoes text NOT NULL DEFAULT '10-12',
  descanso_seg integer DEFAULT 60,
  observacao text,
  ordem integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.treino_exercicios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "te_select" ON public.treino_exercicios FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "te_insert" ON public.treino_exercicios FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "te_update" ON public.treino_exercicios FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "te_delete" ON public.treino_exercicios FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.treino_registro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  exercicio_id uuid REFERENCES public.treino_exercicios(id) ON DELETE SET NULL,
  exercicio_nome text NOT NULL,
  peso_kg numeric NOT NULL DEFAULT 0,
  repeticoes integer NOT NULL DEFAULT 0,
  series integer NOT NULL DEFAULT 1,
  data date NOT NULL DEFAULT CURRENT_DATE,
  observacao text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.treino_registro ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trg_select" ON public.treino_registro FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "trg_insert" ON public.treino_registro FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "trg_update" ON public.treino_registro FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "trg_delete" ON public.treino_registro FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.medidas_corporais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  data date NOT NULL DEFAULT CURRENT_DATE,
  peso numeric,
  cintura numeric,
  peito numeric,
  quadril numeric,
  gluteo numeric,
  perna_dir numeric,
  perna_esq numeric,
  pescoco numeric,
  bracos_dir numeric,
  bracos_esq numeric,
  percent_gordura numeric,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.medidas_corporais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mc_select" ON public.medidas_corporais FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "mc_insert" ON public.medidas_corporais FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mc_update" ON public.medidas_corporais FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "mc_delete" ON public.medidas_corporais FOR DELETE TO authenticated USING (auth.uid() = user_id);

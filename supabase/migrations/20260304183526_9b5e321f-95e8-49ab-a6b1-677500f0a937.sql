
-- Tabela de perfis de usuário
CREATE TABLE public.perfil_usuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nome TEXT NOT NULL DEFAULT '',
  nickname TEXT UNIQUE,
  avatar_url TEXT,
  idade INTEGER,
  peso NUMERIC(5,2),
  altura NUMERIC(4,2),
  sexo TEXT CHECK (sexo IN ('masculino', 'feminino', 'outro', 'prefiro_nao_dizer')),
  nivel_atividade TEXT CHECK (nivel_atividade IN ('sedentario', 'leve', 'moderado', 'intenso')),
  nivel_estresse TEXT CHECK (nivel_estresse IN ('baixo', 'moderado', 'alto')),
  qualidade_sono TEXT CHECK (qualidade_sono IN ('boa', 'irregular', 'ruim')),
  humor_geral TEXT CHECK (humor_geral IN ('bom', 'variavel', 'ruim')),
  rotina TEXT CHECK (rotina IN ('trabalho', 'estudo', 'ambos', 'nenhum')),
  objetivo TEXT,
  tempo_livre TEXT,
  onboarding_completo BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Check-in diário
CREATE TABLE public.checkin_diario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  humor TEXT NOT NULL,
  energia TEXT NOT NULL,
  observacao TEXT,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, data)
);

-- Hábitos do usuário
CREATE TABLE public.habitos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome_habito TEXT NOT NULL,
  descricao TEXT,
  icone TEXT DEFAULT 'check',
  ativo BOOLEAN DEFAULT true,
  gerado_por_ia BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Registro diário de conclusão de hábito
CREATE TABLE public.habito_registro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habito_id UUID REFERENCES public.habitos(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  concluido BOOLEAN DEFAULT false,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(habito_id, data)
);

-- Conversas do Amigo Lucas (cada "thread")
CREATE TABLE public.conversas_lucas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  titulo TEXT NOT NULL DEFAULT 'Nova conversa',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Mensagens dentro de cada conversa
CREATE TABLE public.mensagens_lucas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id UUID REFERENCES public.conversas_lucas(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  conteudo TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Preferências do usuário
CREATE TABLE public.preferencias_usuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  localizacao_permitida BOOLEAN DEFAULT false,
  notificacoes_ativas BOOLEAN DEFAULT true,
  tema TEXT DEFAULT 'claro',
  sons_favoritos TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Amizades
CREATE TABLE public.amizades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amigo_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceito', 'recusado')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, amigo_id)
);

-- Desafios entre amigos
CREATE TABLE public.desafios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  criador_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  desafiado_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  meta INTEGER DEFAULT 7,
  progresso_criador INTEGER DEFAULT 0,
  progresso_desafiado INTEGER DEFAULT 0,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'concluido', 'cancelado')),
  created_at TIMESTAMPTZ DEFAULT now(),
  data_fim TIMESTAMPTZ
);

-- Presença online
CREATE TABLE public.presenca_online (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  online BOOLEAN DEFAULT false,
  ultimo_acesso TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX idx_checkin_user_data ON public.checkin_diario(user_id, data);
CREATE INDEX idx_habitos_user ON public.habitos(user_id);
CREATE INDEX idx_habito_registro_user ON public.habito_registro(user_id, data);
CREATE INDEX idx_conversas_user ON public.conversas_lucas(user_id);
CREATE INDEX idx_mensagens_conversa ON public.mensagens_lucas(conversa_id);
CREATE INDEX idx_amizades_user ON public.amizades(user_id);
CREATE INDEX idx_amizades_amigo ON public.amizades(amigo_id);
CREATE INDEX idx_perfil_nickname ON public.perfil_usuario(nickname);

-- RLS
ALTER TABLE public.perfil_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_diario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habitos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habito_registro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversas_lucas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensagens_lucas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preferencias_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amizades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.desafios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presenca_online ENABLE ROW LEVEL SECURITY;

-- Perfil: ler próprio + ler amigos aceitos + ler por nickname (para buscar amigos)
CREATE POLICY "perfil_select_own" ON public.perfil_usuario FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "perfil_select_by_nickname" ON public.perfil_usuario FOR SELECT TO authenticated USING (nickname IS NOT NULL);
CREATE POLICY "perfil_insert" ON public.perfil_usuario FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "perfil_update" ON public.perfil_usuario FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Check-in
CREATE POLICY "checkin_select" ON public.checkin_diario FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "checkin_insert" ON public.checkin_diario FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "checkin_update" ON public.checkin_diario FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Hábitos
CREATE POLICY "habitos_select" ON public.habitos FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "habitos_insert" ON public.habitos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "habitos_update" ON public.habitos FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "habitos_delete" ON public.habitos FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Registro de hábitos
CREATE POLICY "hab_reg_select" ON public.habito_registro FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "hab_reg_insert" ON public.habito_registro FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "hab_reg_update" ON public.habito_registro FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Conversas Lucas
CREATE POLICY "conv_select" ON public.conversas_lucas FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "conv_insert" ON public.conversas_lucas FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "conv_update" ON public.conversas_lucas FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "conv_delete" ON public.conversas_lucas FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Mensagens Lucas
CREATE POLICY "msg_select" ON public.mensagens_lucas FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "msg_insert" ON public.mensagens_lucas FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Preferências
CREATE POLICY "pref_select" ON public.preferencias_usuario FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "pref_insert" ON public.preferencias_usuario FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pref_update" ON public.preferencias_usuario FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Amizades: ver as suas
CREATE POLICY "amiz_select" ON public.amizades FOR SELECT TO authenticated USING (auth.uid() = user_id OR auth.uid() = amigo_id);
CREATE POLICY "amiz_insert" ON public.amizades FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "amiz_update" ON public.amizades FOR UPDATE TO authenticated USING (auth.uid() = amigo_id);
CREATE POLICY "amiz_delete" ON public.amizades FOR DELETE TO authenticated USING (auth.uid() = user_id OR auth.uid() = amigo_id);

-- Desafios
CREATE POLICY "desafio_select" ON public.desafios FOR SELECT TO authenticated USING (auth.uid() = criador_id OR auth.uid() = desafiado_id);
CREATE POLICY "desafio_insert" ON public.desafios FOR INSERT TO authenticated WITH CHECK (auth.uid() = criador_id);
CREATE POLICY "desafio_update" ON public.desafios FOR UPDATE TO authenticated USING (auth.uid() = criador_id OR auth.uid() = desafiado_id);

-- Presença online
CREATE POLICY "presenca_select" ON public.presenca_online FOR SELECT TO authenticated USING (true);
CREATE POLICY "presenca_upsert" ON public.presenca_online FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "presenca_update" ON public.presenca_online FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Trigger para criar perfil + preferências automaticamente ao cadastrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.perfil_usuario (user_id, nome)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'nome', ''));
  
  INSERT INTO public.preferencias_usuario (user_id)
  VALUES (NEW.id);
  
  INSERT INTO public.presenca_online (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_perfil_updated_at BEFORE UPDATE ON public.perfil_usuario FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_conversas_updated_at BEFORE UPDATE ON public.conversas_lucas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_preferencias_updated_at BEFORE UPDATE ON public.preferencias_usuario FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Storage bucket para avatares
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

CREATE POLICY "avatar_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatar_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatar_select" ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars');
CREATE POLICY "avatar_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

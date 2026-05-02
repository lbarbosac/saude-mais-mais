import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Activity, Brain, Target, Lock, Loader2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

// Which categories exist and their column in perfil_privacidade
const PRIVACY_CATEGORIES = [
  { key: "dados_fisicos", label: "Dados Físicos", icon: Activity },
  { key: "saude_mental", label: "Saúde Mental", icon: Brain },
  { key: "objetivos", label: "Objetivos", icon: Target },
] as const;

type PrivacyKey = (typeof PRIVACY_CATEGORIES)[number]["key"];

interface PerfilData {
  nome: string;
  nickname: string;
  avatar_url: string | null;
  idade: number | null;
  peso: number | null;
  altura: number | null;
  sexo: string | null;
  nivel_atividade: string | null;
  nivel_estresse: string | null;
  qualidade_sono: string | null;
  humor_geral: string | null;
  rotina: string | null;
  objetivo: string | null;
  tempo_livre: string | null;
}

interface PrivacySettings {
  dados_fisicos: boolean; // true = private
  saude_mental: boolean;
  objetivos: boolean;
}

const defaultPrivacy: PrivacySettings = { dados_fisicos: false, saude_mental: false, objetivos: false };

// ─── FriendProfile ────────────────────────────────────────────────────────────
const FriendProfile = () => {
  const { friendId } = useParams<{ friendId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [isFriend, setIsFriend] = useState(false);
  const [friendPerfil, setFriendPerfil] = useState<PerfilData | null>(null);
  // My own privacy settings (what I share)
  const [myPrivacy, setMyPrivacy] = useState<PrivacySettings>(defaultPrivacy);
  // Friend's privacy settings (what they share)
  const [friendPrivacy, setFriendPrivacy] = useState<PrivacySettings>(defaultPrivacy);

  useEffect(() => {
    if (user && friendId) load();
  }, [user, friendId]);

  const load = async () => {
    setLoading(true);

    // Verify friendship
    const { data: friendship } = await supabase
      .from("amizades")
      .select("id")
      .eq("status", "aceito")
      .or(
        `and(user_id.eq.${user!.id},amigo_id.eq.${friendId}),and(user_id.eq.${friendId},amigo_id.eq.${user!.id})`
      )
      .maybeSingle();

    if (!friendship) {
      setIsFriend(false);
      setLoading(false);
      return;
    }
    setIsFriend(true);

    // Load friend profile + both privacy settings in parallel
    const [{ data: fp }, { data: myPr }, { data: friendPr }] = await Promise.all([
      supabase
        .from("perfil_usuario")
        .select("nome,nickname,avatar_url,idade,peso,altura,sexo,nivel_atividade,nivel_estresse,qualidade_sono,humor_geral,rotina,objetivo,tempo_livre")
        .eq("user_id", friendId!)
        .maybeSingle(),
      supabase.from("perfil_privacidade").select("dados_fisicos,saude_mental,objetivos").eq("user_id", user!.id).maybeSingle(),
      supabase.from("perfil_privacidade").select("dados_fisicos,saude_mental,objetivos").eq("user_id", friendId!).maybeSingle(),
    ]);

    setFriendPerfil(fp as PerfilData | null);
    setMyPrivacy({ ...defaultPrivacy, ...(myPr ?? {}) });
    setFriendPrivacy({ ...defaultPrivacy, ...(friendPr ?? {}) });
    setLoading(false);
  };

  // A category is visible only when BOTH sides allow it
  const canSee = (cat: PrivacyKey) => !myPrivacy[cat] && !friendPrivacy[cat];

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isFriend) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <Lock className="h-10 w-10 text-muted-foreground" />
        <p className="font-semibold text-foreground">Acesso negado</p>
        <p className="text-sm text-muted-foreground">Você precisa ser amigo desta pessoa para ver o perfil.</p>
        <button onClick={() => navigate("/amigos")} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
          Voltar
        </button>
      </div>
    );
  }

  if (!friendPerfil) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-sm text-muted-foreground">Perfil não encontrado.</p>
        <button onClick={() => navigate("/amigos")} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
          Voltar
        </button>
      </div>
    );
  }

  const InfoRow = ({ label, value }: { label: string; value: string | null | undefined }) => (
    <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground capitalize">{value || "Não informado"}</span>
    </div>
  );

  const PrivateBanner = ({ label }: { label: string }) => (
    <div className="flex items-center gap-2 rounded-xl border border-dashed border-border p-4 text-muted-foreground">
      <Lock className="h-4 w-4 shrink-0" />
      <p className="text-sm">
        {myPrivacy[label as PrivacyKey]
          ? "Você optou por não compartilhar esta seção — configure em Configurações → Privacidade."
          : "Esta pessoa deixou esta seção privada."}
      </p>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/amigos")} className="rounded-xl p-2 text-muted-foreground hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Perfil do Amigo</h1>
          <p className="text-sm text-muted-foreground">Informações compartilhadas</p>
        </div>
      </div>

      {/* Avatar card */}
      <div className="flex items-center gap-4 rounded-2xl gradient-calm p-5 text-primary-foreground">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-primary-foreground/20">
          {friendPerfil.avatar_url
            ? <img src={friendPerfil.avatar_url} alt={friendPerfil.nome} className="h-full w-full object-cover" />
            : <User className="h-8 w-8" />
          }
        </div>
        <div>
          <p className="text-lg font-bold">{friendPerfil.nome || "Usuário"}</p>
          <p className="text-sm opacity-80">{friendPerfil.nickname ? `@${friendPerfil.nickname}` : ""}</p>
        </div>
      </div>

      {/* Dados físicos */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Dados Físicos</p>
        </div>
        {canSee("dados_fisicos") ? (
          <div className="flex flex-col gap-2">
            <InfoRow label="Idade" value={friendPerfil.idade ? `${friendPerfil.idade} anos` : null} />
            <InfoRow label="Peso" value={friendPerfil.peso ? `${friendPerfil.peso} kg` : null} />
            <InfoRow label="Altura" value={friendPerfil.altura ? `${friendPerfil.altura} m` : null} />
            <InfoRow label="Sexo" value={friendPerfil.sexo} />
            <InfoRow label="Nível de atividade" value={friendPerfil.nivel_atividade} />
          </div>
        ) : (
          <PrivateBanner label="dados_fisicos" />
        )}
      </div>

      {/* Saúde mental */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-4 flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Saúde Mental</p>
        </div>
        {canSee("saude_mental") ? (
          <div className="flex flex-col gap-2">
            <InfoRow label="Nível de estresse" value={friendPerfil.nivel_estresse} />
            <InfoRow label="Qualidade do sono" value={friendPerfil.qualidade_sono} />
            <InfoRow label="Humor geral" value={friendPerfil.humor_geral} />
          </div>
        ) : (
          <PrivateBanner label="saude_mental" />
        )}
      </div>

      {/* Objetivos */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-4 flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Objetivos</p>
        </div>
        {canSee("objetivos") ? (
          <div className="flex flex-col gap-2">
            <InfoRow label="Rotina" value={friendPerfil.rotina} />
            <InfoRow label="Objetivo" value={friendPerfil.objetivo} />
            <InfoRow label="Tempo livre" value={friendPerfil.tempo_livre} />
          </div>
        ) : (
          <PrivateBanner label="objetivos" />
        )}
      </div>
    </motion.div>
  );
};

export default FriendProfile;

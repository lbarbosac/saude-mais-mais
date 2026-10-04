import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, User, Lock, Flame, CheckCircle2, Activity, Brain, Target } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import BackButton from "@/components/BackButton";

interface PublicProfile {
  user_id: string;
  nome: string;
  nickname: string | null;
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
  profile_private: boolean;
  show_habits: boolean;
  show_progress: boolean;
  show_streak: boolean;
  show_dados_fisicos: boolean;
  show_saude_mental: boolean;
  show_objetivos: boolean;
}

const FriendProfile = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [isFriend, setIsFriend] = useState(false);
  const [habitsCompleted, setHabitsCompleted] = useState(0);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && userId) load();
  }, [user, userId]);

  const load = async () => {
    setLoading(true);
    const { data: prof } = await supabase
      .from("perfil_usuario")
      .select("*")
      .eq("user_id", userId!)
      .maybeSingle();

    if (!prof) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const { data: friendship } = await supabase
      .from("amizades")
      .select("status")
      .eq("status", "aceito")
      .or(`and(user_id.eq.${user!.id},amigo_id.eq.${userId}),and(user_id.eq.${userId},amigo_id.eq.${user!.id})`)
      .maybeSingle();

    const friend = !!friendship;
    setIsFriend(friend);
    setProfile(prof as unknown as PublicProfile);

    const profR = prof as Record<string, unknown>;
    if ((!prof.profile_private || friend) && ((profR.show_progress as boolean) || (profR.show_streak as boolean))) {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data: regs } = await supabase
        .from("habito_registro")
        .select("data, concluido")
        .eq("user_id", userId!)
        .eq("concluido", true)
        .gte("data", since.toISOString().split("T")[0]);
      setHabitsCompleted((regs || []).length);

      const days = new Set((regs || []).map((r) => r.data));
      let s = 0;
      const today = new Date();
      for (let i = 0; i < 90; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        if (days.has(d.toISOString().split("T")[0])) s++;
        else break;
      }
      setStreak(s);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col gap-4">
        <BackButton to="/amigos" />
        <p className="text-center text-sm text-muted-foreground py-12">Perfil não encontrado.</p>
      </div>
    );
  }

  const isOwn = user?.id === profile.user_id;
  const isPrivate = profile.profile_private && !isFriend && !isOwn;

  const Field = ({ l, v }: { l: string; v: string | number | null }) =>
    v ? (
      <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-2.5">
        <span className="text-xs font-medium text-muted-foreground">{l}</span>
        <span className="text-sm font-medium text-foreground capitalize text-right">{v}</span>
      </div>
    ) : null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <BackButton to={isOwn ? "/configuracoes" : "/amigos"} />
        {isOwn && (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Pré-visualização
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 rounded-2xl gradient-calm p-5 text-primary-foreground">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-primary-foreground/20">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.nome} className="h-full w-full object-cover" />
          ) : (
            <User className="h-8 w-8" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-lg font-bold truncate">{profile.nome || "Usuário"}</p>
          <p className="text-sm opacity-80 truncate">{profile.nickname ? `@${profile.nickname}` : ""}</p>
        </div>
      </div>

      {isPrivate ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border p-8 text-center">
          <Lock className="h-8 w-8 text-muted-foreground" />
          <p className="font-semibold text-foreground">Perfil privado</p>
          <p className="text-sm text-muted-foreground">Apenas amigos podem ver as informações deste perfil.</p>
        </div>
      ) : (
        <>
          {(profile.show_streak || profile.show_progress) && (
            <div className="grid grid-cols-2 gap-3">
              {profile.show_streak && (
                <div className="flex flex-col gap-2 rounded-2xl bg-wellness-peach p-4">
                  <Flame className="h-5 w-5 text-foreground/70" />
                  <span className="text-lg font-bold text-foreground">{streak} dias</span>
                  <span className="text-xs text-muted-foreground">Sequência</span>
                </div>
              )}
              {profile.show_progress && (
                <div className="flex flex-col gap-2 rounded-2xl bg-wellness-mint p-4">
                  <CheckCircle2 className="h-5 w-5 text-foreground/70" />
                  <span className="text-lg font-bold text-foreground">{habitsCompleted}</span>
                  <span className="text-xs text-muted-foreground">Hábitos no mês</span>
                </div>
              )}
            </div>
          )}

          {profile.show_dados_fisicos && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Dados físicos</p>
              </div>
              <div className="flex flex-col gap-2">
                <Field l="Idade" v={profile.idade ? `${profile.idade} anos` : null} />
                <Field l="Peso" v={profile.peso ? `${profile.peso} kg` : null} />
                <Field l="Altura" v={profile.altura ? `${profile.altura} m` : null} />
                <Field l="Sexo" v={profile.sexo} />
                <Field l="Atividade física" v={profile.nivel_atividade} />
              </div>
            </div>
          )}

          {profile.show_saude_mental && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="mb-3 flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Saúde mental</p>
              </div>
              <div className="flex flex-col gap-2">
                <Field l="Estresse" v={profile.nivel_estresse} />
                <Field l="Sono" v={profile.qualidade_sono} />
                <Field l="Humor geral" v={profile.humor_geral} />
              </div>
            </div>
          )}

          {profile.show_objetivos && (profile.objetivo || profile.rotina) && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="mb-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Objetivos</p>
              </div>
              <div className="flex flex-col gap-2">
                <Field l="Rotina" v={profile.rotina} />
                {profile.objetivo && (
                  <div className="rounded-xl bg-muted px-4 py-3 flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground">Objetivo</span>
                    <span className="text-sm font-medium text-foreground break-words">{profile.objetivo}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
};

export default FriendProfile;

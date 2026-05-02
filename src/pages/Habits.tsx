import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Plus, Target, History, RefreshCw, Loader2, BookOpen, Dumbbell, Brain, Heart, Users, Moon, Droplets, Apple, Music, Eye, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const iconMap: Record<string, React.ElementType> = {
  "book-open": BookOpen,
  dumbbell: Dumbbell,
  brain: Brain,
  heart: Heart,
  users: Users,
  moon: Moon,
  droplets: Droplets,
  apple: Apple,
  music: Music,
  eye: Eye,
  check: Check,
};

interface Habito {
  id: string;
  nome_habito: string;
  descricao: string | null;
  icone: string;
  concluido_hoje: boolean;
}

const Habits = () => {
  const { user, session } = useAuth();
  const [habitos, setHabitos] = useState<Habito[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (user) loadHabitos();
  }, [user]);

  // Deterministic daily seed from date string
  const getDailyseed = (dateStr: string, userId: string): number => {
    let hash = 0;
    const seed = dateStr + userId;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  };

  // Shuffle array deterministically using a seed
  const seededShuffle = <T,>(arr: T[], seed: number): T[] => {
    const result = [...arr];
    let s = seed;
    for (let i = result.length - 1; i > 0; i--) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const j = s % (i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };

  const HABITS_PER_DAY = 6;

  const loadHabitos = async () => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];

    const { data: habitosData } = await supabase
      .from("habitos")
      .select("id, nome_habito, descricao, icone")
      .eq("ativo", true)
      .order("created_at");

    if (!habitosData || habitosData.length === 0) {
      setHabitos([]);
      setLoading(false);
      return;
    }

    // Select a rotating subset of habits for today
    const dailySeed = getDailyseed(today, user!.id);
    const shuffled = seededShuffle(habitosData, dailySeed);
    const todayHabits = shuffled.slice(0, Math.min(HABITS_PER_DAY, shuffled.length));

    const { data: registros } = await supabase
      .from("habito_registro")
      .select("habito_id, concluido")
      .eq("data", today);

    const registroMap = new Map((registros || []).map((r) => [r.habito_id, r.concluido]));

    setHabitos(
      todayHabits.map((h) => ({
        ...h,
        concluido_hoje: registroMap.get(h.id) || false,
      }))
    );
    setLoading(false);
  };

  const toggleHabito = async (habito: Habito) => {
    const today = new Date().toISOString().split("T")[0];
    const newState = !habito.concluido_hoje;

    setHabitos((prev) => prev.map((h) => (h.id === habito.id ? { ...h, concluido_hoje: newState } : h)));

    const { data: existing } = await supabase
      .from("habito_registro")
      .select("id")
      .eq("habito_id", habito.id)
      .eq("data", today)
      .maybeSingle();

    if (existing) {
      await supabase.from("habito_registro").update({ concluido: newState }).eq("id", existing.id);
    } else {
      await supabase.from("habito_registro").insert({
        habito_id: habito.id,
        user_id: user!.id,
        concluido: newState,
        data: today,
      });
    }
  };

  const gerarHabitos = async () => {
    setGenerating(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gerar-habitos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({}),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);

      toast({ title: "Habitos gerados!", description: "Seus habitos personalizados foram criados." });
      loadHabitos();
    } catch (e: any) {
      toast({ title: "Erro ao gerar habitos", description: e.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  const completed = habitos.filter((h) => h.concluido_hoje).length;
  const progress = habitos.length > 0 ? (completed / habitos.length) * 100 : 0;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meus Habitos</h1>
          <p className="text-sm text-muted-foreground">Construa sua rotina ideal</p>
        </div>
        <button
          onClick={gerarHabitos}
          disabled={generating}
          className="flex h-10 items-center gap-2 rounded-xl bg-primary px-3 text-sm font-medium text-primary-foreground shadow-soft disabled:opacity-50"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {generating ? "Gerando..." : "Gerar com IA"}
        </button>
      </div>

      {habitos.length > 0 && (
        <div className="rounded-2xl gradient-nature p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-secondary-foreground" />
              <span className="text-sm font-semibold text-secondary-foreground">Progresso de hoje</span>
            </div>
            <span className="text-sm font-bold text-secondary-foreground">{completed}/{habitos.length}</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary-foreground/10">
            <motion.div className="h-full rounded-full bg-secondary-foreground/40" animate={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {habitos.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-border p-8 text-center">
          <Target className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="font-semibold text-foreground">Nenhum habito ainda</p>
            <p className="text-sm text-muted-foreground">Clique em "Gerar com IA" para criar habitos personalizados baseados no seu perfil</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {habitos.map((habito, i) => {
            const IconComp = iconMap[habito.icone] || Check;
            return (
              <motion.button
                key={habito.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => toggleHabito(habito)}
                className={`flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all ${
                  habito.concluido_hoje ? "border-primary/20 bg-primary/5" : "border-border bg-card hover:border-primary/30"
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${habito.concluido_hoje ? "bg-primary/10" : "bg-muted"}`}>
                  <IconComp className={`h-5 w-5 ${habito.concluido_hoje ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1">
                  <p className={`font-medium ${habito.concluido_hoje ? "text-muted-foreground line-through" : "text-foreground"}`}>
                    {habito.nome_habito}
                  </p>
                  {habito.descricao && <p className="text-xs text-muted-foreground">{habito.descricao}</p>}
                </div>
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg border-2 transition-colors ${
                  habito.concluido_hoje ? "border-primary bg-primary text-primary-foreground" : "border-border"
                }`}>
                  {habito.concluido_hoje && <CheckCircle2 className="h-4 w-4" />}
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default Habits;

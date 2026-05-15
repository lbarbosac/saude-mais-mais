import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2, Target, RefreshCw, Loader2,
  BookOpen, Dumbbell, Brain, Heart, Users, Moon,
  Droplets, Apple, Music, Eye, Check,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { callEdgeFunction } from "@/lib/supabase/functions";
import { getDailySeed, seededShuffle, todayISO } from "@/lib/utils/date";
import { toast } from "@/hooks/use-toast";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface HabitoRaw {
  id: string;
  nome_habito: string;
  descricao: string | null;
  icone: string;
}

interface Habito extends HabitoRaw {
  concluido_hoje: boolean;
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const HABITS_PER_DAY = 6;

const ICON_MAP: Record<string, React.ElementType> = {
  "book-open": BookOpen,
  dumbbell:    Dumbbell,
  brain:       Brain,
  heart:       Heart,
  users:       Users,
  moon:        Moon,
  droplets:    Droplets,
  apple:       Apple,
  music:       Music,
  eye:         Eye,
  check:       Check,
};

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchHabitos(userId: string): Promise<Habito[]> {
  const today = todayISO();

  const [habitosResult, registrosResult] = await Promise.all([
    supabase
      .from("habitos")
      .select("id, nome_habito, descricao, icone")
      .eq("ativo", true)
      .order("created_at"),
    supabase
      .from("habito_registro")
      .select("habito_id, concluido")
      .eq("data", today),
  ]);

  const allHabitos: HabitoRaw[] = habitosResult.data ?? [];
  if (allHabitos.length === 0) return [];

  const seed = getDailySeed(today, userId);
  const todayHabitos = seededShuffle(allHabitos, seed).slice(0, HABITS_PER_DAY);

  const registroMap = new Map(
    (registrosResult.data ?? []).map((r) => [r.habito_id, r.concluido])
  );

  return todayHabitos.map((h) => ({
    ...h,
    concluido_hoje: registroMap.get(h.id) ?? false,
  }));
}

async function toggleHabitoStatus(habito: Habito, userId: string): Promise<void> {
  const today = todayISO();
  const newState = !habito.concluido_hoje;

  const { data: existing } = await supabase
    .from("habito_registro")
    .select("id")
    .eq("habito_id", habito.id)
    .eq("data", today)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("habito_registro")
      .update({ concluido: newState })
      .eq("id", existing.id);
  } else {
    await supabase.from("habito_registro").insert({
      habito_id: habito.id,
      user_id: userId,
      concluido: newState,
      data: today,
    });
  }
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function HabitsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["habitos", user?.id];

  const { data: habitos = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchHabitos(user!.id),
    enabled: !!user,
  });

  const toggleMutation = useMutation({
    mutationFn: (habito: Habito) => toggleHabitoStatus(habito, user!.id),
    onMutate: async (habito) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey });
      const snapshot = queryClient.getQueryData<Habito[]>(queryKey);
      queryClient.setQueryData<Habito[]>(queryKey, (prev = []) =>
        prev.map((h) =>
          h.id === habito.id ? { ...h, concluido_hoje: !h.concluido_hoje } : h
        )
      );
      return { snapshot };
    },
    onError: (_err, _habito, ctx) => {
      // Reverte em caso de erro
      queryClient.setQueryData(queryKey, ctx?.snapshot);
      toast({ title: "Erro ao atualizar hábito", variant: "destructive" });
    },
  });

  const generateMutation = useMutation({
    mutationFn: () => callEdgeFunction("gerar-habitos"),
    onSuccess: () => {
      toast({ title: "Hábitos gerados!", description: "Seus hábitos personalizados foram criados." });
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao gerar hábitos", description: err.message, variant: "destructive" });
    },
  });

  const { completed, progress } = useMemo(() => {
    const done = habitos.filter((h) => h.concluido_hoje).length;
    return {
      completed: done,
      progress: habitos.length > 0 ? (done / habitos.length) * 100 : 0,
    };
  }, [habitos]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meus Hábitos</h1>
          <p className="text-sm text-muted-foreground">Construa sua rotina ideal</p>
        </div>
        <button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="flex h-10 items-center gap-2 rounded-xl bg-primary px-3 text-sm font-medium text-primary-foreground shadow-soft disabled:opacity-50"
        >
          {generateMutation.isPending
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <RefreshCw className="h-4 w-4" />}
          {generateMutation.isPending ? "Gerando..." : "Gerar com IA"}
        </button>
      </div>

      {/* Barra de progresso */}
      {habitos.length > 0 && (
        <div className="rounded-2xl gradient-nature p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-secondary-foreground" aria-hidden />
              <span className="text-sm font-semibold text-secondary-foreground">Progresso de hoje</span>
            </div>
            <span className="text-sm font-bold text-secondary-foreground">
              {completed}/{habitos.length}
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary-foreground/10">
            <motion.div
              className="h-full rounded-full bg-secondary-foreground/40"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>
      )}

      {/* Lista de hábitos */}
      {habitos.length === 0 ? (
        <EmptyState onGenerate={() => generateMutation.mutate()} />
      ) : (
        <div className="flex flex-col gap-3">
          {habitos.map((habito, i) => (
            <HabitoCard
              key={habito.id}
              habito={habito}
              index={i}
              onToggle={() => toggleMutation.mutate(habito)}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function HabitoCard({
  habito,
  index,
  onToggle,
}: {
  habito: Habito;
  index: number;
  onToggle: () => void;
}) {
  const Icon = ICON_MAP[habito.icone] ?? Check;
  const done = habito.concluido_hoje;

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      onClick={onToggle}
      aria-pressed={done}
      aria-label={`${done ? "Desmarcar" : "Marcar"} hábito: ${habito.nome_habito}`}
      className={[
        "flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all",
        done ? "border-primary/20 bg-primary/5" : "border-border bg-card hover:border-primary/30",
      ].join(" ")}
    >
      <div className={["flex h-10 w-10 items-center justify-center rounded-xl", done ? "bg-primary/10" : "bg-muted"].join(" ")}>
        <Icon className={["h-5 w-5", done ? "text-primary" : "text-muted-foreground"].join(" ")} aria-hidden />
      </div>
      <div className="flex-1">
        <p className={["font-medium", done ? "text-muted-foreground line-through" : "text-foreground"].join(" ")}>
          {habito.nome_habito}
        </p>
        {habito.descricao && (
          <p className="text-xs text-muted-foreground">{habito.descricao}</p>
        )}
      </div>
      <div className={[
        "flex h-7 w-7 items-center justify-center rounded-lg border-2 transition-colors",
        done ? "border-primary bg-primary text-primary-foreground" : "border-border",
      ].join(" ")}>
        {done && <CheckCircle2 className="h-4 w-4" aria-hidden />}
      </div>
    </motion.button>
  );
}

function EmptyState({ onGenerate }: { onGenerate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-border p-8 text-center">
      <Target className="h-8 w-8 text-muted-foreground" aria-hidden />
      <div>
        <p className="font-semibold text-foreground">Nenhum hábito ainda</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Clique em "Gerar com IA" para criar hábitos personalizados baseados no seu perfil.
        </p>
      </div>
      <button
        onClick={onGenerate}
        className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
      >
        Gerar com IA
      </button>
    </div>
  );
}

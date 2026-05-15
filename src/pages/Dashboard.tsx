import { useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Sun, Zap, CheckCircle2, Sparkles, TrendingUp, Smile, Meh, Frown } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getDailySeed, seededShuffle, todayISO, getTimeGreeting } from "@/lib/utils/date";

// ─── Tipos ───────────────────────────────────────────────────────────────────

type MoodValue = "bom" | "normal" | "baixo";
type EnergyValue = "baixa" | "media" | "alta";

interface CheckinData {
  humor: MoodValue | null;
  energia: EnergyValue | null;
}

interface DashboardData {
  nome: string;
  checkin: CheckinData;
  habitos: Array<{ id: string; nome_habito: string; done: boolean }>;
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const HABITS_PER_DAY = 6;

const MOODS = [
  { icon: Smile, label: "Alto",   value: "bom"    as MoodValue },
  { icon: Meh,   label: "Normal", value: "normal" as MoodValue },
  { icon: Frown, label: "Baixo",  value: "baixo"  as MoodValue },
];

const ENERGY_LEVELS = [
  { label: "Baixa", value: "baixa" as EnergyValue },
  { label: "Média", value: "media" as EnergyValue },
  { label: "Alta",  value: "alta"  as EnergyValue },
];

const SUGGESTIONS = [
  "Que tal uma pausa de 5 minutos para respirar fundo?",
  "Ouvir sons da natureza pode ajudar na concentração.",
  "Beba um copo de água agora. Seu corpo agradece.",
  "Alongue-se por 2 minutos. Pequenas pausas fazem diferença.",
];

// ─── Fetcher ──────────────────────────────────────────────────────────────────

async function fetchDashboardData(userId: string): Promise<DashboardData> {
  const today = todayISO();

  const [perfilResult, checkinResult, habitosResult, registrosResult] = await Promise.all([
    supabase.from("perfil_usuario").select("nome").eq("user_id", userId).single(),
    supabase.from("checkin_diario").select("humor, energia").eq("user_id", userId).eq("data", today).maybeSingle(),
    supabase.from("habitos").select("id, nome_habito").eq("ativo", true).order("created_at"),
    supabase.from("habito_registro").select("habito_id, concluido").eq("data", today),
  ]);

  const allHabitos = habitosResult.data ?? [];
  const seed = getDailySeed(today, userId);
  const todayHabitos = seededShuffle(allHabitos, seed).slice(0, HABITS_PER_DAY);
  const regMap = new Map((registrosResult.data ?? []).map((r) => [r.habito_id, r.concluido]));

  return {
    nome: perfilResult.data?.nome ?? "",
    checkin: {
      humor: (checkinResult.data?.humor as MoodValue) ?? null,
      energia: (checkinResult.data?.energia as EnergyValue) ?? null,
    },
    habitos: todayHabitos.map((h) => ({ ...h, done: regMap.get(h.id) ?? false })),
  };
}

// ─── Componente ───────────────────────────────────────────────────────────────

const STAGGER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const ITEM = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["dashboard", user?.id];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchDashboardData(user!.id),
    enabled: !!user,
  });

  // Sugestão estável: calculada uma vez por render (sem Math.random no JSX)
  const suggestionIndex = useRef(Math.floor(Math.random() * SUGGESTIONS.length));
  const suggestion = SUGGESTIONS[suggestionIndex.current];

  const checkinMutation = useMutation({
    mutationFn: async ({ humor, energia }: { humor: MoodValue; energia: EnergyValue }) => {
      const today = todayISO();
      const { data: existing } = await supabase
        .from("checkin_diario")
        .select("id")
        .eq("user_id", user!.id)
        .eq("data", today)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("checkin_diario")
          .update({ humor, energia })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("checkin_diario")
          .insert({ user_id: user!.id, humor, energia, data: today });
      }
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });
      const snapshot = queryClient.getQueryData<DashboardData>(queryKey);
      queryClient.setQueryData<DashboardData>(queryKey, (prev) =>
        prev ? { ...prev, checkin: { humor: variables.humor, energia: variables.energia } } : prev
      );
      return { snapshot };
    },
    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(queryKey, ctx?.snapshot);
    },
  });

  const { mood, energy, habitos, completed, progress } = useMemo(() => {
    const h = data?.habitos ?? [];
    const done = h.filter((x) => x.done).length;
    return {
      mood:      data?.checkin.humor ?? null,
      energy:    data?.checkin.energia ?? null,
      habitos:   h,
      completed: done,
      progress:  h.length > 0 ? (done / h.length) * 100 : 0,
    };
  }, [data]);

  function handleMoodSelect(value: MoodValue) {
    checkinMutation.mutate({ humor: value, energia: energy ?? "media" });
  }

  function handleEnergySelect(value: EnergyValue) {
    checkinMutation.mutate({ humor: mood ?? "normal", energia: value });
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const firstName = data?.nome?.split(" ")[0] ?? "";

  return (
    <motion.div variants={STAGGER} initial="hidden" animate="show" className="flex flex-col gap-6">
      {/* Saudação */}
      <motion.div variants={ITEM}>
        <div className="flex items-center gap-2">
          <Sun className="h-5 w-5 text-primary" aria-hidden />
          <p className="text-muted-foreground">{getTimeGreeting()}!</p>
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          {firstName ? `Olá, ${firstName}` : "Como você está hoje?"}
        </h1>
      </motion.div>

      {/* Check-in de humor */}
      <motion.div variants={ITEM} className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <p className="mb-3 text-sm font-semibold text-foreground">Check-in de humor</p>
        <div className="flex gap-3">
          {MOODS.map(({ icon: Icon, label, value }) => {
            const active = mood === value;
            return (
              <button
                key={value}
                onClick={() => handleMoodSelect(value)}
                aria-pressed={active}
                aria-label={`Humor: ${label}`}
                className={[
                  "flex flex-1 flex-col items-center gap-1.5 rounded-xl py-3 text-sm transition-all",
                  active ? "bg-primary/10 ring-2 ring-primary" : "bg-muted hover:bg-muted/80",
                ].join(" ")}
              >
                <Icon className={["h-6 w-6", active ? "text-primary" : "text-muted-foreground"].join(" ")} aria-hidden />
                <span className="font-medium">{label}</span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Nível de energia */}
      <motion.div variants={ITEM} className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" aria-hidden />
          <p className="text-sm font-semibold text-foreground">Nível de energia</p>
        </div>
        <div className="flex gap-3">
          {ENERGY_LEVELS.map(({ label, value }) => {
            const active = energy === value;
            return (
              <button
                key={value}
                onClick={() => handleEnergySelect(value)}
                aria-pressed={active}
                aria-label={`Energia: ${label}`}
                className={[
                  "flex-1 rounded-xl py-2.5 text-sm font-medium transition-all",
                  active ? "gradient-nature text-secondary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80",
                ].join(" ")}
              >
                {label}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Hábitos do dia */}
      {habitos.length > 0 && (
        <motion.div variants={ITEM} className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
              <p className="text-sm font-semibold text-foreground">Hábitos de hoje</p>
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {completed}/{habitos.length}
            </span>
          </div>
          <div className="mb-3 mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full gradient-calm"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <div className="flex flex-col gap-2">
            {habitos.map((h) => (
              <div
                key={h.id}
                className={[
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm",
                  h.done ? "bg-secondary/40 text-muted-foreground line-through" : "bg-muted text-foreground",
                ].join(" ")}
              >
                <div className={[
                  "flex h-5 w-5 items-center justify-center rounded-md border-2",
                  h.done ? "border-primary bg-primary text-primary-foreground" : "border-border",
                ].join(" ")}>
                  {h.done && <CheckCircle2 className="h-3 w-3" aria-hidden />}
                </div>
                {h.nome_habito}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Sugestão do Lucas */}
      <motion.div variants={ITEM} className="rounded-2xl gradient-calm p-5 shadow-soft">
        <div className="mb-3 flex items-center gap-2 text-primary-foreground">
          <Sparkles className="h-4 w-4" aria-hidden />
          <p className="text-sm font-semibold">Sugestão do Lucas</p>
        </div>
        <p className="text-sm leading-relaxed text-primary-foreground/90">{suggestion}</p>
      </motion.div>

      {/* Resumo semanal */}
      <motion.div variants={ITEM} className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" aria-hidden />
          <p className="text-sm font-semibold text-foreground">Resumo do dia</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Hábitos",  value: String(completed), color: "bg-wellness-mint" },
            { label: "Humor",    value: mood === "bom" ? "Alto" : mood === "baixo" ? "Baixo" : "Normal", color: "bg-wellness-peach" },
            { label: "Energia",  value: energy ?? "—", color: "bg-wellness-lavender" },
          ].map(({ label, value, color }) => (
            <div key={label} className={`flex flex-col items-center gap-1 rounded-xl ${color} p-3`}>
              <span className="text-lg font-bold capitalize text-foreground">{value}</span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

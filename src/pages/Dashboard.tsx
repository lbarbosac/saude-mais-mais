import { useMemo } from "react";
import { motion } from "framer-motion";
import { Sun, Zap, CheckCircle2, Sparkles, TrendingUp, Smile, Meh, Frown } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { todayISO, getTimeGreeting, getDailySeed } from "@/lib/utils/date";
import { track } from "@/lib/analytics";
import { useHabitosDoDia } from "@/hooks/useHabitosDoDia";

// ─── Tipos ───────────────────────────────────────────────────────────────────

type MoodValue = "bom" | "normal" | "baixo";
type EnergyValue = "baixa" | "media" | "alta";

interface CheckinData {
  humor: MoodValue | null;
  energia: EnergyValue | null;
}

// ─── Constantes ──────────────────────────────────────────────────────────────

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

// ─── Fetcher (apenas check-in — hábitos vêm do hook compartilhado) ────────────

async function fetchCheckin(userId: string, today: string): Promise<{ nome: string; checkin: CheckinData }> {
  const [perfilResult, checkinResult] = await Promise.all([
    supabase.from("perfil_usuario").select("nome").eq("user_id", userId).single(),
    supabase.from("checkin_diario").select("humor, energia").eq("user_id", userId).eq("data", today).maybeSingle(),
  ]);

  return {
    nome: perfilResult.data?.nome ?? "",
    checkin: {
      humor: (checkinResult.data?.humor as MoodValue) ?? null,
      energia: (checkinResult.data?.energia as EnergyValue) ?? null,
    },
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
  const today = todayISO();
  const queryKey = ["dashboard-checkin", user?.id, today];

  // Hábitos do dia: MESMO hook e MESMA queryKey usados na página de Hábitos.
  // Isso elimina a divergência onde Dashboard e Habits calculavam pesos
  // diferentes (vezes_concluido/vezes_exibido hardcoded em 0 vs valores reais)
  // e podiam selecionar conjuntos de 6 hábitos diferentes no mesmo dia.
  const { habitos: habitosSelecionados, isLoading: habitosLoading, toggleMutation } = useHabitosDoDia(user?.id);

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchCheckin(user!.id, today),
    enabled: !!user,
  });

  // Sugestão determinística por dia — mesma lógica de seed usada nos hábitos.
  // Antes usava Math.random() em useRef, que mudava a cada remontagem do
  // componente (troca de tema, navegação) sem motivo aparente para o usuário.
  const suggestion = useMemo(() => {
    if (!user) return SUGGESTIONS[0];
    const seed = getDailySeed(today, user.id);
    return SUGGESTIONS[seed % SUGGESTIONS.length];
  }, [user, today]);

  const checkinMutation = useMutation({
    mutationFn: async ({ humor, energia }: { humor: MoodValue | null; energia: EnergyValue | null }) => {
      const fieldsToSave = Object.fromEntries(
        Object.entries({ humor, energia }).filter(([, v]) => v !== null)
      );

      // Guarda contra update vazio: se nada para salvar, não chama o Supabase
      if (Object.keys(fieldsToSave).length === 0) return;

      const { data: existing } = await supabase
        .from("checkin_diario")
        .select("id")
        .eq("user_id", user!.id)
        .eq("data", today)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("checkin_diario")
          .update(fieldsToSave)
          .eq("id", existing.id);
      } else {
        await supabase
          .from("checkin_diario")
          .insert({ user_id: user!.id, data: today, ...fieldsToSave });
      }
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });
      const snapshot = queryClient.getQueryData<{ nome: string; checkin: CheckinData }>(queryKey);
      queryClient.setQueryData<{ nome: string; checkin: CheckinData }>(queryKey, (prev) =>
        prev ? { ...prev, checkin: { humor: variables.humor, energia: variables.energia } } : prev
      );
      return { snapshot };
    },
    onSuccess: () => { track("checkin_saved"); },
    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(queryKey, ctx?.snapshot);
    },
  });

  const mood = data?.checkin.humor ?? null;
  const energy = data?.checkin.energia ?? null;

  const { completed, progress } = useMemo(() => {
    const done = habitosSelecionados.filter((h) => h.concluido_hoje).length;
    return {
      completed: done,
      progress: habitosSelecionados.length > 0 ? (done / habitosSelecionados.length) * 100 : 0,
    };
  }, [habitosSelecionados]);

  function handleMoodSelect(value: MoodValue) {
    checkinMutation.mutate({ humor: value, energia: energy });
  }

  function handleEnergySelect(value: EnergyValue) {
    checkinMutation.mutate({ humor: mood, energia: value });
  }

  if (isLoading || habitosLoading) {
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

      {/* Hábitos do dia — exatamente os mesmos da página Hábitos */}
      {habitosSelecionados.length > 0 && (
        <motion.div variants={ITEM} className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
              <p className="text-sm font-semibold text-foreground">Hábitos de hoje</p>
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {completed}/{habitosSelecionados.length}
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
            {habitosSelecionados.map((h) => (
              <button
                key={h.id}
                onClick={() => toggleMutation.mutate(h)}
                aria-pressed={h.concluido_hoje}
                aria-label={`${h.concluido_hoje ? "Desmarcar" : "Marcar como concluído"}: ${h.nome_habito}`}
                className={[
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition-colors",
                  h.concluido_hoje ? "bg-secondary/40 text-muted-foreground line-through" : "bg-muted text-foreground hover:bg-muted/80",
                ].join(" ")}
              >
                <div className={[
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2",
                  h.concluido_hoje ? "border-primary bg-primary text-primary-foreground" : "border-border",
                ].join(" ")}>
                  {h.concluido_hoje && <CheckCircle2 className="h-3 w-3" aria-hidden />}
                </div>
                {h.nome_habito}
              </button>
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

      {/* Resumo do dia */}
      <motion.div variants={ITEM} className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" aria-hidden />
          <p className="text-sm font-semibold text-foreground">Resumo do dia</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Hábitos",  value: String(completed), color: "bg-emerald-100 dark:bg-emerald-950/50",  textVal: "text-emerald-900 dark:text-emerald-100", textLabel: "text-emerald-700 dark:text-emerald-400" },
            { label: "Humor",    value: mood === "bom" ? "Alto" : mood === "baixo" ? "Baixo" : "Normal", color: "bg-orange-100 dark:bg-orange-950/50", textVal: "text-orange-900 dark:text-orange-100", textLabel: "text-orange-700 dark:text-orange-400" },
            { label: "Energia",  value: energy ?? "—", color: "bg-violet-100 dark:bg-violet-950/50", textVal: "text-violet-900 dark:text-violet-100", textLabel: "text-violet-700 dark:text-violet-400" },
          ].map(({ label, value, color, textVal, textLabel }) => (
            <div key={label} className={`flex flex-col items-center gap-1 rounded-xl ${color} p-3`}>
              <span className={`text-lg font-bold capitalize ${textVal}`}>{value}</span>
              <span className={`text-xs font-medium ${textLabel}`}>{label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

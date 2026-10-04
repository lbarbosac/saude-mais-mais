import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Flame, Loader2, CheckCircle2, Smile, Meh, Frown, Sparkles, Shield, Loader } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { supabase } from "@/lib/supabase/client";
import { getDailySeed, seededShuffle } from "@/lib/utils/date";
import { useAuth } from "@/contexts/AuthContext";

const HABITS_PER_DAY = 6;

const moodToValue: Record<string, number> = { bom: 3, normal: 2, baixo: 1 };
const valueToMood: Record<number, { label: string; icon: React.ElementType }> = {
  3: { label: "Bem", icon: Smile },
  2: { label: "Normal", icon: Meh },
  1: { label: "Baixo", icon: Frown },
  0: { label: "Sem registro", icon: Meh },
};

type FilterType = "semana" | "mes" | "tudo";

const CustomMoodTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value?: number; payload?: { date?: string } }> }) => {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value ?? 0;
  const mood = valueToMood[value] ?? valueToMood[0];
  const IconComp = mood.icon;
  const date = payload[0]?.payload?.date ?? "";
  return (
    <div className="rounded-xl border border-border bg-card/95 px-3 py-2 shadow-elevated backdrop-blur text-xs">
      <p className="text-muted-foreground mb-1">{date}</p>
      <div className="flex items-center gap-1.5">
        <IconComp className="h-4 w-4 text-primary" />
        <span className="font-semibold text-foreground">Você estava: {mood.label}</span>
      </div>
    </div>
  );
};

const CustomHabitTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value?: number; payload?: { date?: string; target?: number } }> }) => {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value ?? 0;
  const target = payload[0]?.payload?.target ?? HABITS_PER_DAY;
  const date = payload[0]?.payload?.date ?? "";
  return (
    <div className="rounded-xl border border-border bg-card/95 px-3 py-2 shadow-elevated backdrop-blur text-xs">
      <p className="text-muted-foreground mb-1">{date}</p>
      <span className="font-semibold text-foreground">
        {value} de {target} hábitos
      </span>
    </div>
  );
};

const Progress = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterType>("semana");
  const [moodData, setMoodData] = useState<any[]>([]);
  const [habitData, setHabitData] = useState<any[]>([]);
  const [totalHabitos, setTotalHabitos] = useState(0);
  const [totalPossible, setTotalPossible] = useState(0);
  const [streak, setStreak] = useState(0);
  const [tokensRestantes, setTokensRestantes] = useState(3);
  const [canRestore, setCanRestore] = useState(false);
  const [restoringStreak, setRestoringStreak] = useState(false);
  const [yesterdayStr, setYesterdayStr] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    loadData(cancelled).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filter]);

  const getDatesForFilter = (): Date[] => {
    const today = new Date();
    let days = 7;
    if (filter === "mes") days = 30;
    if (filter === "tudo") days = 90;
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (days - 1) + i);
      return d;
    });
  };

  const formatDate = (d: Date): string => {
    if (filter === "semana") {
      return ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][d.getDay()];
    }
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  const loadData = async (cancelled = false) => {
    if (!cancelled) setLoading(true);
    const dates = getDatesForFilter();
    const startDate = dates[0].toISOString().split("T")[0];
    const endDate = dates[dates.length - 1].toISOString().split("T")[0];

    // For accurate streak we always look back at least 120 days of habit data
    const streakStartDate = new Date();
    streakStartDate.setDate(streakStartDate.getDate() - 120);
    const streakStart = streakStartDate.toISOString().split("T")[0];

    // Tokens are reset every calendar month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [checkinRes, registrosRes, habitosRes, streakRegistrosRes, restauracoesRes, tokensMesRes] = await Promise.all([
      supabase.from("checkin_diario").select("humor, data").eq("user_id", user!.id).gte("data", startDate).lte("data", endDate),
      supabase.from("habito_registro").select("habito_id, data, concluido").eq("user_id", user!.id).eq("concluido", true).gte("data", startDate).lte("data", endDate),
      supabase.from("habitos").select("id").eq("user_id", user!.id).eq("ativo", true).order("created_at"),
      supabase.from("habito_registro").select("habito_id, data").eq("user_id", user!.id).eq("concluido", true).gte("data", streakStart),
      supabase.from("streak_restauracoes").select("data_restaurada").eq("user_id", user!.id).gte("data_restaurada", streakStart),
      supabase.from("streak_restauracoes").select("id", { count: "exact", head: true }).eq("user_id", user!.id).gte("created_at", monthStart.toISOString()),
    ]);

    // Mood data
    const checkinMap = new Map((checkinRes.data || []).map((c) => [c.data, c.humor]));
    setMoodData(
      dates.map((d) => ({
        day: formatDate(d),
        date: d.toISOString().split("T")[0],
        value: moodToValue[checkinMap.get(d.toISOString().split("T")[0]) || ""] || 0,
      })),
    );

    const allHabitos = habitosRes.data || [];
    const dailyTarget = Math.min(HABITS_PER_DAY, Math.max(allHabitos.length, 1));

    // Group completed registros by date for the visible chart range
    const completedByDate = new Map<string, Set<string>>();
    (registrosRes.data || []).forEach((r) => {
      const set = completedByDate.get(r.data) || new Set<string>();
      set.add(r.habito_id);
      completedByDate.set(r.data, set);
    });

    // Helper to compute completed count for a given date
    const completedCountFor = (dateStr: string, doneSet?: Set<string>): number => {
      if (allHabitos.length === 0 || !doneSet) return 0;
      const seed = getDailySeed(dateStr, user!.id);
      const shuffled = seededShuffle(allHabitos, seed);
      const todays = new Set(shuffled.slice(0, dailyTarget).map((h) => h.id));
      let count = 0;
      doneSet.forEach((id) => {
        if (todays.has(id) || count < dailyTarget) count++;
      });
      return Math.min(count, dailyTarget);
    };

    const habitChartData: { day: string; date: string; completed: number; target: number }[] = [];
    let sumCompleted = 0;
    let totalDailyTarget = 0;

    dates.forEach((d) => {
      const dateStr = d.toISOString().split("T")[0];
      const completedCount = completedCountFor(dateStr, completedByDate.get(dateStr));
      habitChartData.push({ day: formatDate(d), date: dateStr, value: completedCount, target: dailyTarget });
      sumCompleted += completedCount;
      totalDailyTarget += dailyTarget;
    });

    setHabitData(habitChartData);
    setTotalHabitos(sumCompleted);
    setTotalPossible(totalDailyTarget);

    // ===== Streak calc using full 120-day window =====
    const streakDoneByDate = new Map<string, Set<string>>();
    (streakRegistrosRes.data || []).forEach((r) => {
      const set = streakDoneByDate.get(r.data) || new Set<string>();
      set.add(r.habito_id);
      streakDoneByDate.set(r.data, set);
    });
    const restoredSet = new Set((restauracoesRes.data || []).map((r) => r.data_restaurada));

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yStr = yesterday.toISOString().split("T")[0];
    setYesterdayStr(yStr);

    const isDayComplete = (dateStr: string): boolean => {
      if (restoredSet.has(dateStr)) return true;
      if (dailyTarget <= 0) return false;
      return completedCountFor(dateStr, streakDoneByDate.get(dateStr)) >= dailyTarget;
    };

    // Start from today; if today not yet complete, we still keep streak from yesterday backwards
    let s = 0;
    const todayDone = isDayComplete(todayStr);
    let cursor = new Date(today);
    if (!todayDone) cursor.setDate(cursor.getDate() - 1);
    for (let i = 0; i < 120; i++) {
      const cStr = cursor.toISOString().split("T")[0];
      if (isDayComplete(cStr)) {
        s++;
        cursor.setDate(cursor.getDate() - 1);
      } else break;
    }
    setStreak(s);

    // Tokens restantes (3 por mês)
    const usedThisMonth = tokensMesRes.count || 0;
    const remaining = Math.max(0, 3 - usedThisMonth);
    setTokensRestantes(remaining);

    // Eligível para restaurar: ontem incompleto e não restaurado, e existe sequência anterior
    const yesterdayIncomplete = !isDayComplete(yStr);
    const dayBeforeYesterday = new Date(today);
    dayBeforeYesterday.setDate(today.getDate() - 2);
    const dbyStr = dayBeforeYesterday.toISOString().split("T")[0];
    const hadStreakBefore = isDayComplete(dbyStr);
    setCanRestore(!todayDone && yesterdayIncomplete && hadStreakBefore && remaining > 0);

    if (!cancelled) setLoading(false);
  };

  const restoreStreak = async () => {
    if (!yesterdayStr || tokensRestantes <= 0 || restoringStreak) return;
    setRestoringStreak(true);
    const { error } = await supabase.from("streak_restauracoes").insert({
      user_id: user!.id,
      data_restaurada: yesterdayStr,
    });
    if (error) {
      toast({ title: "Erro ao restaurar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sequência restaurada!", description: "Continue de onde parou ✨" });
      await loadData();
    }
    setRestoringStreak(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const percentage = totalPossible > 0 ? Math.round((totalHabitos / totalPossible) * 100) : 0;
  const isScrollable = filter !== "semana";
  const chartWidth = isScrollable ? Math.max(habitData.length * 40, 600) : "100%";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Seu Progresso</h1>
        <p className="text-sm text-muted-foreground">Acompanhe sua evolução</p>
      </div>

      <div className="flex gap-2">
        {([
          { key: "semana" as const, label: "Semana" },
          { key: "mes" as const, label: "Mês" },
          { key: "tudo" as const, label: "Tudo" },
        ]).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-all ${
              filter === f.key ? "bg-primary text-primary-foreground shadow-soft" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2 rounded-2xl bg-wellness-peach p-4 dark:bg-orange-950/40 dark:border dark:border-orange-800/30">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-600 dark:text-orange-400" aria-hidden />
            <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">Sequência atual</span>
          </div>
          <span className="text-2xl font-bold text-orange-900 dark:text-orange-100">{streak} {streak === 1 ? "dia" : "dias"}</span>
          <p className="text-[11px] text-orange-700/80 dark:text-orange-300/80 leading-snug flex items-start gap-1">
            <Sparkles className="h-3 w-3 mt-0.5 shrink-0 text-orange-600/70 dark:text-orange-400/70" aria-hidden />
            Complete seus hábitos diários para manter sua sequência.
          </p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="flex flex-col gap-2 rounded-2xl bg-wellness-mint p-4 dark:bg-emerald-950/40 dark:border dark:border-emerald-800/30">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Hábitos completados</span>
          </div>
          <span className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{percentage}%</span>
          <span className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">{totalHabitos} de {totalPossible} hábitos do período</span>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="rounded-2xl border border-border bg-card p-4 shadow-card"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Restaurar sequência</p>
              <p className="text-xs text-muted-foreground truncate">
                {tokensRestantes} {tokensRestantes === 1 ? "token disponível" : "tokens disponíveis"} este mês
              </p>
            </div>
          </div>
          <button
            onClick={restoreStreak}
            disabled={!canRestore || restoringStreak}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-medium text-primary-foreground shadow-soft disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {restoringStreak ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <Flame className="h-3.5 w-3.5" />}
            Restaurar
          </button>
        </div>
        {!canRestore && tokensRestantes > 0 && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Disponível apenas em até 24h após perder a sequência.
          </p>
        )}
        {tokensRestantes === 0 && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Você usou todos os tokens deste mês. Eles renovam no dia 1º.
          </p>
        )}
      </motion.div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Taxa de conclusão</p>
          </div>
          <span className="text-sm font-bold text-primary">{percentage}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <motion.div className="h-full rounded-full gradient-calm" animate={{ width: `${percentage}%` }} transition={{ duration: 0.6, ease: "easeOut" }} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{totalHabitos} de {totalPossible} hábitos completados</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <p className="mb-4 text-sm font-semibold text-foreground">Evolução do humor</p>
        <div className={isScrollable ? "overflow-x-auto" : ""} style={isScrollable ? { touchAction: "pan-x" } : undefined}>
          <div style={{ width: isScrollable ? chartWidth : "100%", minWidth: "100%" }}>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={moodData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(213 72% 59%)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="hsl(213 72% 59%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 4" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} interval={isScrollable ? 2 : 0} />
                <YAxis hide domain={[0, 3]} />
                <Tooltip content={<CustomMoodTooltip />} cursor={{ stroke: "hsl(var(--primary))", strokeOpacity: 0.2, strokeWidth: 1 }} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(213 72% 59%)"
                  strokeWidth={2.5}
                  fill="url(#moodGrad)"
                  dot={{ r: 3, fill: "hsl(213 72% 59%)", strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "hsl(213 72% 59%)", stroke: "hsl(var(--card))", strokeWidth: 2 }}
                  animationDuration={700}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-foreground">Hábitos concluídos</p>
          <span className="text-[11px] text-muted-foreground">Meta diária: {Math.min(HABITS_PER_DAY, habitData[0]?.target || 0)}</span>
        </div>
        <div className={isScrollable ? "overflow-x-auto" : ""} style={isScrollable ? { touchAction: "pan-x" } : undefined}>
          <div style={{ width: isScrollable ? chartWidth : "100%", minWidth: "100%" }}>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={habitData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="habitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(152 55% 55%)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(152 55% 55%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 4" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} interval={isScrollable ? 2 : 0} />
                <YAxis hide domain={[0, HABITS_PER_DAY]} />
                <Tooltip content={<CustomHabitTooltip />} cursor={{ stroke: "hsl(152 55% 55%)", strokeOpacity: 0.2, strokeWidth: 1 }} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(152 55% 45%)"
                  strokeWidth={2.5}
                  fill="url(#habitGrad)"
                  dot={{ r: 3, fill: "hsl(152 55% 45%)", strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "hsl(152 55% 45%)", stroke: "hsl(var(--card))", strokeWidth: 2 }}
                  animationDuration={700}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Progress;

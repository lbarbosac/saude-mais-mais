import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Flame, Loader2, CheckCircle2, Smile, Meh, Frown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const moodToValue: Record<string, number> = { bom: 3, normal: 2, baixo: 1 };
const valueToMood: Record<number, { label: string; icon: React.ElementType }> = {
  3: { label: "Bem", icon: Smile },
  2: { label: "Normal", icon: Meh },
  1: { label: "Baixo", icon: Frown },
  0: { label: "Sem registro", icon: Meh },
};

type FilterType = "semana" | "mes" | "tudo";

const CustomMoodTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value || 0;
  const mood = valueToMood[value] || valueToMood[0];
  const IconComp = mood.icon;
  const date = payload[0]?.payload?.date || "";
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-card text-xs">
      <p className="text-muted-foreground mb-1">{date}</p>
      <div className="flex items-center gap-1.5">
        <IconComp className="h-4 w-4 text-primary" />
        <span className="font-medium text-foreground">Voce estava: {mood.label}</span>
      </div>
    </div>
  );
};

const CustomHabitTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value || 0;
  const date = payload[0]?.payload?.date || "";
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-card text-xs">
      <p className="text-muted-foreground mb-1">{date}</p>
      <span className="font-medium text-foreground">Voce completou {value} habito{value !== 1 ? "s" : ""}</span>
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
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollRef2 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) loadData();
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
      return ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"][d.getDay()];
    }
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  const loadData = async () => {
    setLoading(true);
    const dates = getDatesForFilter();
    const startDate = dates[0].toISOString().split("T")[0];
    const endDate = dates[dates.length - 1].toISOString().split("T")[0];

    const [checkinRes, registrosRes, habitosRes] = await Promise.all([
      supabase.from("checkin_diario").select("humor, data").eq("user_id", user!.id).gte("data", startDate).lte("data", endDate),
      supabase.from("habito_registro").select("data, concluido").eq("user_id", user!.id).eq("concluido", true).gte("data", startDate).lte("data", endDate),
      supabase.from("habitos").select("id").eq("user_id", user!.id).eq("ativo", true),
    ]);

    const checkinMap = new Map((checkinRes.data || []).map((c) => [c.data, c.humor]));
    setMoodData(dates.map((d) => ({
      day: formatDate(d),
      date: d.toISOString().split("T")[0],
      value: moodToValue[checkinMap.get(d.toISOString().split("T")[0]) || ""] || 0,
    })));

    const habitMap = new Map<string, number>();
    (registrosRes.data || []).forEach((r) => {
      habitMap.set(r.data, (habitMap.get(r.data) || 0) + 1);
    });

    const totalCompleted = registrosRes.data?.length || 0;
    const numHabits = habitosRes.data?.length || 1;
    const numDays = dates.length;

    setHabitData(dates.map((d) => ({
      day: formatDate(d),
      date: d.toISOString().split("T")[0],
      value: habitMap.get(d.toISOString().split("T")[0]) || 0,
    })));

    setTotalHabitos(totalCompleted);
    setTotalPossible(numHabits * numDays);

    let s = 0;
    for (let i = dates.length - 1; i >= 0; i--) {
      const dateStr = dates[i].toISOString().split("T")[0];
      if ((habitMap.get(dateStr) || 0) > 0) s++;
      else break;
    }
    setStreak(s);
    setLoading(false);
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const percentage = totalPossible > 0 ? Math.round((totalHabitos / totalPossible) * 100) : 0;
  const isScrollable = filter !== "semana";
  const chartWidth = isScrollable ? Math.max(moodData.length * 40, 600) : "100%";

  const stats = [
    { label: "Sequencia atual", value: `${streak} dias`, icon: Flame, color: "bg-wellness-peach" },
    { label: "Habitos completados", value: `${percentage}%`, icon: TrendingUp, color: "bg-wellness-mint" },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Seu Progresso</h1>
        <p className="text-sm text-muted-foreground">Acompanhe sua evolucao</p>
      </div>

      <div className="flex gap-2">
        {([
          { key: "semana" as const, label: "Semana" },
          { key: "mes" as const, label: "Mes" },
          { key: "tudo" as const, label: "Tudo" },
        ]).map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-all ${filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className={`flex flex-col gap-2 rounded-2xl ${s.color} p-4`}>
            <s.icon className="h-5 w-5 text-foreground/70" />
            <span className="text-lg font-bold text-foreground">{s.value}</span>
            <span className="text-xs text-muted-foreground">{s.label}</span>
          </motion.div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Taxa de conclusao</p>
          </div>
          <span className="text-sm font-bold text-primary">{percentage}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <motion.div className="h-full rounded-full gradient-calm" animate={{ width: `${percentage}%` }} transition={{ duration: 0.5 }} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{totalHabitos} de {totalPossible} habitos completados</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <p className="mb-4 text-sm font-semibold text-foreground">Evolucao do humor</p>
        <div ref={scrollRef} className={isScrollable ? "overflow-x-auto" : ""} style={isScrollable ? { touchAction: "pan-x" } : undefined}>
          <div style={{ width: isScrollable ? chartWidth : "100%", minWidth: "100%" }}>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={moodData}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} interval={isScrollable ? 2 : 0} />
                <YAxis hide />
                <Tooltip content={<CustomMoodTooltip />} cursor={false} />
                <Bar dataKey="value" fill="hsl(213 72% 59%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <p className="mb-4 text-sm font-semibold text-foreground">Habitos concluidos</p>
        <div ref={scrollRef2} className={isScrollable ? "overflow-x-auto" : ""} style={isScrollable ? { touchAction: "pan-x" } : undefined}>
          <div style={{ width: isScrollable ? chartWidth : "100%", minWidth: "100%" }}>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={habitData}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} interval={isScrollable ? 2 : 0} />
                <YAxis hide />
                <Tooltip content={<CustomHabitTooltip />} cursor={false} />
                <Bar dataKey="value" fill="hsl(152 55% 78%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Progress;

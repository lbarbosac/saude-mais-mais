import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sun, Zap, CheckCircle2, Sparkles, TrendingUp, Smile, Meh, Frown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const moods = [
  { icon: Smile, label: "Bem", value: "bom" },
  { icon: Meh, label: "Normal", value: "normal" },
  { icon: Frown, label: "Baixo", value: "baixo" },
];

const energyLevels = [
  { label: "Baixa", value: "baixa" },
  { label: "Media", value: "media" },
  { label: "Alta", value: "alta" },
];

const suggestions = [
  "Tente fazer uma pausa de 5 minutos para respirar profundamente.",
  "Que tal ouvir sons da natureza enquanto trabalha?",
  "Beba um copo de agua agora!",
  "Alongue-se por 2 minutos. Seu corpo agradece.",
];

const Dashboard = () => {
  const { user } = useAuth();
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [energy, setEnergy] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [habitos, setHabitos] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadTodayCheckin();
      loadHabitos();
    }
  }, [user]);

  const loadProfile = async () => {
    const { data } = await supabase.from("perfil_usuario").select("nome").eq("user_id", user!.id).single();
    if (data) setNome(data.nome);
  };

  const loadTodayCheckin = async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase.from("checkin_diario").select("humor, energia").eq("user_id", user!.id).eq("data", today).maybeSingle();
    if (data) {
      setSelectedMood(data.humor);
      setEnergy(data.energia);
    }
  };

  const loadHabitos = async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data: habitosData } = await supabase.from("habitos").select("id, nome_habito").eq("ativo", true).limit(4);
    if (!habitosData) return;
    const { data: registros } = await supabase.from("habito_registro").select("habito_id, concluido").eq("data", today);
    const regMap = new Map((registros || []).map((r) => [r.habito_id, r.concluido]));
    setHabitos(habitosData.map((h) => ({ ...h, done: regMap.get(h.id) || false })));
  };

  const saveCheckin = async (humor: string, energia: string) => {
    const today = new Date().toISOString().split("T")[0];
    const { data: existing } = await supabase.from("checkin_diario").select("id").eq("user_id", user!.id).eq("data", today).maybeSingle();
    if (existing) {
      await supabase.from("checkin_diario").update({ humor, energia }).eq("id", existing.id);
    } else {
      await supabase.from("checkin_diario").insert({ user_id: user!.id, humor, energia, data: today });
    }
  };

  const selectMood = (value: string) => {
    setSelectedMood(value);
    saveCheckin(value, energy || "media");
  };

  const selectEnergy = (value: string) => {
    setEnergy(value);
    saveCheckin(selectedMood || "normal", value);
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  const completedCount = habitos.filter((t) => t.done).length;
  const progressPercent = habitos.length > 0 ? (completedCount / habitos.length) * 100 : 0;

  const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
  const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-6">
      <motion.div variants={item}>
        <div className="flex items-center gap-2">
          <Sun className="h-5 w-5 text-primary" />
          <p className="text-muted-foreground">{greeting}!</p>
        </div>
        <h1 className="text-2xl font-bold text-foreground">{nome ? `Ola, ${nome.split(' ')[0]}` : "Como voce esta hoje?"}</h1>
      </motion.div>

      <motion.div variants={item} className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <p className="mb-3 text-sm font-semibold text-foreground">Check-in de humor</p>
        <div className="flex gap-3">
          {moods.map((m) => (
            <button
              key={m.value}
              onClick={() => selectMood(m.value)}
              className={`flex flex-1 flex-col items-center gap-1.5 rounded-xl py-3 text-sm transition-all ${
                selectedMood === m.value ? "bg-primary/10 ring-2 ring-primary" : "bg-muted hover:bg-muted/80"
              }`}
            >
              <m.icon className={`h-6 w-6 ${selectedMood === m.value ? "text-primary" : "text-muted-foreground"}`} />
              <span className="font-medium">{m.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div variants={item} className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Nivel de energia</p>
        </div>
        <div className="flex gap-3">
          {energyLevels.map((e) => (
            <button
              key={e.value}
              onClick={() => selectEnergy(e.value)}
              className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-all ${
                energy === e.value ? "gradient-nature text-secondary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>
      </motion.div>

      {habitos.length > 0 && (
        <motion.div variants={item} className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Habitos de hoje</p>
            </div>
            <span className="text-xs font-medium text-muted-foreground">{completedCount}/{habitos.length}</span>
          </div>
          <div className="mb-3 mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div className="h-full rounded-full gradient-calm" animate={{ width: `${progressPercent}%` }} transition={{ duration: 0.4 }} />
          </div>
          <div className="flex flex-col gap-2">
            {habitos.map((t) => (
              <div key={t.id} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm ${t.done ? "bg-secondary/40 text-muted-foreground line-through" : "bg-muted text-foreground"}`}>
                <div className={`flex h-5 w-5 items-center justify-center rounded-md border-2 ${t.done ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                  {t.done && <CheckCircle2 className="h-3 w-3" />}
                </div>
                {t.nome_habito}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div variants={item} className="rounded-2xl gradient-calm p-5 shadow-soft">
        <div className="mb-3 flex items-center gap-2 text-primary-foreground">
          <Sparkles className="h-4 w-4" />
          <p className="text-sm font-semibold">Sugestao do Lucas</p>
        </div>
        <p className="text-sm leading-relaxed text-primary-foreground/90">
          {suggestions[Math.floor(Math.random() * suggestions.length)]}
        </p>
      </motion.div>

      <motion.div variants={item} className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Resumo semanal</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Habitos", value: `${completedCount}`, color: "bg-wellness-mint" },
            { label: "Humor", value: selectedMood === "bom" ? "Bem" : selectedMood === "baixo" ? "Baixo" : "Normal", color: "bg-wellness-peach" },
            { label: "Energia", value: energy || "--", color: "bg-wellness-lavender" },
          ].map((s) => (
            <div key={s.label} className={`flex flex-col items-center gap-1 rounded-xl ${s.color} p-3`}>
              <span className="text-lg font-bold text-foreground capitalize">{s.value}</span>
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;

import { useState, useEffect, useCallback, useMemo, type KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dumbbell, Loader2, RefreshCw, Plus, ChevronDown, ChevronUp, Ruler, Calculator, History, Save, X, Settings2, Trash2, Search, Star, Clock, Layers, TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { callEdgeFunction } from "@/lib/supabase/functions";
import { track } from "@/lib/analytics";
import { deISO, todayISO } from "@/lib/utils/date";
import type { Tables, TablesInsert } from "@/lib/supabase/types";
import { calculateBodyFat, classifyBodyFat } from "@/lib/bodyFat";
import medidasImg from "@/assets/medidas-personagem.webp";

interface TreinoPerfil {
  objetivo: string;
  dias_semana: number;
  local_treino: string;
  nivel: string;
  grupo_foco: string;
  cardio: string;
  tempo_treino: number;
  limitacoes: string;
  descanso_pref?: number | null;
}

type RespostasTreino = Record<string, string | number | null | undefined>;

interface RegistroCarga {
  id: string;
  exercicio_nome: string;
  peso_kg: number;
  repeticoes: number;
  series: number;
  data: string;
  observacao: string | null;
  created_at: string | null;
}

type Medida = Tables<"medidas_corporais">;

/** Aceita vírgula como separador decimal. */
const numeroBR = (v: string) => Number(v.replace(",", "."));

interface Treino {
  id: string;
  nome: string;
  divisao: string | null;
  dia_semana: number | null;
  exercicios?: Exercicio[];
}

interface Exercicio {
  id: string;
  nome: string;
  series: number;
  repeticoes: string;
  descanso_seg: number;
  observacao: string | null;
  ordem: number;
}

// Formata segundos em formato legível: 90s → "1min 30s", 60s → "1min", 45s → "45s"
function formatRestTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m}min` : `${m}min ${s}s`;
}

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const FORM_QUESTIONS = [
  { key: "objetivo", label: "Objetivo principal", options: [
    { v: "emagrecimento", l: "Emagrecimento" },
    { v: "ganho_massa", l: "Ganho de massa" },
    { v: "condicionamento", l: "Condicionamento" },
    { v: "saude_geral", l: "Saúde geral" },
  ]},
  { key: "dias_semana", label: "Dias de treino por semana", options: [
    { v: 2, l: "2 dias" }, { v: 3, l: "3 dias" }, { v: 4, l: "4 dias" }, { v: 5, l: "5 dias" }, { v: 6, l: "6 dias" },
  ]},
  { key: "local_treino", label: "Local de treino", options: [
    { v: "academia", l: "Academia" }, { v: "casa", l: "Casa" }, { v: "ar_livre", l: "Ar livre" },
  ]},
  { key: "nivel", label: "Nível", options: [
    { v: "iniciante", l: "Iniciante" }, { v: "intermediario", l: "Intermediário" }, { v: "avancado", l: "Avançado" },
  ]},
  { key: "grupo_foco", label: "Grupo muscular foco", options: [
    { v: "superior", l: "Superior" }, { v: "inferior", l: "Inferior" }, { v: "full_body", l: "Full body" },
  ]},
  { key: "cardio", label: "Cardio", options: [
    { v: "nao", l: "Não quero" }, { v: "leve", l: "Leve" }, { v: "moderado", l: "Moderado" }, { v: "intenso", l: "Intenso" },
  ]},
  { key: "tempo_treino", label: "Tempo por treino", options: [
    { v: 30, l: "30 min" }, { v: 45, l: "45 min" }, { v: 60, l: "60 min" }, { v: 90, l: "90 min" },
  ]},
  { key: "descanso_pref", label: "Descanso preferido entre séries", options: [
    { v: 60, l: "60s" }, { v: 90, l: "90s" }, { v: 120, l: "2 min" }, { v: 180, l: "3 min" },
  ]},
  { key: "limitacoes", label: "Lesões ou limitações", options: [
    { v: "nenhuma", l: "Nenhuma" }, { v: "joelho", l: "Joelho" }, { v: "coluna", l: "Coluna" }, { v: "ombro", l: "Ombro" },
  ]},
];

const Treinos = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [perfil, setPerfil] = useState<TreinoPerfil | null>(null);
  const [treinos, setTreinos] = useState<Treino[]>([]);
  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<RespostasTreino>({});
  const [savingPerfil, setSavingPerfil] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tab, setTab] = useState<"plano" | "registro" | "medidas" | "calc">("plano");
  const [refazendo, setRefazendo] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const { data: tp } = await supabase.from("treino_perfil").select("*").eq("user_id", user!.id).maybeSingle();
    if (tp) setPerfil(tp as TreinoPerfil);

    const { data: ts } = await supabase.from("treinos").select("*").eq("user_id", user!.id).eq("ativo", true).order("dia_semana");
    if (ts && ts.length > 0) {
      const ids = ts.map((t) => t.id);
      const { data: exs } = await supabase.from("treino_exercicios").select("*").in("treino_id", ids).order("ordem");
      const grouped: Record<string, Exercicio[]> = {};
      (exs || []).forEach((e) => {
        if (!grouped[e.treino_id]) grouped[e.treino_id] = [];
        grouped[e.treino_id].push(e as Exercicio);
      });
      setTreinos(ts.map((t) => ({ ...t, exercicios: grouped[t.id] || [] })));
    } else {
      setTreinos([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) loadAll();
  }, [user, loadAll]);

  const savePerfil = async () => {
    setSavingPerfil(true);
    const payload = {
      user_id: user!.id,
      objetivo: String(formData.objetivo),
      dias_semana: Number(formData.dias_semana),
      local_treino: String(formData.local_treino),
      nivel: String(formData.nivel),
      grupo_foco: String(formData.grupo_foco),
      cardio: String(formData.cardio),
      tempo_treino: Number(formData.tempo_treino),
      limitacoes: String(formData.limitacoes ?? "nenhuma"),
      descanso_pref: formData.descanso_pref ? Number(formData.descanso_pref) : null,
    };
    const { error } = await supabase.from("treino_perfil").upsert(payload, { onConflict: "user_id" });
    setSavingPerfil(false);
    if (error) {
      toast({ title: "Não foi possível salvar", description: "Verifique sua conexão e tente de novo.", variant: "destructive" });
      return;
    }
    setPerfil(payload);
    setRefazendo(false);
    toast({ title: "Perfil de treino salvo!" });
    await gerarTreinos();
  };

  const gerarTreinos = async () => {
    if (generating) return;
    setGenerating(true);
    const { data, error } = await callEdgeFunction<{ total: number }>("gerar-treino", { timeoutMs: 90_000 });
    if (error || !data) {
      toast({ title: "Não deu para gerar o treino agora", description: error ?? undefined, variant: "destructive" });
    } else {
      track("workout_generated", { total: data.total });
      toast({ title: "Plano pronto", description: `${data.total} ${data.total === 1 ? "treino criado" : "treinos criados"}.` });
      await loadAll();
    }
    setGenerating(false);
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  // FORM (first access OR re-do)
  if (!perfil || refazendo) {
    const q = FORM_QUESTIONS[step];
    const isLast = step === FORM_QUESTIONS.length - 1;
    const canNext = formData[q.key] !== undefined && formData[q.key] !== "";

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6 max-w-xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configurar Treinos</h1>
            <p className="text-sm text-muted-foreground">Pergunta {step + 1} de {FORM_QUESTIONS.length}</p>
          </div>
          {refazendo && (
            <button onClick={() => { setRefazendo(false); setStep(0); setFormData({}); }} className="text-xs text-muted-foreground hover:text-foreground">
              Cancelar
            </button>
          )}
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div className="h-full bg-primary" animate={{ width: `${((step + 1) / FORM_QUESTIONS.length) * 100}%` }} />
        </div>

        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <p className="mb-4 text-base font-semibold text-foreground">{q.label}</p>
          <div className="grid grid-cols-2 gap-2">
            {q.options.map((opt) => (
              <button
                key={String(opt.v)}
                onClick={() => setFormData({ ...formData, [q.key]: opt.v })}
                className={`rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all ${
                  formData[q.key] === opt.v
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-foreground hover:border-primary/30"
                }`}
              >
                {opt.l}
              </button>
            ))}
          </div>
        </motion.div>

        <div className="flex gap-2">
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} className="flex-1 rounded-xl border border-border bg-card py-3 text-sm font-medium hover:bg-muted">
              Voltar
            </button>
          )}
          <button
            onClick={isLast ? savePerfil : () => setStep(step + 1)}
            disabled={!canNext || savingPerfil}
            className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-soft disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {savingPerfil && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLast ? "Gerar treino" : "Próxima"}
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Treinos</h1>
          <p className="text-sm text-muted-foreground">Seu plano personalizado</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setRefazendo(true); setStep(0); setFormData(perfil ? { ...perfil, descanso_pref: perfil.descanso_pref ?? undefined } : {}); }}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
            title="Refazer perguntas do perfil de treino"
          >
            <Settings2 className="h-4 w-4" />
            Refazer perguntas
          </button>
          {tab === "plano" && (
            <button
              onClick={gerarTreinos}
              disabled={generating}
              className="flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-soft disabled:opacity-50"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {generating ? "Gerando..." : "Gerar treino"}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-muted p-1 overflow-x-auto">
        {[
          { v: "plano", l: "Plano", icon: Dumbbell },
          { v: "registro", l: "Registro", icon: History },
          { v: "medidas", l: "Medidas", icon: Ruler },
          { v: "calc", l: "% Gordura", icon: Calculator },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.v}
              onClick={() => setTab(t.v as typeof tab)}
              className={`flex-1 min-w-fit flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                tab === t.v ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.l}
            </button>
          );
        })}
      </div>

      {tab === "plano" && (
        <>
          {treinos.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-border p-8 text-center">
              <Dumbbell className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-semibold text-foreground">Nenhum treino ainda</p>
              <p className="text-sm text-muted-foreground mt-1">Clique em "Gerar treino" para criar.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {treinos.map((t, i) => {
                const isOpen = expanded === t.id;
                return (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="rounded-2xl border border-border bg-card shadow-card overflow-hidden"
                  >
                    <button
                      onClick={() => setExpanded(isOpen ? null : t.id)}
                      className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                        <Dumbbell className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{t.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.dia_semana !== null && DIAS[t.dia_semana]} • {t.exercicios?.length || 0} exercícios
                        </p>
                      </div>
                      {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </button>
                    {isOpen && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="border-t border-border p-4 flex flex-col gap-2">
                        {t.exercicios?.map((e) => (
                          <div key={e.id} className="rounded-xl bg-muted p-3">
                            <p className="font-medium text-foreground text-sm">{e.nome}</p>
                            <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                              <span>{e.series}× {e.repeticoes}</span>
                              <span>•</span>
                              <span>{formatRestTime(e.descanso_seg)} descanso</span>
                            </div>
                            {e.observacao && <p className="text-xs text-muted-foreground mt-1 italic">{e.observacao}</p>}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === "registro" && <RegistroTreino userId={user!.id} treinos={treinos} />}
      {tab === "medidas" && <MedidasCorporais userId={user!.id} />}
      {tab === "calc" && <CalculadoraGordura userId={user!.id} />}
    </motion.div>
  );
};

// ============= REGISTRO =============
type PickerTab = "recentes" | "plano" | "favoritos" | "buscar";

const MUSCLE_CATEGORIES: { key: string; label: string; matches: string[] }[] = [
  { key: "peito", label: "Peito", matches: ["supino", "crucifixo", "peck", "peitoral", "crossover", "flexão"] },
  { key: "costas", label: "Costas", matches: ["puxada", "remada", "barra fixa", "pulldown", "deadlift", "levantamento terra"] },
  { key: "pernas", label: "Pernas", matches: ["agachamento", "leg", "cadeira", "afundo", "stiff", "panturrilha", "glúteo", "gluteo"] },
  { key: "ombros", label: "Ombros", matches: ["desenvolvimento", "elevação", "elevacao", "arnold", "ombro"] },
  { key: "biceps", label: "Bíceps", matches: ["rosca", "bíceps", "biceps"] },
  { key: "triceps", label: "Tríceps", matches: ["tríceps", "triceps", "francês", "frances", "corda", "testa"] },
  { key: "abdomen", label: "Abdômen", matches: ["abdominal", "prancha", "abdômen", "abdomen", "core"] },
  { key: "cardio", label: "Cardio", matches: ["corrida", "esteira", "bike", "elíptico", "eliptico", "burpee"] },
];

const matchCategory = (name: string, cat: typeof MUSCLE_CATEGORIES[0]) => {
  const n = name.toLowerCase();
  return cat.matches.some((m) => n.includes(m));
};

const RegistroTreino = ({ userId, treinos }: { userId: string; treinos: Treino[] }) => {
  const [registros, setRegistros] = useState<RegistroCarga[]>([]);
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [pickerTab, setPickerTab] = useState<PickerTab>("recentes");
  const [selectedTreinoId, setSelectedTreinoId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [form, setForm] = useState({ exercicio_nome: "", peso_kg: "", repeticoes: "", series: "1" });
  const [saving, setSaving] = useState(false);
  const [detailExercicio, setDetailExercicio] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("treino_registro")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200);
    setRegistros(data || []);
    const { data: pref } = await supabase
      .from("preferencias_usuario")
      .select("favoritos_exercicios")
      .eq("user_id", userId)
      .maybeSingle();
    setFavoritos(pref?.favoritos_exercicios ?? []);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const toggleFavorito = async (nome: string) => {
    const next = favoritos.includes(nome)
      ? favoritos.filter((n) => n !== nome)
      : [...favoritos, nome];
    setFavoritos(next);
    await supabase
      .from("preferencias_usuario")
      .update({ favoritos_exercicios: next })
      .eq("user_id", userId);
  };

  const planoExercicios = useMemo(() => {
    const all: { nome: string; treino: string }[] = [];
    treinos.forEach((t) => (t.exercicios || []).forEach((e) => all.push({ nome: e.nome, treino: t.nome })));
    return all;
  }, [treinos]);

  const recentes = useMemo(() => {
    const seen = new Set<string>();
    const out: { nome: string; ultima: string }[] = [];
    registros.forEach((r) => {
      if (!seen.has(r.exercicio_nome)) {
        seen.add(r.exercicio_nome);
        out.push({ nome: r.exercicio_nome, ultima: r.data });
      }
    });
    return out.slice(0, 12);
  }, [registros]);

  const allKnown = useMemo(() => {
    const set = new Set<string>();
    planoExercicios.forEach((e) => set.add(e.nome));
    recentes.forEach((e) => set.add(e.nome));
    favoritos.forEach((n) => set.add(n));
    return Array.from(set);
  }, [planoExercicios, recentes, favoritos]);

  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return allKnown.filter((n) => n.toLowerCase().includes(q)).slice(0, 8);
  }, [searchQuery, allKnown]);

  const categoryExercicios = useMemo(() => {
    if (!activeCategory) return [];
    const cat = MUSCLE_CATEGORIES.find((c) => c.key === activeCategory);
    if (!cat) return [];
    return allKnown.filter((n) => matchCategory(n, cat));
  }, [activeCategory, allKnown]);

  const exerciciosPorTreino = useMemo(() => {
    return treinos.find((t) => t.id === selectedTreinoId)?.exercicios || [];
  }, [treinos, selectedTreinoId]);

  const escolherExercicio = (nome: string) => {
    setForm({ ...form, exercicio_nome: nome });
  };

  const save = async () => {
    if (saving) return;
    if (!form.exercicio_nome || !form.peso_kg || !form.repeticoes) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("treino_registro").insert({
      user_id: userId,
      exercicio_nome: form.exercicio_nome.trim().slice(0, 100),
      peso_kg: numeroBR(form.peso_kg),
      repeticoes: Math.round(numeroBR(form.repeticoes)),
      series: Math.max(1, Math.round(numeroBR(form.series))),
      data: todayISO(),
    });
    if (error) {
      setSaving(false);
      toast({ title: "Erro ao salvar", variant: "destructive" });
      return;
    }
    toast({ title: "Registro salvo!" });
    setForm({ exercicio_nome: "", peso_kg: "", repeticoes: "", series: "1" });
    setShowAdd(false);
    setSelectedTreinoId("");
    setSearchQuery("");
    setActiveCategory(null);
    await load();
    setSaving(false);
  };

  const handleEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      save();
    }
  };

  const exercicioRegistros = useMemo(() => {
    if (!detailExercicio) return [];
    return registros
      .filter((r) => r.exercicio_nome === detailExercicio)
      .sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""));
  }, [detailExercicio, registros]);

  const chartData = useMemo(() => {
    return exercicioRegistros.map((r, i) => ({
      i: i + 1,
      data: deISO(r.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
      peso: Number(r.peso_kg),
      reps: Number(r.repeticoes),
    }));
  }, [exercicioRegistros]);

  const tabs: { v: PickerTab; l: string; icon: React.ElementType }[] = [
    { v: "recentes", l: "Recentes", icon: Clock },
    { v: "plano", l: "Plano", icon: Dumbbell },
    { v: "favoritos", l: "Favoritos", icon: Star },
    { v: "buscar", l: "Buscar", icon: Search },
  ];

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => setShowAdd(!showAdd)}
        className="flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-soft"
      >
        {showAdd ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {showAdd ? "Cancelar" : "Novo registro"}
      </button>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl border border-border bg-card p-5 shadow-card flex flex-col gap-4"
          >
            {/* Picker tabs */}
            <div className="flex gap-1 rounded-xl bg-muted p-1 overflow-x-auto">
              {tabs.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.v}
                    onClick={() => setPickerTab(t.v)}
                    className={`flex-1 min-w-fit flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-all ${
                      pickerTab === t.v ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {t.l}
                  </button>
                );
              })}
            </div>

            {/* Picker content */}
            <div className="min-h-[80px]">
              {pickerTab === "recentes" && (
                <>
                  {recentes.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Nenhum exercício registrado ainda. Use a busca ou o plano.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {recentes.map((r) => (
                        <ExercicioChip
                          key={r.nome}
                          nome={r.nome}
                          ativo={form.exercicio_nome === r.nome}
                          onClick={() => escolherExercicio(r.nome)}
                          favorito={favoritos.includes(r.nome)}
                          onToggleFav={() => toggleFavorito(r.nome)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}

              {pickerTab === "plano" && (
                <div className="flex flex-col gap-2">
                  {treinos.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Nenhum treino no plano ainda.
                    </p>
                  ) : (
                    <>
                      <select
                        value={selectedTreinoId}
                        onChange={(e) => { setSelectedTreinoId(e.target.value); setForm({ ...form, exercicio_nome: "" }); }}
                        className="input-modern"
                      >
                        <option value="">Selecione o treino...</option>
                        {treinos.map((t) => (
                          <option key={t.id} value={t.id}>{t.nome}</option>
                        ))}
                      </select>
                      {selectedTreinoId && (
                        <div className="flex flex-wrap gap-2">
                          {exerciciosPorTreino.map((ex) => (
                            <ExercicioChip
                              key={ex.id}
                              nome={ex.nome}
                              ativo={form.exercicio_nome === ex.nome}
                              onClick={() => escolherExercicio(ex.nome)}
                              favorito={favoritos.includes(ex.nome)}
                              onToggleFav={() => toggleFavorito(ex.nome)}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {pickerTab === "favoritos" && (
                <>
                  {favoritos.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Marque exercícios como favoritos com a estrela.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {favoritos.map((nome) => (
                        <ExercicioChip
                          key={nome}
                          nome={nome}
                          ativo={form.exercicio_nome === nome}
                          onClick={() => escolherExercicio(nome)}
                          favorito
                          onToggleFav={() => toggleFavorito(nome)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}

              {pickerTab === "buscar" && (
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Digite o nome do exercício..."
                      className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-3 text-sm outline-none focus:border-primary"
                    />
                  </div>

                  {searchSuggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {searchSuggestions.map((nome) => (
                        <ExercicioChip
                          key={nome}
                          nome={nome}
                          ativo={form.exercicio_nome === nome}
                          onClick={() => escolherExercicio(nome)}
                          favorito={favoritos.includes(nome)}
                          onToggleFav={() => toggleFavorito(nome)}
                        />
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-1">
                    <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-[11px] font-medium text-muted-foreground">Por grupo muscular</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {MUSCLE_CATEGORIES.map((c) => (
                      <button
                        key={c.key}
                        onClick={() => setActiveCategory(activeCategory === c.key ? null : c.key)}
                        className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-all ${
                          activeCategory === c.key
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card text-muted-foreground hover:border-primary/30"
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                  {activeCategory && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {categoryExercicios.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground">Nenhum exercício conhecido nesse grupo. Use a busca.</p>
                      ) : (
                        categoryExercicios.map((nome) => (
                          <ExercicioChip
                            key={nome}
                            nome={nome}
                            ativo={form.exercicio_nome === nome}
                            onClick={() => escolherExercicio(nome)}
                            favorito={favoritos.includes(nome)}
                            onToggleFav={() => toggleFavorito(nome)}
                          />
                        ))
                      )}
                    </div>
                  )}

                  {searchQuery && searchSuggestions.length === 0 && (
                    <button
                      onClick={() => escolherExercicio(searchQuery)}
                      className="rounded-xl border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-xs text-primary"
                    >
                      Usar "{searchQuery}" como exercício novo
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Selected exercise + form */}
            {form.exercicio_nome && (
              <div className="rounded-xl bg-primary/5 border border-primary/20 px-3 py-2 flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-primary" />
                <p className="flex-1 text-sm font-medium text-foreground truncate">{form.exercicio_nome}</p>
                <button onClick={() => setForm({ ...form, exercicio_nome: "" })} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <input type="number" step="0.5" value={form.peso_kg} onKeyDown={handleEnter} onChange={(e) => setForm({ ...form, peso_kg: e.target.value })} placeholder="Peso (kg)" className="input-modern" />
              <input type="number" value={form.repeticoes} onKeyDown={handleEnter} onChange={(e) => setForm({ ...form, repeticoes: e.target.value })} placeholder="Reps" className="input-modern" />
              <input type="number" value={form.series} onKeyDown={handleEnter} onChange={(e) => setForm({ ...form, series: e.target.value })} placeholder="Séries" className="input-modern" />
            </div>
            <button onClick={save} disabled={saving || !form.exercicio_nome} className="rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail panel */}
      <AnimatePresence>
        {detailExercicio && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl border border-border bg-card shadow-card overflow-hidden"
          >
            <div className="flex items-center gap-3 p-4 border-b border-border">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{detailExercicio}</p>
                <p className="text-xs text-muted-foreground">{exercicioRegistros.length} registros</p>
              </div>
              <button onClick={() => setDetailExercicio(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {chartData.length > 1 ? (
              <div className="p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Evolução de carga (kg)</p>
                <ResponsiveContainer width="100%" height={150}>
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="pesoGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(213 72% 59%)" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="hsl(213 72% 59%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 4" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="data" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                      formatter={(v: number) => [`${v} kg`, "Peso"]}
                    />
                    <Area type="monotone" dataKey="peso" stroke="hsl(213 72% 59%)" strokeWidth={2.5} fill="url(#pesoGrad)" dot={{ r: 3, fill: "hsl(213 72% 59%)" }} animationDuration={600} />
                  </AreaChart>
                </ResponsiveContainer>

                <p className="text-xs font-medium text-muted-foreground mt-4 mb-2">Evolução de repetições</p>
                <ResponsiveContainer width="100%" height={130}>
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="repsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(152 55% 50%)" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="hsl(152 55% 50%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 4" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="data" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                      formatter={(v: number) => [`${v} reps`, "Reps"]}
                    />
                    <Area type="monotone" dataKey="reps" stroke="hsl(152 55% 45%)" strokeWidth={2.5} fill="url(#repsGrad)" dot={{ r: 3, fill: "hsl(152 55% 45%)" }} animationDuration={600} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-6">Registre mais sessões para ver a evolução.</p>
            )}

            <div className="border-t border-border p-3 max-h-72 overflow-y-auto">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Histórico</p>
              <div className="flex flex-col gap-1.5">
                {[...exercicioRegistros].reverse().map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-xs">
                    <span className="text-foreground font-medium">{r.peso_kg}kg • {r.repeticoes} reps • {r.series}x</span>
                    <span className="text-muted-foreground">{deISO(r.data).toLocaleDateString("pt-BR")}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {registros.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">Nenhum registro ainda.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {registros.map((r) => (
            <button
              key={r.id}
              onClick={() => setDetailExercicio(r.exercicio_nome)}
              className="rounded-xl bg-card border border-border p-3 flex items-center gap-3 text-left transition-all hover:border-primary/40 hover:bg-muted/40"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Dumbbell className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">{r.exercicio_nome}</p>
                <p className="text-xs text-muted-foreground">{r.series}× {r.repeticoes} reps • {r.peso_kg}kg</p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{deISO(r.data).toLocaleDateString("pt-BR")}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ExercicioChip = ({
  nome,
  ativo,
  onClick,
  favorito,
  onToggleFav,
}: {
  nome: string;
  ativo: boolean;
  onClick: () => void;
  favorito: boolean;
  onToggleFav: () => void;
}) => (
  <div
    className={`group inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
      ativo
        ? "border-primary bg-primary/10 text-primary"
        : "border-border bg-card text-foreground hover:border-primary/40"
    }`}
  >
    <button onClick={onClick} className="truncate max-w-[180px]">{nome}</button>
    <button
      onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
      className={`rounded-full p-0.5 transition-colors ${favorito ? "text-amber-500" : "text-muted-foreground hover:text-amber-500"}`}
      title={favorito ? "Remover favorito" : "Marcar favorito"}
    >
      <Star className={`h-3 w-3 ${favorito ? "fill-amber-500" : ""}`} />
    </button>
  </div>
);


// ============= MEDIDAS =============
type CampoMedida = "peso" | "cintura" | "peito" | "quadril" | "gluteo" | "perna_dir" | "perna_esq" | "pescoco" | "bracos_dir" | "bracos_esq";

const MEDIDA_FIELDS: { k: CampoMedida; l: string; short: string }[] = [
  { k: "peso", l: "Peso (kg)", short: "Peso" },
  { k: "cintura", l: "Cintura (cm)", short: "Cintura" },
  { k: "peito", l: "Peito (cm)", short: "Peito" },
  { k: "quadril", l: "Quadril (cm)", short: "Quadril" },
  { k: "gluteo", l: "Glúteo (cm)", short: "Glúteo" },
  { k: "perna_dir", l: "Perna direita (cm)", short: "Perna D" },
  { k: "perna_esq", l: "Perna esquerda (cm)", short: "Perna E" },
  { k: "pescoco", l: "Pescoço (cm)", short: "Pescoço" },
  { k: "bracos_dir", l: "Braço direito (cm)", short: "Braço D" },
  { k: "bracos_esq", l: "Braço esquerdo (cm)", short: "Braço E" },
];

const MedidasCorporais = ({ userId }: { userId: string }) => {
  const [medidas, setMedidas] = useState<Record<string, string>>({});
  const [historico, setHistorico] = useState<Medida[]>([]);
  const [saving, setSaving] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("medidas_corporais").select("*").eq("user_id", userId).order("data", { ascending: false }).limit(20);
    setHistorico(data || []);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (saving) return;
    const filled = Object.entries(medidas).filter(([, v]) => v !== "" && v !== null && v !== undefined && !isNaN(numeroBR(v)));
    if (filled.length === 0) {
      toast({ title: "Informe ao menos uma medida", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload: Record<string, string | number> = { user_id: userId, data: todayISO() };
    filled.forEach(([k, v]) => { payload[k] = numeroBR(v); });
    const { error } = await supabase.from("medidas_corporais").insert(payload as TablesInsert<"medidas_corporais">);
    setSaving(false);
    if (error) {
      toast({ title: "Não foi possível salvar", description: "Confira se os valores estão em cm e kg.", variant: "destructive" });
      return;
    }
    toast({ title: "Medidas salvas!" });
    setMedidas({});
    load();
  };

  const handleEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      save();
    }
  };

  const remover = async (id: string) => {
    const { error } = await supabase.from("medidas_corporais").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao remover", variant: "destructive" });
      return;
    }
    toast({ title: "Medida removida" });
    setOpenId(null);
    load();
  };

  // Compute deltas vs previous record
  const enriched: (Medida & { deltas: Record<string, number> })[] = historico.map((h, idx) => {
    const prev = historico[idx + 1];
    const deltas: Record<string, number> = {};
    if (prev) {
      MEDIDA_FIELDS.forEach((f) => {
        if (h[f.k] != null && prev[f.k] != null) {
          deltas[f.k] = Number(h[f.k]) - Number(prev[f.k]);
        }
      });
    }
    return { ...h, deltas };
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl gradient-nature p-4 flex items-center gap-4">
        <img src={medidasImg} alt="Personagem mostrando pontos de medição" loading="lazy" width={96} height={144} className="h-32 w-auto" />
        <div>
          <p className="text-sm font-semibold text-secondary-foreground">Como medir</p>
          <p className="text-xs text-secondary-foreground/80 mt-1">
            Use uma fita métrica relaxado. Peito: linha dos mamilos. Cintura: 2cm acima do umbigo. Quadril: parte mais larga. Pressione Enter para salvar.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <p className="text-sm font-semibold text-foreground mb-3">Novas medidas</p>
        <div className="grid grid-cols-2 gap-3">
          {MEDIDA_FIELDS.map((f) => (
            <div key={f.k}>
              <label className="text-xs text-muted-foreground">{f.l}</label>
              <input
                type="number"
                step="0.1"
                value={medidas[f.k] ?? ""}
                onChange={(e) => setMedidas({ ...medidas, [f.k]: e.target.value })}
                onKeyDown={handleEnter}
                className="input-modern"
              />
            </div>
          ))}
        </div>
        <button onClick={save} disabled={saving} className="mt-4 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Salvando..." : "Salvar medidas"}
        </button>
      </div>

      {enriched.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">Histórico</p>
          <div className="flex flex-col gap-2">
            {enriched.map((h) => {
              const isOpen = openId === h.id;
              const valoresPreenchidos = MEDIDA_FIELDS.filter((f) => h[f.k] != null);
              return (
                <motion.div
                  key={h.id}
                  layout
                  className="rounded-2xl border border-border bg-card overflow-hidden"
                >
                  <button
                    onClick={() => setOpenId(isOpen ? null : h.id)}
                    className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <Ruler className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {deISO(h.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {valoresPreenchidos.length} medida{valoresPreenchidos.length !== 1 ? "s" : ""}
                        {h.percent_gordura != null && ` • ${h.percent_gordura}% gordura`}
                      </p>
                    </div>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                        className="overflow-hidden border-t border-border"
                      >
                        <div className="p-3">
                          <div className="grid grid-cols-2 gap-2">
                            {valoresPreenchidos.map((f) => {
                              const delta = h.deltas?.[f.k];
                              const positivo = delta > 0;
                              const negativo = delta < 0;
                              return (
                                <div key={f.k} className="rounded-xl bg-muted px-3 py-2">
                                  <p className="text-[11px] text-muted-foreground">{f.short}</p>
                                  <div className="flex items-baseline gap-1.5">
                                    <span className="text-sm font-semibold text-foreground">{h[f.k]}</span>
                                    {delta != null && delta !== 0 && (
                                      <span className={`text-[10px] font-medium ${positivo ? "text-orange-500" : negativo ? "text-emerald-500" : "text-muted-foreground"}`}>
                                        {positivo ? "+" : ""}{delta.toFixed(1)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <button
                            onClick={() => remover(h.id)}
                            className="mt-3 flex items-center gap-1.5 text-xs text-destructive hover:underline"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remover este registro
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ============= CALC % GORDURA =============
const CalculadoraGordura = ({ userId }: { userId: string }) => {
  const [sexo, setSexo] = useState<"masculino" | "feminino">("masculino");
  const [altura, setAltura] = useState("");
  const [pescoco, setPescoco] = useState("");
  const [cintura, setCintura] = useState("");
  const [quadril, setQuadril] = useState("");
  const [resultado, setResultado] = useState<number | null>(null);
  const [calculando, setCalculando] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("perfil_usuario").select("sexo, altura").eq("user_id", userId).maybeSingle();
      if (data) {
        if (data.sexo === "masculino" || data.sexo === "feminino") setSexo(data.sexo);
        if (data.altura) setAltura(String(Math.round(data.altura * 100)));
      }
    };
    load();
  }, [userId]);

  const calcular = async () => {
    if (calculando) return;
    setCalculando(true);
    const r = calculateBodyFat({
      sexo,
      alturaCm: numeroBR(altura),
      pescocoCm: numeroBR(pescoco),
      cinturaCm: numeroBR(cintura),
      quadrilCm: sexo === "feminino" ? numeroBR(quadril) : undefined,
    });
    if (r === null) {
      setCalculando(false);
      toast({ title: "Dados inválidos", description: "Verifique os valores informados.", variant: "destructive" });
      return;
    }
    setResultado(r);
    await supabase.from("medidas_corporais").insert({
      user_id: userId,
      data: todayISO(),
      pescoco: numeroBR(pescoco),
      cintura: numeroBR(cintura),
      quadril: sexo === "feminino" ? numeroBR(quadril) : null,
      percent_gordura: r,
    });
    setCalculando(false);
  };

  const handleEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      calcular();
    }
  };

  const classificacao = resultado !== null ? classifyBodyFat(resultado, sexo) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl gradient-calm p-4 text-primary-foreground">
        <p className="text-sm font-semibold">Método US Navy</p>
        <p className="text-xs opacity-80 mt-1">Cálculo baseado em circunferências corporais. Pressione Enter para calcular.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card flex flex-col gap-3">
        <div>
          <label className="text-xs text-muted-foreground">Sexo</label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {[{ v: "masculino", l: "Masculino" }, { v: "feminino", l: "Feminino" }].map((o) => (
              <button
                key={o.v}
                onClick={() => setSexo(o.v as "masculino" | "feminino")}
                className={`rounded-xl border-2 py-2 text-sm font-medium ${
                  sexo === o.v ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Altura (cm)</label>
            <input type="number" value={altura} onKeyDown={handleEnter} onChange={(e) => setAltura(e.target.value)} className="input-modern" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Pescoço (cm)</label>
            <input type="number" value={pescoco} onKeyDown={handleEnter} onChange={(e) => setPescoco(e.target.value)} className="input-modern" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Cintura (cm)</label>
            <input type="number" value={cintura} onKeyDown={handleEnter} onChange={(e) => setCintura(e.target.value)} className="input-modern" />
          </div>
          {sexo === "feminino" && (
            <div>
              <label className="text-xs text-muted-foreground">Quadril (cm)</label>
              <input type="number" value={quadril} onKeyDown={handleEnter} onChange={(e) => setQuadril(e.target.value)} className="input-modern" />
            </div>
          )}
        </div>
        <button onClick={calcular} disabled={calculando} className="rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-50">
          {calculando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
          {calculando ? "Calculando..." : "Calcular"}
        </button>
      </div>

      {resultado !== null && classificacao && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl border-2 border-primary bg-primary/5 p-6 text-center">
          <p className="text-xs text-muted-foreground">Sua % de gordura corporal</p>
          <p className="text-4xl font-bold text-primary mt-2">{resultado}%</p>
          <p className={`text-sm font-semibold mt-2 ${classificacao.color}`}>{classificacao.label}</p>
        </motion.div>
      )}
    </div>
  );
};

export default Treinos;

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Dumbbell, Loader2, Plus, ChevronDown, ChevronUp,
  Ruler, Calculator, History, Save, X, Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { calculateBodyFat, classifyBodyFat } from "@/lib/bodyFat";
import medidasImg from "@/assets/medidas-personagem.png";

interface TreinoPerfil {
  objetivo: string;
  dias_semana: number;
  local_treino: string;
  nivel: string;
  grupo_foco: string;
  cardio: string;
  tempo_treino: number;
  limitacoes: string;
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

interface Treino {
  id: string;
  nome: string;
  divisao: string | null;
  dia_semana: number | null;
  exercicios?: Exercicio[];
}

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const FORM_QUESTIONS = [
  {
    key: "objetivo", label: "Qual é seu objetivo principal?",
    options: [
      { v: "emagrecimento", l: "Emagrecer" },
      { v: "ganho_massa", l: "Ganhar massa" },
      { v: "condicionamento", l: "Condicionamento" },
      { v: "saude_geral", l: "Saúde geral" },
    ],
  },
  {
    key: "dias_semana", label: "Quantos dias por semana você pode treinar?",
    options: [
      { v: 2, l: "2 dias" }, { v: 3, l: "3 dias" },
      { v: 4, l: "4 dias" }, { v: 5, l: "5 dias" }, { v: 6, l: "6 dias" },
    ],
  },
  {
    key: "local_treino", label: "Onde você vai treinar?",
    options: [
      { v: "academia", l: "Academia" }, { v: "casa", l: "Em casa" }, { v: "ar_livre", l: "Ar livre" },
    ],
  },
  {
    key: "nivel", label: "Qual é o seu nível de experiência?",
    options: [
      { v: "iniciante", l: "Iniciante" }, { v: "intermediario", l: "Intermediário" }, { v: "avancado", l: "Avançado" },
    ],
  },
  {
    key: "grupo_foco", label: "Qual grupo muscular quer priorizar?",
    options: [
      { v: "superior", l: "Superior" }, { v: "inferior", l: "Inferior" }, { v: "full_body", l: "Full body" },
    ],
  },
  {
    key: "cardio", label: "Como prefere o cardio?",
    options: [
      { v: "nao", l: "Sem cardio" }, { v: "leve", l: "Leve" },
      { v: "moderado", l: "Moderado" }, { v: "intenso", l: "Intenso" },
    ],
  },
  {
    key: "tempo_treino", label: "Quanto tempo você tem por sessão?",
    options: [
      { v: 30, l: "30 min" }, { v: 45, l: "45 min" },
      { v: 60, l: "60 min" }, { v: 90, l: "90 min" },
    ],
  },
  {
    key: "limitacoes", label: "Tem alguma lesão ou limitação física?",
    options: [
      { v: "nenhuma", l: "Nenhuma" }, { v: "joelho", l: "Joelho" },
      { v: "coluna", l: "Coluna" }, { v: "ombro", l: "Ombro" },
    ],
  },
];

// ─── Main component ───────────────────────────────────────────────────────────

const Treinos = () => {
  const { user, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [perfil, setPerfil] = useState<TreinoPerfil | null>(null);
  const [treinos, setTreinos] = useState<Treino[]>([]);
  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [savingPerfil, setSavingPerfil] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tab, setTab] = useState<"plano" | "registro" | "medidas" | "calc">("plano");

  useEffect(() => {
    if (user) loadAll();
  }, [user]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [{ data: tp }, { data: ts }] = await Promise.all([
        supabase.from("treino_perfil").select("*").eq("user_id", user!.id).maybeSingle(),
        supabase.from("treinos").select("*").eq("user_id", user!.id).eq("ativo", true).order("dia_semana"),
      ]);

      if (tp) setPerfil(tp as TreinoPerfil);

      if (ts && ts.length > 0) {
        const ids = ts.map((t) => t.id);
        const { data: exs } = await supabase
          .from("treino_exercicios")
          .select("*")
          .in("treino_id", ids)
          .order("ordem");

        const grouped: Record<string, Exercicio[]> = {};
        (exs ?? []).forEach((e) => {
          if (!grouped[e.treino_id]) grouped[e.treino_id] = [];
          grouped[e.treino_id].push(e as Exercicio);
        });
        setTreinos(ts.map((t) => ({ ...t, exercicios: grouped[t.id] ?? [] })));
      } else {
        setTreinos([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const savePerfil = async () => {
    setSavingPerfil(true);
    const payload = {
      user_id: user!.id,
      objetivo: formData.objetivo as string,
      dias_semana: formData.dias_semana as number,
      local_treino: formData.local_treino as string,
      nivel: formData.nivel as string,
      grupo_foco: formData.grupo_foco as string,
      cardio: formData.cardio as string,
      tempo_treino: formData.tempo_treino as number,
      limitacoes: formData.limitacoes as string,
    };

    const { error } = await supabase.from("treino_perfil").upsert(payload, { onConflict: "user_id" });
    setSavingPerfil(false);

    if (error) {
      toast({ title: "Erro ao salvar perfil", description: error.message, variant: "destructive" });
      return;
    }
    setPerfil(payload as TreinoPerfil);
    toast({ title: "Perfil salvo!" });
    await gerarTreinos(payload);
  };

  const gerarTreinos = async (perfilOverride?: TreinoPerfil) => {
    if (!session?.access_token) {
      toast({ title: "Sessão expirada. Faça login novamente.", variant: "destructive" });
      return;
    }
    setGenerating(true);

    // Load user profile to enrich the AI prompt
    const { data: userProfile } = await supabase
      .from("perfil_usuario")
      .select("nome, idade, peso, altura, sexo, nivel_atividade, nivel_estresse, qualidade_sono, humor_geral, objetivo")
      .eq("user_id", user!.id)
      .maybeSingle();

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gerar-treino`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ perfilUsuario: userProfile ?? null, treinoPerfil: perfilOverride ?? perfil }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(err.error ?? "Falha ao gerar treinos");
      }

      const data = await resp.json();
      toast({ title: "Treino gerado!", description: `${data.count ?? ""} treinos criados com IA.` });
      await loadAll();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao gerar treinos";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // ── Onboarding form ──
  if (!perfil) {
    const q = FORM_QUESTIONS[step];
    const isLast = step === FORM_QUESTIONS.length - 1;
    const canNext = formData[q.key] !== undefined && formData[q.key] !== "";

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6 max-w-xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurar Treinos</h1>
          <p className="text-sm text-muted-foreground">
            Pergunta {step + 1} de {FORM_QUESTIONS.length} — a IA usará suas respostas e seu perfil para montar o plano ideal.
          </p>
        </div>

        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            animate={{ width: `${((step + 1) / FORM_QUESTIONS.length) * 100}%` }}
            transition={{ type: "spring", stiffness: 120 }}
          />
        </div>

        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-2xl border border-border bg-card p-6 shadow-card"
        >
          <p className="mb-4 text-base font-semibold text-foreground">{q.label}</p>
          <div className="grid grid-cols-2 gap-2">
            {q.options.map((opt) => (
              <button
                key={String(opt.v)}
                onClick={() => setFormData((prev) => ({ ...prev, [q.key]: opt.v }))}
                className={`rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all ${
                  formData[q.key] === opt.v
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-foreground hover:border-primary/40"
                }`}
              >
                {opt.l}
              </button>
            ))}
          </div>
        </motion.div>

        <div className="flex gap-2">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 rounded-xl border border-border bg-card py-3 text-sm font-medium hover:bg-muted"
            >
              Voltar
            </button>
          )}
          <button
            onClick={isLast ? savePerfil : () => setStep((s) => s + 1)}
            disabled={!canNext || savingPerfil}
            className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-soft disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {savingPerfil && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLast ? (savingPerfil ? "Gerando..." : "Gerar Treino") : "Próxima"}
          </button>
        </div>
      </motion.div>
    );
  }

  // ── Main view ──
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Treinos</h1>
          <p className="text-sm text-muted-foreground">Seu plano personalizado por IA</p>
        </div>
        <button
          onClick={() => gerarTreinos()}
          disabled={generating}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft disabled:opacity-50"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {generating ? "Gerando..." : "Gerar Treino"}
        </button>
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
            <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-border p-10 text-center">
              <Sparkles className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-semibold text-foreground">Nenhum treino ainda</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Clique em "Gerar Treino" para que a IA crie seu plano personalizado.
                </p>
              </div>
              <button
                onClick={() => gerarTreinos()}
                disabled={generating}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Gerar Treino
              </button>
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
                          {t.dia_semana !== null && DIAS[t.dia_semana]} • {t.exercicios?.length ?? 0} exercícios
                        </p>
                      </div>
                      {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </button>

                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="border-t border-border p-4 flex flex-col gap-2"
                      >
                        {(t.exercicios ?? []).map((e) => (
                          <div key={e.id} className="rounded-xl bg-muted p-3">
                            <p className="font-medium text-foreground text-sm">{e.nome}</p>
                            <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                              <span>{e.series}× {e.repeticoes}</span>
                              <span>•</span>
                              <span>{e.descanso_seg}s descanso</span>
                            </div>
                            {e.observacao && (
                              <p className="text-xs text-muted-foreground mt-1 italic">{e.observacao}</p>
                            )}
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

// ─── Registro ─────────────────────────────────────────────────────────────────

const RegistroTreino = ({ userId, treinos }: { userId: string; treinos: Treino[] }) => {
  const [registros, setRegistros] = useState<Record<string, unknown>[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ exercicio_nome: "", peso_kg: "", repeticoes: "", series: "1" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase
      .from("treino_registro")
      .select("*")
      .eq("user_id", userId)
      .order("data", { ascending: false })
      .limit(50);
    setRegistros(data ?? []);
  };

  const save = async () => {
    if (!form.exercicio_nome || !form.peso_kg || !form.repeticoes) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    const pesoNum = Number(form.peso_kg);
    const repsNum = Number(form.repeticoes);
    const seriesNum = Number(form.series);
    if (pesoNum <= 0 || repsNum <= 0 || seriesNum <= 0) {
      toast({ title: "Valores inválidos", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("treino_registro").insert({
      user_id: userId,
      exercicio_nome: form.exercicio_nome,
      peso_kg: pesoNum,
      repeticoes: repsNum,
      series: seriesNum,
    });
    setSaving(false);
    if (error) { toast({ title: "Erro ao salvar", variant: "destructive" }); return; }
    toast({ title: "Registro salvo!" });
    setShowAdd(false);
    setForm({ exercicio_nome: "", peso_kg: "", repeticoes: "", series: "1" });
    load();
  };

  const allExercicios = Array.from(new Set(treinos.flatMap((t) => t.exercicios?.map((e) => e.nome) ?? [])));

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => setShowAdd((v) => !v)}
        className="flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-soft"
      >
        {showAdd ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {showAdd ? "Cancelar" : "Novo registro"}
      </button>

      {showAdd && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card p-5 shadow-card flex flex-col gap-3"
        >
          {allExercicios.length > 0 ? (
            <select
              value={form.exercicio_nome}
              onChange={(e) => setForm((f) => ({ ...f, exercicio_nome: e.target.value }))}
              className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
            >
              <option value="">Selecione exercício</option>
              {allExercicios.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          ) : (
            <input
              value={form.exercicio_nome}
              onChange={(e) => setForm((f) => ({ ...f, exercicio_nome: e.target.value }))}
              placeholder="Nome do exercício"
              className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
            />
          )}
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: "peso_kg", placeholder: "Peso (kg)", step: "0.5" },
              { key: "repeticoes", placeholder: "Reps", step: "1" },
              { key: "series", placeholder: "Séries", step: "1" },
            ].map(({ key, placeholder, step }) => (
              <input
                key={key}
                type="number"
                min="0"
                step={step}
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
              />
            ))}
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar
          </button>
        </motion.div>
      )}

      {registros.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">Nenhum registro ainda.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {registros.map((r) => (
            <div key={r.id as string} className="rounded-xl bg-card border border-border p-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Dumbbell className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">{r.exercicio_nome as string}</p>
                <p className="text-xs text-muted-foreground">
                  {r.series as number}× {r.repeticoes as number} reps • {r.peso_kg as number}kg
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(r.data as string).toLocaleDateString("pt-BR")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Medidas ──────────────────────────────────────────────────────────────────

const MEDIDA_FIELDS = [
  { k: "peso", l: "Peso (kg)" }, { k: "cintura", l: "Cintura (cm)" },
  { k: "peito", l: "Peito (cm)" }, { k: "quadril", l: "Quadril (cm)" },
  { k: "gluteo", l: "Glúteo (cm)" }, { k: "perna_dir", l: "Perna direita (cm)" },
  { k: "perna_esq", l: "Perna esquerda (cm)" }, { k: "pescoco", l: "Pescoço (cm)" },
  { k: "bracos_dir", l: "Braço direito (cm)" }, { k: "bracos_esq", l: "Braço esquerdo (cm)" },
];

const MedidasCorporais = ({ userId }: { userId: string }) => {
  const [medidas, setMedidas] = useState<Record<string, string>>({});
  const [historico, setHistorico] = useState<Record<string, unknown>[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase
      .from("medidas_corporais").select("*").eq("user_id", userId)
      .order("data", { ascending: false }).limit(10);
    setHistorico(data ?? []);
  };

  const save = async () => {
    const payload: Record<string, unknown> = { user_id: userId };
    let hasAny = false;
    MEDIDA_FIELDS.forEach(({ k }) => {
      const v = medidas[k];
      if (v && Number(v) > 0) { payload[k] = Number(v); hasAny = true; }
    });
    if (!hasAny) { toast({ title: "Informe ao menos uma medida", variant: "destructive" }); return; }
    setSaving(true);
    const { error } = await supabase.from("medidas_corporais").insert(payload);
    setSaving(false);
    if (error) { toast({ title: "Erro ao salvar", variant: "destructive" }); return; }
    toast({ title: "Medidas salvas!" });
    setMedidas({});
    load();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl gradient-nature p-4 flex items-center gap-4">
        <img src={medidasImg} alt="Guia de medição" loading="lazy" width={96} height={144} className="h-32 w-auto" />
        <div>
          <p className="text-sm font-semibold text-secondary-foreground">Como medir</p>
          <p className="text-xs text-secondary-foreground/80 mt-1">
            Use fita métrica relaxado. Peito: linha dos mamilos. Cintura: 2 cm acima do umbigo. Quadril: parte mais larga.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <p className="text-sm font-semibold text-foreground mb-3">Novas medidas</p>
        <div className="grid grid-cols-2 gap-3">
          {MEDIDA_FIELDS.map(({ k, l }) => (
            <div key={k}>
              <label className="text-xs text-muted-foreground">{l}</label>
              <input
                type="number" step="0.1" min="0"
                value={medidas[k] ?? ""}
                onChange={(e) => setMedidas((m) => ({ ...m, [k]: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
              />
            </div>
          ))}
        </div>
        <button
          onClick={save} disabled={saving}
          className="mt-4 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar medidas
        </button>
      </div>

      {historico.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">Histórico</p>
          <div className="flex flex-col gap-2">
            {historico.map((h) => (
              <div key={h.id as string} className="rounded-xl bg-muted p-3 text-xs">
                <p className="font-medium text-foreground mb-1">
                  {new Date(h.data as string).toLocaleDateString("pt-BR")}
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
                  {h.peso && <span>Peso: {h.peso as number}kg</span>}
                  {h.cintura && <span>Cintura: {h.cintura as number}cm</span>}
                  {h.peito && <span>Peito: {h.peito as number}cm</span>}
                  {h.quadril && <span>Quadril: {h.quadril as number}cm</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Calculadora Gordura ──────────────────────────────────────────────────────

const CalculadoraGordura = ({ userId }: { userId: string }) => {
  const [sexo, setSexo] = useState<"masculino" | "feminino">("masculino");
  const [altura, setAltura] = useState("");
  const [pescoco, setPescoco] = useState("");
  const [cintura, setCintura] = useState("");
  const [quadril, setQuadril] = useState("");
  const [resultado, setResultado] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from("perfil_usuario")
      .select("sexo, altura")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        if (data.sexo === "masculino" || data.sexo === "feminino") setSexo(data.sexo);
        if (data.altura) setAltura(String(Math.round(Number(data.altura) * 100)));
      });
  }, [userId]);

  const calcular = async () => {
    const r = calculateBodyFat({
      sexo,
      alturaCm: Number(altura),
      pescocoCm: Number(pescoco),
      cinturaCm: Number(cintura),
      quadrilCm: sexo === "feminino" ? Number(quadril) : undefined,
    });
    if (r === null) {
      toast({ title: "Dados inválidos", description: "Verifique os valores.", variant: "destructive" });
      return;
    }
    setResultado(r);
    await supabase.from("medidas_corporais").insert({
      user_id: userId,
      pescoco: Number(pescoco),
      cintura: Number(cintura),
      quadril: sexo === "feminino" ? Number(quadril) : null,
      percent_gordura: r,
    });
  };

  const classificacao = resultado !== null ? classifyBodyFat(resultado, sexo) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl gradient-calm p-4 text-primary-foreground">
        <p className="text-sm font-semibold">Método US Navy</p>
        <p className="text-xs opacity-80 mt-1">Cálculo por circunferências corporais. Resultado estimado.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card flex flex-col gap-3">
        <div>
          <label className="text-xs text-muted-foreground">Sexo</label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {[{ v: "masculino", l: "Masculino" }, { v: "feminino", l: "Feminino" }].map((o) => (
              <button
                key={o.v}
                onClick={() => { setSexo(o.v as typeof sexo); setResultado(null); }}
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
          {[
            { label: "Altura (cm)", val: altura, set: setAltura },
            { label: "Pescoço (cm)", val: pescoco, set: setPescoco },
            { label: "Cintura (cm)", val: cintura, set: setCintura },
            ...(sexo === "feminino" ? [{ label: "Quadril (cm)", val: quadril, set: setQuadril }] : []),
          ].map(({ label, val, set }) => (
            <div key={label}>
              <label className="text-xs text-muted-foreground">{label}</label>
              <input
                type="number" min="0" step="0.1"
                value={val} onChange={(e) => { set(e.target.value); setResultado(null); }}
                className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
              />
            </div>
          ))}
        </div>

        <button
          onClick={calcular}
          className="rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground flex items-center justify-center gap-2"
        >
          <Calculator className="h-4 w-4" /> Calcular
        </button>
      </div>

      {resultado !== null && classificacao && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border-2 border-primary bg-primary/5 p-6 text-center"
        >
          <p className="text-xs text-muted-foreground">% de gordura corporal estimada</p>
          <p className="text-4xl font-bold text-primary mt-2">{resultado}%</p>
          <p className={`text-sm font-semibold mt-2 ${classificacao.color}`}>{classificacao.label}</p>
        </motion.div>
      )}
    </div>
  );
};

export default Treinos;

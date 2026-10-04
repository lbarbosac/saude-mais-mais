import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, Target, RefreshCw, Loader2,
  BookOpen, Dumbbell, Brain, Heart, Users, Moon,
  Droplets, Apple, Music, Eye, Check, Sun, Leaf,
  Smile, Coffee, Wind, Star, Shield, Clock, Zap, Flame,
  Sparkles,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { callEdgeFunction } from "@/lib/supabase/functions";
import { RenovarHabitosModal } from "@/components/features/habits/RenovarHabitosModal";
import { useHabitosDoDia } from "@/hooks/useHabitosDoDia";
import type { HabitoSelecionado } from "@/lib/utils/habitSelection";
import { toast } from "@/hooks/use-toast";

// ─── Ícones ───────────────────────────────────────────────────────────────────

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
  sun:         Sun,
  leaf:        Leaf,
  smile:       Smile,
  coffee:      Coffee,
  wind:        Wind,
  star:        Star,
  shield:      Shield,
  clock:       Clock,
  target:      Target,
  zap:         Zap,
  flame:       Flame,
};

// Labels de categoria para exibição
const CATEGORIA_LABEL: Record<string, string> = {
  movimento:          "Movimento",
  agua_alimentacao:   "Alimentação",
  sono_descanso:      "Descanso",
  respiracao:         "Respiração",
  social_gratidao:    "Social",
  foco_aprendizado:   "Foco",
  humor_emocao:       "Emoção",
  geral:              "Geral",
};

// ─── Componente principal ─────────────────────────────────────────────────────

export default function HabitsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showRenovarModal, setShowRenovarModal] = useState(false);

  const { habitos, isLoading, toggleMutation, queryKey } = useHabitosDoDia(user?.id);

  const generateMutation = useMutation({
    mutationFn: () => callEdgeFunction("gerar-habitos"),
    onSuccess: () => {
      toast({
        title: "Novos hábitos gerados!",
        description: "Sua lista foi renovada com hábitos personalizados.",
      });
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

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Hábitos do Dia</h1>
          <p className="text-sm text-muted-foreground">
            {habitos.length > 0
              ? "Selecionados especialmente para você hoje"
              : "Gere seus hábitos personalizados"}
          </p>
        </div>
        <button
          onClick={() => setShowRenovarModal(true)}
          disabled={generateMutation.isPending}
          aria-label={generateMutation.isPending ? "Gerando hábitos..." : "Renovar hábitos com IA"}
          className="flex h-10 items-center gap-2 rounded-xl bg-primary px-3 text-sm font-medium text-primary-foreground shadow-soft transition-all hover:bg-primary/90 disabled:opacity-50"
        >
          {generateMutation.isPending
            ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            : <RefreshCw className="h-4 w-4" aria-hidden />}
          <span className="hidden sm:inline">
            {generateMutation.isPending ? "Gerando..." : "Renovar"}
          </span>
        </button>
      </div>

      {/* Estado vazio */}
      {habitos.length === 0 && (
        <EmptyState
          onGenerate={() => generateMutation.mutate()}
          isGenerating={generateMutation.isPending}
        />
      )}

      {/* Barra de progresso */}
      <AnimatePresence>
        {habitos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl gradient-nature p-5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-secondary-foreground" aria-hidden />
                <span className="text-sm font-semibold text-secondary-foreground">
                  Progresso de hoje
                </span>
              </div>
              <span className="text-sm font-bold text-secondary-foreground">
                {completed}/{habitos.length}
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary-foreground/10">
              <motion.div
                className="h-full rounded-full bg-secondary-foreground/40"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            {completed === habitos.length && habitos.length > 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-2 text-xs font-medium text-secondary-foreground/80"
              >
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden />Parabéns! Você completou todos os hábitos de hoje.</span>
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de hábitos */}
      {habitos.length > 0 && (
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

      {/* Nota explicativa */}
      {habitos.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          Seus hábitos mudam a cada dia para manter a variedade. Use "Renovar" para gerar uma lista completamente nova.
        </p>
      )}
    </motion.div>
  );
}

// ─── HabitoCard ───────────────────────────────────────────────────────────────

function HabitoCard({
  habito,
  index,
  onToggle,
}: {
  habito: HabitoSelecionado;
  index: number;
  onToggle: () => void;
}) {
  const Icon = ICON_MAP[habito.icone] ?? Check;
  const done = habito.concluido_hoje;
  const catLabel = CATEGORIA_LABEL[habito.categoria] ?? habito.categoria;

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onToggle}
      aria-pressed={done}
      aria-label={`${done ? "Desmarcar" : "Marcar como concluído"}: ${habito.nome_habito}`}
      className={[
        "flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all duration-200",
        done
          ? "border-primary/20 bg-primary/5"
          : "border-border bg-card hover:border-primary/30 hover:shadow-soft",
      ].join(" ")}
    >
      {/* Ícone */}
      <div className={[
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors",
        done ? "bg-primary/10" : "bg-muted",
      ].join(" ")}>
        <Icon
          className={["h-5 w-5", done ? "text-primary" : "text-muted-foreground"].join(" ")}
          aria-hidden
        />
      </div>

      {/* Texto */}
      <div className="min-w-0 flex-1">
        <p className={[
          "font-medium leading-snug",
          done ? "text-muted-foreground line-through" : "text-foreground",
        ].join(" ")}>
          {habito.nome_habito}
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          {habito.descricao && (
            <p className="truncate text-xs text-muted-foreground">{habito.descricao}</p>
          )}
          <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {catLabel}
          </span>
        </div>
      </div>

      {/* Checkbox visual */}
      <div className={[
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 transition-all",
        done
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border",
      ].join(" ")}>
        {done && <CheckCircle2 className="h-4 w-4" aria-hidden />}
      </div>
    </motion.button>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({
  onGenerate,
  isGenerating,
}: {
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-5 rounded-2xl border-2 border-dashed border-border p-10 text-center"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <Sparkles className="h-8 w-8 text-primary" aria-hidden />
      </div>
      <div>
        <p className="text-lg font-bold text-foreground">Nenhum hábito ainda</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Clique no botão abaixo para criar sua lista personalizada com inteligência artificial.
          Novos hábitos serão selecionados todo dia automaticamente.
        </p>
      </div>
      <button
        onClick={onGenerate}
        disabled={isGenerating}
        className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:bg-primary/90 disabled:opacity-60"
      >
        {isGenerating
          ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          : <Sparkles className="h-4 w-4" aria-hidden />}
        {isGenerating ? "Gerando seus hábitos..." : "Criar hábitos com IA"}
      </button>
    </motion.div>
  );
}

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, Sparkles, Target, Brain, Activity,
  ArrowRight, Check, Loader2, Sun, Moon, Zap,
  Dumbbell, Leaf, BatteryCharging, Sofa, PersonStanding, TrendingUp,
  Smile, Meh, Frown, CloudMoon, CloudLightning,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface StepOption { value: string; label: string; Icon: React.ElementType; }
interface OnboardingProps {
  onComplete: () => void;
}

interface OnboardingData {
  nome: string;
  objetivo: string;
  nivel_atividade: string;
  nivel_estresse: string;
  qualidade_sono: string;
}

const STEPS = [
  {
    id: "nome",
    title: "Qual é o seu nome?",
    subtitle: "Vamos personalizar tudo para você.",
    icon: Heart,
    gradient: "from-rose-400 to-pink-500",
    type: "text" as const,
    placeholder: "Seu primeiro nome",
    field: "nome" as keyof OnboardingData,
  },
  {
    id: "objetivo",
    title: "Qual é o seu principal objetivo?",
    subtitle: "Isso nos ajuda a criar hábitos feitos para você.",
    icon: Target,
    gradient: "from-blue-400 to-indigo-500",
    type: "options" as const,
    field: "objetivo" as keyof OnboardingData,
    options: [
      { value: "emagrecer", label: "Emagrecer", Icon: TrendingUp },
      { value: "ganhar_massa", label: "Ganhar massa", Icon: Dumbbell },
      { value: "saude_mental", label: "Saúde mental", Icon: Brain },
      { value: "mais_energia", label: "Mais energia", Icon: BatteryCharging },
      { value: "dormir_melhor", label: "Dormir melhor", Icon: Moon },
      { value: "reduzir_estresse", label: "Reduzir estresse", Icon: Leaf },
    ],
  },
  {
    id: "nivel_atividade",
    title: "Como é seu nível de atividade hoje?",
    subtitle: "Sem julgamentos. Queremos entender onde você está agora.",
    icon: Activity,
    gradient: "from-emerald-400 to-teal-500",
    type: "options" as const,
    field: "nivel_atividade" as keyof OnboardingData,
    options: [
      { value: "sedentario", label: "Sedentário", Icon: Sofa },
      { value: "leve", label: "Levemente ativo", Icon: PersonStanding },
      { value: "moderado", label: "Moderadamente ativo", Icon: Activity },
      { value: "intenso", label: "Muito ativo", Icon: Dumbbell },
    ],
  },
  {
    id: "nivel_estresse",
    title: "Como está seu nível de estresse?",
    subtitle: "Isso nos ajuda a escolher os melhores hábitos para você.",
    icon: Brain,
    gradient: "from-violet-400 to-purple-500",
    type: "options" as const,
    field: "nivel_estresse" as keyof OnboardingData,
    options: [
      { value: "baixo", label: "Tranquilo", Icon: Smile },
      { value: "moderado", label: "Moderado", Icon: Meh },
      { value: "alto", label: "Bem estressado", Icon: Frown },
    ],
  },
  {
    id: "qualidade_sono",
    title: "Como você dorme?",
    subtitle: "O sono é a base de tudo. Seja honesto consigo mesmo.",
    icon: Moon,
    gradient: "from-indigo-400 to-blue-600",
    type: "options" as const,
    field: "qualidade_sono" as keyof OnboardingData,
    options: [
      { value: "boa", label: "Durmo bem", Icon: Moon },
      { value: "irregular", label: "Irregular", Icon: CloudMoon },
      { value: "ruim", label: "Durmo mal", Icon: CloudLightning },
    ],
  },
];

const SLIDE_VARIANTS = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
};

export function OnboardingFlow({ onComplete }: OnboardingProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [data, setData] = useState<Partial<OnboardingData>>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const canProceed = current.type === "text"
    ? (data[current.field] ?? "").toString().trim().length >= 2
    : !!data[current.field];

  const go = useCallback((dir: 1 | -1) => {
    setDirection(dir);
    setStep((s) => s + dir);
  }, []);

  const handleSelect = (value: string) => {
    setData((d) => ({ ...d, [current.field]: value }));
  };

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);

    // upsert em vez de update — protege contra race condition onde a linha
    // do perfil_usuario ainda não foi criada pelo trigger do banco
    const { error } = await supabase
      .from("perfil_usuario")
      .upsert(
        {
          user_id: user.id,
          nome: data.nome?.trim(),
          objetivo: data.objetivo,
          nivel_atividade: data.nivel_atividade,
          nivel_estresse: data.nivel_estresse,
          qualidade_sono: data.qualidade_sono,
          onboarding_completo: true,
        },
        { onConflict: "user_id" }
      );

    setSaving(false);

    if (error) {
      console.error("Onboarding save error:", error);
      // Não bloqueia o usuário mesmo com erro — ele pode completar o perfil depois
    }

    setDone(true);
    setTimeout(onComplete, 2200);
  };

  // ── Success screen ───────────────────────────────────────────────────────
  if (done) {
    const firstName = data.nome?.split(" ")[0] ?? "";
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-6"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 14, stiffness: 200, delay: 0.1 }}
          className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl gradient-hero shadow-elevated"
        >
          <Sparkles className="h-12 w-12 text-white" />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center text-3xl font-bold text-foreground"
        >
          Tudo pronto{firstName ? `, ${firstName}` : ""}!
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-3 text-center text-muted-foreground"
        >
          Seus hábitos personalizados estão sendo criados ✨
        </motion.p>
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.7, duration: 1.2, ease: "easeOut" }}
          className="mt-8 h-1.5 w-48 origin-left rounded-full gradient-calm"
        />
      </motion.div>
    );
  }

  const Icon = current.icon;
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Progress bar */}
      <div className="h-1 w-full bg-muted">
        <motion.div
          className="h-full gradient-calm"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden px-6 py-8">
        {/* Step counter */}
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => step > 0 && go(-1)}
            className={[
              "text-sm text-muted-foreground transition-opacity",
              step === 0 ? "pointer-events-none opacity-0" : "opacity-100",
            ].join(" ")}
          >
            ← Voltar
          </button>
          <span className="text-xs text-muted-foreground">
            {step + 1} de {STEPS.length}
          </span>
        </div>

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={SLIDE_VARIANTS}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            className="flex flex-1 flex-col"
          >
            {/* Icon */}
            <div
              className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${current.gradient} shadow-soft`}
            >
              <Icon className="h-7 w-7 text-white" aria-hidden />
            </div>

            {/* Title */}
            <h2 className="mb-2 text-2xl font-bold text-foreground">{current.title}</h2>
            <p className="mb-8 text-sm text-muted-foreground">{current.subtitle}</p>

            {/* Input */}
            {current.type === "text" ? (
              <input
                autoFocus
                type="text"
                value={(data[current.field] as string) ?? ""}
                onChange={(e) => handleSelect(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canProceed)
                    isLast ? handleFinish() : go(1);
                }}
                placeholder={current.placeholder}
                className="input-modern text-lg py-4"
              />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {current.options?.map((opt) => {
                  const selected = data[current.field] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleSelect(opt.value)}
                      className={[
                        "relative flex flex-col items-start gap-1.5 rounded-2xl border-2 p-4 text-left transition-all",
                        selected
                          ? "border-primary bg-primary/8 shadow-soft"
                          : "border-border bg-card hover:border-primary/30",
                      ].join(" ")}
                    >
                      <div className={[
                        "mb-1 flex h-8 w-8 items-center justify-center rounded-lg",
                        selected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                      ].join(" ")}>
                        <opt.Icon className="h-4 w-4" aria-hidden />
                      </div>
                      <span
                        className={[
                          "text-sm font-medium leading-tight",
                          selected ? "text-primary" : "text-foreground",
                        ].join(" ")}
                      >
                        {opt.label}
                      </span>
                      {selected && (
                        <span className="absolute right-3 top-3">
                          <Check className="h-3.5 w-3.5 text-primary" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* CTA */}
        <motion.button
          onClick={isLast ? handleFinish : () => go(1)}
          disabled={!canProceed || saving}
          whileTap={{ scale: 0.97 }}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl gradient-calm py-4 text-base font-semibold text-white shadow-soft transition-all disabled:opacity-40"
        >
          {saving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isLast ? (
            <>
              <Sparkles className="h-5 w-5" />
              Começar minha jornada
            </>
          ) : (
            <>
              Continuar
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Flame, Star, Zap, Trophy, Crown } from "lucide-react";
import type { ConquistaEvent } from "@/hooks/useStreakConquista";
import Confetti from "./Confetti";
import FireworksBurst from "./FireworksBurst";
import StarShower from "./StarShower";

interface Props {
  conquista: ConquistaEvent;
  onDismiss: () => void;
}

// Each milestone gets a distinct visual theme
const MILESTONE_CONFIG: Record<
  number,
  {
    icon: React.ElementType;
    iconColor: string;
    gradient: string;
    title: string;
    subtitle: (name: string) => string;
    animation: "confetti" | "fireworks" | "stars";
    ring: string;
  }
> = {
  7: {
    icon: Flame,
    iconColor: "text-orange-400",
    gradient: "from-orange-400 via-amber-400 to-yellow-400",
    title: "🔥 1 semana seguida!",
    subtitle: (n) => `${n ? n + ", você" : "Você"} está pegando fogo! Sete dias sem parar.`,
    animation: "confetti",
    ring: "ring-orange-400/40",
  },
  14: {
    icon: Star,
    iconColor: "text-yellow-400",
    gradient: "from-yellow-400 via-amber-300 to-orange-400",
    title: "⭐ Duas semanas!",
    subtitle: (n) => `${n || "Você"} é consistente de verdade. 14 dias é coisa séria.`,
    animation: "stars",
    ring: "ring-yellow-400/40",
  },
  30: {
    icon: Trophy,
    iconColor: "text-emerald-400",
    gradient: "from-emerald-400 via-teal-400 to-cyan-400",
    title: "🏆 30 dias!",
    subtitle: (n) =>
      `${n || "Você"} transformou um hábito em rotina. Um mês inteiro!`,
    animation: "fireworks",
    ring: "ring-emerald-400/40",
  },
  60: {
    icon: Zap,
    iconColor: "text-violet-400",
    gradient: "from-violet-400 via-purple-400 to-fuchsia-400",
    title: "⚡ 60 dias!",
    subtitle: (n) =>
      `${n || "Você"} ultrapassou a marca dos dois meses. Isso é raro.`,
    animation: "fireworks",
    ring: "ring-violet-400/40",
  },
  100: {
    icon: Crown,
    iconColor: "text-yellow-300",
    gradient: "from-yellow-300 via-amber-400 to-orange-500",
    title: "👑 100 dias!!",
    subtitle: (n) =>
      `${n || "Você"} é lendário. 100 dias seguidos — isso muda uma vida.`,
    animation: "fireworks",
    ring: "ring-yellow-300/40",
  },
};

const DEFAULT_CONFIG = MILESTONE_CONFIG[7];

export function ConquistaModal({ conquista, onDismiss }: Props) {
  const config = MILESTONE_CONFIG[conquista.milestone] ?? DEFAULT_CONFIG;
  const Icon = config.icon;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDismiss}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Particle layer */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {config.animation === "confetti" && <Confetti />}
          {config.animation === "fireworks" && <FireworksBurst />}
          {config.animation === "stars" && <StarShower />}
        </div>

        {/* Modal card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 20 }}
          transition={{ type: "spring", damping: 18, stiffness: 260 }}
          className={`relative z-10 w-full max-w-sm rounded-3xl border border-border bg-card p-8 shadow-2xl ring-4 ${config.ring}`}
        >
          {/* Close */}
          <button
            onClick={onDismiss}
            aria-label="Fechar"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Icon circle */}
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center">
            {/* Pulsing ring */}
            <motion.div
              animate={{ scale: [1, 1.18, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className={`absolute h-24 w-24 rounded-full bg-gradient-to-br ${config.gradient} opacity-20`}
            />
            <motion.div
              initial={{ rotate: -15 }}
              animate={{ rotate: 15 }}
              transition={{ duration: 1.4, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
              className={`relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br ${config.gradient} shadow-elevated`}
            >
              <Icon className="h-10 w-10 text-white" aria-hidden />
            </motion.div>
          </div>

          {/* Streak number */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 12, stiffness: 300, delay: 0.2 }}
            className="mb-4 text-center"
          >
            <span
              className={`bg-gradient-to-r ${config.gradient} bg-clip-text text-6xl font-black text-transparent`}
            >
              {conquista.streak}
            </span>
            <span className="ml-1 text-xl font-bold text-muted-foreground">dias</span>
          </motion.div>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-2 text-center text-xl font-bold text-foreground"
          >
            {config.title}
          </motion.h2>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8 text-center text-sm leading-relaxed text-muted-foreground"
          >
            {config.subtitle(conquista.userName)}
          </motion.p>

          {/* CTA */}
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            whileTap={{ scale: 0.97 }}
            onClick={onDismiss}
            className={`w-full rounded-2xl bg-gradient-to-r ${config.gradient} py-4 text-base font-bold text-white shadow-soft`}
          >
            Continuar a sequência 💪
          </motion.button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

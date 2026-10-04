import {
  Apple, BookOpen, Brain, Check, Clock, Coffee, Droplets, Dumbbell, Eye, Flame,
  Heart, Leaf, Moon, Music, Shield, Smile, Star, Sun, Target, Users, Wind, Zap,
  type LucideIcon,
} from "lucide-react";

// Ícones aceitos para hábitos. Espelha ICONES em supabase/functions/_shared/habitos.ts.
export const ICONES_HABITO: Record<string, LucideIcon> = {
  "book-open": BookOpen,
  dumbbell: Dumbbell,
  brain: Brain,
  heart: Heart,
  users: Users,
  moon: Moon,
  droplets: Droplets,
  apple: Apple,
  music: Music,
  eye: Eye,
  check: Check,
  sun: Sun,
  leaf: Leaf,
  smile: Smile,
  coffee: Coffee,
  wind: Wind,
  star: Star,
  shield: Shield,
  clock: Clock,
  target: Target,
  zap: Zap,
  flame: Flame,
};

export const ROTULO_CATEGORIA: Record<string, string> = {
  movimento: "Movimento",
  agua_alimentacao: "Alimentação",
  sono_descanso: "Descanso",
  respiracao: "Respiração",
  social_gratidao: "Social",
  foco_aprendizado: "Foco",
  humor_emocao: "Emoção",
  geral: "Geral",
};

export function iconeDoHabito(icone: string): LucideIcon {
  return ICONES_HABITO[icone] ?? Check;
}

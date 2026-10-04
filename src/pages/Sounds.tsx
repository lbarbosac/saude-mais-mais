import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, Volume2, Timer, Heart,
  CloudRain, Waves, TreePine, Wind, Flame,
  Wheat, Building2, Radio, Brain, Loader2, X, Plus, Minus,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Sound {
  id: string;
  name: string;
  icon: React.ElementType;
  category: string;
  filename: string;
  cardStyle: string;
  lightCardStyle: string;
  iconStyle: string;
  lightIconStyle: string;
  playing: boolean;
  volume: number;
  favorite: boolean;
}

// ─── Dados ────────────────────────────────────────────────────────────────────
//
// IMPORTANTE: os arquivos de áudio devem estar no bucket "sounds" do seu
// próprio Supabase Storage. Não há mais fallback automático para CDNs de
// terceiros (ex: mixkit.co) — depender de um host externo não controlado
// é um risco de continuidade (a URL pode mudar/cair sem aviso) e de
// licenciamento para um produto comercial.
//
// Para subir os arquivos: Supabase Dashboard > Storage > bucket "sounds" >
// Upload, usando exatamente os nomes em SOUND_DEFS[].filename abaixo.
// Se um arquivo não existir no bucket, o card mostra "Indisponível" em vez
// de silenciosamente tocar um som de outra fonte.


const SOUND_DEFS: Omit<Sound, "playing" | "volume" | "favorite">[] = [
  {
    id: "1", name: "Chuva", icon: CloudRain, category: "natureza", filename: "chuva.mp3",
    cardStyle: "from-blue-600/80 via-indigo-500/70 to-blue-800/80 border-blue-400/40",
    lightCardStyle: "from-blue-50 via-indigo-50 to-blue-100 border-blue-200",
    iconStyle: "bg-blue-400/30 text-blue-100",
    lightIconStyle: "bg-blue-100 text-blue-600",
  },
  {
    id: "2", name: "Mar", icon: Waves, category: "natureza", filename: "mar.mp3",
    cardStyle: "from-cyan-500/80 via-teal-400/70 to-cyan-700/80 border-cyan-300/40",
    lightCardStyle: "from-cyan-50 via-teal-50 to-cyan-100 border-cyan-200",
    iconStyle: "bg-cyan-300/30 text-cyan-100",
    lightIconStyle: "bg-cyan-100 text-cyan-600",
  },
  {
    id: "3", name: "Rio", icon: Waves, category: "natureza", filename: "rio.mp3",
    cardStyle: "from-teal-500/80 via-emerald-400/70 to-teal-700/80 border-teal-300/40",
    lightCardStyle: "from-teal-50 via-emerald-50 to-teal-100 border-teal-200",
    iconStyle: "bg-teal-300/30 text-teal-100",
    lightIconStyle: "bg-teal-100 text-teal-600",
  },
  {
    id: "4", name: "Floresta", icon: TreePine, category: "natureza", filename: "floresta.mp3",
    cardStyle: "from-green-600/80 via-emerald-500/70 to-green-800/80 border-green-400/40",
    lightCardStyle: "from-green-50 via-emerald-50 to-green-100 border-green-200",
    iconStyle: "bg-green-400/30 text-green-100",
    lightIconStyle: "bg-green-100 text-green-600",
  },
  {
    id: "5", name: "Vento", icon: Wind, category: "natureza", filename: "vento.mp3",
    cardStyle: "from-sky-500/80 via-blue-400/70 to-slate-600/80 border-sky-300/40",
    lightCardStyle: "from-sky-50 via-blue-50 to-sky-100 border-sky-200",
    iconStyle: "bg-sky-300/30 text-sky-100",
    lightIconStyle: "bg-sky-100 text-sky-600",
  },
  {
    id: "6", name: "Fogueira", icon: Flame, category: "natureza", filename: "fogueira.mp3",
    cardStyle: "from-orange-500/80 via-amber-400/70 to-red-700/80 border-orange-300/40",
    lightCardStyle: "from-orange-50 via-amber-50 to-orange-100 border-orange-200",
    iconStyle: "bg-orange-300/30 text-orange-100",
    lightIconStyle: "bg-orange-100 text-orange-600",
  },
  {
    id: "7", name: "Campo", icon: Wheat, category: "natureza", filename: "campo.mp3",
    cardStyle: "from-yellow-500/80 via-lime-400/70 to-amber-600/80 border-yellow-300/40",
    lightCardStyle: "from-yellow-50 via-lime-50 to-yellow-100 border-yellow-200",
    iconStyle: "bg-yellow-300/30 text-yellow-100",
    lightIconStyle: "bg-yellow-100 text-yellow-600",
  },
  {
    id: "8", name: "Cidade Tranquila", icon: Building2, category: "urbano", filename: "cidade.mp3",
    cardStyle: "from-violet-500/80 via-purple-400/70 to-indigo-700/80 border-violet-300/40",
    lightCardStyle: "from-violet-50 via-purple-50 to-violet-100 border-violet-200",
    iconStyle: "bg-violet-300/30 text-violet-100",
    lightIconStyle: "bg-violet-100 text-violet-600",
  },
  {
    id: "9", name: "Ruído Branco", icon: Radio, category: "foco", filename: "ruido-branco.mp3",
    cardStyle: "from-slate-500/80 via-zinc-400/70 to-slate-700/80 border-slate-300/40",
    lightCardStyle: "from-slate-50 via-zinc-50 to-slate-100 border-slate-200",
    iconStyle: "bg-slate-300/30 text-slate-100",
    lightIconStyle: "bg-slate-100 text-slate-600",
  },
  {
    id: "10", name: "Meditação", icon: Brain, category: "foco", filename: "meditacao.mp3",
    cardStyle: "from-purple-600/80 via-violet-500/70 to-fuchsia-700/80 border-purple-300/40",
    lightCardStyle: "from-purple-50 via-violet-50 to-purple-100 border-purple-200",
    iconStyle: "bg-purple-300/30 text-purple-100",
    lightIconStyle: "bg-purple-100 text-purple-600",
  },
];

// Timer: opções rápidas
const QUICK_TIMERS = [
  { label: "15 min", seconds: 15 * 60 },
  { label: "30 min", seconds: 30 * 60 },
  { label: "1 hora", seconds: 60 * 60 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

// ─── Componente ───────────────────────────────────────────────────────────────

const Sounds = () => {
  const [sounds, setSounds] = useState<Sound[]>(
    SOUND_DEFS.map((s) => ({ ...s, playing: false, volume: 60, favorite: false }))
  );
  const [selectedSeconds, setSelectedSeconds] = useState<number | null>(null);
  const [remaining, setRemaining]             = useState<number | null>(null);
  const [audioUrls, setAudioUrls]             = useState<Record<string, string>>({});
  const [unavailable, setUnavailable]         = useState<Set<string>>(new Set());
  const [loadingUrls, setLoadingUrls]         = useState(true);

  // Timer customizado
  const [customHours, setCustomHours]     = useState(0);
  const [customMinutes, setCustomMinutes] = useState(0);
  const [showCustom, setShowCustom]       = useState(false);

  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // Carrega URLs do Supabase Storage e verifica quais arquivos realmente existem.
  // Sem fallback para CDN externo — se o arquivo não estiver no bucket próprio,
  // o card é marcado como indisponível em vez de tocar um som de outra fonte.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: files, error } = await supabase.storage.from("sounds").list();
      if (cancelled) return;

      if (error) {
        console.error("[Sounds] Erro ao listar bucket de sons:", error);
        setUnavailable(new Set(SOUND_DEFS.map((s) => s.id)));
        setLoadingUrls(false);
        return;
      }

      const existingFilenames = new Set((files ?? []).map((f) => f.name));
      const urls: Record<string, string> = {};
      const missing = new Set<string>();

      for (const s of SOUND_DEFS) {
        if (existingFilenames.has(s.filename)) {
          const { data } = supabase.storage.from("sounds").getPublicUrl(s.filename);
          urls[s.id] = data.publicUrl;
        } else {
          missing.add(s.id);
        }
      }

      setAudioUrls(urls);
      setUnavailable(missing);
      setLoadingUrls(false);

      if (missing.size > 0) {
        console.warn(
          `[Sounds] ${missing.size} arquivo(s) ausente(s) no bucket "sounds". Faça upload pelo painel do Supabase Storage.`
        );
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const getAudio = useCallback((sound: Sound): HTMLAudioElement | null => {
    const url = audioUrls[sound.id];
    if (!url) return null;
    let audio = audioRefs.current.get(sound.id);
    if (!audio) {
      audio = new Audio();
      audio.loop = true;
      audio.preload = "auto";
      audio.src = url;
      audio.onerror = () => {
        // Arquivo existia na listagem mas falhou ao carregar (ex: removido
        // entre a listagem e o play, ou corrompido) — marca como indisponível
        // em vez de buscar silenciosamente em outra fonte.
        setUnavailable((prev) => new Set(prev).add(sound.id));
        toast({
          title: `Não foi possível carregar "${sound.name}"`,
          description: "O arquivo de áudio está indisponível no momento.",
          variant: "destructive",
        });
      };
      audio.load();
      audioRefs.current.set(sound.id, audio);
    }
    return audio;
  }, [audioUrls]);

  const stopAll = useCallback(() => {
    audioRefs.current.forEach((a) => { a.pause(); a.currentTime = 0; });
    setSounds((p) => p.map((s) => ({ ...s, playing: false })));
  }, []);

  // Timer — reinicia ao mudar selectedSeconds
  useEffect(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (selectedSeconds === null) { setRemaining(null); return; }

    setRemaining(selectedSeconds);
    timerRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          stopAll();
          setSelectedSeconds(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeconds]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      audioRefs.current.forEach((a) => { a.pause(); a.src = ""; });
      audioRefs.current.clear();
    };
  }, []);

  async function togglePlay(id: string) {
    const sound = sounds.find((s) => s.id === id);
    if (!sound) return;

    if (unavailable.has(id)) {
      toast({
        title: `"${sound.name}" está indisponível`,
        description: "Este som ainda não foi configurado.",
        variant: "destructive",
      });
      return;
    }

    const audio = getAudio(sound);
    if (!audio) return;

    if (!sound.playing) {
      audio.volume = sound.volume / 100;
      try { await audio.play(); }
      catch {
        toast({ title: "Erro ao tocar o som", description: "Verifique sua conexão.", variant: "destructive" });
        return;
      }
    } else {
      audio.pause();
    }
    setSounds((p) => p.map((s) => (s.id === id ? { ...s, playing: !s.playing } : s)));
  }

  function setVolume(id: string, volume: number) {
    const audio = audioRefs.current.get(id);
    if (audio) audio.volume = volume / 100;
    setSounds((p) => p.map((s) => (s.id === id ? { ...s, volume } : s)));
  }

  function toggleFav(id: string) {
    setSounds((p) => p.map((s) => (s.id === id ? { ...s, favorite: !s.favorite } : s)));
  }

  function handleQuickTimer(seconds: number) {
    setSelectedSeconds(selectedSeconds === seconds ? null : seconds);
    setShowCustom(false);
  }

  function handleCustomTimer() {
    const total = customHours * 3600 + customMinutes * 60;
    if (total <= 0) { toast({ title: "Defina um tempo maior que zero.", variant: "destructive" }); return; }
    setSelectedSeconds(total);
    setShowCustom(false);
  }

  const activeSounds = sounds.filter((s) => s.playing);

  if (loadingUrls) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">

      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sons Relaxantes</h1>
        <p className="text-sm text-muted-foreground">Misture sons para criar seu ambiente ideal</p>
      </div>

      {/* Barra de sons ativos */}
      <AnimatePresence>
        {activeSounds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl bg-gradient-to-r from-primary/90 to-primary p-4 text-primary-foreground shadow-elevated"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" aria-hidden />
                <span className="text-sm font-semibold">
                  {activeSounds.length} som{activeSounds.length > 1 ? "s" : ""} ativo{activeSounds.length > 1 ? "s" : ""}
                </span>
                {remaining !== null && (
                  <span className="rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs font-mono">
                    {formatTime(remaining)}
                  </span>
                )}
              </div>
              <button
                onClick={stopAll}
                className="rounded-xl bg-primary-foreground/20 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-primary-foreground/30"
              >
                Parar todos
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controles do timer */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Timer className="h-4 w-4 text-primary" aria-hidden />
          <span className="text-sm font-semibold text-foreground">Temporizador</span>
          {selectedSeconds !== null && remaining !== null && (
            <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-mono font-medium text-primary">
              {formatTime(remaining)}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {QUICK_TIMERS.map((opt) => {
            const active = selectedSeconds === opt.seconds;
            return (
              <button
                key={opt.seconds}
                onClick={() => handleQuickTimer(opt.seconds)}
                aria-pressed={active}
                className={[
                  "rounded-xl px-3 py-2 text-xs font-semibold transition-all",
                  active
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                ].join(" ")}
              >
                {opt.label}
              </button>
            );
          })}

          <button
            onClick={() => setShowCustom((v) => !v)}
            aria-pressed={showCustom}
            className={[
              "rounded-xl px-3 py-2 text-xs font-semibold transition-all",
              showCustom
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
            ].join(" ")}
          >
            Personalizado
          </button>

          {selectedSeconds !== null && (
            <button
              onClick={() => setSelectedSeconds(null)}
              aria-label="Cancelar temporizador"
              className="flex items-center gap-1 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/20"
            >
              <X className="h-3 w-3" aria-hidden />
              Cancelar
            </button>
          )}
        </div>

        {/* Timer personalizado */}
        <AnimatePresence>
          {showCustom && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }} className="overflow-hidden"
            >
              <div className="mt-4 flex flex-wrap items-end gap-3">
                {/* Horas */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">Horas</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCustomHours((h) => Math.max(0, h - 1))}
                      aria-label="Diminuir horas"
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground hover:text-foreground"
                    >
                      <Minus className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <span className="w-8 text-center text-sm font-bold text-foreground">{customHours}</span>
                    <button
                      onClick={() => setCustomHours((h) => Math.min(23, h + 1))}
                      aria-label="Aumentar horas"
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground hover:text-foreground"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                </div>

                {/* Minutos */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">Minutos</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCustomMinutes((m) => Math.max(0, m - 5))}
                      aria-label="Diminuir minutos"
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground hover:text-foreground"
                    >
                      <Minus className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <span className="w-8 text-center text-sm font-bold text-foreground">
                      {customMinutes.toString().padStart(2, "0")}
                    </span>
                    <button
                      onClick={() => setCustomMinutes((m) => Math.min(55, m + 5))}
                      aria-label="Aumentar minutos"
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground hover:text-foreground"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleCustomTimer}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-soft hover:bg-primary/90"
                >
                  Iniciar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Grade de sons */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {sounds.map((sound, i) => {
          const Icon = sound.icon;
          return (
            <motion.div
              key={sound.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={[
                "relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 transition-all duration-300",
                sound.playing
                  ? `${sound.cardStyle} shadow-elevated scale-[1.02]`
                  : `${sound.lightCardStyle} hover:shadow-soft dark:border-border dark:bg-card dark:hover:shadow-soft`,
              ].join(" ")}
            >
              {/* Overlay colorido no hover */}
              {!sound.playing && (
                <div className={`absolute inset-0 bg-gradient-to-br ${sound.cardStyle} opacity-0 transition-opacity hover:opacity-20 dark:hover:opacity-50 rounded-2xl pointer-events-none`} />
              )}

              <div className="relative">
                <div className="mb-3 flex items-center justify-between">
                  <div className={[
                    "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                    sound.playing
                      ? sound.iconStyle
                      : `${sound.lightIconStyle} dark:bg-muted dark:text-muted-foreground`,
                  ].join(" ")}>
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <button
                    onClick={() => toggleFav(sound.id)}
                    aria-label={sound.favorite ? `Remover ${sound.name} dos favoritos` : `Adicionar ${sound.name} aos favoritos`}
                    className={[
                      "transition-colors",
                      sound.playing
                        ? "text-white/80 hover:text-white"
                        : "text-muted-foreground hover:text-rose-500",
                    ].join(" ")}
                  >
                    <Heart className={`h-4 w-4 ${sound.favorite ? "fill-current text-rose-400" : ""}`} />
                  </button>
                </div>

                <p className={[
                  "mb-3 text-sm leading-tight select-none",
                  sound.playing
                    ? "font-extrabold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.5)]"
                    : "font-bold text-foreground dark:text-white",
                ].join(" ")}>{sound.name}</p>

                <div className="mb-1 flex items-center gap-1.5">
                  <Volume2 className={["h-3 w-3 shrink-0", sound.playing ? "text-white/70" : "text-muted-foreground"].join(" ")} aria-hidden />
                  <label htmlFor={`volume-${sound.id}`} className={["text-[10px] font-medium", sound.playing ? "text-white/70" : "text-muted-foreground"].join(" ")}>
                    Volume
                  </label>
                </div>
                <input
                  id={`volume-${sound.id}`}
                  type="range"
                  min={0} max={100}
                  value={sound.volume}
                  onChange={(e) => setVolume(sound.id, Number(e.target.value))}
                  className="mb-3 h-1 w-full cursor-pointer appearance-none rounded-full"
                  style={{ 
                    accentColor: sound.playing ? "white" : "hsl(var(--primary))",
                    background: sound.playing ? "rgba(255,255,255,0.25)" : "hsl(var(--muted))" 
                  }}
                />

                <button
                  onClick={() => togglePlay(sound.id)}
                  aria-label={sound.playing ? `Pausar ${sound.name}` : `Tocar ${sound.name}`}
                  className={[
                    "flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all",
                    sound.playing
                      ? "bg-white/25 text-white hover:bg-white/35"
                      : "bg-white/60 text-foreground hover:bg-white/80 dark:bg-muted dark:text-muted-foreground dark:hover:bg-primary/10 dark:hover:text-primary border border-black/5 dark:border-transparent",
                  ].join(" ")}
                >
                  {sound.playing
                    ? <Pause className="h-3.5 w-3.5" aria-hidden />
                    : <Play  className="h-3.5 w-3.5" aria-hidden />}
                  {sound.playing ? "Pausar" : "Tocar"}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Você pode tocar vários sons ao mesmo tempo para criar seu ambiente ideal.
      </p>
    </motion.div>
  );
};

export default Sounds;

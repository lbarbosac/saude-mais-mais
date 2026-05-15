import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Volume2, Timer, Heart, CloudRain, Waves, TreePine, Wind, Flame, Wheat, Building2, Radio, Brain, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Sound {
  id: string;
  name: string;
  icon: React.ElementType;
  category: string;
  filename: string;
  gradient: string;
  playing: boolean;
  volume: number;
  favorite: boolean;
  loaded: boolean;
}

// Mixkit royalty-free CDN fallbacks (used if a file is missing from the bucket)
const FALLBACK_URLS: Record<string, string> = {
  "chuva.mp3": "https://assets.mixkit.co/active_storage/sfx/2393/2393-preview.mp3",
  "mar.mp3": "https://assets.mixkit.co/active_storage/sfx/1196/1196-preview.mp3",
  "rio.mp3": "https://assets.mixkit.co/active_storage/sfx/1212/1212-preview.mp3",
  "floresta.mp3": "https://assets.mixkit.co/active_storage/sfx/2473/2473-preview.mp3",
  "vento.mp3": "https://assets.mixkit.co/active_storage/sfx/2608/2608-preview.mp3",
  "fogueira.mp3": "https://assets.mixkit.co/active_storage/sfx/1345/1345-preview.mp3",
  "campo.mp3": "https://assets.mixkit.co/active_storage/sfx/2658/2658-preview.mp3",
  "cidade.mp3": "https://assets.mixkit.co/active_storage/sfx/1554/1554-preview.mp3",
  "ruido-branco.mp3": "https://assets.mixkit.co/active_storage/sfx/2135/2135-preview.mp3",
  "meditacao.mp3": "https://assets.mixkit.co/active_storage/sfx/2132/2132-preview.mp3",
};

const initialSounds: Omit<Sound, "playing" | "volume" | "favorite" | "loaded">[] = [
  { id: "1", name: "Chuva", icon: CloudRain, category: "natureza", filename: "chuva.mp3", gradient: "from-blue-400/20 to-indigo-400/20" },
  { id: "2", name: "Mar", icon: Waves, category: "natureza", filename: "mar.mp3", gradient: "from-cyan-400/20 to-blue-400/20" },
  { id: "3", name: "Rio", icon: Waves, category: "natureza", filename: "rio.mp3", gradient: "from-teal-400/20 to-cyan-400/20" },
  { id: "4", name: "Floresta", icon: TreePine, category: "natureza", filename: "floresta.mp3", gradient: "from-green-400/20 to-emerald-400/20" },
  { id: "5", name: "Vento", icon: Wind, category: "natureza", filename: "vento.mp3", gradient: "from-slate-400/20 to-blue-300/20" },
  { id: "6", name: "Fogueira", icon: Flame, category: "natureza", filename: "fogueira.mp3", gradient: "from-orange-400/20 to-red-400/20" },
  { id: "7", name: "Campo", icon: Wheat, category: "natureza", filename: "campo.mp3", gradient: "from-yellow-400/20 to-amber-400/20" },
  { id: "8", name: "Cidade Tranquila", icon: Building2, category: "urbano", filename: "cidade.mp3", gradient: "from-gray-400/20 to-slate-400/20" },
  { id: "9", name: "Ruído Branco", icon: Radio, category: "outro", filename: "ruido-branco.mp3", gradient: "from-zinc-400/20 to-stone-400/20" },
  { id: "10", name: "Meditação", icon: Brain, category: "outro", filename: "meditacao.mp3", gradient: "from-purple-400/20 to-violet-400/20" },
];

const Sounds = () => {
  const [sounds, setSounds] = useState<Sound[]>(
    initialSounds.map((s) => ({ ...s, playing: false, volume: 60, favorite: false, loaded: false }))
  );
  const [timerMin, setTimerMin] = useState<number | null>(null);
  const [timerRemaining, setTimerRemaining] = useState<number | null>(null);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [loadingUrls, setLoadingUrls] = useState(true);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Build URLs from public bucket directly (with CDN fallback)
  useEffect(() => {
    const urls: Record<string, string> = {};
    for (const sound of initialSounds) {
      const { data } = supabase.storage.from("sounds").getPublicUrl(sound.filename);
      urls[sound.id] = data.publicUrl || FALLBACK_URLS[sound.filename];
    }
    setAudioUrls(urls);
    setLoadingUrls(false);
  }, []);

  const getAudio = (sound: Sound): HTMLAudioElement | null => {
    const url = audioUrls[sound.id];
    if (!url) return null;
    let audio = audioRefs.current.get(sound.id);
    if (!audio) {
      audio = new Audio();
      audio.loop = true;
      audio.preload = "auto";
      audio.src = url;
      audio.onerror = () => {
        // Fall back to CDN URL if bucket fails
        const fallback = FALLBACK_URLS[sound.filename];
        if (fallback && audio!.src !== fallback) {
          audio!.src = fallback;
          audio!.load();
        }
      };
      audio.load();
      audioRefs.current.set(sound.id, audio);
    }
    return audio;
  };

  useEffect(() => {
    if (timerMin === null) {
      setTimerRemaining(null);
      return;
    }
    setTimerRemaining(timerMin * 60);
    const interval = setInterval(() => {
      setTimerRemaining((prev) => {
        if (prev === null || prev <= 1) {
          setSounds((s) => s.map((sound) => ({ ...sound, playing: false })));
          audioRefs.current.forEach((audio) => {
            audio.pause();
            audio.currentTime = 0;
          });
          setTimerMin(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerMin]);

  useEffect(() => {
    return () => {
      audioRefs.current.forEach((audio) => {
        audio.pause();
        audio.src = "";
      });
      audioRefs.current.clear();
    };
  }, []);

  const togglePlay = async (id: string) => {
    const sound = sounds.find((s) => s.id === id);
    if (!sound) return;
    const audio = getAudio(sound);
    if (!audio) return;

    const newPlaying = !sound.playing;
    if (newPlaying) {
      audio.volume = sound.volume / 100;
      try {
        await audio.play();
      } catch (err) {
        console.error("Audio play failed:", err);
        toast({
          title: "Erro ao tocar som",
          description: "Tente novamente ou verifique sua conexão.",
          variant: "destructive",
        });
        return;
      }
    } else {
      audio.pause();
    }
    setSounds((prev) => prev.map((s) => (s.id === id ? { ...s, playing: newPlaying } : s)));
  };

  const setVolume = (id: string, volume: number) => {
    const audio = audioRefs.current.get(id);
    if (audio) audio.volume = volume / 100;
    setSounds((prev) => prev.map((s) => (s.id === id ? { ...s, volume } : s)));
  };

  const toggleFav = (id: string) => {
    setSounds((prev) => prev.map((s) => (s.id === id ? { ...s, favorite: !s.favorite } : s)));
  };

  const stopAll = () => {
    audioRefs.current.forEach((audio) => audio.pause());
    setSounds((prev) => prev.map((s) => ({ ...s, playing: false })));
  };

  const activeSounds = sounds.filter((s) => s.playing);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (loadingUrls) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sons Relaxantes</h1>
        <p className="text-sm text-muted-foreground">Misture sons para criar seu ambiente ideal</p>
      </div>

      {activeSounds.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl gradient-calm p-4 text-primary-foreground shadow-elevated">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              <span className="text-sm font-semibold">
                {activeSounds.length} som{activeSounds.length > 1 ? "s" : ""} ativo
                {activeSounds.length > 1 ? "s" : ""}
              </span>
              {timerRemaining !== null && (
                <span className="text-xs opacity-80">- {formatTime(timerRemaining)}</span>
              )}
            </div>
            <button onClick={stopAll} className="rounded-lg bg-primary-foreground/20 px-3 py-1 text-xs font-medium hover:bg-primary-foreground/30 transition-colors">
              Parar todos
            </button>
          </div>
        </motion.div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <Timer className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Timer:</span>
        {[15, 30, 60].map((min) => (
          <button
            key={min}
            onClick={() => setTimerMin(timerMin === min ? null : min)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              timerMin === min
                ? "bg-primary text-primary-foreground shadow-soft"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {min} min
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {sounds.map((sound, i) => {
          const IconComponent = sound.icon;
          return (
            <motion.div
              key={sound.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`relative overflow-hidden rounded-2xl border-2 p-4 transition-all ${
                sound.playing
                  ? "border-primary bg-primary/5 shadow-elevated"
                  : "border-border bg-card hover:border-primary/30 hover:shadow-soft"
              }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${sound.gradient} opacity-${sound.playing ? "100" : "0"} transition-opacity pointer-events-none`} />
              <div className="relative">
                <div className="mb-3 flex items-center justify-between">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                      sound.playing ? "bg-primary/15" : "bg-muted"
                    }`}
                  >
                    <IconComponent
                      className={`h-5 w-5 ${sound.playing ? "text-primary" : "text-muted-foreground"}`}
                    />
                  </div>
                  <button
                    onClick={() => toggleFav(sound.id)}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <Heart className={`h-4 w-4 ${sound.favorite ? "fill-destructive text-destructive" : ""}`} />
                  </button>
                </div>
                <p className="mb-3 text-sm font-semibold text-foreground">{sound.name}</p>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={sound.volume}
                  onChange={(e) => setVolume(sound.id, Number(e.target.value))}
                  className="mb-3 h-1 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
                />
                <button
                  onClick={() => togglePlay(sound.id)}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold transition-all ${
                    sound.playing
                      ? "bg-primary text-primary-foreground shadow-soft"
                      : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  }`}
                >
                  {sound.playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  {sound.playing ? "Pausar" : "Tocar"}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Você pode tocar vários sons ao mesmo tempo para criar seu ambiente perfeito.
      </p>
    </motion.div>
  );
};

export default Sounds;

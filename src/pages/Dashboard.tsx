import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Frown, Meh, Smile, Sparkles, Sun, TrendingUp, Zap } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getDailySeed, getTimeGreeting, todayISO } from "@/lib/utils/date";
import { track } from "@/lib/analytics";
import { useHabitosDoDia } from "@/hooks/useHabitosDoDia";
import { toast } from "@/hooks/use-toast";
import { TelaCarregando } from "@/components/ui/loading-spinner";

type Humor = "bom" | "normal" | "baixo";
type Energia = "baixa" | "media" | "alta";

interface Checkin {
  humor: Humor | null;
  energia: Energia | null;
}

const HUMORES: { icone: typeof Smile; rotulo: string; valor: Humor }[] = [
  { icone: Smile, rotulo: "Bem", valor: "bom" },
  { icone: Meh, rotulo: "Normal", valor: "normal" },
  { icone: Frown, rotulo: "Pra baixo", valor: "baixo" },
];

const ENERGIAS: { rotulo: string; valor: Energia }[] = [
  { rotulo: "Baixa", valor: "baixa" },
  { rotulo: "Média", valor: "media" },
  { rotulo: "Alta", valor: "alta" },
];

const ROTULO_HUMOR: Record<Humor, string> = { bom: "Bem", normal: "Normal", baixo: "Pra baixo" };
const ROTULO_ENERGIA: Record<Energia, string> = { baixa: "Baixa", media: "Média", alta: "Alta" };

const SUGESTOES = [
  "Que tal uma pausa de 5 minutos para respirar fundo?",
  "Ouvir sons da natureza pode ajudar na concentração.",
  "Beba um copo de água agora. Seu corpo agradece.",
  "Alongue-se por 2 minutos. Pequenas pausas fazem diferença.",
  "Mande uma mensagem para alguém de quem você gosta.",
  "Dê uma olhada pela janela por um minuto e descanse os olhos.",
];

const STAGGER = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const ITEM = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const hoje = todayISO();
  const chaveCheckin = ["checkin", user?.id, hoje];

  const { habitos, isLoading: carregandoHabitos, alternar } = useHabitosDoDia(user?.id);

  const nome = useQuery({
    queryKey: ["perfil", user?.id, "nome"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("perfil_usuario").select("nome").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data?.nome ?? "";
    },
  });

  const checkin = useQuery({
    queryKey: chaveCheckin,
    enabled: !!user,
    queryFn: async (): Promise<Checkin> => {
      const { data, error } = await supabase
        .from("checkin_diario")
        .select("humor, energia")
        .eq("user_id", user!.id)
        .eq("data", hoje)
        .maybeSingle();
      if (error) throw error;
      return { humor: (data?.humor as Humor) ?? null, energia: (data?.energia as Energia) ?? null };
    },
  });

  // Grava só o campo tocado: humor e energia são independentes.
  const salvarCheckin = useMutation({
    mutationFn: async (campos: Partial<Checkin>) => {
      const { error } = await supabase
        .from("checkin_diario")
        .upsert({ user_id: user!.id, data: hoje, ...campos }, { onConflict: "user_id,data" });
      if (error) throw error;
    },
    onMutate: async (campos) => {
      await queryClient.cancelQueries({ queryKey: chaveCheckin });
      const anterior = queryClient.getQueryData<Checkin>(chaveCheckin);
      queryClient.setQueryData<Checkin>(chaveCheckin, (c) => ({ humor: null, energia: null, ...c, ...campos }));
      return { anterior };
    },
    onSuccess: () => {
      track("checkin_saved");
      queryClient.invalidateQueries({ queryKey: ["progresso"] });
    },
    onError: (_e, _v, ctx) => {
      queryClient.setQueryData(chaveCheckin, ctx?.anterior);
      toast({ title: "Não foi possível salvar o check-in", variant: "destructive" });
    },
  });

  const sugestao = useMemo(
    () => SUGESTOES[user ? getDailySeed(hoje, user.id) % SUGESTOES.length : 0],
    [user, hoje],
  );

  if (carregandoHabitos || checkin.isLoading) return <TelaCarregando cheia={false} />;

  const humor = checkin.data?.humor ?? null;
  const energia = checkin.data?.energia ?? null;
  const feitos = habitos.filter((h) => h.concluido).length;
  const progresso = habitos.length ? (feitos / habitos.length) * 100 : 0;
  const primeiroNome = nome.data?.split(" ")[0] ?? "";

  return (
    <motion.div variants={STAGGER} initial="hidden" animate="show" className="flex flex-col gap-6">
      <motion.div variants={ITEM}>
        <div className="flex items-center gap-2">
          <Sun className="h-5 w-5 text-primary" aria-hidden />
          <p className="text-muted-foreground">{getTimeGreeting()}!</p>
        </div>
        <h1 className="text-2xl font-bold text-foreground">{primeiroNome ? `Olá, ${primeiroNome}` : "Como você está hoje?"}</h1>
      </motion.div>

      <motion.section variants={ITEM} aria-labelledby="titulo-humor" className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h2 id="titulo-humor" className="mb-3 text-sm font-semibold text-foreground">Como você está se sentindo?</h2>
        <div className="flex gap-3">
          {HUMORES.map(({ icone: Icone, rotulo, valor }) => {
            const ativo = humor === valor;
            return (
              <button
                key={valor}
                type="button"
                onClick={() => salvarCheckin.mutate({ humor: valor })}
                aria-pressed={ativo}
                className={[
                  "flex flex-1 flex-col items-center gap-1.5 rounded-xl py-3 text-sm transition-colors",
                  ativo ? "bg-primary/10 ring-2 ring-primary" : "bg-muted hover:bg-muted/70",
                ].join(" ")}
              >
                <Icone className={["h-6 w-6", ativo ? "text-primary" : "text-muted-foreground"].join(" ")} aria-hidden />
                <span className="font-medium">{rotulo}</span>
              </button>
            );
          })}
        </div>
      </motion.section>

      <motion.section variants={ITEM} aria-labelledby="titulo-energia" className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" aria-hidden />
          <h2 id="titulo-energia" className="text-sm font-semibold text-foreground">Nível de energia</h2>
        </div>
        <div className="flex gap-3">
          {ENERGIAS.map(({ rotulo, valor }) => {
            const ativo = energia === valor;
            return (
              <button
                key={valor}
                type="button"
                onClick={() => salvarCheckin.mutate({ energia: valor })}
                aria-pressed={ativo}
                className={[
                  "flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors",
                  ativo ? "gradient-nature text-secondary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70",
                ].join(" ")}
              >
                {rotulo}
              </button>
            );
          })}
        </div>
      </motion.section>

      <motion.section variants={ITEM} aria-labelledby="titulo-habitos" className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
            <h2 id="titulo-habitos" className="text-sm font-semibold text-foreground">Hábitos de hoje</h2>
          </div>
          {habitos.length > 0 && (
            <span className="text-xs font-medium text-muted-foreground">
              {feitos}/{habitos.length}
            </span>
          )}
        </div>

        {habitos.length === 0 ? (
          <Link to="/habitos" className="mt-3 flex items-center justify-between rounded-xl bg-muted px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/70">
            Criar minha lista de hábitos
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        ) : (
          <>
            <div className="mb-3 mt-2 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
              <motion.div className="h-full rounded-full gradient-calm" animate={{ width: `${progresso}%` }} transition={{ duration: 0.4 }} />
            </div>
            <ul className="flex flex-col gap-2">
              {habitos.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={h.concluido}
                    onClick={() => alternar(h.id)}
                    className={[
                      "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition-colors",
                      h.concluido ? "bg-secondary/40 text-muted-foreground line-through" : "bg-muted text-foreground hover:bg-muted/70",
                    ].join(" ")}
                  >
                    <span
                      aria-hidden
                      className={[
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2",
                        h.concluido ? "border-primary bg-primary text-primary-foreground" : "border-border",
                      ].join(" ")}
                    >
                      {h.concluido && <CheckCircle2 className="h-3 w-3" />}
                    </span>
                    {h.nome_habito}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </motion.section>

      <motion.section variants={ITEM} aria-labelledby="titulo-sugestao" className="rounded-2xl gradient-calm p-5 shadow-soft">
        <div className="mb-3 flex items-center gap-2 text-primary-foreground">
          <Sparkles className="h-4 w-4" aria-hidden />
          <h2 id="titulo-sugestao" className="text-sm font-semibold">Sugestão do Lucas</h2>
        </div>
        <p className="text-sm leading-relaxed text-primary-foreground">{sugestao}</p>
      </motion.section>

      <motion.section variants={ITEM} aria-labelledby="titulo-resumo" className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" aria-hidden />
          <h2 id="titulo-resumo" className="text-sm font-semibold text-foreground">Resumo do dia</h2>
        </div>
        <dl className="grid grid-cols-3 gap-3">
          {[
            { rotulo: "Hábitos", valor: habitos.length ? `${feitos}/${habitos.length}` : "—", cor: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100" },
            { rotulo: "Humor", valor: humor ? ROTULO_HUMOR[humor] : "—", cor: "bg-orange-100 text-orange-900 dark:bg-orange-950/50 dark:text-orange-100" },
            { rotulo: "Energia", valor: energia ? ROTULO_ENERGIA[energia] : "—", cor: "bg-violet-100 text-violet-900 dark:bg-violet-950/50 dark:text-violet-100" },
          ].map(({ rotulo, valor, cor }) => (
            <div key={rotulo} className={`flex flex-col-reverse items-center gap-1 rounded-xl p-3 text-center ${cor}`}>
              <dt className="text-xs font-medium opacity-80">{rotulo}</dt>
              <dd className="text-base font-bold">{valor}</dd>
            </div>
          ))}
        </dl>
      </motion.section>
    </motion.div>
  );
}

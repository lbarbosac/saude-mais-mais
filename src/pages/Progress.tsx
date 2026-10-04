import { useState } from "react";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CheckCircle2, Flame, Frown, Loader2, Meh, Shield, Smile, Sparkles, TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { deISO, somarDias, todayISO } from "@/lib/utils/date";
import { toast } from "@/hooks/use-toast";
import { TelaCarregando } from "@/components/ui/loading-spinner";
import { ErroCarregamento } from "@/components/ErroCarregamento";

type Periodo = "semana" | "mes" | "tudo";
const DIAS: Record<Periodo, number> = { semana: 7, mes: 30, tudo: 90 };
const RESTAURACOES_POR_MES = 3;

const VALOR_HUMOR: Record<string, number> = { bom: 3, normal: 2, baixo: 1 };
const HUMOR_DO_VALOR: Record<number, { rotulo: string; icone: typeof Smile }> = {
  3: { rotulo: "Bem", icone: Smile },
  2: { rotulo: "Normal", icone: Meh },
  1: { rotulo: "Pra baixo", icone: Frown },
  0: { rotulo: "Sem registro", icone: Meh },
};
const SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

interface Dia {
  data: string;
  total: number;
  concluidos: number;
  restaurado: boolean;
}

const diaCompleto = (d?: Dia) => !!d && (d.restaurado || (d.total > 0 && d.concluidos >= d.total));

function formatarDia(iso: string, periodo: Periodo) {
  const d = deISO(iso);
  return periodo === "semana" ? SEMANA[d.getDay()] : `${d.getDate()}/${d.getMonth() + 1}`;
}

function dataPorExtenso(iso: string) {
  return deISO(iso).toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" });
}

export default function Progress() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [periodo, setPeriodo] = useState<Periodo>("semana");
  const hoje = todayISO();
  const inicio = somarDias(hoje, -(DIAS[periodo] - 1));

  const dados = useQuery({
    queryKey: ["progresso", user?.id, periodo, hoje],
    enabled: !!user,
    queryFn: async () => {
      // Pelo menos 7 dias, para avaliar se a restauração está disponível.
      const inicioConsulta = periodo === "semana" ? inicio : inicio < somarDias(hoje, -6) ? inicio : somarDias(hoje, -6);
      const inicioMes = new Date(deISO(hoje).getFullYear(), deISO(hoje).getMonth(), 1).toISOString();
      const [resumo, sequencia, checkins, usadas] = await Promise.all([
        supabase.rpc("resumo_habitos", { p_inicio: inicioConsulta, p_fim: hoje }),
        supabase.rpc("minha_sequencia", { p_hoje: hoje }),
        supabase.from("checkin_diario").select("data, humor").eq("user_id", user!.id).gte("data", inicio).lte("data", hoje),
        supabase.from("streak_restauracoes").select("id", { count: "exact", head: true }).eq("user_id", user!.id).gte("created_at", inicioMes),
      ]);
      for (const r of [resumo, sequencia, checkins, usadas]) if (r.error) throw r.error;
      return {
        dias: resumo.data as Dia[],
        sequencia: sequencia.data as number,
        humor: new Map((checkins.data ?? []).map((c) => [c.data, c.humor])),
        restauracoesRestantes: Math.max(0, RESTAURACOES_POR_MES - (usadas.count ?? 0)),
      };
    },
  });

  const restaurar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("streak_restauracoes")
        .insert({ user_id: user!.id, data_restaurada: somarDias(hoje, -1) });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progresso"] });
      toast({ title: "Sequência restaurada", description: "Continue de onde parou." });
    },
    onError: () => toast({ title: "Não foi possível restaurar", variant: "destructive" }),
  });

  if (dados.isLoading) return <TelaCarregando cheia={false} />;
  if (dados.isError || !dados.data) return <ErroCarregamento mensagem="Não foi possível carregar seu progresso." onTentar={() => dados.refetch()} />;

  const { dias, sequencia, humor, restauracoesRestantes } = dados.data;
  const porData = new Map(dias.map((d) => [d.data, d]));
  const periodoDias = dias.filter((d) => d.data >= inicio);
  const concluidos = periodoDias.reduce((s, d) => s + d.concluidos, 0);
  const possiveis = periodoDias.reduce((s, d) => s + d.total, 0);
  const percentual = possiveis ? Math.round((concluidos / possiveis) * 100) : 0;

  const ontem = porData.get(somarDias(hoje, -1));
  const anteontem = porData.get(somarDias(hoje, -2));
  const podeRestaurar =
    restauracoesRestantes > 0 && !diaCompleto(porData.get(hoje)) && !diaCompleto(ontem) && !ontem?.restaurado && diaCompleto(anteontem);

  const graficoHumor = periodoDias.map((d) => ({ rotulo: formatarDia(d.data, periodo), data: d.data, valor: VALOR_HUMOR[humor.get(d.data) ?? ""] ?? 0 }));
  const graficoHabitos = periodoDias.map((d) => ({ rotulo: formatarDia(d.data, periodo), data: d.data, valor: d.concluidos, total: d.total }));
  const maxHabitos = Math.max(6, ...graficoHabitos.map((d) => d.total));
  const rolavel = periodo !== "semana";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Seu progresso</h1>
        <p className="text-sm text-muted-foreground">Acompanhe sua evolução</p>
      </div>

      <div role="tablist" aria-label="Período" className="flex gap-2">
        {(["semana", "mes", "tudo"] as Periodo[]).map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={periodo === p}
            onClick={() => setPeriodo(p)}
            className={[
              "flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors",
              periodo === p ? "bg-primary text-primary-foreground shadow-soft" : "bg-muted text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {p === "semana" ? "7 dias" : p === "mes" ? "30 dias" : "90 dias"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2 rounded-2xl bg-orange-100 p-4 dark:border dark:border-orange-800/30 dark:bg-orange-950/40">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-600 dark:text-orange-400" aria-hidden />
            <span className="text-xs font-semibold text-orange-800 dark:text-orange-300">Sequência atual</span>
          </div>
          <span className="text-2xl font-bold text-orange-950 dark:text-orange-100">
            {sequencia} {sequencia === 1 ? "dia" : "dias"}
          </span>
          <p className="flex items-start gap-1 text-[11px] leading-snug text-orange-800 dark:text-orange-300/90">
            <Sparkles className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
            Dias seguidos com todos os hábitos feitos.
          </p>
        </div>
        <div className="flex flex-col gap-2 rounded-2xl bg-emerald-100 p-4 dark:border dark:border-emerald-800/30 dark:bg-emerald-950/40">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Hábitos feitos</span>
          </div>
          <span className="text-2xl font-bold text-emerald-950 dark:text-emerald-100">{percentual}%</span>
          <span className="text-[11px] text-emerald-800 dark:text-emerald-300/90">
            {concluidos} de {possiveis} no período
          </span>
        </div>
      </div>

      <section aria-labelledby="titulo-restaurar" className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Shield className="h-5 w-5 text-primary" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 id="titulo-restaurar" className="text-sm font-semibold text-foreground">Restaurar sequência</h2>
              <p className="text-xs text-muted-foreground">
                {restauracoesRestantes} de {RESTAURACOES_POR_MES} disponíveis este mês
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => restaurar.mutate()}
            disabled={!podeRestaurar || restaurar.isPending}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-medium text-primary-foreground shadow-soft disabled:cursor-not-allowed disabled:opacity-40"
          >
            {restaurar.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Flame className="h-3.5 w-3.5" aria-hidden />}
            Restaurar
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {restauracoesRestantes === 0
            ? "Você usou todas as restaurações deste mês. Elas renovam no dia 1º."
            : "Use quando esquecer um dia: recupera a sequência de ontem."}
        </p>
      </section>

      <section aria-labelledby="titulo-taxa" className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
            <h2 id="titulo-taxa" className="text-sm font-semibold text-foreground">Taxa de conclusão</h2>
          </div>
          <span className="text-sm font-bold text-primary">{percentual}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
          <motion.div className="h-full rounded-full gradient-calm" animate={{ width: `${percentual}%` }} transition={{ duration: 0.6, ease: "easeOut" }} />
        </div>
      </section>

      <Grafico
        titulo="Como você se sentiu"
        dados={graficoHumor}
        dominio={[0, 3]}
        cor="hsl(213 72% 50%)"
        rolavel={rolavel}
        dica={(d) => {
          const h = HUMOR_DO_VALOR[d.valor] ?? HUMOR_DO_VALOR[0];
          return `${dataPorExtenso(d.data)}: ${h.rotulo}`;
        }}
      />

      <Grafico
        titulo="Hábitos concluídos"
        dados={graficoHabitos}
        dominio={[0, maxHabitos]}
        cor="hsl(152 55% 40%)"
        rolavel={rolavel}
        dica={(d) => `${dataPorExtenso(d.data)}: ${d.valor} de ${(d as { total?: number }).total ?? 0}`}
      />
    </motion.div>
  );
}

interface Ponto {
  rotulo: string;
  data: string;
  valor: number;
}

function Grafico<T extends Ponto>({
  titulo, dados, dominio, cor, rolavel, dica,
}: {
  titulo: string;
  dados: T[];
  dominio: [number, number];
  cor: string;
  rolavel: boolean;
  dica: (d: T) => string;
}) {
  const id = `grad-${titulo.replace(/\W/g, "")}`;
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <h2 className="mb-4 text-sm font-semibold text-foreground">{titulo}</h2>
      <div className={rolavel ? "overflow-x-auto scrollbar-thin" : ""}>
        <div style={{ width: rolavel ? Math.max(dados.length * 36, 560) : "100%", minWidth: "100%" }}>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={dados} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={cor} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={cor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 4" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="rotulo" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} interval={rolavel ? 2 : 0} />
              <YAxis hide domain={dominio} />
              <Tooltip
                cursor={{ stroke: cor, strokeOpacity: 0.25 }}
                content={({ active, payload }) =>
                  active && payload?.length ? (
                    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground shadow-elevated">
                      {dica(payload[0].payload as T)}
                    </div>
                  ) : null
                }
              />
              <Area
                type="monotone"
                dataKey="valor"
                stroke={cor}
                strokeWidth={2.5}
                fill={`url(#${id})`}
                dot={{ r: 3, fill: cor, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: cor, stroke: "hsl(var(--card))", strokeWidth: 2 }}
                animationDuration={600}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

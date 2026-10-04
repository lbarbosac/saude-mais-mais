import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, RefreshCw, Sparkles, Target } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useHabitosDoDia, type HabitoDoDia } from "@/hooks/useHabitosDoDia";
import { useGerarHabitos } from "@/hooks/useGerarHabitos";
import { RenovarHabitosModal } from "@/components/features/habits/RenovarHabitosModal";
import { TelaCarregando } from "@/components/ui/loading-spinner";
import { ErroCarregamento } from "@/components/ErroCarregamento";
import { iconeDoHabito, ROTULO_CATEGORIA } from "@/lib/habitos";

export default function HabitsPage() {
  const { user } = useAuth();
  const { habitos, isLoading, isError, recarregar, alternar } = useHabitosDoDia(user?.id);
  const [renovarAberto, setRenovarAberto] = useState(false);
  const gerar = useGerarHabitos(() => setRenovarAberto(false));

  if (isLoading) return <TelaCarregando cheia={false} />;
  if (isError) return <ErroCarregamento mensagem="Não foi possível carregar seus hábitos." onTentar={() => recarregar()} />;

  const feitos = habitos.filter((h) => h.concluido).length;
  const progresso = habitos.length ? (feitos / habitos.length) * 100 : 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Hábitos do dia</h1>
          <p className="text-sm text-muted-foreground">
            {habitos.length ? "Escolhidos para você hoje" : "Crie sua lista personalizada"}
          </p>
        </div>
        {habitos.length > 0 && (
          <button
            type="button"
            onClick={() => setRenovarAberto(true)}
            disabled={gerar.isPending}
            className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-primary px-3 text-sm font-medium text-primary-foreground shadow-soft transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <RefreshCw className={["h-4 w-4", gerar.isPending ? "animate-spin" : ""].join(" ")} aria-hidden />
            <span>Renovar</span>
          </button>
        )}
      </div>

      {habitos.length === 0 ? (
        <ListaVazia onGerar={() => gerar.mutate()} gerando={gerar.isPending} />
      ) : (
        <>
          <section aria-label="Progresso de hoje" className="rounded-2xl gradient-nature p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-secondary-foreground" aria-hidden />
                <span className="text-sm font-semibold text-secondary-foreground">Progresso de hoje</span>
              </div>
              <span className="text-sm font-bold text-secondary-foreground">
                {feitos}/{habitos.length}
              </span>
            </div>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-secondary-foreground/10"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={habitos.length}
              aria-valuenow={feitos}
              aria-label="Hábitos concluídos hoje"
            >
              <motion.div
                className="h-full rounded-full bg-secondary-foreground/50"
                animate={{ width: `${progresso}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
            {feitos === habitos.length && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-secondary-foreground">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                Você concluiu todos os hábitos de hoje.
              </p>
            )}
          </section>

          <ul className="flex flex-col gap-3">
            {habitos.map((habito, i) => (
              <li key={habito.id}>
                <CartaoHabito habito={habito} indice={i} onAlternar={() => alternar(habito.id)} />
              </li>
            ))}
          </ul>

          <p className="text-center text-xs text-muted-foreground">
            A lista muda a cada dia para manter a variedade. Use "Renovar" para pedir uma lista totalmente nova.
          </p>
        </>
      )}

      <RenovarHabitosModal
        open={renovarAberto}
        gerando={gerar.isPending}
        onConfirmar={() => gerar.mutate()}
        onFechar={() => setRenovarAberto(false)}
      />
    </motion.div>
  );
}

function CartaoHabito({ habito, indice, onAlternar }: { habito: HabitoDoDia; indice: number; onAlternar: () => void }) {
  const Icone = iconeDoHabito(habito.icone);
  const feito = habito.concluido;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: indice * 0.04 }}
      onClick={onAlternar}
      role="checkbox"
      aria-checked={feito}
      className={[
        "flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition-colors duration-200",
        feito ? "border-primary/20 bg-primary/5" : "border-border bg-card hover:border-primary/30 hover:shadow-soft",
      ].join(" ")}
    >
      <div className={["flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", feito ? "bg-primary/10" : "bg-muted"].join(" ")}>
        <Icone className={["h-5 w-5", feito ? "text-primary" : "text-muted-foreground"].join(" ")} aria-hidden />
      </div>

      <div className="min-w-0 flex-1">
        <p className={["font-medium leading-snug", feito ? "text-muted-foreground line-through" : "text-foreground"].join(" ")}>
          {habito.nome_habito}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {ROTULO_CATEGORIA[habito.categoria] ?? habito.categoria}
          </span>
          {habito.descricao && <span className="text-xs text-muted-foreground">{habito.descricao}</span>}
        </div>
      </div>

      <div
        aria-hidden
        className={[
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 transition-colors",
          feito ? "border-primary bg-primary text-primary-foreground" : "border-border",
        ].join(" ")}
      >
        {feito && <CheckCircle2 className="h-4 w-4" />}
      </div>
    </motion.button>
  );
}

function ListaVazia({ onGerar, gerando }: { onGerar: () => void; gerando: boolean }) {
  return (
    <div className="flex flex-col items-center gap-5 rounded-2xl border-2 border-dashed border-border p-8 text-center sm:p-10">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <Sparkles className="h-8 w-8 text-primary" aria-hidden />
      </div>
      <div>
        <p className="text-lg font-bold text-foreground">Nenhum hábito ainda</p>
        <p className="mt-1 text-sm text-muted-foreground">
          A IA monta uma lista a partir do seu perfil e, a cada dia, escolhe seis deles para você.
        </p>
      </div>
      <button type="button" onClick={onGerar} disabled={gerando} className="btn-primary">
        {gerando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
        {gerando ? "Criando seus hábitos…" : "Criar hábitos com IA"}
      </button>
    </div>
  );
}

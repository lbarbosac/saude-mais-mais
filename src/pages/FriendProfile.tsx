import { useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Brain, CheckCircle2, Flame, Lock, Target, UserCheck, UserMinus, UserPlus } from "lucide-react";
import BackButton from "@/components/BackButton";
import { Avatar } from "@/components/Avatar";
import { ErroCarregamento } from "@/components/ErroCarregamento";
import { TelaCarregando } from "@/components/ui/loading-spinner";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { desfazerAmizade, ehUuid, pedirAmizade, perfilPublico, type PerfilPublico } from "@/lib/social";
import { HUMOR_GERAL, NIVEL_ATIVIDADE, NIVEL_ESTRESSE, OBJETIVO, QUALIDADE_SONO, ROTINA, SEXO, rotulo } from "@/lib/rotulos";

export default function FriendProfile() {
  const { userId } = useParams();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const previa = params.get("previa") === "1" && userId === user?.id;
  const valido = ehUuid(userId);

  const perfil = useQuery({
    queryKey: ["social", "perfil", userId, previa],
    queryFn: () => perfilPublico(userId!, previa),
    enabled: !!user && valido,
  });

  const acao = useMutation({
    mutationFn: async (tipo: "pedir" | "desfazer") => {
      if (tipo === "pedir") {
        const erro = await pedirAmizade(user!.id, userId!);
        if (erro) throw new Error(erro);
      } else {
        await desfazerAmizade(user!.id, userId!);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["social"] }),
    onError: (e: Error) => toast({ title: e.message || "Não foi possível concluir", variant: "destructive" }),
  });

  if (!valido) return <NaoEncontrado />;
  if (perfil.isLoading) return <TelaCarregando cheia={false} />;
  if (perfil.isError) return <ErroCarregamento mensagem="Não foi possível carregar este perfil." onTentar={() => perfil.refetch()} />;
  if (!perfil.data) return <NaoEncontrado />;

  const p = perfil.data;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <BackButton to={previa ? "/configuracoes" : "/amigos"} />
        {previa && (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Como seus amigos veem</span>
        )}
      </div>

      <div className="flex items-center gap-4 rounded-2xl gradient-calm p-5 text-primary-foreground">
        <Avatar url={p.avatar_url} nome={p.nome} className="h-16 w-16 rounded-2xl bg-primary-foreground/20 text-2xl text-primary-foreground" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold">{p.nome || "Sem nome"}</h1>
          {p.nickname && <p className="truncate text-sm opacity-90">@{p.nickname}</p>}
        </div>
      </div>

      {!p.eh_proprio && <AcoesAmizade perfil={p} ocupado={acao.isPending} onPedir={() => acao.mutate("pedir")} onDesfazer={() => acao.mutate("desfazer")} />}

      {p.restrito ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border p-8 text-center">
          <Lock className="h-8 w-8 text-muted-foreground" aria-hidden />
          <p className="font-semibold text-foreground">Perfil privado</p>
          <p className="text-sm text-muted-foreground">Só amigos veem as informações deste perfil.</p>
        </div>
      ) : (
        <>
          {(p.sequencia !== undefined || p.habitos_concluidos_30d !== undefined) && (
            <div className="grid grid-cols-2 gap-3">
              {p.sequencia !== undefined && (
                <Numero icone={Flame} valor={`${p.sequencia} ${p.sequencia === 1 ? "dia" : "dias"}`} legenda="Sequência" cor="bg-wellness-peach" />
              )}
              {p.habitos_concluidos_30d !== undefined && (
                <Numero icone={CheckCircle2} valor={String(p.habitos_concluidos_30d)} legenda="Hábitos nos últimos 30 dias" cor="bg-wellness-mint" />
              )}
            </div>
          )}

          {p.dados_fisicos && (
            <Bloco icone={Activity} titulo="Dados físicos">
              <Campo nome="Idade" valor={p.dados_fisicos.idade ? `${p.dados_fisicos.idade} anos` : null} />
              <Campo nome="Peso" valor={p.dados_fisicos.peso ? `${p.dados_fisicos.peso} kg` : null} />
              <Campo nome="Altura" valor={p.dados_fisicos.altura ? `${String(p.dados_fisicos.altura).replace(".", ",")} m` : null} />
              <Campo nome="Sexo" valor={rotulo(SEXO, p.dados_fisicos.sexo)} />
              <Campo nome="Atividade física" valor={rotulo(NIVEL_ATIVIDADE, p.dados_fisicos.nivel_atividade)} />
            </Bloco>
          )}

          {p.saude_mental && (
            <Bloco icone={Brain} titulo="Saúde mental">
              <Campo nome="Estresse" valor={rotulo(NIVEL_ESTRESSE, p.saude_mental.nivel_estresse)} />
              <Campo nome="Sono" valor={rotulo(QUALIDADE_SONO, p.saude_mental.qualidade_sono)} />
              <Campo nome="Humor geral" valor={rotulo(HUMOR_GERAL, p.saude_mental.humor_geral)} />
            </Bloco>
          )}

          {p.objetivos && (p.objetivos.objetivo || p.objetivos.rotina) && (
            <Bloco icone={Target} titulo="Objetivos">
              <Campo nome="Objetivo" valor={rotulo(OBJETIVO, p.objetivos.objetivo)} />
              <Campo nome="Rotina" valor={rotulo(ROTINA, p.objetivos.rotina)} />
            </Bloco>
          )}
        </>
      )}
    </motion.div>
  );
}

function AcoesAmizade({ perfil, ocupado, onPedir, onDesfazer }: { perfil: PerfilPublico; ocupado: boolean; onPedir: () => void; onDesfazer: () => void }) {
  const base = "flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors disabled:opacity-50";
  switch (perfil.status_amizade) {
    case "amigos":
      return (
        <button type="button" onClick={onDesfazer} disabled={ocupado} className={`${base} border border-border bg-card text-muted-foreground hover:text-destructive`}>
          <UserMinus className="h-4 w-4" aria-hidden /> Desfazer amizade
        </button>
      );
    case "pedido_enviado":
      return (
        <button type="button" onClick={onDesfazer} disabled={ocupado} className={`${base} border border-border bg-card text-muted-foreground`}>
          <UserCheck className="h-4 w-4" aria-hidden /> Pedido enviado · cancelar
        </button>
      );
    case "pedido_recebido":
      return <p className="rounded-2xl bg-primary/5 p-3 text-center text-sm text-foreground">Essa pessoa te enviou um pedido. Responda na aba Pedidos, em Amigos.</p>;
    default:
      return (
        <button type="button" onClick={onPedir} disabled={ocupado} className={`${base} bg-primary text-primary-foreground hover:bg-primary/90`}>
          <UserPlus className="h-4 w-4" aria-hidden /> Adicionar como amigo
        </button>
      );
  }
}

function Numero({ icone: Icone, valor, legenda, cor }: { icone: typeof Flame; valor: string; legenda: string; cor: string }) {
  return (
    <div className={`flex flex-col gap-2 rounded-2xl p-4 ${cor}`}>
      <Icone className="h-5 w-5 text-slate-800" aria-hidden />
      <span className="text-lg font-bold text-slate-900">{valor}</span>
      <span className="text-xs text-slate-700">{legenda}</span>
    </div>
  );
}

function Bloco({ icone: Icone, titulo, children }: { icone: typeof Flame; titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="mb-3 flex items-center gap-2">
        <Icone className="h-4 w-4 text-primary" aria-hidden />
        <h2 className="text-sm font-semibold text-foreground">{titulo}</h2>
      </div>
      <dl className="flex flex-col gap-2">{children}</dl>
    </section>
  );
}

function Campo({ nome, valor }: { nome: string; valor: string | null }) {
  if (!valor) return null;
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-muted px-4 py-2.5">
      <dt className="text-xs font-medium text-muted-foreground">{nome}</dt>
      <dd className="text-right text-sm font-medium text-foreground">{valor}</dd>
    </div>
  );
}

function NaoEncontrado() {
  return (
    <div className="flex flex-col gap-4">
      <BackButton to="/amigos" />
      <p className="py-12 text-center text-sm text-muted-foreground">Perfil não encontrado.</p>
    </div>
  );
}

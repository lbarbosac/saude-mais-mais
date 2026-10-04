import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Search, Trophy, UserPlus, X } from "lucide-react";
import BackButton from "@/components/BackButton";
import { Avatar } from "@/components/Avatar";
import { ErroCarregamento } from "@/components/ErroCarregamento";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { buscarPerfis, listarAmigos, listarPedidos, pedirAmizade, responderPedido, type PerfilResumo } from "@/lib/social";

type Aba = "amigos" | "pedidos" | "buscar";

export default function Friends() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [aba, setAba] = useState<Aba>("amigos");

  const amigos = useQuery({ queryKey: ["social", "amigos"], queryFn: listarAmigos, enabled: !!user });
  const pedidos = useQuery({ queryKey: ["social", "pedidos"], queryFn: listarPedidos, enabled: !!user });

  const responder = useMutation({
    mutationFn: ({ id, aceitar }: { id: string; aceitar: boolean }) => responderPedido(id, aceitar),
    onSuccess: (_d, { aceitar }) => {
      queryClient.invalidateQueries({ queryKey: ["social"] });
      toast({ title: aceitar ? "Agora vocês são amigos" : "Pedido recusado" });
    },
    onError: () => toast({ title: "Não foi possível responder ao pedido", variant: "destructive" }),
  });

  const abas: { id: Aba; rotulo: string }[] = [
    { id: "amigos", rotulo: "Amigos" },
    { id: "pedidos", rotulo: pedidos.data?.length ? `Pedidos (${pedidos.data.length})` : "Pedidos" },
    { id: "buscar", rotulo: "Buscar" },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <BackButton to="/perfil" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Amigos</h1>
          <p className="text-sm text-muted-foreground">Conecte-se e desafie seus amigos</p>
        </div>
      </div>

      <div role="tablist" aria-label="Seções de amigos" className="flex gap-2">
        {abas.map((a) => (
          <button
            key={a.id}
            type="button"
            role="tab"
            aria-selected={aba === a.id}
            onClick={() => setAba(a.id)}
            className={[
              "flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors",
              aba === a.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {aba === "amigos" &&
          (amigos.isLoading ? (
            <Carregando />
          ) : amigos.isError ? (
            <ErroCarregamento mensagem="Não foi possível carregar seus amigos." onTentar={() => amigos.refetch()} />
          ) : amigos.data!.length === 0 ? (
            <Vazio texto="Você ainda não tem amigos por aqui. Procure alguém pelo nickname." acao={() => setAba("buscar")} rotuloAcao="Buscar pessoas" />
          ) : (
            <ul className="flex flex-col gap-3">
              {amigos.data!.map((a) => (
                <li key={a.user_id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
                  <span className="relative">
                    <Avatar url={a.avatar_url} nome={a.nome} className="h-12 w-12 text-lg" />
                    <span
                      className={[
                        "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card",
                        a.online ? "bg-emerald-500" : "bg-muted-foreground/30",
                      ].join(" ")}
                      aria-hidden
                    />
                  </span>
                  <Link to={`/amigo/${a.user_id}`} className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground hover:text-primary">{a.nome || "Sem nome"}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {a.nickname ? `@${a.nickname}` : ""}
                      {a.online && <span className="text-emerald-600 dark:text-emerald-400"> · online</span>}
                    </span>
                  </Link>
                  <Link
                    to="/desafios"
                    state={{ desafiar: a.user_id }}
                    className="flex h-9 items-center gap-1.5 rounded-xl bg-primary/10 px-3 text-xs font-medium text-primary hover:bg-primary/15"
                  >
                    <Trophy className="h-3.5 w-3.5" aria-hidden />
                    Desafiar
                  </Link>
                </li>
              ))}
            </ul>
          ))}

        {aba === "pedidos" &&
          (pedidos.isLoading ? (
            <Carregando />
          ) : pedidos.isError ? (
            <ErroCarregamento mensagem="Não foi possível carregar os pedidos." onTentar={() => pedidos.refetch()} />
          ) : pedidos.data!.length === 0 ? (
            <Vazio texto="Nenhum pedido de amizade pendente." />
          ) : (
            <ul className="flex flex-col gap-3">
              {pedidos.data!.map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
                  <Avatar url={p.avatar_url} nome={p.nome} className="h-10 w-10 text-sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{p.nome || "Sem nome"}</p>
                    <p className="truncate text-xs text-muted-foreground">{p.nickname ? `@${p.nickname}` : ""}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => responder.mutate({ id: p.id, aceitar: true })}
                    disabled={responder.isPending}
                    aria-label={`Aceitar o pedido de ${p.nome}`}
                    className="rounded-lg bg-primary p-2 text-primary-foreground disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => responder.mutate({ id: p.id, aceitar: false })}
                    disabled={responder.isPending}
                    aria-label={`Recusar o pedido de ${p.nome}`}
                    className="rounded-lg bg-muted p-2 text-muted-foreground disabled:opacity-50"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          ))}

        {aba === "buscar" && <BuscaDePessoas meuId={user!.id} />}
      </div>
    </motion.div>
  );
}

function BuscaDePessoas({ meuId }: { meuId: string }) {
  const queryClient = useQueryClient();
  const [termo, setTermo] = useState("");
  const [busca, setBusca] = useState("");
  const [enviados, setEnviados] = useState<Set<string>>(new Set());

  const resultado = useQuery({
    queryKey: ["social", "busca", busca],
    queryFn: () => buscarPerfis(busca),
    enabled: busca.length >= 2,
  });

  async function adicionar(p: PerfilResumo) {
    const erro = await pedirAmizade(meuId, p.user_id);
    if (erro) {
      toast({ title: erro, variant: "destructive" });
      return;
    }
    setEnviados((s) => new Set(s).add(p.user_id));
    queryClient.invalidateQueries({ queryKey: ["social", "amigos"] });
    toast({ title: "Pedido enviado" });
  }

  function buscar(e: FormEvent) {
    e.preventDefault();
    setBusca(termo.trim().replace(/^@/, "").toLowerCase());
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={buscar} className="flex gap-2" role="search">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <label htmlFor="busca-nickname" className="sr-only">Buscar por nickname</label>
          <input
            id="busca-nickname"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Buscar por nickname"
            autoComplete="off"
            maxLength={31}
            className="input-modern pl-10"
          />
        </div>
        <button type="submit" disabled={termo.trim().length < 2} className="rounded-2xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50">
          Buscar
        </button>
      </form>

      {resultado.isFetching && <Carregando />}
      {resultado.isError && <ErroCarregamento mensagem="A busca falhou. Tente de novo." onTentar={() => resultado.refetch()} />}
      {resultado.data && resultado.data.length === 0 && !resultado.isFetching && (
        <Vazio texto={`Ninguém encontrado com "${busca}".`} />
      )}

      <ul className="flex flex-col gap-2">
        {resultado.data?.map((p) => (
          <li key={p.user_id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
            <Avatar url={p.avatar_url} nome={p.nome} className="h-10 w-10 text-sm" />
            <Link to={`/amigo/${p.user_id}`} className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-foreground hover:text-primary">{p.nome || "Sem nome"}</span>
              <span className="block truncate text-xs text-muted-foreground">@{p.nickname}</span>
            </Link>
            <button
              type="button"
              onClick={() => adicionar(p)}
              disabled={enviados.has(p.user_id)}
              className="flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-60"
            >
              <UserPlus className="h-3.5 w-3.5" aria-hidden />
              {enviados.has(p.user_id) ? "Enviado" : "Adicionar"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Carregando() {
  return (
    <div className="flex justify-center py-8">
      <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Carregando" />
    </div>
  );
}

function Vazio({ texto, acao, rotuloAcao }: { texto: string; acao?: () => void; rotuloAcao?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <UserPlus className="h-8 w-8 text-muted-foreground" aria-hidden />
      <p className="text-sm text-muted-foreground">{texto}</p>
      {acao && (
        <button type="button" onClick={acao} className="btn-secondary">
          {rotuloAcao}
        </button>
      )}
    </div>
  );
}

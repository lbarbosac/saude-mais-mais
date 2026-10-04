import { useRef, useState, type FormEvent } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Camera, Check, Image as ImageIcon, Loader2, Plus, Shield, Swords, Target, Trophy, X } from "lucide-react";
import BackButton from "@/components/BackButton";
import { ErroCarregamento } from "@/components/ErroCarregamento";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { listarAmigos } from "@/lib/social";
import { toast } from "@/hooks/use-toast";

interface Desafio {
  id: string;
  titulo: string;
  descricao: string | null;
  meta: number;
  status: string;
  criador_id: string;
  desafiado_id: string;
  criador_nome: string | null;
  desafiado_nome: string | null;
  progresso_criador: number;
  progresso_desafiado: number;
  confirmacao_criador: boolean;
  confirmacao_desafiado: boolean;
  prova_criador_path: string | null;
  prova_desafiado_path: string | null;
  flag_suspeito: boolean;
  motivo_flag: string | null;
}

const ROTULO_STATUS: Record<string, string> = { ativo: "Em andamento", concluido: "Concluído", cancelado: "Cancelado" };
const TIPOS_IMAGEM = ["image/jpeg", "image/png", "image/webp"];

/** Mensagem de erro vinda das funções do banco (já em português) ou genérica. */
const mensagemDoErro = (e: unknown) =>
  e && typeof e === "object" && "message" in e && typeof e.message === "string" && /[áéíóúãõç]/i.test(e.message)
    ? e.message
    : "Não foi possível concluir. Tente de novo.";

export default function Challenges() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const location = useLocation();
  const desafiarId = (location.state as { desafiar?: string } | null)?.desafiar ?? "";
  const [criando, setCriando] = useState(!!desafiarId);

  const desafios = useQuery({
    queryKey: ["desafios"],
    enabled: !!user,
    queryFn: async (): Promise<Desafio[]> => {
      const { data, error } = await supabase.rpc("listar_desafios");
      if (error) throw error;
      return data;
    },
  });

  const atualizar = () => queryClient.invalidateQueries({ queryKey: ["desafios"] });

  const progresso = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("registrar_progresso_desafio", { p_desafio: id });
      if (error) throw error;
    },
    onSuccess: () => {
      atualizar();
      toast({ title: "Progresso registrado" });
    },
    onError: (e) => toast({ title: mensagemDoErro(e), variant: "destructive" }),
  });

  const confirmar = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc("confirmar_desafio", { p_desafio: id });
      if (error) throw error;
      return data;
    },
    onSuccess: (resultado) => {
      atualizar();
      toast({ title: resultado === "concluido" ? "Desafio concluído pelos dois!" : "Confirmado. Falta seu amigo confirmar." });
    },
    onError: (e) => toast({ title: mensagemDoErro(e), variant: "destructive" }),
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <BackButton to="/amigos" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Desafios</h1>
          <p className="text-sm text-muted-foreground">Desafie seus amigos</p>
        </div>
        {!criando && (
          <button type="button" onClick={() => setCriando(true)} className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
            <Plus className="h-4 w-4" aria-hidden />
            Novo
          </button>
        )}
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Jogo limpo:</span> o desafio só termina quando os dois confirmam. Dá
          para anexar uma foto como prova, e registros muito rápidos são sinalizados.
        </p>
      </div>

      {criando && (
        <NovoDesafio
          meuId={user!.id}
          amigoInicial={desafiarId}
          onFechar={() => setCriando(false)}
          onCriado={() => {
            setCriando(false);
            atualizar();
          }}
        />
      )}

      {desafios.isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Carregando" />
        </div>
      ) : desafios.isError ? (
        <ErroCarregamento mensagem="Não foi possível carregar seus desafios." onTentar={() => desafios.refetch()} />
      ) : desafios.data!.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Swords className="h-10 w-10 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">Nenhum desafio ainda. Que tal chamar um amigo?</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {desafios.data!.map((d) => (
            <li key={d.id}>
              <CartaoDesafio
                desafio={d}
                meuId={user!.id}
                ocupado={progresso.isPending || confirmar.isPending}
                onProgresso={() => progresso.mutate(d.id)}
                onConfirmar={() => confirmar.mutate(d.id)}
                onProvaEnviada={atualizar}
              />
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

function NovoDesafio({ meuId, amigoInicial, onFechar, onCriado }: { meuId: string; amigoInicial: string; onFechar: () => void; onCriado: () => void }) {
  const amigos = useQuery({ queryKey: ["social", "amigos"], queryFn: listarAmigos });
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [meta, setMeta] = useState(7);
  const [amigo, setAmigo] = useState(amigoInicial);
  const [salvando, setSalvando] = useState(false);

  async function criar(e: FormEvent) {
    e.preventDefault();
    if (titulo.trim().length < 2 || !amigo) {
      toast({ title: "Dê um título e escolha um amigo", variant: "destructive" });
      return;
    }
    setSalvando(true);
    const { error } = await supabase.from("desafios").insert({
      criador_id: meuId,
      desafiado_id: amigo,
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      meta: Math.min(365, Math.max(1, meta || 1)),
    });
    setSalvando(false);
    if (error) {
      toast({ title: "Não foi possível criar o desafio", variant: "destructive" });
      return;
    }
    toast({ title: "Desafio criado" });
    onCriado();
  }

  return (
    <motion.form
      onSubmit={criar}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-card"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Novo desafio</h2>
        <button type="button" onClick={onFechar} aria-label="Fechar formulário" className="rounded-full p-1 text-muted-foreground hover:bg-muted">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <label className="sr-only" htmlFor="desafio-titulo">Título</label>
      <input id="desafio-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={80} placeholder="Ex.: 7 dias caminhando" className="input-modern" />
      <label className="sr-only" htmlFor="desafio-descricao">Descrição</label>
      <textarea id="desafio-descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={300} placeholder="Descrição (opcional)" rows={2} className="textarea-modern min-h-0" />
      <div className="flex items-center gap-3">
        <label htmlFor="desafio-meta" className="text-sm text-muted-foreground">Meta (vezes)</label>
        <input id="desafio-meta" type="number" inputMode="numeric" value={meta} onChange={(e) => setMeta(Number(e.target.value))} min={1} max={365} className="input-modern w-24 py-2" />
      </div>
      <label className="sr-only" htmlFor="desafio-amigo">Amigo</label>
      <select id="desafio-amigo" value={amigo} onChange={(e) => setAmigo(e.target.value)} className="select-modern">
        <option value="">{amigos.isLoading ? "Carregando amigos…" : amigos.data?.length ? "Escolha um amigo" : "Adicione amigos primeiro"}</option>
        {amigos.data?.map((a) => (
          <option key={a.user_id} value={a.user_id}>
            {a.nome}{a.nickname ? ` (@${a.nickname})` : ""}
          </option>
        ))}
      </select>
      <button type="submit" disabled={salvando} className="btn-primary">
        {salvando ? "Criando…" : "Criar desafio"}
      </button>
    </motion.form>
  );
}

function CartaoDesafio({
  desafio: d, meuId, ocupado, onProgresso, onConfirmar, onProvaEnviada,
}: {
  desafio: Desafio;
  meuId: string;
  ocupado: boolean;
  onProgresso: () => void;
  onConfirmar: () => void;
  onProvaEnviada: () => void;
}) {
  const arquivoRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const souCriador = d.criador_id === meuId;
  const meu = souCriador ? d.progresso_criador : d.progresso_desafiado;
  const deles = souCriador ? d.progresso_desafiado : d.progresso_criador;
  const nomeDeles = (souCriador ? d.desafiado_nome : d.criador_nome) || "Amigo";
  const confirmei = souCriador ? d.confirmacao_criador : d.confirmacao_desafiado;
  const confirmaram = souCriador ? d.confirmacao_desafiado : d.confirmacao_criador;
  const minhaProva = souCriador ? d.prova_criador_path : d.prova_desafiado_path;
  const provaDeles = souCriador ? d.prova_desafiado_path : d.prova_criador_path;
  const ativo = d.status === "ativo";

  async function enviarProva(arquivo: File) {
    if (!TIPOS_IMAGEM.includes(arquivo.type) || arquivo.size > 5 * 1024 * 1024) {
      toast({ title: "Use uma foto JPG, PNG ou WebP de até 5 MB", variant: "destructive" });
      return;
    }
    setEnviando(true);
    const extensao = arquivo.type.split("/")[1].replace("jpeg", "jpg");
    const caminho = `${d.id}/${meuId}-${Date.now()}.${extensao}`;
    const envio = await supabase.storage.from("provas-desafios").upload(caminho, arquivo, { contentType: arquivo.type });
    const registro = envio.error ? envio : await supabase.rpc("anexar_prova_desafio", { p_desafio: d.id, p_path: caminho });
    setEnviando(false);
    if (registro.error) {
      toast({ title: "Não foi possível enviar a foto", variant: "destructive" });
      return;
    }
    toast({ title: "Foto enviada" });
    onProvaEnviada();
  }

  async function verProva(caminho: string) {
    const { data, error } = await supabase.storage.from("provas-desafios").createSignedUrl(caminho, 120);
    if (error || !data) {
      toast({ title: "Não foi possível abrir a foto", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="mb-3 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-primary" aria-hidden />
        <h2 className="flex-1 text-sm font-semibold text-foreground">{d.titulo}</h2>
        <span className="rounded-lg bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{ROTULO_STATUS[d.status] ?? d.status}</span>
      </div>
      {d.descricao && <p className="mb-3 text-xs text-muted-foreground">{d.descricao}</p>}

      {d.flag_suspeito && (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
          <div>
            <p className="text-xs font-semibold text-destructive">Atividade suspeita</p>
            <p className="text-xs text-muted-foreground">{d.motivo_flag}</p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <Barra nome="Você" valor={meu} meta={d.meta} cor="bg-primary" />
        <Barra nome={nomeDeles} valor={deles} meta={d.meta} cor="bg-wellness-mint" />
      </div>

      {ativo && meu < d.meta && (
        <button
          type="button"
          onClick={onProgresso}
          disabled={ocupado}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary/10 py-2.5 text-xs font-semibold text-primary hover:bg-primary/20 disabled:opacity-50"
        >
          <Target className="h-3.5 w-3.5" aria-hidden /> Registrar progresso (+1)
        </button>
      )}

      {ativo && meu >= d.meta && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          <p className="text-xs font-semibold text-foreground">Fechar o desafio</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Selo ok={confirmei} texto={confirmei ? "Você confirmou" : "Você ainda não confirmou"} />
            <Selo ok={confirmaram} texto={confirmaram ? `${nomeDeles} confirmou` : `${nomeDeles} ainda não`} />
          </div>
          {!confirmei && (
            <div className="flex gap-2">
              <input
                ref={arquivoRef}
                type="file"
                accept={TIPOS_IMAGEM.join(",")}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) enviarProva(f);
                }}
              />
              <button
                type="button"
                onClick={() => arquivoRef.current?.click()}
                disabled={enviando}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-muted py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                {enviando ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Camera className="h-3.5 w-3.5" aria-hidden />}
                {minhaProva ? "Trocar foto" : "Anexar foto"}
              </button>
              <button
                type="button"
                onClick={onConfirmar}
                disabled={ocupado}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" aria-hidden /> Confirmar
              </button>
            </div>
          )}
        </div>
      )}

      {provaDeles && (
        <button type="button" onClick={() => verProva(provaDeles)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
          <ImageIcon className="h-3.5 w-3.5" aria-hidden /> Ver a foto de {nomeDeles}
        </button>
      )}
    </article>
  );
}

function Barra({ nome, valor, meta, cor }: { nome: string; valor: number; meta: number; cor: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{nome}</span>
        <span className="text-muted-foreground">{valor}/{meta}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={meta} aria-valuenow={valor} aria-label={`Progresso de ${nome}`}>
        <motion.div className={`h-full rounded-full ${cor}`} animate={{ width: `${Math.min((valor / meta) * 100, 100)}%` }} />
      </div>
    </div>
  );
}

function Selo({ ok, texto }: { ok: boolean; texto: string }) {
  return (
    <div className={`rounded-lg p-2 text-center ${ok ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
      {ok && <Check className="mr-1 inline h-3 w-3" aria-hidden />}
      {texto}
    </div>
  );
}

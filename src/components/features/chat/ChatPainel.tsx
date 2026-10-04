import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { ChevronLeft, Loader2, MessageCircle, Plus, Send, Settings, Trash2, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import amigoLucas from "@/assets/amigo-lucas.webp";
import { useChatLucas, type Conversa, type Mensagem } from "./useChatLucas";

const MAX_MENSAGEM = 4000;

/**
 * Painel do chat. Carregado sob demanda no primeiro clique no botão do Lucas
 * (leva junto o renderizador de Markdown) e mantido montado depois disso, para
 * a conversa continuar onde estava quando o painel for reaberto.
 */
export default function ChatPainel({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [tela, setTela] = useState<"lista" | "conversa">("lista");
  const [paraExcluir, setParaExcluir] = useState<Conversa | null>(null);
  const chat = useChatLucas(user?.id, aberto);
  const fechar = onFechar;

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !paraExcluir) fechar();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto, paraExcluir, fechar]);

  async function confirmarExclusao() {
    if (!paraExcluir) return;
    const alvo = paraExcluir;
    setParaExcluir(null);
    try {
      await chat.excluir(alvo.id);
      if (tela === "conversa" && chat.conversaId === alvo.id) setTela("lista");
      toast({ title: "Conversa excluída" });
    } catch {
      toast({ title: "Não foi possível excluir a conversa", variant: "destructive" });
    }
  }

  return (
    <>
      <AnimatePresence>
        {aberto && (
          <motion.div
            role="dialog"
            aria-label="Conversa com o Lucas"
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 32, scale: 0.97 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className={[
              "fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-elevated",
              isMobile
                ? "inset-x-2 bottom-20 top-16 max-h-[640px]"
                : "bottom-6 right-6 h-[min(600px,calc(100vh-6rem))] w-96",
            ].join(" ")}
          >
            <Cabecalho
              tela={tela}
              onVoltar={() => setTela("lista")}
              onNova={() => {
                chat.novaConversa();
                setTela("conversa");
              }}
              onConfigurar={() => {
                fechar();
                navigate("/configuracoes");
              }}
              onFechar={fechar}
            />

            {tela === "lista" ? (
              <ListaConversas
                conversas={chat.conversas}
                carregando={chat.carregandoConversas}
                erro={chat.erroConversas}
                onTentar={() => chat.recarregarConversas()}
                onAbrir={(c) => {
                  chat.abrir(c.id);
                  setTela("conversa");
                }}
                onExcluir={setParaExcluir}
                onNova={() => {
                  chat.novaConversa();
                  setTela("conversa");
                }}
              />
            ) : (
              <Conversa mensagens={chat.mensagens} enviando={chat.enviando} onEnviar={chat.enviar} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialog open={!!paraExcluir} onOpenChange={(v) => !v && setParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              "{paraExcluir?.titulo}" e todas as mensagens dela serão apagadas. Isso não pode ser desfeito.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="btn-secondary mt-0">Cancelar</AlertDialogCancel>
            <button type="button" onClick={confirmarExclusao} className="btn-danger">
              Excluir
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Cabecalho({
  tela, onVoltar, onNova, onConfigurar, onFechar,
}: {
  tela: "lista" | "conversa";
  onVoltar: () => void;
  onNova: () => void;
  onConfigurar: () => void;
  onFechar: () => void;
}) {
  const botao = "rounded-full p-1.5 transition-colors hover:bg-primary-foreground/20";
  return (
    <div className="flex shrink-0 items-center gap-3 gradient-calm px-4 py-3 text-primary-foreground">
      {tela === "conversa" && (
        <button type="button" onClick={onVoltar} aria-label="Voltar para as conversas" className={botao}>
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
      )}
      <img src={amigoLucas} alt="" width={36} height={36} className="h-9 w-9 rounded-full bg-primary-foreground/20 object-cover ring-2 ring-primary-foreground/30" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-tight">Lucas</p>
        <p className="text-xs leading-tight opacity-90">Seu amigo de bem-estar</p>
      </div>
      {tela === "lista" && (
        <button type="button" onClick={onNova} aria-label="Nova conversa" className={botao}>
          <Plus className="h-4 w-4" aria-hidden />
        </button>
      )}
      <button type="button" onClick={onConfigurar} aria-label="Configurar o Lucas" className={botao}>
        <Settings className="h-4 w-4" aria-hidden />
      </button>
      <button type="button" onClick={onFechar} aria-label="Fechar conversa" className={botao}>
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

function ListaConversas({
  conversas, carregando, erro, onTentar, onAbrir, onExcluir, onNova,
}: {
  conversas: Conversa[];
  carregando: boolean;
  erro: boolean;
  onTentar: () => void;
  onAbrir: (c: Conversa) => void;
  onExcluir: (c: Conversa) => void;
  onNova: () => void;
}) {
  if (carregando) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-label="Carregando conversas" />
      </div>
    );
  }

  if (erro) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-muted-foreground">Não foi possível carregar suas conversas.</p>
        <button type="button" onClick={onTentar} className="btn-secondary">Tentar de novo</button>
      </div>
    );
  }

  if (conversas.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <MessageCircle className="h-8 w-8 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">
          Aqui você conversa com o Lucas sobre como está se sentindo, sono, estresse e hábitos.
        </p>
        <button type="button" onClick={onNova} className="btn-primary">Começar uma conversa</button>
        <p className="text-[11px] leading-snug text-muted-foreground">O Lucas é uma IA e não substitui um profissional de saúde.</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-1 flex-col gap-1 overflow-y-auto p-3 scrollbar-thin">
      {conversas.map((c) => (
        <li key={c.id} className="group flex items-center gap-1 rounded-xl transition-colors hover:bg-muted">
          <button type="button" onClick={() => onAbrir(c)} className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left">
            <MessageCircle className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span className="truncate text-sm font-medium text-foreground">{c.titulo}</span>
          </button>
          <button
            type="button"
            onClick={() => onExcluir(c)}
            aria-label={`Excluir a conversa "${c.titulo}"`}
            className="mr-2 shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}

function Conversa({
  mensagens, enviando, onEnviar,
}: {
  mensagens: Mensagem[];
  enviando: boolean;
  onEnviar: (texto: string) => void;
}) {
  const [texto, setTexto] = useState("");
  const fimRef = useRef<HTMLDivElement>(null);
  const campoRef = useRef<HTMLTextAreaElement>(null);
  const aguardando = enviando && mensagens[mensagens.length - 1]?.papel !== "assistant";

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensagens, aguardando]);

  useEffect(() => {
    campoRef.current?.focus();
  }, []);

  function enviar(e?: FormEvent) {
    e?.preventDefault();
    if (!texto.trim() || enviando) return;
    onEnviar(texto);
    setTexto("");
  }

  return (
    <>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4 scrollbar-thin" aria-live="polite">
        {mensagens.length === 0 && !enviando && (
          <p className="m-auto px-4 text-center text-sm text-muted-foreground">Oi! Como você está se sentindo hoje?</p>
        )}
        {mensagens.map((m, i) => (
          <div
            key={i}
            className={[
              "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
              m.papel === "user" ? "self-end bg-primary text-primary-foreground" : "self-start bg-muted text-foreground",
              m.aviso ? "border border-destructive/30 bg-destructive/5 text-foreground" : "",
            ].join(" ")}
          >
            {m.papel === "assistant" && !m.aviso ? (
              <div className="prose prose-sm max-w-none text-foreground dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-li:my-0.5">
                <ReactMarkdown
                  components={{
                    a: ({ children, href }) => (
                      <a href={href} target="_blank" rel="noopener noreferrer">
                        {children}
                      </a>
                    ),
                  }}
                >
                  {m.texto}
                </ReactMarkdown>
              </div>
            ) : (
              <span className="whitespace-pre-wrap break-words">{m.texto}</span>
            )}
          </div>
        ))}
        {aguardando && (
          <div className="flex items-center gap-2 self-start rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Lucas está escrevendo…
          </div>
        )}
        <div ref={fimRef} aria-hidden />
      </div>

      <form onSubmit={enviar} className="flex shrink-0 items-end gap-2 border-t border-border px-3 py-3">
        <label htmlFor="mensagem-lucas" className="sr-only">Mensagem para o Lucas</label>
        <textarea
          id="mensagem-lucas"
          ref={campoRef}
          value={texto}
          onChange={(e) => setTexto(e.target.value.slice(0, MAX_MENSAGEM))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              enviar();
            }
          }}
          rows={1}
          placeholder="Escreva para o Lucas…"
          className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border border-transparent bg-muted px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
        />
        <button
          type="submit"
          disabled={enviando || !texto.trim()}
          aria-label="Enviar mensagem"
          className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {enviando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
        </button>
      </form>
    </>
  );
}

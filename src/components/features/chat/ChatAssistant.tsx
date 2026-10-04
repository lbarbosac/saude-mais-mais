import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, X, Send, Plus, Trash2,
  ChevronLeft, Loader2, Settings,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { track } from "@/lib/analytics";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ReactMarkdown from "react-markdown";
import amigoLucasImg from "@/assets/amigo-lucas.png";

// ─── Tipos ───────────────────────────────────────────────────────────────────

type MessageRole = "user" | "assistant";
interface ChatMessage { role: MessageRole; content: string; }
interface Conversa { id: string; titulo: string; created_at: string; }

const CHAT_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-lucas`;
const MAX_INPUT = 4000;

// ─── Componente ───────────────────────────────────────────────────────────────

export function ChatAssistant() {
  const { user, session } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen]     = useState(false);
  const [view, setView]         = useState<"list" | "chat">("list");
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]       = useState("");
  const [isSending, setIsSending] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (isOpen && user) loadConversas(); }, [isOpen, user]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function loadConversas() {
    const { data, error } = await supabase
      .from("conversas_lucas")
      .select("id, titulo, created_at")
      .order("updated_at", { ascending: false })
      .limit(50); // paginação: máximo 50 conversas por vez
    if (error) {
      console.error("[ChatAssistant] Erro ao carregar conversas:", error);
      return; // não bloqueia o UI, mas não atualiza a lista
    }
    if (data) setConversas(data);
  }

  async function loadMessages(id: string) {
    const { data, error } = await supabase
      .from("mensagens_lucas")
      .select("role, conteudo")
      .eq("conversa_id", id)
      .order("created_at", { ascending: true })
      .limit(100); // paginação: máximo 100 mensagens por conversa
    if (error) {
      console.error("[ChatAssistant] Erro ao carregar mensagens:", error);
      setMessages([{
        role: "assistant",
        content: "Não consegui carregar as mensagens anteriores. Tente novamente.",
      }]);
      return;
    }
    if (data) setMessages(data.map((m) => ({ role: m.role as MessageRole, content: m.conteudo })));
  }

  async function openConversa(c: Conversa) {
    setActiveId(c.id); setIsPending(false);
    await loadMessages(c.id);
    setView("chat");
  }

  function startNew() {
    setActiveId(null); setIsPending(true); setMessages([]); setView("chat");
  }

  async function deleteConversa(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await supabase.from("conversas_lucas").delete().eq("id", id);
    if (activeId === id) { setActiveId(null); setMessages([]); setView("list"); }
    loadConversas();
  }

  async function createConversaDB(): Promise<string | null> {
    const { data, error } = await supabase
      .from("conversas_lucas")
      .insert({ user_id: user!.id, titulo: "Nova conversa" })
      .select()
      .single();
    if (error) {
      console.error("[ChatAssistant] Erro ao criar conversa:", error);
      return null;
    }
    if (data) { setActiveId(data.id); setIsPending(false); return data.id; }
    return null;
  }

  function backToList() { setView("list"); if (isPending) { setIsPending(false); setActiveId(null); } }

  async function sendMessage() {
    const text = input.replace(/<[^>]*>/g, "").slice(0, MAX_INPUT).trim();
    if (!text || isSending) return;
    if (!session?.access_token) {
      setMessages((p) => [...p, { role: "assistant", content: "Sessão expirada. Faça login novamente." }]);
      return;
    }

    let convId = activeId;
    if (isPending && !convId) { convId = await createConversaDB(); if (!convId) return; }
    if (!convId) return;

    track("chat_message_sent");
    const userMsg: ChatMessage = { role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages(history); setInput(""); setIsSending(true);

    await supabase.from("mensagens_lucas").insert({
      conversa_id: convId, user_id: user!.id, role: "user", conteudo: text,
    });

    let reply = "";
    try {
      const resp = await fetch(CHAT_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ messages: history, conversa_id: convId }),
      });

      if (!resp.ok || !resp.body) throw new Error("Erro na resposta");

      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          const line = buf.slice(0, nl).trimEnd();
          buf = buf.slice(nl + 1);
          if (!line.startsWith("data: ")) continue;
          const j = line.slice(6).trim();
          if (j === "[DONE]") break;
          try {
            const chunk = JSON.parse(j).choices?.[0]?.delta?.content;
            if (chunk) {
              reply += chunk;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return [...prev.slice(0, -1), { role: "assistant", content: reply }];
                }
                return [...prev, { role: "assistant", content: reply }];
              });
            }
          } catch { /* chunk inválido */ }
        }
      }

      if (reply) {
        await supabase.from("mensagens_lucas").insert({
          conversa_id: convId, user_id: user!.id, role: "assistant", conteudo: reply,
        });
        if (history.length <= 2) {
          fetch(CHAT_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
            body: JSON.stringify({ action: "generate_title", messages: [...history, { role: "assistant", content: reply }], conversa_id: convId }),
          }).then(() => loadConversas());
        }
      }
    } catch {
      setMessages((p) => [...p, { role: "assistant", content: "Desculpe, ocorreu um erro. Tente novamente." }]);
    }
    setIsSending(false);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* FAB */}
      {!isOpen && (
        <motion.button
          whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
          onClick={() => setIsOpen(true)}
          aria-label="Abrir chat com o Lucas"
          className="fixed bottom-24 right-4 z-50 h-14 w-14 overflow-hidden rounded-full shadow-elevated ring-2 ring-background">
          <img src={amigoLucasImg} alt="Amigo Lucas" className="h-full w-full object-cover" />
        </motion.button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="dialog" aria-label="Chat com o Lucas" aria-modal="true"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            className="fixed bottom-20 left-3 right-3 z-50 mx-auto max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-elevated sm:left-auto sm:right-4 sm:w-96">

            {/* Header */}
            <div className="flex items-center gap-3 gradient-calm px-4 py-3 text-primary-foreground">
              {view === "chat" && (
                <button onClick={backToList} aria-label="Voltar para conversas"
                  className="rounded-full p-1 transition-colors hover:bg-primary-foreground/20">
                  <ChevronLeft className="h-5 w-5" aria-hidden />
                </button>
              )}
              <img src={amigoLucasImg} alt="" aria-hidden
                className="h-9 w-9 rounded-full bg-primary-foreground/20 object-cover ring-2 ring-primary-foreground/30" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold leading-tight">Lucas</p>
                <p className="text-xs opacity-75 leading-tight">Assistente de bem-estar</p>
              </div>
              {view === "list" && (
                <button onClick={startNew} aria-label="Nova conversa"
                  className="rounded-full p-1.5 transition-colors hover:bg-primary-foreground/20">
                  <Plus className="h-4 w-4" aria-hidden />
                </button>
              )}
              <button
                onClick={() => { setIsOpen(false); setTimeout(() => navigate("/configuracoes"), 150); }}
                aria-label="Configurações do Lucas"
                className="rounded-full p-1.5 transition-colors hover:bg-primary-foreground/20 text-primary-foreground">
                <Settings className="h-4 w-4" aria-hidden />
              </button>
              <button onClick={() => setIsOpen(false)} aria-label="Fechar chat"
                className="rounded-full p-1.5 transition-colors hover:bg-primary-foreground/20">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            {/* Lista de conversas */}
            {view === "list" ? (
              <div className="flex h-80 flex-col gap-1 overflow-y-auto p-3">
                {conversas.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center px-4">
                    <MessageCircle className="h-8 w-8 text-muted-foreground" aria-hidden />
                    <p className="text-sm text-muted-foreground">
                      Nenhuma conversa ainda. Clique em + para começar.
                    </p>
                    <button onClick={startNew}
                      className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                      Iniciar conversa
                    </button>
                  </div>
                ) : (
                  conversas.map((c) => (
                    <button key={c.id} onClick={() => openConversa(c)}
                      className="flex items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-muted">
                      <MessageCircle className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                      <span className="flex-1 truncate text-sm font-medium text-foreground">{c.titulo}</span>
                      <button onClick={(e) => deleteConversa(c.id, e)}
                        aria-label={`Excluir: ${c.titulo}`}
                        className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </button>
                  ))
                )}
              </div>
            ) : (
              /* Chat */
              <>
                <div className="flex h-80 flex-col gap-3 overflow-y-auto p-4">
                  {messages.length === 0 && !isSending && (
                    <p className="m-auto text-center text-sm text-muted-foreground px-4">
                      Olá! Como você está se sentindo hoje?
                    </p>
                  )}
                  {messages.map((msg, i) => (
                    <div key={i} className={[
                      "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                      msg.role === "assistant"
                        ? "self-start bg-muted text-foreground"
                        : "self-end bg-primary text-primary-foreground",
                    ].join(" ")}>
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0.5">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : msg.content}
                    </div>
                  ))}
                  {isSending && messages[messages.length - 1]?.role !== "assistant" && (
                    <div className="flex items-center gap-2 self-start rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Pensando...
                    </div>
                  )}
                  <div ref={endRef} aria-hidden />
                </div>

                {/* Input */}
                <div className="flex items-center gap-2 border-t border-border px-3 py-3">
                  <input value={input} onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Como você está se sentindo?" maxLength={MAX_INPUT}
                    aria-label="Mensagem para o Lucas"
                    className="flex-1 rounded-xl bg-muted px-4 py-2.5 text-sm outline-none border border-transparent placeholder:text-muted-foreground transition-all focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
                  <button onClick={sendMessage} disabled={isSending || !input.trim()}
                    aria-label="Enviar mensagem"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
                    <Send className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

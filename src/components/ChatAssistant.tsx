import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Plus, Trash2, ChevronLeft, Loader2, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import ReactMarkdown from "react-markdown";
import amigoLucasImg from "@/assets/amigo-lucas.png";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Conversa {
  id: string;
  titulo: string;
  created_at: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-lucas`;

const ChatAssistant = () => {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"list" | "chat">("list");
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [activeConversaId, setActiveConversaId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingConversa, setPendingConversa] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && user) loadConversas();
  }, [open, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversas = async () => {
    const { data } = await supabase
      .from("conversas_lucas")
      .select("id, titulo, created_at")
      .order("updated_at", { ascending: false });
    if (data) setConversas(data);
  };

  const loadMessages = async (conversaId: string) => {
    const { data } = await supabase
      .from("mensagens_lucas")
      .select("role, conteudo")
      .eq("conversa_id", conversaId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data.map((m) => ({ role: m.role as "user" | "assistant", content: m.conteudo })));
  };

  const openConversa = async (conversa: Conversa) => {
    setActiveConversaId(conversa.id);
    setPendingConversa(false);
    await loadMessages(conversa.id);
    setView("chat");
  };

  const newConversa = () => {
    setActiveConversaId(null);
    setPendingConversa(true);
    setMessages([]);
    setView("chat");
  };

  const deleteConversa = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("conversas_lucas").delete().eq("id", id);
    if (activeConversaId === id) {
      setActiveConversaId(null);
      setMessages([]);
      setView("list");
    }
    loadConversas();
  };

  const createConversaInDB = async (): Promise<string | null> => {
    const { data, error } = await supabase
      .from("conversas_lucas")
      .insert({ user_id: user!.id, titulo: "Nova conversa" })
      .select()
      .single();
    if (data) {
      setActiveConversaId(data.id);
      setPendingConversa(false);
      return data.id;
    }
    return null;
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const sanitizedInput = input.replace(/<[^>]*>/g, "").slice(0, 4000).trim();
    if (!sanitizedInput) return;

    let conversaId = activeConversaId;
    if (pendingConversa && !conversaId) {
      conversaId = await createConversaInDB();
      if (!conversaId) return;
    }
    if (!conversaId) return;

    const userMsg: Message = { role: "user", content: sanitizedInput };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    await supabase.from("mensagens_lucas").insert({
      conversa_id: conversaId,
      user_id: user!.id,
      role: "user",
      conteudo: sanitizedInput,
    });

    let assistantContent = "";
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ messages: newMessages, conversa_id: conversaId }),
      });

      if (!resp.ok || !resp.body) throw new Error("Erro na resposta");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch {}
        }
      }

      if (assistantContent) {
        await supabase.from("mensagens_lucas").insert({
          conversa_id: conversaId,
          user_id: user!.id,
          role: "assistant",
          conteudo: assistantContent,
        });

        if (newMessages.length <= 2) {
          fetch(CHAT_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({
              action: "generate_title",
              messages: [...newMessages, { role: "assistant", content: assistantContent }],
              conversa_id: conversaId,
            }),
          }).then(() => loadConversas());
        }
      }
    } catch (e) {
      console.error(e);
      setMessages((prev) => [...prev, { role: "assistant", content: "Desculpe, ocorreu um erro. Tente novamente." }]);
    }
    setIsLoading(false);
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(true)}
        className={`fixed bottom-24 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-elevated overflow-hidden ${open ? "hidden" : ""}`}
      >
        <img src={amigoLucasImg} alt="Amigo Lucas" className="h-full w-full object-cover" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-20 right-3 left-3 z-50 mx-auto max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-elevated sm:left-auto sm:w-96"
          >
            <div className="flex items-center gap-3 gradient-calm px-4 py-3 text-primary-foreground">
              {view === "chat" && (
                <button onClick={() => { setView("list"); if (pendingConversa) { setPendingConversa(false); setActiveConversaId(null); } }} className="rounded-full p-1 hover:bg-primary-foreground/20">
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              <img src={amigoLucasImg} alt="Lucas" className="h-10 w-10 rounded-full bg-primary-foreground/20 object-cover" />
              <div className="flex-1">
                <p className="font-semibold">Amigo Lucas</p>
                <p className="text-xs opacity-80">Seu assistente de bem-estar</p>
              </div>
              {view === "list" && (
                <button onClick={newConversa} className="rounded-full p-1 hover:bg-primary-foreground/20">
                  <Plus className="h-5 w-5" />
                </button>
              )}
              <button onClick={() => { setOpen(false); navigate("/configuracoes"); }} className="rounded-full p-1 hover:bg-primary-foreground/20">
                <Settings className="h-5 w-5" />
              </button>
              <button onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-primary-foreground/20">
                <X className="h-5 w-5" />
              </button>
            </div>

            {view === "list" ? (
              <div className="flex h-80 flex-col gap-1 overflow-y-auto p-3">
                {conversas.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                    <MessageCircle className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Nenhuma conversa ainda</p>
                    <button onClick={newConversa} className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                      Iniciar conversa
                    </button>
                  </div>
                ) : (
                  conversas.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => openConversa(c)}
                      className="flex items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-muted"
                    >
                      <MessageCircle className="h-4 w-4 text-primary shrink-0" />
                      <span className="flex-1 truncate text-sm font-medium text-foreground">{c.titulo}</span>
                      <button onClick={(e) => deleteConversa(c.id, e)} className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </button>
                  ))
                )}
              </div>
            ) : (
              <>
                <div className="flex h-80 flex-col gap-3 overflow-y-auto p-4">
                  {messages.length === 0 && (
                    <div className="flex flex-1 items-center justify-center">
                      <p className="text-sm text-muted-foreground text-center">Ola! Como posso te ajudar hoje?</p>
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.role === "assistant"
                          ? "self-start bg-muted text-foreground"
                          : "self-end bg-primary text-primary-foreground"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        msg.content
                      )}
                    </div>
                  ))}
                  {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                    <div className="self-start flex items-center gap-2 rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Pensando...
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="flex items-center gap-2 border-t border-border px-3 py-3">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 rounded-xl border-none bg-muted px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={isLoading}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatAssistant;

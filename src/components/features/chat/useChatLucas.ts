import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { cabecalhosDaFuncao, urlDaFuncao } from "@/lib/supabase/functions";
import { lerEventosSSE } from "@/lib/sse";
import { track } from "@/lib/analytics";

export interface Mensagem {
  papel: "user" | "assistant";
  texto: string;
  /** Aviso local (erro), não salvo no banco. */
  aviso?: boolean;
}

export interface Conversa {
  id: string;
  titulo: string;
  updated_at: string | null;
}

type Evento =
  | { tipo: "conversa"; conversa_id: string }
  | { tipo: "texto"; texto: string }
  | { tipo: "fim" }
  | { tipo: "erro"; mensagem: string };

const CHAVE_CONVERSAS = ["chat-lucas", "conversas"];

/**
 * Estado do chat do Lucas: lista de conversas, mensagens da conversa aberta e
 * envio com resposta em streaming. O servidor salva as duas mensagens; o
 * cliente só exibe.
 */
export function useChatLucas(userId: string | undefined, painelAberto: boolean) {
  const queryClient = useQueryClient();
  const [conversaId, setConversaId] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [enviando, setEnviando] = useState(false);
  const controleRef = useRef<AbortController | null>(null);

  useEffect(() => () => controleRef.current?.abort(), []);

  const conversas = useQuery({
    queryKey: [...CHAVE_CONVERSAS, userId],
    enabled: !!userId && painelAberto,
    queryFn: async (): Promise<Conversa[]> => {
      const { data, error } = await supabase
        .from("conversas_lucas")
        .select("id, titulo, updated_at")
        .order("updated_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const abrir = useCallback(async (id: string) => {
    controleRef.current?.abort();
    setConversaId(id);
    setMensagens([]);
    const { data, error } = await supabase
      .from("mensagens_lucas")
      .select("role, conteudo")
      .eq("conversa_id", id)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) {
      setMensagens([{ papel: "assistant", texto: "Não consegui carregar esta conversa. Tente de novo.", aviso: true }]);
      return;
    }
    setMensagens(data.map((m) => ({ papel: m.role === "assistant" ? "assistant" : "user", texto: m.conteudo })));
  }, []);

  const novaConversa = useCallback(() => {
    controleRef.current?.abort();
    setConversaId(null);
    setMensagens([]);
  }, []);

  const excluir = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("conversas_lucas").delete().eq("id", id);
      if (error) throw error;
      if (id === conversaId) novaConversa();
      queryClient.setQueryData<Conversa[]>([...CHAVE_CONVERSAS, userId], (lista) => lista?.filter((c) => c.id !== id));
    },
    [conversaId, novaConversa, queryClient, userId],
  );

  const enviar = useCallback(
    async (texto: string) => {
      const mensagem = texto.trim();
      if (!mensagem || enviando) return;

      const headers = await cabecalhosDaFuncao();
      if (!headers) {
        setMensagens((m) => [...m, { papel: "assistant", texto: "Sua sessão expirou. Entre novamente.", aviso: true }]);
        return;
      }

      track("chat_message_sent");
      setEnviando(true);
      setMensagens((m) => [...m.filter((x) => !x.aviso), { papel: "user", texto: mensagem }]);

      const controle = new AbortController();
      controleRef.current = controle;
      const avisar = (aviso: string) => setMensagens((m) => [...m, { papel: "assistant", texto: aviso, aviso: true }]);

      try {
        const resp = await fetch(urlDaFuncao("chat-lucas"), {
          method: "POST",
          headers,
          body: JSON.stringify({ mensagem, conversa_id: conversaId }),
          signal: controle.signal,
        });

        if (!resp.ok || !resp.body) {
          const json = await resp.json().catch(() => null);
          avisar(json?.error ?? "Não consegui responder agora. Tente de novo em instantes.");
          return;
        }

        let resposta = "";
        for await (const evento of lerEventosSSE<Evento>(resp.body)) {
          if (evento.tipo === "conversa") {
            setConversaId(evento.conversa_id);
          } else if (evento.tipo === "texto") {
            resposta += evento.texto;
            const parcial = resposta;
            setMensagens((m) => {
              const ultima = m[m.length - 1];
              return ultima?.papel === "assistant" && !ultima.aviso
                ? [...m.slice(0, -1), { papel: "assistant", texto: parcial }]
                : [...m, { papel: "assistant", texto: parcial }];
            });
          } else if (evento.tipo === "erro") {
            avisar(evento.mensagem);
          }
        }
      } catch (e) {
        if (!(e instanceof DOMException && e.name === "AbortError")) {
          avisar("A conexão caiu antes da resposta terminar. Tente de novo.");
        }
      } finally {
        setEnviando(false);
        if (controleRef.current === controle) controleRef.current = null;
        queryClient.invalidateQueries({ queryKey: CHAVE_CONVERSAS });
      }
    },
    [conversaId, enviando, queryClient],
  );

  return {
    conversas: conversas.data ?? [],
    carregandoConversas: conversas.isFetching && !conversas.data,
    erroConversas: conversas.isError,
    recarregarConversas: conversas.refetch,
    conversaId,
    mensagens,
    enviando,
    abrir,
    novaConversa,
    excluir,
    enviar,
  };
}

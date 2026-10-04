import { useCallback, useEffect, useState } from "react";
import { callEdgeFunction } from "@/lib/supabase/functions";
import { supabase } from "@/lib/supabase/client";

export type PermissaoNotificacao = "default" | "granted" | "denied";

const CHAVE_HORA = "saude-reminder-hour";
const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim() ?? "";

function base64UrlParaBytes(base64: string): Uint8Array<ArrayBuffer> {
  const preenchimento = "=".repeat((4 - (base64.length % 4)) % 4);
  const bruto = atob((base64 + preenchimento).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(bruto.length));
  for (let i = 0; i < bruto.length; i++) bytes[i] = bruto.charCodeAt(i);
  return bytes;
}

function horaSalva(): number {
  try {
    const n = Number(localStorage.getItem(CHAVE_HORA));
    return Number.isInteger(n) && n >= 0 && n <= 23 && localStorage.getItem(CHAVE_HORA) !== null ? n : 8;
  } catch {
    return 8;
  }
}

/**
 * Lembrete diário por Web Push. A inscrição vai para o servidor e o envio é
 * feito pela função enviar-lembretes-diarios (pg_cron), mesmo com o app fechado.
 */
export function usePushNotifications() {
  const suportado =
    typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
  const configurado = VAPID.length > 0;

  const [permissao, setPermissao] = useState<PermissaoNotificacao>(() =>
    suportado ? (Notification.permission as PermissaoNotificacao) : "default",
  );
  const [hora, setHora] = useState(horaSalva);
  const [inscrito, setInscrito] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    if (!suportado) return;
    let ativo = true;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => ativo && setInscrito(!!sub))
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, [suportado]);

  const pedirPermissao = useCallback(async () => {
    if (!suportado) return false;
    const resultado = await Notification.requestPermission();
    setPermissao(resultado as PermissaoNotificacao);
    return resultado === "granted";
  }, [suportado]);

  /** Ativa (ou atualiza o horário do) lembrete. Devolve uma mensagem de erro ou null. */
  const ativar = useCallback(
    async (novaHora: number): Promise<string | null> => {
      if (!suportado) return "Este navegador não suporta notificações.";
      if (!configurado) return "Os lembretes não estão configurados neste ambiente.";
      if (!import.meta.env.PROD) return "Os lembretes só funcionam na versão publicada (npm run build).";
      setOcupado(true);
      try {
        if (Notification.permission !== "granted" && !(await pedirPermissao())) {
          return "Permita as notificações no navegador para receber o lembrete.";
        }
        const reg = await navigator.serviceWorker.ready;
        const sub =
          (await reg.pushManager.getSubscription()) ??
          (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlParaBytes(VAPID) }));
        const json = sub.toJSON();

        const { error } = await callEdgeFunction("salvar-push-subscription", {
          body: {
            endpoint: json.endpoint,
            keys: json.keys,
            reminderHour: novaHora,
            timezoneOffsetMinutes: new Date().getTimezoneOffset(),
          },
        });
        if (error) return error;

        setHora(novaHora);
        setInscrito(true);
        try {
          localStorage.setItem(CHAVE_HORA, String(novaHora));
        } catch {
          // só afeta o valor inicial do seletor
        }
        return null;
      } catch (e) {
        console.error("[push] falha ao ativar:", e);
        return "Não foi possível ativar os lembretes neste navegador.";
      } finally {
        setOcupado(false);
      }
    },
    [suportado, configurado, pedirPermissao],
  );

  const desativar = useCallback(async (): Promise<string | null> => {
    if (!suportado) return null;
    setOcupado(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setInscrito(false);
      return null;
    } catch (e) {
      console.error("[push] falha ao desativar:", e);
      return "Não foi possível desativar os lembretes.";
    } finally {
      setOcupado(false);
    }
  }, [suportado]);

  const testar = useCallback(async () => {
    if (Notification.permission !== "granted" && !(await pedirPermissao())) return;
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification("Saúde++", {
      body: "Tudo certo: suas notificações estão funcionando.",
      icon: "/icons/icon-192.png",
      tag: "teste",
    });
  }, [pedirPermissao]);

  return { suportado, configurado, permissao, hora, inscrito, ocupado, ativar, desativar, testar };
}

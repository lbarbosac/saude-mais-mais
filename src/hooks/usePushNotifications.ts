import { useState, useEffect, useCallback } from "react";
import { callEdgeFunction } from "@/lib/supabase/functions";

export type NotificationPermission = "default" | "granted" | "denied";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (c) => c.charCodeAt(0));
}

/**
 * Web Push real (RFC 8030) — substitui o agendamento via setTimeout, que
 * só funcionava enquanto a aba/app permanecia aberto. Agora a inscrição é
 * enviada ao servidor; o disparo da notificação acontece via Edge Function
 * `enviar-lembretes-diarios` agendada por pg_cron, mesmo com o app fechado.
 */
export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [reminderHour, setReminderHour] = useState<number>(8);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  const isSupported =
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission as NotificationPermission);
    }
    const saved = localStorage.getItem("saude-reminder-hour");
    if (saved !== null) setReminderHour(Number(saved));

    if (isSupported) {
      navigator.serviceWorker.ready.then(async (reg) => {
        const existing = await reg.pushManager.getSubscription();
        setIsSubscribed(!!existing);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!("Notification" in window)) return false;
    const result = await Notification.requestPermission();
    setPermission(result as NotificationPermission);
    return result === "granted";
  }, []);

  /**
   * Inscreve o navegador para Web Push e envia a inscrição ao servidor.
   * hour: horário local (0-23) em que o usuário quer receber o lembrete.
   */
  const subscribe = useCallback(async (hour: number): Promise<boolean> => {
    if (!isSupported) return false;

    setIsSubscribing(true);
    try {
      const granted = permission === "granted" || (await requestPermission());
      if (!granted) return false;

      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
      if (!vapidPublicKey) {
        console.error("[usePushNotifications] VITE_VAPID_PUBLIC_KEY não configurada");
        return false;
      }

      const reg = await navigator.serviceWorker.ready;
      let subscription = await reg.pushManager.getSubscription();

      if (!subscription) {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

      const { error } = await callEdgeFunction("salvar-push-subscription", {
        body: {
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
          reminderHour: hour,
          timezoneOffsetMinutes: new Date().getTimezoneOffset(),
        },
      });

      if (error) {
        console.error("[usePushNotifications] erro ao salvar inscrição:", error);
        return false;
      }

      setReminderHour(hour);
      setIsSubscribed(true);
      localStorage.setItem("saude-reminder-hour", String(hour));
      return true;
    } finally {
      setIsSubscribing(false);
    }
  }, [isSupported, permission, requestPermission]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return;
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe();
    setIsSubscribed(false);
  }, [isSupported]);

  const sendTestNotification = useCallback(async () => {
    if (permission !== "granted") {
      const ok = await requestPermission();
      if (!ok) return;
    }
    if (!("serviceWorker" in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    // Notificação local imediata, só para testar permissão do navegador —
    // o lembrete diário real chega via push do servidor mesmo com o app fechado
    reg.showNotification("Saúde em Sintonia", {
      body: "Suas notificações estão funcionando!",
      icon: "/icons/icon-192.png",
      tag: "teste",
    });
  }, [permission, requestPermission]);

  return {
    permission,
    reminderHour,
    isSubscribed,
    isSubscribing,
    isSupported,
    requestPermission,
    subscribe,
    unsubscribe,
    sendTestNotification,
  };
}

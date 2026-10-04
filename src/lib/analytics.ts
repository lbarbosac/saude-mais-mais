/**
 * Analytics de primeira parte (first-party) — sem cookies de terceiros,
 * sem Google Analytics, sem rastreamento cross-site. Armazena eventos
 * diretamente no Supabase para conformidade com LGPD.
 *
 * Eventos rastreados (anônimos por design):
 *   - page_view: qual tela foi aberta
 *   - habit_generated: usuário gerou hábitos com IA
 *   - habit_toggled: usuário marcou/desmarcou um hábito
 *   - chat_message_sent: usuário enviou mensagem ao Lucas
 *   - checkin_saved: usuário registrou humor/energia
 *   - onboarding_completed: usuário terminou o onboarding
 *
 * Os eventos NÃO incluem conteúdo das mensagens ou dados pessoais sensíveis,
 * apenas metadados de uso (tipo de evento, data/hora, versão do app).
 */

import { supabase } from "@/lib/supabase/client";

export type AnalyticsEventName =
  | "page_view"
  | "habit_generated"
  | "habit_toggled"
  | "chat_message_sent"
  | "checkin_saved"
  | "onboarding_completed"
  | "sound_played"
  | "workout_generated";

interface EventPayload {
  event: AnalyticsEventName;
  properties?: Record<string, string | number | boolean>;
}

// Fila local para processar em batch — evita 1 chamada ao DB por interação
let eventQueue: EventPayload[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL = 5000; // 5 segundos

function flush() {
  if (eventQueue.length === 0) return;
  const batch = [...eventQueue];
  eventQueue = [];

  supabase.auth.getUser().then(({ data }) => {
    const userId = data?.user?.id ?? null;
    const events = batch.map((e) => ({
      user_id: userId,
      event_name: e.event,
      properties: e.properties ?? {},
      app_version: "1.0.0",
      created_at: new Date().toISOString(),
    }));

    // Fire-and-forget — analytics nunca deve bloquear a UI
    supabase.from("analytics_eventos").insert(events).then(
      () => {},
      (err) => console.debug("[Analytics] flush error:", err)
    );
  });
}

function schedule() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, FLUSH_INTERVAL);
}

/**
 * Registra um evento de analytics.
 * Não lança erro, não bloqueia, não inclui dados pessoais sensíveis.
 */
export function track(event: AnalyticsEventName, properties?: EventPayload["properties"]) {
  eventQueue.push({ event, properties });
  schedule();
}

// Flush ao fechar/ocultar a página (best-effort)
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
  window.addEventListener("pagehide", flush);
}

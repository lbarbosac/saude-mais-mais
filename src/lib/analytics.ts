/**
 * Métricas de uso de primeira parte, gravadas no próprio Supabase.
 * Sem cookies de terceiros e sem ferramentas externas de rastreamento.
 *
 * Registra só o tipo do evento e metadados simples (nunca o conteúdo de
 * mensagens ou dados de saúde). Cada pessoa vê e pode apagar os próprios
 * eventos (RLS), e eles somem junto com a conta.
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

type Propriedades = Record<string, string | number | boolean>;

let fila: { event_name: AnalyticsEventName; properties: Propriedades }[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
const INTERVALO_MS = 5000;

async function enviar() {
  timer = null;
  if (fila.length === 0) return;
  const lote = fila.splice(0, fila.length);

  // getSession lê a sessão local, sem ir à rede.
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return;

  const { error } = await supabase
    .from("analytics_eventos")
    .insert(lote.map((e) => ({ ...e, user_id: userId, app_version: __APP_VERSION__ })));
  if (error) console.debug("[analytics] falha ao enviar:", error.message);
}

/** Registra um evento. Nunca lança erro nem bloqueia a interface. */
export function track(evento: AnalyticsEventName, propriedades: Propriedades = {}) {
  fila.push({ event_name: evento, properties: propriedades });
  if (fila.length > 50) fila = fila.slice(-50);
  if (!timer) timer = setTimeout(enviar, INTERVALO_MS);
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void enviar();
  });
}

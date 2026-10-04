// Edge Function: salvar-push-subscription
//
// Guarda a inscrição de Web Push do navegador e o horário do lembrete.
//
// Entrada: { endpoint, keys: { p256dh, auth }, reminderHour, timezoneOffsetMinutes }

import { erro, json, lerCorpo, preflight } from "../_shared/http.ts";
import { autenticar } from "../_shared/supabase.ts";

const CHAVE_BASE64URL = /^[A-Za-z0-9_-]{16,200}={0,2}$/;

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return erro(req, "Método não permitido.", 405);

  const auth = await autenticar(req);
  if ("resposta" in auth) return auth.resposta;
  const { userId, db } = auth;

  const corpo = await lerCorpo(req);
  const endpoint = typeof corpo?.endpoint === "string" ? corpo.endpoint : "";
  const chaves = (corpo?.keys ?? {}) as Record<string, unknown>;
  const p256dh = typeof chaves.p256dh === "string" ? chaves.p256dh : "";
  const authKey = typeof chaves.auth === "string" ? chaves.auth : "";

  let endpointValido = false;
  try {
    endpointValido = new URL(endpoint).protocol === "https:" && endpoint.length <= 1000;
  } catch { /* URL inválida */ }

  if (!endpointValido || !CHAVE_BASE64URL.test(p256dh) || !CHAVE_BASE64URL.test(authKey)) {
    return erro(req, "Dados de inscrição inválidos.");
  }

  const hora = Number(corpo?.reminderHour);
  const fuso = Number(corpo?.timezoneOffsetMinutes);

  const { error } = await db.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint,
      p256dh,
      auth_key: authKey,
      reminder_hour: Number.isInteger(hora) && hora >= 0 && hora <= 23 ? hora : 8,
      timezone_offset_minutes: Number.isInteger(fuso) && Math.abs(fuso) <= 840 ? fuso : 180,
    },
    { onConflict: "user_id,endpoint" },
  );

  if (error) {
    console.error("[salvar-push-subscription] falha ao salvar:", error.message);
    return erro(req, "Não foi possível ativar os lembretes.", 500);
  }

  return json(req, { ok: true });
});

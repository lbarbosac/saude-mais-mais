// Edge Function: enviar-lembretes-diarios
//
// Disparada de hora em hora pelo pg_cron (ver README). Envia Web Push para
// quem marcou o lembrete para a hora atual no fuso do próprio aparelho.
// Não é chamada pelo app: exige o cabeçalho x-cron-secret.
//
// Secrets: CRON_SECRET, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT

import webpush from "npm:web-push@3.6.7";
import { clienteAdmin } from "../_shared/supabase.ts";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT");
const CRON_SECRET = Deno.env.get("CRON_SECRET");

const resposta = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });

/** Comparação em tempo constante para não vazar o segredo por timing. */
function iguais(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  if (x.length !== y.length) return false;
  let diferenca = 0;
  for (let i = 0; i < x.length; i++) diferenca |= x[i] ^ y[i];
  return diferenca === 0;
}

Deno.serve(async (req) => {
  if (!CRON_SECRET || !iguais(req.headers.get("x-cron-secret") ?? "", CRON_SECRET)) {
    return resposta({ error: "Não autorizado" }, 401);
  }
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
    console.error("[enviar-lembretes] chaves VAPID não configuradas");
    return resposta({ error: "VAPID não configurado" }, 503);
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  const admin = clienteAdmin();

  const { data: inscricoes, error } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth_key, reminder_hour, timezone_offset_minutes");
  if (error) {
    console.error("[enviar-lembretes] erro ao buscar inscrições:", error.message);
    return resposta({ error: "Erro ao buscar inscrições" }, 500);
  }

  // getTimezoneOffset() do navegador: minutos que faltam para o UTC (Brasília = 180).
  const agora = Date.now();
  const candidatos = (inscricoes ?? []).filter((s) => {
    const horaLocal = new Date(agora - s.timezone_offset_minutes * 60_000).getUTCHours();
    return horaLocal === s.reminder_hour;
  });

  let enviados = 0;
  const expirados: string[] = [];
  for (const s of candidatos) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } },
        JSON.stringify({
          title: "Saúde++",
          body: "Hora de dar uma olhada nos seus hábitos de hoje.",
          url: "/habitos",
          tag: "lembrete-diario",
        }),
      );
      enviados++;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      // 404/410: o navegador revogou a inscrição.
      if (status === 404 || status === 410) expirados.push(s.endpoint);
      else console.error("[enviar-lembretes] falha no envio:", status ?? e);
    }
  }

  if (expirados.length) await admin.from("push_subscriptions").delete().in("endpoint", expirados);

  return resposta({ candidatos: candidatos.length, enviados, removidos: expirados.length });
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

/**
 * Disparada por pg_cron a cada hora (cheia). Envia notificação push real
 * (RFC 8030) para todos os usuários cujo horário de lembrete bate com a
 * hora atual, considerando o offset de fuso horário salvo na inscrição.
 *
 * Isso substitui o agendamento via setTimeout no cliente, que só funciona
 * enquanto o app está aberto — a causa raiz dos lembretes não dispararem
 * quando o usuário fecha o app no celular.
 *
 * Esta função NÃO é chamada pelo frontend — apenas pelo pg_cron com a
 * service_role key. Por isso não usa _shared/cors.ts (sem necessidade de
 * CORS para chamadas server-to-server).
 */

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:contato@saudeemsintoniaapp.com";

serve(async (req) => {
  // Protege contra chamadas externas não autorizadas — exige a service role key
  const authHeader = req.headers.get("Authorization");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!authHeader || authHeader !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401 });
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.error("[enviar-lembretes] Chaves VAPID não configuradas");
    return new Response(JSON.stringify({ error: "VAPID não configurado" }), { status: 503 });
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    serviceKey!
  );

  const nowUtcHour = new Date().getUTCHours();

  // Busca inscrições cujo horário local de lembrete corresponde à hora atual.
  // hora_local = (hora_utc - offset_minutos/60) mod 24
  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth_key, reminder_hour, timezone_offset_minutes");

  if (error) {
    console.error("[enviar-lembretes] erro ao buscar inscrições:", error);
    return new Response(JSON.stringify({ error: "Erro ao buscar inscrições" }), { status: 500 });
  }

  const candidatos = (subs ?? []).filter((s) => {
    const horaLocal = ((nowUtcHour - Math.round(s.timezone_offset_minutes / 60)) % 24 + 24) % 24;
    return horaLocal === s.reminder_hour;
  });

  let enviados = 0;
  let falhas = 0;
  const endpointsParaRemover: string[] = [];

  for (const sub of candidatos) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth_key },
        },
        JSON.stringify({
          title: "Saúde em Sintonia",
          body: "Hora de checar seus hábitos e cuidar de você hoje.",
          url: "/habitos",
          tag: "lembrete-diario",
        })
      );
      enviados++;
    } catch (err) {
      falhas++;
      const statusCode = (err as { statusCode?: number })?.statusCode;
      // 404/410 = inscrição expirada ou revogada pelo navegador — remove do banco
      if (statusCode === 404 || statusCode === 410) {
        endpointsParaRemover.push(sub.endpoint);
      } else {
        console.error(`[enviar-lembretes] falha ao enviar para ${sub.user_id}:`, err);
      }
    }
  }

  if (endpointsParaRemover.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", endpointsParaRemover);
  }

  return new Response(
    JSON.stringify({ candidatos: candidatos.length, enviados, falhas, removidos: endpointsParaRemover.length }),
    { headers: { "Content-Type": "application/json" } }
  );
});

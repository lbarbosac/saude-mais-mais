import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsPreflightResponse,
  jsonResponse,
  errorResponse,
  authenticateRequest,
} from "../_shared/cors.ts";

interface SubscriptionPayload {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  reminderHour: number;
  timezoneOffsetMinutes: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return corsPreflightResponse(req);

  const auth = await authenticateRequest(req);
  if ("error" in auth) return auth.error;
  const { userId, supabase } = auth;

  let body: SubscriptionPayload;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Corpo da requisição inválido.", 400, req);
  }

  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return errorResponse("Dados de inscrição incompletos.", 400, req);
  }

  const reminderHour = Number.isInteger(body.reminderHour)
    ? Math.min(23, Math.max(0, body.reminderHour))
    : 8;
  const tzOffset = Number.isInteger(body.timezoneOffsetMinutes) ? body.timezoneOffsetMinutes : 180;

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth_key: body.keys.auth,
      reminder_hour: reminderHour,
      timezone_offset_minutes: tzOffset,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,endpoint" }
  );

  if (error) {
    console.error("[salvar-push-subscription] erro ao salvar:", error);
    return errorResponse("Erro ao salvar inscrição de notificações.", 500, req);
  }

  return jsonResponse({ success: true }, 200, {}, req);
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Nao autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Nao autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const { confirmacao } = await req.json();
    if (confirmacao !== "EXCLUIR MEUS DADOS") {
      return new Response(JSON.stringify({ error: "Confirmacao invalida. Digite 'EXCLUIR MEUS DADOS' para confirmar." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to delete all user data
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Delete in order (respecting dependencies)
    const tables = [
      "mensagens_lucas",
      "conversas_lucas",
      "habito_registro",
      "habitos",
      "checkin_diario",
      "desafios",
      "amizades",
      "preferencias_usuario",
      "presenca_online",
      "consentimento_lgpd",
      "audit_log",
      "perfil_usuario",
    ];

    const results: Record<string, string> = {};
    for (const table of tables) {
      const { error } = await adminClient
        .from(table)
        .delete()
        .eq("user_id", userId);
      results[table] = error ? `erro: ${error.message}` : "excluido";
    }

    // Also delete for desafios where user is the challenged one
    await adminClient.from("desafios").delete().eq("desafiado_id", userId);
    await adminClient.from("amizades").delete().eq("amigo_id", userId);

    // Log the deletion (will be the last entry before account removal)
    console.log(`LGPD data deletion completed for user: ${userId}`);

    return new Response(JSON.stringify({
      message: "Todos os seus dados foram excluidos com sucesso.",
      detalhes: results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("excluir-dados error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

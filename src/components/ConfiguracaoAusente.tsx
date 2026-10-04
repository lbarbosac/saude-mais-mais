/** Mostrado quando o .env não foi configurado, em vez de uma tela branca. */
export function ConfiguracaoAusente() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md rounded-2xl border border-border bg-card p-6 shadow-card">
        <h1 className="text-lg font-bold text-foreground">Falta configurar o Supabase</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Copie o arquivo <code className="rounded bg-muted px-1">.env.example</code> para{" "}
          <code className="rounded bg-muted px-1">.env</code>, preencha{" "}
          <code className="rounded bg-muted px-1">VITE_SUPABASE_URL</code> e{" "}
          <code className="rounded bg-muted px-1">VITE_SUPABASE_PUBLISHABLE_KEY</code> e reinicie o servidor.
        </p>
      </div>
    </main>
  );
}

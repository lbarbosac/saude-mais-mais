import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle, Bell, BellOff, BellRing, ChevronRight, Eye, Loader2, LogOut,
  MessageCircle, Monitor, Moon, Send, Shield, Sun, Trash2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { callEdgeFunction } from "@/lib/supabase/functions";
import { useTema, type PreferenciaTema } from "@/lib/tema";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "@/hooks/use-toast";
import BackButton from "@/components/BackButton";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ─── Dados ──────────────────────────────────────────────────────────────────

interface ConfigLucas {
  lucas_estilo: string;
  lucas_profundidade: string;
  lucas_tom: string;
  lucas_sugestoes: string;
}

interface Privacidade {
  profile_private: boolean;
  show_habits: boolean;
  show_progress: boolean;
  show_streak: boolean;
  show_dados_fisicos: boolean;
  show_saude_mental: boolean;
  show_objetivos: boolean;
}

interface Configuracoes {
  lucas: ConfigLucas;
  sobreVoce: string;
  privacidade: Privacidade;
}

const OPCOES_LUCAS: { campo: keyof ConfigLucas; rotulo: string; descricao: string; opcoes: [string, string][] }[] = [
  { campo: "lucas_estilo", rotulo: "Estilo de conversa", descricao: "Como o Lucas se comunica com você",
    opcoes: [["direto", "Mais direto"], ["equilibrado", "Equilibrado"], ["detalhado", "Mais detalhado"]] },
  { campo: "lucas_profundidade", rotulo: "Profundidade", descricao: "O quanto as respostas se aprofundam",
    opcoes: [["superficial", "Prática"], ["moderado", "Moderada"], ["profundo", "Profunda"]] },
  { campo: "lucas_tom", rotulo: "Tom", descricao: "O jeito das respostas",
    opcoes: [["acolhedor", "Acolhedor"], ["neutro", "Neutro"], ["racional", "Racional"]] },
  { campo: "lucas_sugestoes", rotulo: "Sugestões práticas", descricao: "Com que frequência ele sugere ações",
    opcoes: [["poucas", "Poucas"], ["moderado", "Às vezes"], ["muitas", "Sempre"]] },
];

const OPCOES_PRIVACIDADE: { campo: keyof Privacidade; rotulo: string; ajuda?: string }[] = [
  { campo: "show_progress", rotulo: "Meu progresso" },
  { campo: "show_streak", rotulo: "Minha sequência" },
  { campo: "show_dados_fisicos", rotulo: "Meus dados físicos", ajuda: "Só para amigos" },
  { campo: "show_saude_mental", rotulo: "Minha saúde mental", ajuda: "Só para amigos" },
  { campo: "show_objetivos", rotulo: "Meus objetivos", ajuda: "Só para amigos" },
];

const FRASE_EXCLUSAO = "EXCLUIR MEUS DADOS";

// ─── Tela ───────────────────────────────────────────────────────────────────

export default function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const chave = ["configuracoes", user?.id];
  const { preferencia: tema } = useTema();
  const push = usePushNotifications();

  const [modal, setModal] = useState<null | "aparencia" | "notificacoes" | "privacidade" | "sair" | "excluir">(null);

  const config = useQuery({
    queryKey: chave,
    enabled: !!user,
    queryFn: async (): Promise<Configuracoes> => {
      const [prefs, perfil] = await Promise.all([
        supabase.from("preferencias_usuario")
          .select("lucas_estilo, lucas_profundidade, lucas_tom, lucas_sugestoes")
          .eq("user_id", user!.id).single(),
        supabase.from("perfil_usuario")
          .select("sobre_voce, profile_private, show_habits, show_progress, show_streak, show_dados_fisicos, show_saude_mental, show_objetivos")
          .eq("user_id", user!.id).single(),
      ]);
      if (prefs.error) throw prefs.error;
      if (perfil.error) throw perfil.error;
      const { sobre_voce, ...privacidade } = perfil.data;
      return { lucas: prefs.data, sobreVoce: sobre_voce ?? "", privacidade };
    },
  });

  const salvarLucas = useMutation({
    mutationFn: async ({ lucas, sobreVoce }: { lucas: ConfigLucas; sobreVoce: string }) => {
      const [a, b] = await Promise.all([
        supabase.from("preferencias_usuario").update(lucas).eq("user_id", user!.id),
        supabase.from("perfil_usuario").update({ sobre_voce: sobreVoce.trim().slice(0, 2000) || null }).eq("user_id", user!.id),
      ]);
      if (a.error) throw a.error;
      if (b.error) throw b.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chave });
      toast({ title: "Preferências do Lucas salvas" });
    },
    onError: () => toast({ title: "Não foi possível salvar", variant: "destructive" }),
  });

  const salvarPrivacidade = useMutation({
    mutationFn: async (p: Privacidade) => {
      const { error } = await supabase.from("perfil_usuario").update(p).eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chave });
      setModal(null);
      toast({ title: "Privacidade atualizada" });
    },
    onError: () => toast({ title: "Não foi possível salvar", variant: "destructive" }),
  });

  async function sair() {
    setModal(null);
    await signOut();
    queryClient.clear();
    navigate("/login", { replace: true });
  }

  const rotuloTema: Record<PreferenciaTema, string> = { claro: "Claro", escuro: "Escuro", sistema: "Igual ao sistema" };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <BackButton to="/perfil" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
          <p className="text-sm text-muted-foreground">Personalize sua experiência</p>
        </div>
      </div>

      <Secao titulo="Amigo Lucas">
        {config.isLoading ? (
          <div className="flex justify-center rounded-2xl border border-border bg-card py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-label="Carregando" />
          </div>
        ) : config.data ? (
          <FormLucas
            inicial={config.data}
            salvando={salvarLucas.isPending}
            onSalvar={(lucas, sobreVoce) => salvarLucas.mutate({ lucas, sobreVoce })}
          />
        ) : (
          <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Não foi possível carregar suas preferências.
          </p>
        )}
      </Secao>

      <Secao titulo="Preferências">
        <ItemMenu
          icone={tema === "escuro" ? Moon : tema === "claro" ? Sun : Monitor}
          titulo="Aparência"
          detalhe={rotuloTema[tema]}
          onClick={() => setModal("aparencia")}
        />
        <ItemMenu
          icone={Bell}
          titulo="Lembrete diário"
          detalhe={push.inscrito ? `Todos os dias às ${String(push.hora).padStart(2, "0")}:00` : "Desativado"}
          onClick={() => setModal("notificacoes")}
        />
      </Secao>

      <Secao titulo="Conta">
        <ItemMenu
          icone={Shield}
          titulo="Privacidade"
          detalhe={config.data?.privacidade.profile_private ? "Perfil visível só para amigos" : "Perfil público"}
          onClick={() => setModal("privacidade")}
        />
        <ItemMenu icone={LogOut} titulo="Sair da conta" detalhe="Encerrar a sessão neste aparelho" perigo onClick={() => setModal("sair")} />
      </Secao>

      <Secao titulo="Seus dados">
        <div className="flex gap-3 text-xs">
          <Link to="/termos" className="text-primary underline-offset-4 hover:underline">Termos de Uso</Link>
          <span aria-hidden className="text-muted-foreground">·</span>
          <Link to="/privacidade" className="text-primary underline-offset-4 hover:underline">Política de Privacidade</Link>
        </div>
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden />
            <p className="text-sm font-semibold text-destructive">Excluir minha conta</p>
          </div>
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
            Pela LGPD você pode pedir a exclusão de todos os seus dados. A conta, as conversas, os hábitos, os
            check-ins e o perfil são apagados de forma definitiva.
          </p>
          <button
            type="button"
            onClick={() => setModal("excluir")}
            className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/20"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            Excluir conta e dados
          </button>
        </div>
      </Secao>

      <p className="text-center text-xs text-muted-foreground">Saúde++ v{__APP_VERSION__}</p>

      <ModalAparencia aberto={modal === "aparencia"} onFechar={() => setModal(null)} />
      <ModalLembrete aberto={modal === "notificacoes"} onFechar={() => setModal(null)} push={push} />
      {config.data && (
        <ModalPrivacidade
          aberto={modal === "privacidade"}
          inicial={config.data.privacidade}
          salvando={salvarPrivacidade.isPending}
          onSalvar={(p) => salvarPrivacidade.mutate(p)}
          onVerPerfil={() => {
            setModal(null);
            navigate(`/amigo/${user!.id}?previa=1`);
          }}
          onFechar={() => setModal(null)}
        />
      )}

      <AlertDialog open={modal === "sair"} onOpenChange={(v) => !v && setModal(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair da conta?</AlertDialogTitle>
            <AlertDialogDescription>Você vai precisar entrar de novo para usar o app neste aparelho.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="btn-secondary mt-0">Cancelar</AlertDialogCancel>
            <button type="button" onClick={sair} className="btn-danger">Sair</button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ModalExcluirConta
        aberto={modal === "excluir"}
        onFechar={() => setModal(null)}
        onExcluida={async () => {
          await signOut();
          queryClient.clear();
          navigate("/login", { replace: true });
        }}
      />
    </motion.div>
  );
}

// ─── Componentes ────────────────────────────────────────────────────────────

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{titulo}</h2>
      {children}
    </section>
  );
}

function ItemMenu({
  icone: Icone, titulo, detalhe, perigo, onClick,
}: {
  icone: typeof Bell;
  titulo: string;
  detalhe: string;
  perigo?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted"
    >
      <span className={["flex h-10 w-10 items-center justify-center rounded-xl", perigo ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"].join(" ")}>
        <Icone className="h-5 w-5" aria-hidden />
      </span>
      <span className="flex-1">
        <span className={["block text-sm font-medium", perigo ? "text-destructive" : "text-foreground"].join(" ")}>{titulo}</span>
        <span className="block text-xs text-muted-foreground">{detalhe}</span>
      </span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
    </button>
  );
}

function Alternador({ ligado, onAlternar, rotulo, ajuda }: { ligado: boolean; onAlternar: () => void; rotulo: string; ajuda?: string }) {
  return (
    <button type="button" role="switch" aria-checked={ligado} onClick={onAlternar} className="flex w-full items-center justify-between gap-3 py-2 text-left">
      <span>
        <span className="block text-sm text-foreground">{rotulo}</span>
        {ajuda && <span className="block text-xs text-muted-foreground">{ajuda}</span>}
      </span>
      <span className={["relative h-6 w-11 shrink-0 rounded-full transition-colors", ligado ? "bg-primary" : "bg-muted-foreground/30"].join(" ")}>
        <span className={["absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", ligado ? "translate-x-5" : "translate-x-0.5"].join(" ")} />
      </span>
    </button>
  );
}

function FormLucas({
  inicial, salvando, onSalvar,
}: {
  inicial: Configuracoes;
  salvando: boolean;
  onSalvar: (lucas: ConfigLucas, sobreVoce: string) => void;
}) {
  const [lucas, setLucas] = useState(inicial.lucas);
  const [sobreVoce, setSobreVoce] = useState(inicial.sobreVoce);

  useEffect(() => {
    setLucas(inicial.lucas);
    setSobreVoce(inicial.sobreVoce);
  }, [inicial]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSalvar(lucas, sobreVoce);
      }}
      className="space-y-5 rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <MessageCircle className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-medium text-foreground">Como o Lucas conversa com você</p>
          <p className="text-xs text-muted-foreground">Vale para as próximas mensagens</p>
        </div>
      </div>

      {OPCOES_LUCAS.map(({ campo, rotulo, descricao, opcoes }) => (
        <fieldset key={campo} className="space-y-2">
          <legend className="text-sm font-medium text-foreground">{rotulo}</legend>
          <p className="text-xs text-muted-foreground">{descricao}</p>
          <div className="flex gap-2">
            {opcoes.map(([valor, texto]) => (
              <button
                key={valor}
                type="button"
                aria-pressed={lucas[campo] === valor}
                onClick={() => setLucas((l) => ({ ...l, [campo]: valor }))}
                className={[
                  "flex-1 rounded-xl px-2 py-2 text-xs font-medium transition-colors",
                  lucas[campo] === valor ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70",
                ].join(" ")}
              >
                {texto}
              </button>
            ))}
          </div>
        </fieldset>
      ))}

      <div className="space-y-2">
        <label htmlFor="sobre-voce" className="text-sm font-medium text-foreground">Conte um pouco sobre você</label>
        <p id="sobre-voce-ajuda" className="text-xs text-muted-foreground">
          Ajuda o Lucas a entender seu contexto. Evite dados que identifiquem você, como documentos ou endereço.
        </p>
        <textarea
          id="sobre-voce"
          aria-describedby="sobre-voce-ajuda"
          value={sobreVoce}
          onChange={(e) => setSobreVoce(e.target.value.slice(0, 2000))}
          placeholder="Ex.: sou introvertido, trabalho de casa e tenho dormido pouco."
          className="textarea-modern"
          rows={4}
        />
        <p className="text-right text-xs text-muted-foreground">{sobreVoce.length}/2000</p>
      </div>

      <button type="submit" disabled={salvando} className="btn-primary w-full">
        {salvando ? "Salvando…" : "Salvar preferências do Lucas"}
      </button>
    </form>
  );
}

function ModalAparencia({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const { preferencia, definir } = useTema();
  const opcoes: { valor: PreferenciaTema; rotulo: string; icone: typeof Sun }[] = [
    { valor: "claro", rotulo: "Claro", icone: Sun },
    { valor: "escuro", rotulo: "Escuro", icone: Moon },
    { valor: "sistema", rotulo: "Sistema", icone: Monitor },
  ];
  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent>
        <DialogTitle>Aparência</DialogTitle>
        <DialogDescription>"Sistema" acompanha o modo claro ou escuro do seu aparelho.</DialogDescription>
        <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-label="Tema">
          {opcoes.map(({ valor, rotulo, icone: Icone }) => (
            <button
              key={valor}
              type="button"
              role="radio"
              aria-checked={preferencia === valor}
              onClick={() => definir(valor)}
              className={[
                "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors",
                preferencia === valor ? "border-primary bg-primary/5" : "border-border hover:border-primary/30",
              ].join(" ")}
            >
              <Icone className="h-6 w-6 text-foreground" aria-hidden />
              <span className="text-sm font-medium text-foreground">{rotulo}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ModalLembrete({
  aberto, onFechar, push,
}: {
  aberto: boolean;
  onFechar: () => void;
  push: ReturnType<typeof usePushNotifications>;
}) {
  const [hora, setHora] = useState(push.hora);
  useEffect(() => {
    if (aberto) setHora(push.hora);
  }, [aberto, push.hora]);

  async function executar(acao: () => Promise<string | null>, sucesso: string) {
    const erro = await acao();
    toast(erro ? { title: erro, variant: "destructive" } : { title: sucesso });
  }

  const status = !push.suportado
    ? { icone: BellOff, texto: "Este navegador não suporta notificações. Instale o app ou use outro navegador.", cor: "text-muted-foreground" }
    : push.permissao === "denied"
      ? { icone: BellOff, texto: "As notificações estão bloqueadas. Libere nas configurações do navegador.", cor: "text-destructive" }
      : push.inscrito
        ? { icone: BellRing, texto: "Você recebe o lembrete mesmo com o app fechado.", cor: "text-emerald-600 dark:text-emerald-400" }
        : { icone: Bell, texto: "Escolha um horário para lembrar dos seus hábitos.", cor: "text-muted-foreground" };

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent>
        <DialogTitle>Lembrete diário</DialogTitle>
        <DialogDescription className="flex items-start gap-2">
          <status.icone className={`mt-0.5 h-4 w-4 shrink-0 ${status.cor}`} aria-hidden />
          {status.texto}
        </DialogDescription>

        {push.suportado && push.permissao !== "denied" && (
          <>
            <div className="flex flex-col gap-2">
              <label htmlFor="hora-lembrete" className="text-sm font-medium text-foreground">Horário</label>
              <div className="flex items-center gap-3">
                <input
                  id="hora-lembrete"
                  type="range"
                  min={5}
                  max={22}
                  value={hora}
                  onChange={(e) => setHora(Number(e.target.value))}
                  aria-valuetext={`${hora} horas`}
                  className="flex-1 accent-primary"
                />
                <span className="w-14 rounded-lg bg-muted px-2 py-1 text-center text-sm font-semibold text-foreground">
                  {String(hora).padStart(2, "0")}:00
                </span>
              </div>
            </div>
            <button
              type="button"
              disabled={push.ocupado}
              onClick={() => executar(() => push.ativar(hora), "Lembrete salvo")}
              className="btn-primary w-full"
            >
              {push.ocupado ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : push.inscrito ? "Atualizar horário" : "Ativar lembrete"}
            </button>
            {push.inscrito && (
              <div className="flex gap-2">
                <button type="button" onClick={() => push.testar()} className="btn-secondary flex-1">
                  <Send className="h-4 w-4" aria-hidden />
                  Testar
                </button>
                <button
                  type="button"
                  disabled={push.ocupado}
                  onClick={() => executar(push.desativar, "Lembrete desativado")}
                  className="btn-secondary flex-1"
                >
                  Desativar
                </button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ModalPrivacidade({
  aberto, inicial, salvando, onSalvar, onVerPerfil, onFechar,
}: {
  aberto: boolean;
  inicial: Privacidade;
  salvando: boolean;
  onSalvar: (p: Privacidade) => void;
  onVerPerfil: () => void;
  onFechar: () => void;
}) {
  const [p, setP] = useState(inicial);
  useEffect(() => {
    if (aberto) setP(inicial);
  }, [aberto, inicial]);

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent>
        <DialogTitle>Privacidade</DialogTitle>
        <DialogDescription>
          Quem não é seu amigo vê no máximo nome, nickname, foto, progresso e sequência. Dados de saúde só aparecem
          para amigos, e só o que você liberar.
        </DialogDescription>
        <div className="space-y-1">
          <Alternador
            ligado={p.profile_private}
            onAlternar={() => setP((x) => ({ ...x, profile_private: !x.profile_private }))}
            rotulo="Perfil privado"
            ajuda="Quem não é seu amigo vê só nome e foto"
          />
          <div className="mt-2 border-t border-border pt-2">
            <p className="mb-1 text-xs font-medium text-muted-foreground">O que aparece no seu perfil</p>
            {OPCOES_PRIVACIDADE.map(({ campo, rotulo, ajuda }) => (
              <Alternador key={campo} ligado={p[campo]} onAlternar={() => setP((x) => ({ ...x, [campo]: !x[campo] }))} rotulo={rotulo} ajuda={ajuda} />
            ))}
          </div>
        </div>
        <button type="button" onClick={onVerPerfil} className="btn-secondary w-full">
          <Eye className="h-4 w-4" aria-hidden />
          Ver como meus amigos veem
        </button>
        <button type="button" disabled={salvando} onClick={() => onSalvar(p)} className="btn-primary w-full">
          {salvando ? "Salvando…" : "Salvar"}
        </button>
      </DialogContent>
    </Dialog>
  );
}

function ModalExcluirConta({ aberto, onFechar, onExcluida }: { aberto: boolean; onFechar: () => void; onExcluida: () => void }) {
  const [texto, setTexto] = useState("");
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    if (!aberto) setTexto("");
  }, [aberto]);

  async function excluir() {
    setExcluindo(true);
    const { error } = await callEdgeFunction("excluir-dados", { body: { confirmacao: FRASE_EXCLUSAO } });
    setExcluindo(false);
    if (error) {
      toast({ title: "Não foi possível excluir", description: error, variant: "destructive" });
      return;
    }
    toast({ title: "Sua conta e seus dados foram excluídos" });
    onExcluida();
  }

  return (
    <AlertDialog open={aberto} onOpenChange={(v) => !v && !excluindo && onFechar()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir conta e dados?</AlertDialogTitle>
          <AlertDialogDescription>
            Tudo será apagado de forma definitiva. Para confirmar, digite <strong>{FRASE_EXCLUSAO}</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <label htmlFor="confirmar-exclusao" className="sr-only">Frase de confirmação</label>
        <input
          id="confirmar-exclusao"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          autoComplete="off"
          placeholder={FRASE_EXCLUSAO}
          className="input-modern border-destructive/40 focus:border-destructive focus:ring-destructive/20"
        />
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={excluindo} className="btn-secondary mt-0">Cancelar</AlertDialogCancel>
          <button type="button" onClick={excluir} disabled={excluindo || texto.trim() !== FRASE_EXCLUSAO} className="btn-danger">
            {excluindo ? "Excluindo…" : "Excluir definitivamente"}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

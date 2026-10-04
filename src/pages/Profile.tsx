import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Brain, Camera, Loader2, Pencil, Settings, Target, Users } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Avatar } from "@/components/Avatar";
import { ErroCarregamento } from "@/components/ErroCarregamento";
import { TelaCarregando } from "@/components/ui/loading-spinner";
import {
  HUMOR_GERAL, NIVEL_ATIVIDADE, NIVEL_ESTRESSE, OBJETIVO, QUALIDADE_SONO, ROTINA, SEXO, rotulo,
} from "@/lib/rotulos";
import { normalizarNickname, validarPerfil, type CamposPerfil } from "@/lib/validacao";

interface Perfil extends CamposPerfil {
  avatar_url: string | null;
}

const TIPOS_IMAGEM = ["image/jpeg", "image/png", "image/webp"];
const CAMPOS = "nome, nickname, avatar_url, idade, peso, altura, sexo, nivel_atividade, nivel_estresse, qualidade_sono, humor_geral, rotina, objetivo, tempo_livre";

export default function Profile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const chave = ["perfil", user?.id, "completo"];
  const [editando, setEditando] = useState(false);

  const perfil = useQuery({
    queryKey: chave,
    enabled: !!user,
    queryFn: async (): Promise<Perfil> => {
      const { data, error } = await supabase.from("perfil_usuario").select(CAMPOS).eq("user_id", user!.id).single();
      if (error) throw error;
      return data as Perfil;
    },
  });

  if (perfil.isLoading) return <TelaCarregando cheia={false} />;
  if (perfil.isError || !perfil.data) return <ErroCarregamento mensagem="Não foi possível carregar seu perfil." onTentar={() => perfil.refetch()} />;

  const atualizarCache = (p: Partial<Perfil>) => {
    queryClient.setQueryData<Perfil>(chave, (atual) => (atual ? { ...atual, ...p } : atual));
    queryClient.invalidateQueries({ queryKey: ["perfil", user?.id, "nome"] });
    queryClient.invalidateQueries({ queryKey: ["onboarding"] });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meu perfil</h1>
          <p className="text-sm text-muted-foreground">Seus dados deixam hábitos, treinos e conversas mais certeiros</p>
        </div>
        <div className="flex gap-2">
          <Link to="/amigos" aria-label="Amigos" className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground">
            <Users className="h-5 w-5" aria-hidden />
          </Link>
          <Link to="/configuracoes" aria-label="Configurações" className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground">
            <Settings className="h-5 w-5" aria-hidden />
          </Link>
        </div>
      </div>

      <Cabecalho perfil={perfil.data} userId={user!.id} onAvatar={(url) => atualizarCache({ avatar_url: url })} />

      {editando ? (
        <FormularioPerfil
          inicial={perfil.data}
          userId={user!.id}
          onCancelar={() => setEditando(false)}
          onSalvo={(p) => {
            atualizarCache(p);
            setEditando(false);
          }}
        />
      ) : (
        <>
          <Bloco icone={Activity} titulo="Dados físicos">
            <Linha nome="Idade" valor={perfil.data.idade ? `${perfil.data.idade} anos` : null} />
            <Linha nome="Peso" valor={perfil.data.peso ? `${String(perfil.data.peso).replace(".", ",")} kg` : null} />
            <Linha nome="Altura" valor={perfil.data.altura ? `${String(perfil.data.altura).replace(".", ",")} m` : null} />
            <Linha nome="Sexo" valor={rotulo(SEXO, perfil.data.sexo)} />
            <Linha nome="Atividade física" valor={rotulo(NIVEL_ATIVIDADE, perfil.data.nivel_atividade)} />
          </Bloco>
          <Bloco icone={Brain} titulo="Saúde mental">
            <Linha nome="Estresse" valor={rotulo(NIVEL_ESTRESSE, perfil.data.nivel_estresse)} />
            <Linha nome="Sono" valor={rotulo(QUALIDADE_SONO, perfil.data.qualidade_sono)} />
            <Linha nome="Humor geral" valor={rotulo(HUMOR_GERAL, perfil.data.humor_geral)} />
          </Bloco>
          <Bloco icone={Target} titulo="Objetivos">
            <Linha nome="Objetivo" valor={rotulo(OBJETIVO, perfil.data.objetivo)} />
            <Linha nome="Rotina" valor={rotulo(ROTINA, perfil.data.rotina)} />
            <Linha nome="Tempo livre por dia" valor={perfil.data.tempo_livre} />
          </Bloco>
          <button type="button" onClick={() => setEditando(true)} className="btn-secondary py-4 text-primary">
            <Pencil className="h-4 w-4" aria-hidden />
            Editar perfil
          </button>
        </>
      )}
    </motion.div>
  );
}

function Cabecalho({ perfil, userId, onAvatar }: { perfil: Perfil; userId: string; onAvatar: (url: string) => void }) {
  const arquivoRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviarFoto(arquivo: File) {
    if (!TIPOS_IMAGEM.includes(arquivo.type)) {
      toast({ title: "Use uma imagem JPG, PNG ou WebP", variant: "destructive" });
      return;
    }
    if (arquivo.size > 2 * 1024 * 1024) {
      toast({ title: "A imagem precisa ter até 2 MB", variant: "destructive" });
      return;
    }
    setEnviando(true);
    try {
      const extensao = arquivo.type.split("/")[1].replace("jpeg", "jpg");
      const caminho = `${userId}/avatar.${extensao}`;
      const envio = await supabase.storage.from("avatars").upload(caminho, arquivo, { upsert: true, contentType: arquivo.type });
      if (envio.error) throw envio.error;

      // Remove avatares antigos com outra extensão.
      const { data: arquivos } = await supabase.storage.from("avatars").list(userId);
      const antigos = (arquivos ?? []).map((a) => `${userId}/${a.name}`).filter((c) => c !== caminho);
      if (antigos.length) await supabase.storage.from("avatars").remove(antigos);

      // O parâmetro v força o navegador a buscar a foto nova (a URL é a mesma).
      const url = `${supabase.storage.from("avatars").getPublicUrl(caminho).data.publicUrl}?v=${Date.now()}`;
      const { error } = await supabase.from("perfil_usuario").update({ avatar_url: url }).eq("user_id", userId);
      if (error) throw error;
      onAvatar(url);
      toast({ title: "Foto atualizada" });
    } catch {
      toast({ title: "Não foi possível enviar a foto", variant: "destructive" });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex items-center gap-4 rounded-2xl gradient-calm p-5 text-primary-foreground">
      <div className="relative">
        <Avatar url={perfil.avatar_url} nome={perfil.nome} className="h-16 w-16 rounded-2xl bg-primary-foreground/20 text-2xl text-primary-foreground" />
        <button
          type="button"
          onClick={() => arquivoRef.current?.click()}
          disabled={enviando}
          aria-label="Trocar foto do perfil"
          className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary-foreground text-primary shadow"
        >
          {enviando ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Camera className="h-3.5 w-3.5" aria-hidden />}
        </button>
        <input
          ref={arquivoRef}
          type="file"
          accept={TIPOS_IMAGEM.join(",")}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) enviarFoto(f);
          }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-lg font-bold">{perfil.nome || "Sem nome"}</p>
        <p className="truncate text-sm opacity-90">{perfil.nickname ? `@${perfil.nickname}` : "Defina um nickname para ser encontrado"}</p>
      </div>
    </div>
  );
}

function FormularioPerfil({
  inicial, userId, onCancelar, onSalvo,
}: {
  inicial: Perfil;
  userId: string;
  onCancelar: () => void;
  onSalvo: (p: Partial<Perfil>) => void;
}) {
  const [f, setF] = useState(() => ({
    ...inicial,
    idade: inicial.idade?.toString() ?? "",
    peso: inicial.peso?.toString().replace(".", ",") ?? "",
    altura: inicial.altura?.toString().replace(".", ",") ?? "",
  }));
  const objetivoPersonalizado = !!f.objetivo && !(f.objetivo in OBJETIVO);
  const [outroObjetivo, setOutroObjetivo] = useState(objetivoPersonalizado);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const primeiroRef = useRef<HTMLInputElement>(null);

  useEffect(() => primeiroRef.current?.focus(), []);

  const set = (campo: string) => (valor: string) => setF((x) => ({ ...x, [campo]: valor }));

  async function salvar(e: FormEvent) {
    e.preventDefault();
    const { dados, erros: novosErros } = validarPerfil(f);
    setErros(novosErros);
    if (Object.keys(novosErros).length) return;

    setSalvando(true);
    const { error } = await supabase.from("perfil_usuario").update({ ...dados, onboarding_completo: true }).eq("user_id", userId);
    setSalvando(false);
    if (error) {
      if (error.code === "23505") setErros({ nickname: "Esse nickname já está em uso." });
      else toast({ title: "Não foi possível salvar o perfil", variant: "destructive" });
      return;
    }
    toast({ title: "Perfil salvo" });
    onSalvo(dados);
  }

  return (
    <form onSubmit={salvar} noValidate className="flex flex-col gap-6">
      <Bloco icone={Pencil} titulo="Identificação">
        <Campo id="nome" rotulo="Nome" erro={erros.nome}>
          <input ref={primeiroRef} id="nome" value={f.nome} maxLength={80} autoComplete="name" onChange={(e) => set("nome")(e.target.value)} className="input-modern" />
        </Campo>
        <Campo id="nickname" rotulo="Nickname" erro={erros.nickname} ajuda="Letras minúsculas, números, ponto e _. É como seus amigos te encontram.">
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">@</span>
            <input
              id="nickname"
              value={f.nickname ?? ""}
              maxLength={30}
              autoCapitalize="none"
              autoComplete="username"
              spellCheck={false}
              onChange={(e) => set("nickname")(normalizarNickname(e.target.value))}
              className="input-modern pl-8"
            />
          </div>
        </Campo>
      </Bloco>

      <Bloco icone={Activity} titulo="Dados físicos">
        <div className="grid grid-cols-2 gap-3">
          <Campo id="idade" rotulo="Idade" erro={erros.idade}>
            <input id="idade" inputMode="numeric" value={f.idade} onChange={(e) => set("idade")(e.target.value.replace(/\D/g, "").slice(0, 3))} className="input-modern" />
          </Campo>
          <Campo id="peso" rotulo="Peso (kg)" erro={erros.peso}>
            <input id="peso" inputMode="decimal" value={f.peso} placeholder="70,5" onChange={(e) => set("peso")(e.target.value.slice(0, 6))} className="input-modern" />
          </Campo>
          <Campo id="altura" rotulo="Altura (m)" erro={erros.altura}>
            <input id="altura" inputMode="decimal" value={f.altura} placeholder="1,72" onChange={(e) => set("altura")(e.target.value.slice(0, 4))} className="input-modern" />
          </Campo>
          <Selecao id="sexo" rotulo="Sexo" valor={f.sexo} opcoes={SEXO} onMudar={set("sexo")} />
        </div>
        <Selecao id="atividade" rotulo="Nível de atividade" valor={f.nivel_atividade} opcoes={NIVEL_ATIVIDADE} onMudar={set("nivel_atividade")} />
      </Bloco>

      <Bloco icone={Brain} titulo="Saúde mental">
        <Selecao id="estresse" rotulo="Nível de estresse" valor={f.nivel_estresse} opcoes={NIVEL_ESTRESSE} onMudar={set("nivel_estresse")} />
        <Selecao id="sono" rotulo="Qualidade do sono" valor={f.qualidade_sono} opcoes={QUALIDADE_SONO} onMudar={set("qualidade_sono")} />
        <Selecao id="humor" rotulo="Humor geral" valor={f.humor_geral} opcoes={HUMOR_GERAL} onMudar={set("humor_geral")} />
      </Bloco>

      <Bloco icone={Target} titulo="Objetivos">
        <Campo id="objetivo" rotulo="Objetivo principal" erro={erros.objetivo}>
          <select
            id="objetivo"
            value={outroObjetivo ? "__outro" : f.objetivo ?? ""}
            onChange={(e) => {
              const outro = e.target.value === "__outro";
              setOutroObjetivo(outro);
              set("objetivo")(outro ? "" : e.target.value);
            }}
            className="select-modern"
          >
            <option value="">Não informar</option>
            {Object.entries(OBJETIVO).map(([valor, texto]) => (
              <option key={valor} value={valor}>{texto}</option>
            ))}
            <option value="__outro">Outro…</option>
          </select>
        </Campo>
        {outroObjetivo && (
          <Campo id="objetivo-texto" rotulo="Descreva seu objetivo">
            <input id="objetivo-texto" value={f.objetivo ?? ""} maxLength={300} onChange={(e) => set("objetivo")(e.target.value)} className="input-modern" />
          </Campo>
        )}
        <Selecao id="rotina" rotulo="Rotina" valor={f.rotina} opcoes={ROTINA} onMudar={set("rotina")} />
        <Campo id="tempo-livre" rotulo="Tempo livre por dia">
          <input id="tempo-livre" value={f.tempo_livre ?? ""} maxLength={100} placeholder="Ex.: 1 a 2 horas" onChange={(e) => set("tempo_livre")(e.target.value)} className="input-modern" />
        </Campo>
      </Bloco>

      <div className="flex gap-3">
        <button type="button" onClick={onCancelar} disabled={salvando} className="btn-secondary flex-1">Cancelar</button>
        <button type="submit" disabled={salvando} className="btn-primary flex-1">
          {salvando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {salvando ? "Salvando…" : "Salvar perfil"}
        </button>
      </div>
    </form>
  );
}

function Bloco({ icone: Icone, titulo, children }: { icone: typeof Activity; titulo: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center gap-2">
        <Icone className="h-4 w-4 text-primary" aria-hidden />
        <h2 className="text-sm font-semibold text-foreground">{titulo}</h2>
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

function Linha({ nome, valor }: { nome: string; valor: string | null | undefined }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-muted px-4 py-3">
      <span className="shrink-0 text-sm text-muted-foreground">{nome}</span>
      <span className={["break-words text-right text-sm font-medium", valor ? "text-foreground" : "text-muted-foreground"].join(" ")}>
        {valor || "Não informado"}
      </span>
    </div>
  );
}

function Campo({ id, rotulo, erro, ajuda, children }: { id: string; rotulo: string; erro?: string; ajuda?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="label-modern">{rotulo}</label>
      {children}
      {ajuda && !erro && <p className="text-xs text-muted-foreground">{ajuda}</p>}
      {erro && <p role="alert" className="text-xs font-medium text-destructive">{erro}</p>}
    </div>
  );
}

function Selecao({ id, rotulo, valor, opcoes, onMudar }: { id: string; rotulo: string; valor: string | null; opcoes: Record<string, string>; onMudar: (v: string) => void }) {
  return (
    <Campo id={id} rotulo={rotulo}>
      <select id={id} value={valor ?? ""} onChange={(e) => onMudar(e.target.value)} className="select-modern">
        <option value="">Não informar</option>
        {Object.entries(opcoes).map(([v, t]) => (
          <option key={v} value={v}>{t}</option>
        ))}
      </select>
    </Campo>
  );
}

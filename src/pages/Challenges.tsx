import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Trophy, Plus, Loader2, Target, Swords, X, Camera, Check, AlertTriangle, Shield } from "lucide-react";
import BackButton from "@/components/BackButton";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface Desafio {
  id: string;
  titulo: string;
  descricao: string | null;
  meta: number;
  progresso_criador: number;
  progresso_desafiado: number;
  status: string;
  criador_id: string;
  desafiado_id: string;
  criador_nome?: string;
  desafiado_nome?: string;
  data_fim: string | null;
  confirmacao_criador: boolean;
  confirmacao_desafiado: boolean;
  prova_criador_url: string | null;
  prova_desafiado_url: string | null;
  flag_suspeito: boolean;
  motivo_flag: string | null;
}

interface Amigo {
  id: string;
  nome: string;
  nickname: string;
}

const Challenges = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [desafios, setDesafios] = useState<Desafio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [amigos, setAmigos] = useState<Amigo[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newMeta, setNewMeta] = useState(7);
  const [selectedAmigo, setSelectedAmigo] = useState("");
  const [creating, setCreating] = useState(false);
  const [uploadingProva, setUploadingProva] = useState<string | null>(null);
  const fileRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  useEffect(() => {
    if (user) {
      loadDesafios();
      loadAmigos();
    }
  }, [user]);

  const loadDesafios = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("desafios")
      .select("*")
      .or(`criador_id.eq.${user!.id},desafiado_id.eq.${user!.id}`)
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      const userIds = [...new Set(data.flatMap((d) => [d.criador_id, d.desafiado_id]))];
      const { data: profiles } = await supabase
        .from("perfil_usuario")
        .select("user_id, nome")
        .in("user_id", userIds);

      const nameMap = new Map((profiles || []).map((p) => [p.user_id, p.nome]));
      setDesafios(data.map((d: any) => ({
        ...d,
        criador_nome: nameMap.get(d.criador_id) || "Usuario",
        desafiado_nome: nameMap.get(d.desafiado_id) || "Usuario",
      })));
    } else {
      setDesafios([]);
    }
    setLoading(false);
  };

  const loadAmigos = async () => {
    const { data: friendships } = await supabase
      .from("amizades")
      .select("user_id, amigo_id")
      .eq("status", "aceito")
      .or(`user_id.eq.${user!.id},amigo_id.eq.${user!.id}`);

    if (!friendships || friendships.length === 0) return;
    const friendIds = friendships.map((f) => f.user_id === user!.id ? f.amigo_id : f.user_id);
    const { data: profiles } = await supabase
      .from("perfil_usuario")
      .select("user_id, nome, nickname")
      .in("user_id", friendIds);

    setAmigos((profiles || []).map((p) => ({ id: p.user_id, nome: p.nome, nickname: p.nickname || "" })));
  };

  const createDesafio = async () => {
    if (!newTitle.trim() || !selectedAmigo) {
      toast({ title: "Preencha o título e selecione um amigo", variant: "destructive" });
      return;
    }
    setCreating(true);
    const { error } = await supabase.from("desafios").insert({
      criador_id: user!.id,
      desafiado_id: selectedAmigo,
      titulo: newTitle.trim(),
      descricao: newDesc.trim() || null,
      meta: newMeta,
    });
    if (error) {
      toast({ title: "Erro ao criar desafio", variant: "destructive" });
    } else {
      toast({ title: "Desafio criado!" });
      setShowCreate(false);
      setNewTitle("");
      setNewDesc("");
      setNewMeta(7);
      setSelectedAmigo("");
      loadDesafios();
    }
    setCreating(false);
  };

  const updateProgress = async (desafio: Desafio, isCriador: boolean) => {
    const field = isCriador ? "progresso_criador" : "progresso_desafiado";
    const currentVal = isCriador ? desafio.progresso_criador : desafio.progresso_desafiado;
    if (currentVal >= desafio.meta) return;

    const newVal = currentVal + 1;
    await supabase.from("desafios").update({ [field]: newVal }).eq("id", desafio.id);
    // Log progresso para anti-trapaça
    await supabase.from("desafio_progresso_log").insert({
      desafio_id: desafio.id,
      user_id: user!.id,
      progresso_anterior: currentVal,
      progresso_novo: newVal,
    });
    toast({ title: "Progresso atualizado!" });
    loadDesafios();
  };

  const confirmar = async (desafio: Desafio, isCriador: boolean) => {
    const field = isCriador ? "confirmacao_criador" : "confirmacao_desafiado";
    const otherConfirmed = isCriador ? desafio.confirmacao_desafiado : desafio.confirmacao_criador;
    const updates: any = { [field]: true };
    if (otherConfirmed) updates.status = "concluido";
    await supabase.from("desafios").update(updates).eq("id", desafio.id);
    toast({ title: otherConfirmed ? "Desafio confirmado por ambos!" : "Sua confirmação registrada. Aguardando o outro." });
    loadDesafios();
  };

  const uploadProva = async (desafio: Desafio, isCriador: boolean, file: File) => {
    setUploadingProva(desafio.id);
    const ext = file.name.split(".").pop();
    const path = `${desafio.id}/${user!.id}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("provas-desafios").upload(path, file);
    if (upErr) {
      toast({ title: "Erro no upload", description: upErr.message, variant: "destructive" });
      setUploadingProva(null);
      return;
    }
    const { data: signed } = await supabase.storage.from("provas-desafios").createSignedUrl(path, 60 * 60 * 24 * 365);
    const field = isCriador ? "prova_criador_url" : "prova_desafiado_url";
    await supabase.from("desafios").update({ [field]: signed?.signedUrl || path }).eq("id", desafio.id);
    toast({ title: "Foto-prova enviada!" });
    setUploadingProva(null);
    loadDesafios();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <BackButton to="/amigos" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Desafios</h1>
          <p className="text-sm text-muted-foreground">Desafie seus amigos</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
          <Plus className="h-4 w-4" />
          Novo
        </button>
      </div>

      <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 flex items-start gap-2">
        <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Anti-trapaça:</span> ao concluir, ambos precisam confirmar. Você pode anexar foto-prova. Atividade suspeita é sinalizada automaticamente.
        </p>
      </div>

      {showCreate && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-foreground">Criar Desafio</p>
            <button onClick={() => setShowCreate(false)} className="text-muted-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex flex-col gap-3">
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Título do desafio" className="rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Descrição (opcional)" className="rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none resize-none focus:ring-2 focus:ring-primary/30" rows={2} />
            <div className="flex items-center gap-3">
              <label className="text-sm text-muted-foreground">Meta (dias):</label>
              <input type="number" value={newMeta} onChange={(e) => setNewMeta(Number(e.target.value))} min={1} max={365} className="w-20 rounded-xl border border-border bg-muted px-3 py-2 text-sm" />
            </div>
            <select value={selectedAmigo} onChange={(e) => setSelectedAmigo(e.target.value)} className="rounded-xl border border-border bg-muted px-4 py-2.5 text-sm">
              <option value="">Selecione um amigo</option>
              {amigos.map((a) => <option key={a.id} value={a.id}>{a.nome} (@{a.nickname})</option>)}
            </select>
            <button onClick={createDesafio} disabled={creating} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              {creating ? "Criando..." : "Criar Desafio"}
            </button>
          </div>
        </motion.div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : desafios.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Swords className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhum desafio ainda.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {desafios.map((d) => {
            const isCriador = d.criador_id === user!.id;
            const myProgress = isCriador ? d.progresso_criador : d.progresso_desafiado;
            const theirProgress = isCriador ? d.progresso_desafiado : d.progresso_criador;
            const myName = isCriador ? d.criador_nome : d.desafiado_nome;
            const theirName = isCriador ? d.desafiado_nome : d.criador_nome;
            const myConfirmed = isCriador ? d.confirmacao_criador : d.confirmacao_desafiado;
            const theirConfirmed = isCriador ? d.confirmacao_desafiado : d.confirmacao_criador;
            const myProva = isCriador ? d.prova_criador_url : d.prova_desafiado_url;
            const myPercent = Math.min((myProgress / d.meta) * 100, 100);
            const theirPercent = Math.min((theirProgress / d.meta) * 100, 100);
            const concluido = myProgress >= d.meta;

            return (
              <motion.div key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="h-5 w-5 text-primary" />
                  <p className="text-sm font-semibold text-foreground flex-1">{d.titulo}</p>
                  <span className="rounded-lg bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{d.status}</span>
                </div>
                {d.descricao && <p className="text-xs text-muted-foreground mb-3">{d.descricao}</p>}

                {d.flag_suspeito && (
                  <div className="mb-3 flex items-start gap-2 rounded-xl bg-destructive/10 border border-destructive/30 p-2.5">
                    <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-destructive">Atividade suspeita detectada</p>
                      <p className="text-xs text-muted-foreground">{d.motivo_flag}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-foreground">{myName} (você)</span>
                      <span className="text-muted-foreground">{myProgress}/{d.meta}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <motion.div className="h-full rounded-full bg-primary" animate={{ width: `${myPercent}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-foreground">{theirName}</span>
                      <span className="text-muted-foreground">{theirProgress}/{d.meta}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <motion.div className="h-full rounded-full bg-wellness-mint" animate={{ width: `${theirPercent}%` }} />
                    </div>
                  </div>
                </div>

                {d.status === "ativo" && !concluido && (
                  <button
                    onClick={() => updateProgress(d, isCriador)}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary/10 py-2 text-xs font-semibold text-primary hover:bg-primary/20"
                  >
                    <Target className="h-3.5 w-3.5" /> Registrar progresso (+1)
                  </button>
                )}

                {/* Confirmation + photo when goal reached */}
                {concluido && d.status === "ativo" && (
                  <div className="mt-3 space-y-2 border-t border-border pt-3">
                    <p className="text-xs font-semibold text-foreground">Concluir desafio</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className={`rounded-lg p-2 text-center ${myConfirmed ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {myConfirmed ? <Check className="h-3 w-3 inline mr-1" /> : null}
                        Você {myConfirmed ? "confirmou" : "ainda não"}
                      </div>
                      <div className={`rounded-lg p-2 text-center ${theirConfirmed ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {theirConfirmed ? <Check className="h-3 w-3 inline mr-1" /> : null}
                        Amigo {theirConfirmed ? "confirmou" : "ainda não"}
                      </div>
                    </div>

                    {!myConfirmed && (
                      <div className="flex gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          ref={(el) => { if (el) fileRefs.current.set(d.id, el); }}
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadProva(d, isCriador, f); }}
                          className="hidden"
                        />
                        <button
                          onClick={() => fileRefs.current.get(d.id)?.click()}
                          disabled={uploadingProva === d.id}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-muted py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                        >
                          {uploadingProva === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                          {myProva ? "Trocar prova" : "Anexar prova"}
                        </button>
                        <button
                          onClick={() => confirmar(d, isCriador)}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2 text-xs font-semibold text-primary-foreground"
                        >
                          <Check className="h-3.5 w-3.5" /> Confirmar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default Challenges;

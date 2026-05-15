import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { User, Activity, Brain, Target, ChevronRight, Settings, Camera, Loader2, Save, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface PerfilData {
  nome: string;
  nickname: string;
  avatar_url: string;
  idade: number | null;
  peso: number | null;
  altura: number | null;
  sexo: string;
  nivel_atividade: string;
  nivel_estresse: string;
  qualidade_sono: string;
  humor_geral: string;
  rotina: string;
  objetivo: string;
  tempo_livre: string;
  onboarding_completo: boolean;
}

const defaultPerfil: PerfilData = {
  nome: "", nickname: "", avatar_url: "", idade: null, peso: null, altura: null,
  sexo: "", nivel_atividade: "", nivel_estresse: "", qualidade_sono: "",
  humor_geral: "", rotina: "", objetivo: "", tempo_livre: "", onboarding_completo: false,
};

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [perfil, setPerfil] = useState<PerfilData>(defaultPerfil);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) loadPerfil();
  }, [user]);

  const loadPerfil = async () => {
    const { data } = await supabase
      .from("perfil_usuario")
      .select("*")
      .eq("user_id", user!.id)
      .single();
    if (data) setPerfil(data as unknown as PerfilData);
    setLoading(false);
  };

  const savePerfil = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("perfil_usuario")
      .update({
        nome: perfil.nome,
        nickname: perfil.nickname || null,
        idade: perfil.idade,
        peso: perfil.peso,
        altura: perfil.altura,
        sexo: perfil.sexo || null,
        nivel_atividade: perfil.nivel_atividade || null,
        nivel_estresse: perfil.nivel_estresse || null,
        qualidade_sono: perfil.qualidade_sono || null,
        humor_geral: perfil.humor_geral || null,
        rotina: perfil.rotina || null,
        objetivo: perfil.objetivo || null,
        tempo_livre: perfil.tempo_livre || null,
        onboarding_completo: true,
      })
      .eq("user_id", user!.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Perfil salvo com sucesso!" });
      setEditing(false);
    }
  };

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `${user!.id}/${Date.now()}.${file.name.split('.').pop()}`;
    const { error: upError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upError) {
      toast({ title: "Erro ao enviar foto", variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("perfil_usuario").update({ avatar_url: publicUrl }).eq("user_id", user!.id);
    setPerfil((p) => ({ ...p, avatar_url: publicUrl }));
    setUploading(false);
  };

  const SelectField = ({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {editing ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary">
          <option value="">Selecione</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <p className="rounded-xl bg-muted px-4 py-3 text-sm font-medium text-foreground">{options.find((o) => o.value === value)?.label || "Nao informado"}</p>
      )}
    </div>
  );

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus dados</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate("/amigos")} className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground">
            <Users className="h-5 w-5" />
          </button>
          <button onClick={() => navigate("/configuracoes")} className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground">
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4 rounded-2xl gradient-calm p-5 text-primary-foreground">
        <div className="relative">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-primary-foreground/20">
            {perfil.avatar_url ? (
              <img src={perfil.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <User className="h-8 w-8" />
            )}
          </div>
          {editing && (
            <button onClick={() => fileRef.current?.click()} className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary-foreground text-primary shadow">
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={uploadAvatar} className="hidden" />
        </div>
        <div className="flex-1">
          {editing ? (
            <div className="flex flex-col gap-1">
              <input value={perfil.nome} onChange={(e) => setPerfil((p) => ({ ...p, nome: e.target.value }))} placeholder="Seu nome" className="bg-transparent text-lg font-bold placeholder:text-primary-foreground/50 outline-none" />
              <div className="flex items-center gap-1">
                <span className="text-xs opacity-60">@</span>
                <input value={perfil.nickname} onChange={(e) => setPerfil((p) => ({ ...p, nickname: e.target.value }))} placeholder="nickname" className="bg-transparent text-sm opacity-80 placeholder:text-primary-foreground/50 outline-none" />
              </div>
            </div>
          ) : (
            <>
              <p className="text-lg font-bold">{perfil.nome || "Usuario"}</p>
              <p className="text-sm opacity-80">{perfil.nickname ? `@${perfil.nickname}` : "Defina seu nickname"}</p>
            </>
          )}
        </div>
      </div>

      {/* Dados fisicos */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Dados fisicos</p>
        </div>
        <div className="flex flex-col gap-3">
          {editing ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Idade</label>
                  <input type="number" value={perfil.idade || ""} onChange={(e) => setPerfil((p) => ({ ...p, idade: Number(e.target.value) || null }))} className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Peso (kg)</label>
                  <input type="number" step="0.1" value={perfil.peso || ""} onChange={(e) => setPerfil((p) => ({ ...p, peso: Number(e.target.value) || null }))} className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Altura (m)</label>
                  <input type="number" step="0.01" value={perfil.altura || ""} onChange={(e) => setPerfil((p) => ({ ...p, altura: Number(e.target.value) || null }))} className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary" />
                </div>
                <SelectField label="Sexo" value={perfil.sexo} onChange={(v) => setPerfil((p) => ({ ...p, sexo: v }))} options={[{ value: "masculino", label: "Masculino" }, { value: "feminino", label: "Feminino" }, { value: "outro", label: "Outro" }, { value: "prefiro_nao_dizer", label: "Prefiro nao dizer" }]} />
              </div>
              <SelectField label="Nivel de atividade" value={perfil.nivel_atividade} onChange={(v) => setPerfil((p) => ({ ...p, nivel_atividade: v }))} options={[{ value: "sedentario", label: "Sedentario" }, { value: "leve", label: "Leve" }, { value: "moderado", label: "Moderado" }, { value: "intenso", label: "Intenso" }]} />
            </>
          ) : (
            <>
              {[
                { label: "Idade", value: perfil.idade ? `${perfil.idade} anos` : "Nao informado" },
                { label: "Peso", value: perfil.peso ? `${perfil.peso} kg` : "Nao informado" },
                { label: "Altura", value: perfil.altura ? `${perfil.altura} m` : "Nao informado" },
                { label: "Sexo", value: perfil.sexo || "Nao informado" },
                { label: "Atividade fisica", value: perfil.nivel_atividade || "Nao informado" },
              ].map((f) => (
                <div key={f.label} className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
                  <span className="text-sm text-muted-foreground">{f.label}</span>
                  <span className="text-sm font-medium text-foreground capitalize">{f.value}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Saude mental */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-4 flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Saude mental</p>
        </div>
        <div className="flex flex-col gap-3">
          {editing ? (
            <>
              <SelectField label="Nivel de estresse" value={perfil.nivel_estresse} onChange={(v) => setPerfil((p) => ({ ...p, nivel_estresse: v }))} options={[{ value: "baixo", label: "Baixo" }, { value: "moderado", label: "Moderado" }, { value: "alto", label: "Alto" }]} />
              <SelectField label="Qualidade do sono" value={perfil.qualidade_sono} onChange={(v) => setPerfil((p) => ({ ...p, qualidade_sono: v }))} options={[{ value: "boa", label: "Boa" }, { value: "irregular", label: "Irregular" }, { value: "ruim", label: "Ruim" }]} />
              <SelectField label="Humor geral" value={perfil.humor_geral} onChange={(v) => setPerfil((p) => ({ ...p, humor_geral: v }))} options={[{ value: "bom", label: "Bom" }, { value: "variavel", label: "Variavel" }, { value: "ruim", label: "Ruim" }]} />
            </>
          ) : (
            <>
              {[
                { label: "Estresse", value: perfil.nivel_estresse || "Nao informado" },
                { label: "Sono", value: perfil.qualidade_sono || "Nao informado" },
                { label: "Humor", value: perfil.humor_geral || "Nao informado" },
              ].map((f) => (
                <div key={f.label} className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
                  <span className="text-sm text-muted-foreground">{f.label}</span>
                  <span className="text-sm font-medium text-foreground capitalize">{f.value}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Objetivos */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-4 flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Objetivos</p>
        </div>
        <div className="flex flex-col gap-3">
          {editing ? (
            <>
              <SelectField label="Rotina" value={perfil.rotina} onChange={(v) => setPerfil((p) => ({ ...p, rotina: v }))} options={[{ value: "trabalho", label: "Trabalho" }, { value: "estudo", label: "Estudo" }, { value: "ambos", label: "Ambos" }, { value: "nenhum", label: "Nenhum" }]} />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Objetivo principal</label>
                <input value={perfil.objetivo || ""} onChange={(e) => setPerfil((p) => ({ ...p, objetivo: e.target.value }))} placeholder="Ex: melhorar saude mental" className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Tempo livre diario</label>
                <input value={perfil.tempo_livre || ""} onChange={(e) => setPerfil((p) => ({ ...p, tempo_livre: e.target.value }))} placeholder="Ex: 1-3 horas" className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary" />
              </div>
            </>
          ) : (
            <>
              {[
                { label: "Rotina", value: perfil.rotina || "Não informado" },
                { label: "Objetivo", value: perfil.objetivo || "Não informado" },
                { label: "Tempo livre", value: perfil.tempo_livre || "Não informado" },
              ].map((f) => {
                const isLong = f.value.length > 22;
                return (
                  <div
                    key={f.label}
                    className={`rounded-xl bg-muted px-4 py-3 ${
                      isLong ? "flex flex-col gap-1" : "flex items-center justify-between gap-3"
                    }`}
                  >
                    <span className="text-xs font-medium text-muted-foreground shrink-0">{f.label}</span>
                    <span className={`text-sm font-medium text-foreground capitalize break-words ${isLong ? "" : "text-right"}`}>
                      {f.value}
                    </span>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      <button
        onClick={() => editing ? savePerfil() : setEditing(true)}
        disabled={saving}
        className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card py-4 text-sm font-medium text-primary transition-colors hover:bg-muted disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? <Save className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {saving ? "Salvando..." : editing ? "Salvar perfil" : "Editar perfil"}
      </button>
    </motion.div>
  );
};

export default Profile;

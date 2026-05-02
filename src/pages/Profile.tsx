import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { User, Activity, Brain, Target, ChevronRight, Settings, Camera, Loader2, Save, Lock, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
}

interface PrivacySettings {
  dados_fisicos: boolean;
  saude_mental: boolean;
  objetivos: boolean;
}

const defaultPerfil: PerfilData = {
  nome: "", nickname: "", avatar_url: "", idade: null, peso: null, altura: null,
  sexo: "", nivel_atividade: "", nivel_estresse: "", qualidade_sono: "",
  humor_geral: "", rotina: "", objetivo: "", tempo_livre: "",
};

const defaultPrivacy: PrivacySettings = { dados_fisicos: false, saude_mental: false, objetivos: false };

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [perfil, setPerfil] = useState<PerfilData>(defaultPerfil);
  const [privacy, setPrivacy] = useState<PrivacySettings>(defaultPrivacy);
  const [editing, setEditing] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) load();
  }, [user]);

  const load = async () => {
    const [{ data: pd }, { data: pr }] = await Promise.all([
      supabase.from("perfil_usuario").select("*").eq("user_id", user!.id).maybeSingle(),
      supabase.from("perfil_privacidade").select("dados_fisicos,saude_mental,objetivos").eq("user_id", user!.id).maybeSingle(),
    ]);
    if (pd) setPerfil(pd as unknown as PerfilData);
    if (pr) setPrivacy({ ...defaultPrivacy, ...pr });
    setLoading(false);
  };

  const savePerfil = async () => {
    if (!perfil.nome.trim()) {
      toast({ title: "Informe seu nome", variant: "destructive" }); return;
    }
    setSaving(true);
    const { error } = await supabase.from("perfil_usuario").update({
      nome: perfil.nome.trim(),
      nickname: perfil.nickname.trim() || null,
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
    }).eq("user_id", user!.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Perfil salvo!" });
      setEditing(false);
    }
  };

  const savePrivacy = async (next: PrivacySettings) => {
    setSavingPrivacy(true);
    const { error } = await supabase.from("perfil_privacidade").upsert(
      { user_id: user!.id, ...next },
      { onConflict: "user_id" }
    );
    setSavingPrivacy(false);
    if (error) {
      toast({ title: "Erro ao salvar privacidade", variant: "destructive" });
    } else {
      setPrivacy(next);
      toast({ title: "Configurações de privacidade salvas!" });
    }
  };

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Imagem muito grande (máx 2 MB)", variant: "destructive" }); return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["jpg", "jpeg", "png", "webp"].includes(ext ?? "")) {
      toast({ title: "Formato inválido (use JPG, PNG ou WebP)", variant: "destructive" }); return;
    }
    setUploading(true);
    const path = `${user!.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) {
      toast({ title: "Erro ao enviar foto", variant: "destructive" });
      setUploading(false); return;
    }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("perfil_usuario").update({ avatar_url: publicUrl }).eq("user_id", user!.id);
    setPerfil((p) => ({ ...p, avatar_url: publicUrl }));
    setUploading(false);
    toast({ title: "Foto atualizada!" });
  };

  const SelectField = ({
    label, value, onChange, options,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
  }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {editing ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
        >
          <option value="">Selecione</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <p className="rounded-xl bg-muted px-4 py-3 text-sm font-medium text-foreground capitalize">
          {options.find((o) => o.value === value)?.label || "Não informado"}
        </p>
      )}
    </div>
  );

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus dados pessoais</p>
        </div>
        <button
          onClick={() => navigate("/configuracoes")}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>

      {/* Avatar card */}
      <div className="flex items-center gap-4 rounded-2xl gradient-calm p-5 text-primary-foreground">
        <div className="relative">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-primary-foreground/20">
            {perfil.avatar_url
              ? <img src={perfil.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
              : <User className="h-8 w-8" />
            }
          </div>
          {editing && (
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary-foreground text-primary shadow"
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAvatar} className="hidden" />
        </div>
        <div className="flex-1">
          {editing ? (
            <div className="flex flex-col gap-1">
              <input
                value={perfil.nome}
                onChange={(e) => setPerfil((p) => ({ ...p, nome: e.target.value }))}
                maxLength={80}
                placeholder="Seu nome"
                className="bg-transparent text-lg font-bold placeholder:text-primary-foreground/50 outline-none"
              />
              <div className="flex items-center gap-1">
                <span className="text-xs opacity-60">@</span>
                <input
                  value={perfil.nickname}
                  onChange={(e) => setPerfil((p) => ({ ...p, nickname: e.target.value.replace(/\s/g, "").slice(0, 30) }))}
                  placeholder="nickname"
                  className="bg-transparent text-sm opacity-80 placeholder:text-primary-foreground/50 outline-none"
                />
              </div>
            </div>
          ) : (
            <>
              <p className="text-lg font-bold">{perfil.nome || "Usuário"}</p>
              <p className="text-sm opacity-80">{perfil.nickname ? `@${perfil.nickname}` : "Defina seu nickname"}</p>
            </>
          )}
        </div>
      </div>

      {/* Privacy section */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <button
          onClick={() => setShowPrivacy((v) => !v)}
          className="flex w-full items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Privacidade do Perfil</p>
          </div>
          <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${showPrivacy ? "rotate-90" : ""}`} />
        </button>
        {showPrivacy && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              Categorias marcadas como privadas não serão visíveis para seus amigos — e você também não verá essa categoria no perfil deles.
            </p>
            {[
              { key: "dados_fisicos" as const, label: "Dados Físicos", icon: Activity },
              { key: "saude_mental" as const, label: "Saúde Mental", icon: Brain },
              { key: "objetivos" as const, label: "Objetivos", icon: Target },
            ].map(({ key, label, icon: Icon }) => {
              const isPrivate = privacy[key];
              return (
                <div key={key} className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">{label}</span>
                  </div>
                  <button
                    onClick={() => {
                      const next = { ...privacy, [key]: !isPrivate };
                      savePrivacy(next);
                    }}
                    disabled={savingPrivacy}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      isPrivate
                        ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    }`}
                  >
                    {isPrivate ? <Lock className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {isPrivate ? "Privado" : "Visível"}
                  </button>
                </div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* Dados físicos */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Dados Físicos</p>
        </div>
        <div className="flex flex-col gap-3">
          {editing ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Idade", field: "idade", type: "number", placeholder: "Ex: 25" },
                  { label: "Peso (kg)", field: "peso", type: "number", placeholder: "Ex: 70" },
                  { label: "Altura (m)", field: "altura", type: "number", placeholder: "Ex: 1.75" },
                ].map(({ label, field, type, placeholder }) => (
                  <div key={field} className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">{label}</label>
                    <input
                      type={type}
                      step={field === "altura" ? "0.01" : "0.1"}
                      min="0"
                      value={(perfil[field as keyof PerfilData] as number) || ""}
                      onChange={(e) => setPerfil((p) => ({ ...p, [field]: Number(e.target.value) || null }))}
                      placeholder={placeholder}
                      className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
                    />
                  </div>
                ))}
                <SelectField
                  label="Sexo" value={perfil.sexo}
                  onChange={(v) => setPerfil((p) => ({ ...p, sexo: v }))}
                  options={[
                    { value: "masculino", label: "Masculino" },
                    { value: "feminino", label: "Feminino" },
                    { value: "outro", label: "Outro" },
                    { value: "prefiro_nao_dizer", label: "Prefiro não dizer" },
                  ]}
                />
              </div>
              <SelectField
                label="Nível de atividade" value={perfil.nivel_atividade}
                onChange={(v) => setPerfil((p) => ({ ...p, nivel_atividade: v }))}
                options={[
                  { value: "sedentario", label: "Sedentário" },
                  { value: "leve", label: "Leve" },
                  { value: "moderado", label: "Moderado" },
                  { value: "intenso", label: "Intenso" },
                ]}
              />
            </>
          ) : (
            <>
              {[
                { label: "Idade", value: perfil.idade ? `${perfil.idade} anos` : null },
                { label: "Peso", value: perfil.peso ? `${perfil.peso} kg` : null },
                { label: "Altura", value: perfil.altura ? `${perfil.altura} m` : null },
                { label: "Sexo", value: perfil.sexo },
                { label: "Atividade física", value: perfil.nivel_atividade },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="text-sm font-medium text-foreground capitalize">{value || "Não informado"}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Saúde mental */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-4 flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Saúde Mental</p>
        </div>
        <div className="flex flex-col gap-3">
          {editing ? (
            <>
              <SelectField label="Nível de estresse" value={perfil.nivel_estresse} onChange={(v) => setPerfil((p) => ({ ...p, nivel_estresse: v }))} options={[{ value: "baixo", label: "Baixo" }, { value: "moderado", label: "Moderado" }, { value: "alto", label: "Alto" }]} />
              <SelectField label="Qualidade do sono" value={perfil.qualidade_sono} onChange={(v) => setPerfil((p) => ({ ...p, qualidade_sono: v }))} options={[{ value: "boa", label: "Boa" }, { value: "irregular", label: "Irregular" }, { value: "ruim", label: "Ruim" }]} />
              <SelectField label="Humor geral" value={perfil.humor_geral} onChange={(v) => setPerfil((p) => ({ ...p, humor_geral: v }))} options={[{ value: "bom", label: "Bom" }, { value: "variavel", label: "Variável" }, { value: "ruim", label: "Ruim" }]} />
            </>
          ) : (
            <>
              {[
                { label: "Estresse", value: perfil.nivel_estresse },
                { label: "Sono", value: perfil.qualidade_sono },
                { label: "Humor", value: perfil.humor_geral },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="text-sm font-medium text-foreground capitalize">{value || "Não informado"}</span>
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
                <input value={perfil.objetivo || ""} maxLength={200} onChange={(e) => setPerfil((p) => ({ ...p, objetivo: e.target.value }))} placeholder="Ex: melhorar saúde mental" className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Tempo livre diário</label>
                <input value={perfil.tempo_livre || ""} maxLength={50} onChange={(e) => setPerfil((p) => ({ ...p, tempo_livre: e.target.value }))} placeholder="Ex: 1-3 horas" className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary" />
              </div>
            </>
          ) : (
            <>
              {[
                { label: "Rotina", value: perfil.rotina },
                { label: "Objetivo", value: perfil.objetivo },
                { label: "Tempo livre", value: perfil.tempo_livre },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="text-sm font-medium text-foreground capitalize">{value || "Não informado"}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <button
        onClick={() => (editing ? savePerfil() : setEditing(true))}
        disabled={saving}
        className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card py-4 text-sm font-medium text-primary transition-colors hover:bg-muted disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? <Save className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {saving ? "Salvando..." : editing ? "Salvar perfil" : "Editar perfil"}
      </button>

      {editing && (
        <button onClick={() => { setEditing(false); load(); }} className="text-center text-sm text-muted-foreground hover:text-foreground">
          Cancelar
        </button>
      )}
    </motion.div>
  );
};

export default Profile;

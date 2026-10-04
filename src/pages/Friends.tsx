import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { UserPlus, Search, Check, X, Trophy, Circle, Loader2 } from "lucide-react";
import BackButton from "@/components/BackButton";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface Amigo {
  id: string;
  nome: string;
  nickname: string;
  avatar_url: string | null;
  online: boolean;
}

interface Pedido {
  id: string;
  user_id: string;
  nome: string;
  nickname: string;
}

const Friends = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<"amigos" | "pedidos" | "buscar">("amigos");
  const [amigos, setAmigos] = useState<Amigo[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{id:string;nome:string;nickname:string;avatar_url:string|null}>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    loadAmigos(cancelled);
    loadPedidos(cancelled);
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadAmigos = async (cancelled = false) => {
    setLoading(true);
    // Get friendships where I'm either user_id or amigo_id and status is accepted
    const { data: friendships } = await supabase
      .from("amizades")
      .select("user_id, amigo_id")
      .eq("status", "aceito")
      .or(`user_id.eq.${user!.id},amigo_id.eq.${user!.id}`);

    if (!friendships || friendships.length === 0) {
      setAmigos([]);
      setLoading(false);
      return;
    }

    const friendIds = friendships.map((f) => f.user_id === user!.id ? f.amigo_id : f.user_id);

    const { data: profiles } = await supabase
      .from("perfil_usuario")
      .select("user_id, nome, nickname, avatar_url")
      .in("user_id", friendIds);

    const { data: presencas } = await supabase
      .from("presenca_online")
      .select("user_id, online")
      .in("user_id", friendIds);

    const presMap = new Map((presencas || []).map((p) => [p.user_id, p.online]));

    setAmigos(
      (profiles || []).map((p) => ({
        id: p.user_id,
        nome: p.nome,
        nickname: p.nickname || "",
        avatar_url: p.avatar_url,
        online: presMap.get(p.user_id) || false,
      }))
    );
    setLoading(false);
  };

  const loadPedidos = async (cancelled = false) => {
    const { data } = await supabase
      .from("amizades")
      .select("id, user_id")
      .eq("amigo_id", user!.id)
      .eq("status", "pendente");

    if (!data || data.length === 0) {
      setPedidos([]);
      return;
    }

    const userIds = data.map((d) => d.user_id);
    const { data: profiles } = await supabase
      .from("perfil_usuario")
      .select("user_id, nome, nickname")
      .in("user_id", userIds);

    setPedidos(
      data.map((d) => {
        const p = (profiles || []).find((pr) => pr.user_id === d.user_id);
        return { id: d.id, user_id: d.user_id, nome: p?.nome || "", nickname: p?.nickname || "" };
      })
    );
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;
    const { data } = await supabase
      .from("perfil_usuario")
      .select("user_id, nome, nickname, avatar_url")
      .ilike("nickname", `%${searchQuery}%`)
      .neq("user_id", user!.id)
      .limit(10);
    setSearchResults(data || []);
  };

  const addFriend = async (amigoId: string) => {
    const { error } = await supabase.from("amizades").insert({ user_id: user!.id, amigo_id: amigoId });
    if (error) {
      toast({ title: "Erro", description: error.message.includes("duplicate") ? "Pedido ja enviado" : error.message, variant: "destructive" });
    } else {
      toast({ title: "Pedido enviado!" });
    }
  };

  const respondPedido = async (id: string, aceitar: boolean) => {
    await supabase.from("amizades").update({ status: aceitar ? "aceito" : "recusado" }).eq("id", id);
    toast({ title: aceitar ? "Amizade aceita!" : "Pedido recusado" });
    loadPedidos();
    if (aceitar) loadAmigos();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <BackButton to="/perfil" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Amigos</h1>
          <p className="text-sm text-muted-foreground">Conecte-se e desafie seus amigos</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: "amigos" as const, label: "Amigos" },
          { key: "pedidos" as const, label: `Pedidos${pedidos.length > 0 ? ` (${pedidos.length})` : ""}` },
          { key: "buscar" as const, label: "Buscar" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-all ${
              tab === t.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "amigos" && (
        <div className="flex flex-col gap-3">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : amigos.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <UserPlus className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nenhum amigo ainda. Busque pelo nickname!</p>
            </div>
          ) : (
            amigos.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
                <div className="relative">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-muted">
                    {a.avatar_url ? <img src={a.avatar_url} className="h-full w-full object-cover" /> : <span className="text-lg font-bold text-muted-foreground">{a.nome[0]}</span>}
                  </div>
                  <Circle className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 ${a.online ? "fill-green-500 text-green-500" : "fill-muted-foreground/30 text-muted-foreground/30"}`} />
                </div>
                <button onClick={() => navigate(`/amigo/${a.id}`)} className="flex-1 text-left min-w-0">
                  <p className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate">{a.nome}</p>
                  <p className="text-xs text-muted-foreground hover:text-primary transition-colors truncate">@{a.nickname}</p>
                </button>
                <button onClick={() => navigate("/desafios")} className="flex h-9 items-center gap-1.5 rounded-xl bg-primary/10 px-3 text-xs font-medium text-primary">
                  <Trophy className="h-3.5 w-3.5" />
                  Desafiar
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "pedidos" && (
        <div className="flex flex-col gap-3">
          {pedidos.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum pedido pendente</p>
          ) : (
            pedidos.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-sm font-bold text-muted-foreground">{p.nome[0]}</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{p.nome}</p>
                  <p className="text-xs text-muted-foreground">@{p.nickname}</p>
                </div>
                <button onClick={() => respondPedido(p.id, true)} className="rounded-lg bg-primary p-2 text-primary-foreground"><Check className="h-4 w-4" /></button>
                <button onClick={() => respondPedido(p.id, false)} className="rounded-lg bg-muted p-2 text-muted-foreground"><X className="h-4 w-4" /></button>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "buscar" && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchUsers()}
                placeholder="Buscar por nickname..."
                className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-4 text-sm outline-none focus:border-primary"
              />
            </div>
            <button onClick={searchUsers} className="rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground">Buscar</button>
          </div>
          <div className="flex flex-col gap-2">
            {searchResults.map((r) => (
              <div key={r.user_id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-muted">
                  {r.avatar_url ? <img src={r.avatar_url} className="h-full w-full object-cover" /> : <span className="text-sm font-bold text-muted-foreground">{(r.nome || "?")[0]}</span>}
                </div>
                <button onClick={() => navigate(`/amigo/${r.user_id}`)} className="flex-1 text-left min-w-0">
                  <p className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate">{r.nome}</p>
                  <p className="text-xs text-muted-foreground truncate">@{r.nickname}</p>
                </button>
                <button onClick={() => addFriend(r.user_id)} className="flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-medium text-primary-foreground">
                  <UserPlus className="h-3.5 w-3.5" />
                  Adicionar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default Friends;

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { UserPlus, Search, Check, X, Trophy, Circle, Loader2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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

const AvatarCircle = ({ nome, avatar_url, size = 12 }: { nome: string; avatar_url?: string | null; size?: number }) => (
  <div className={`flex h-${size} w-${size} items-center justify-center overflow-hidden rounded-xl bg-muted`}>
    {avatar_url
      ? <img src={avatar_url} alt={nome} className="h-full w-full object-cover" />
      : <span className="font-bold text-muted-foreground">{(nome || "?")[0].toUpperCase()}</span>
    }
  </div>
);

const Friends = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<"amigos" | "pedidos" | "buscar">("amigos");
  const [amigos, setAmigos] = useState<Amigo[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Amigo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [pendingActions, setPendingActions] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) { loadAmigos(); loadPedidos(); }
  }, [user]);

  const loadAmigos = async () => {
    setLoading(true);
    const { data: friendships } = await supabase
      .from("amizades")
      .select("user_id, amigo_id")
      .eq("status", "aceito")
      .or(`user_id.eq.${user!.id},amigo_id.eq.${user!.id}`);

    if (!friendships?.length) { setAmigos([]); setLoading(false); return; }

    const friendIds = friendships.map((f) => f.user_id === user!.id ? f.amigo_id : f.user_id);

    const [{ data: profiles }, { data: presencas }] = await Promise.all([
      supabase.from("perfil_usuario").select("user_id, nome, nickname, avatar_url").in("user_id", friendIds),
      supabase.from("presenca_online").select("user_id, online").in("user_id", friendIds),
    ]);

    const presMap = new Map((presencas ?? []).map((p) => [p.user_id, p.online]));
    setAmigos(
      (profiles ?? []).map((p) => ({
        id: p.user_id,
        nome: p.nome ?? "Usuário",
        nickname: p.nickname ?? "",
        avatar_url: p.avatar_url ?? null,
        online: presMap.get(p.user_id) ?? false,
      }))
    );
    setLoading(false);
  };

  const loadPedidos = async () => {
    const { data } = await supabase
      .from("amizades")
      .select("id, user_id")
      .eq("amigo_id", user!.id)
      .eq("status", "pendente");

    if (!data?.length) { setPedidos([]); return; }
    const userIds = data.map((d) => d.user_id);
    const { data: profiles } = await supabase
      .from("perfil_usuario").select("user_id, nome, nickname").in("user_id", userIds);

    setPedidos(
      data.map((d) => {
        const p = (profiles ?? []).find((pr) => pr.user_id === d.user_id);
        return { id: d.id, user_id: d.user_id, nome: p?.nome ?? "Usuário", nickname: p?.nickname ?? "" };
      })
    );
  };

  const searchUsers = async () => {
    const q = searchQuery.trim().replace(/<[^>]*>/g, "").slice(0, 50);
    if (!q) return;
    setSearching(true);
    const { data } = await supabase
      .from("perfil_usuario")
      .select("user_id, nome, nickname, avatar_url")
      .ilike("nickname", `%${q}%`)
      .neq("user_id", user!.id)
      .limit(15);
    setSearchResults(
      (data ?? []).map((r) => ({
        id: r.user_id,
        nome: r.nome ?? "Usuário",
        nickname: r.nickname ?? "",
        avatar_url: r.avatar_url ?? null,
        online: false,
      }))
    );
    setSearching(false);
  };

  const addFriend = async (amigoId: string) => {
    if (pendingActions.has(amigoId)) return;
    setPendingActions((s) => new Set(s).add(amigoId));
    const { error } = await supabase.from("amizades").insert({ user_id: user!.id, amigo_id: amigoId });
    setPendingActions((s) => { const n = new Set(s); n.delete(amigoId); return n; });
    if (error) {
      const msg = error.message.includes("duplicate") ? "Pedido já enviado" : error.message;
      toast({ title: msg, variant: "destructive" });
    } else {
      toast({ title: "Pedido de amizade enviado!" });
    }
  };

  const respondPedido = async (id: string, aceitar: boolean) => {
    if (pendingActions.has(id)) return;
    setPendingActions((s) => new Set(s).add(id));
    await supabase.from("amizades").update({ status: aceitar ? "aceito" : "recusado" }).eq("id", id);
    setPendingActions((s) => { const n = new Set(s); n.delete(id); return n; });
    toast({ title: aceitar ? "Amizade aceita!" : "Pedido recusado" });
    loadPedidos();
    if (aceitar) loadAmigos();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Amigos</h1>
        <p className="text-sm text-muted-foreground">Conecte-se com quem cuida da saúde como você</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: "amigos" as const, label: `Amigos${amigos.length ? ` (${amigos.length})` : ""}` },
          { key: "pedidos" as const, label: `Pedidos${pedidos.length ? ` (${pedidos.length})` : ""}` },
          { key: "buscar" as const, label: "Buscar" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-all ${
              tab === t.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Amigos */}
      {tab === "amigos" && (
        <div className="flex flex-col gap-3">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : amigos.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Users className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-semibold text-foreground">Nenhum amigo ainda</p>
                <p className="text-sm text-muted-foreground mt-1">Busque pelo nickname de alguém para começar.</p>
              </div>
            </div>
          ) : (
            amigos.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
                <div className="relative shrink-0">
                  <AvatarCircle nome={a.nome} avatar_url={a.avatar_url} size={12} />
                  <Circle className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 ${
                    a.online ? "fill-green-500 text-green-500" : "fill-muted-foreground/30 text-muted-foreground/30"
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => navigate(`/amigos/${a.id}`)}
                    className="text-sm font-semibold text-foreground hover:text-primary hover:underline text-left"
                  >
                    {a.nome}
                  </button>
                  <p className="text-xs text-muted-foreground">@{a.nickname}</p>
                </div>
                <button
                  onClick={() => navigate("/desafios")}
                  className="flex h-9 items-center gap-1.5 rounded-xl bg-primary/10 px-3 text-xs font-medium text-primary shrink-0"
                >
                  <Trophy className="h-3.5 w-3.5" />
                  Desafiar
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Pedidos */}
      {tab === "pedidos" && (
        <div className="flex flex-col gap-3">
          {pedidos.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Nenhum pedido pendente</p>
          ) : (
            pedidos.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
                <AvatarCircle nome={p.nome} size={10} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{p.nome}</p>
                  <p className="text-xs text-muted-foreground">@{p.nickname}</p>
                </div>
                <button
                  onClick={() => respondPedido(p.id, true)}
                  disabled={pendingActions.has(p.id)}
                  className="rounded-lg bg-primary p-2 text-primary-foreground disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => respondPedido(p.id, false)}
                  disabled={pendingActions.has(p.id)}
                  className="rounded-lg bg-muted p-2 text-muted-foreground disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Buscar */}
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
                maxLength={50}
                className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-4 text-sm outline-none focus:border-primary"
              />
            </div>
            <button
              onClick={searchUsers}
              disabled={searching}
              className="rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {searchResults.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
                <AvatarCircle nome={r.nome} avatar_url={r.avatar_url} size={10} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{r.nome}</p>
                  <p className="text-xs text-muted-foreground">@{r.nickname}</p>
                </div>
                <button
                  onClick={() => addFriend(r.id)}
                  disabled={pendingActions.has(r.id)}
                  className="flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50"
                >
                  {pendingActions.has(r.id) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
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

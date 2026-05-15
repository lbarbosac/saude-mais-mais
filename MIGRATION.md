# Guia de Migração — Saúde em Sintonia

Este arquivo descreve como aplicar as mudanças do refactoring ao projeto existente.

---

## ⚠️ Ação URGENTE — Segurança

O arquivo `.env` foi commitado publicamente no repositório com a chave `VITE_SUPABASE_PUBLISHABLE_KEY`.

**Faça isso agora, antes de qualquer outra coisa:**

1. Acesse o painel do Supabase: https://supabase.com/dashboard
2. Vá em **Project Settings → API**
3. **Rotacione a `anon key`** (gere uma nova)
4. Atualize o `.env` local com a nova chave
5. Execute os passos abaixo para remover o `.env` do histórico Git:

```bash
# Remove .env do histórico e do índice
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

git push origin --force --all
```

Ou use a ferramenta mais moderna:
```bash
npx git-filter-repo --path .env --invert-paths
git push origin --force --all
```

---

## Passos de migração

### 1. Instalar dependências

```bash
# Remove dependências do Lovable
npm uninstall @lovable.dev/cloud-auth-js
npm uninstall -D lovable-tagger

# Instala se necessário (já estão no package.json refatorado)
npm install
```

### 2. Renomear variável de ambiente

No `.env`, renomear:
```
# ANTES:
VITE_SUPABASE_PUBLISHABLE_KEY=...

# DEPOIS:
VITE_SUPABASE_ANON_KEY=...
```

E verificar se o `.env` está no `.gitignore` (o novo `.gitignore` já cobre isso).

### 3. Substituir arquivos

Copiar os arquivos da pasta `refatorado/` para as posições corretas:

```bash
# Configuração de build
cp refatorado/vite.config.ts vite.config.ts
cp refatorado/package.json package.json
cp refatorado/.gitignore .gitignore
cp refatorado/.env.example .env.example

# Contextos e lib
cp -r refatorado/src/contexts/ src/contexts/
cp -r refatorado/src/lib/ src/lib/

# Componentes
cp -r refatorado/src/components/auth/ src/components/auth/
cp -r refatorado/src/components/layout/ src/components/layout/
cp -r refatorado/src/components/features/chat/ src/components/features/chat/
cp refatorado/src/components/ui/loading-spinner.tsx src/components/ui/

# App principal
cp refatorado/src/App.tsx src/App.tsx

# Páginas refatoradas
cp refatorado/src/pages/Login.tsx src/pages/Login.tsx
cp refatorado/src/pages/Habits.tsx src/pages/Habits.tsx
cp refatorado/src/pages/Dashboard.tsx src/pages/Dashboard.tsx

# Edge Functions
cp -r refatorado/supabase/functions/ supabase/functions/
```

### 4. Atualizar imports nas páginas restantes

Todas as páginas que importam de `@/integrations/supabase/client` devem ser atualizadas:

```typescript
// ANTES:
import { supabase } from "@/integrations/supabase/client";

// DEPOIS:
import { supabase } from "@/lib/supabase/client";
```

Páginas a atualizar: `Sounds.tsx`, `Progress.tsx`, `Profile.tsx`, `Friends.tsx`, `FriendProfile.tsx`, `Challenges.tsx`, `Settings.tsx`, `Treinos.tsx`.

Script de substituição automática:
```bash
find src/pages -name "*.tsx" -exec sed -i \
  's|@/integrations/supabase/client|@/lib/supabase/client|g' {} \;
```

### 5. Atualizar imports do AuthContext nas páginas

```typescript
// AuthContext export mudou:
// loading -> isLoading

// Páginas que usam { loading } precisam trocar para { isLoading }
```

### 6. Remover arquivos obsoletos

```bash
# Remover integração Lovable
rm -rf src/integrations/lovable/

# Remover arquivos de layout antigos (já substituídos)
rm src/components/AppLayout.tsx
rm src/components/AppSidebar.tsx
rm src/components/BottomNav.tsx
rm src/components/ChatAssistant.tsx
rm src/components/ProtectedRoute.tsx

# Remover assets não usados
rm src/assets/medidas-personagem.png  # verificar se está em uso
```

### 7. Configurar Edge Functions com OpenAI

No painel do Supabase, em **Edge Functions → Secrets**, adicionar:
```
OPENAI_API_KEY = sk-...
```

Remover (se existir):
```
LOVABLE_API_KEY
```

### 8. Mover arquivos de áudio

Os arquivos `.mp3` da raiz do projeto devem ir para `public/sounds/`:

```bash
mkdir -p public/sounds
mv *.mp3 public/sounds/
```

Depois fazer upload deles para o Supabase Storage no bucket `sounds` (ou ajustar as URLs na página `Sounds.tsx`).

---

## Checklist final

- [ ] `.env` com `VITE_SUPABASE_ANON_KEY` (nome correto)
- [ ] `.env` no `.gitignore`
- [ ] Chave do Supabase rotacionada (se o `.env` foi publicado)
- [ ] `@lovable.dev/cloud-auth-js` removido do `package.json`
- [ ] `lovable-tagger` removido do `package.json`
- [ ] `OPENAI_API_KEY` configurada no Supabase Secrets
- [ ] Google OAuth configurado diretamente no painel Supabase (não precisa mais do Lovable)
- [ ] Imports atualizados de `@/integrations/supabase/client` → `@/lib/supabase/client`
- [ ] Build de produção passando: `npm run build`

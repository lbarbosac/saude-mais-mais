# Saúde em Sintonia

Plataforma health-tech SaaS para acompanhamento de hábitos, bem-estar mental e físico, com assistente IA integrado.

## Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend:** Supabase (Auth, PostgreSQL, Storage, Edge Functions)
- **IA:** OpenAI via Supabase Edge Functions
- **Auth:** Supabase Auth (email/senha + OAuth Google)

---

## Configuração

### Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com)

### Instalação

```bash
git clone <repo-url>
cd saude-em-sintonia
npm install
cp .env.example .env
# Preencha as variáveis no .env
npm run dev
```

### Variáveis de ambiente

```env
# Supabase (obrigatório)
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>

# OpenAI (usado nas Edge Functions — não expor no frontend)
OPENAI_API_KEY=<sua-chave>
```

> ⚠️ **NUNCA** commite o `.env` com valores reais. Use `.env.example` com placeholders.

### Supabase

1. Crie um projeto no Supabase
2. Execute as migrations em `supabase/migrations/` em ordem cronológica
3. Configure autenticação: habilite Email + Google OAuth no painel
4. Configure SMTP para envio de e-mails de confirmação

---

## Estrutura do Projeto

```
src/
├── components/
│   ├── ui/              # shadcn/ui (não editar manualmente)
│   ├── layout/          # AppLayout, BottomNav, AppSidebar
│   ├── auth/            # ProtectedRoute, AuthRedirect
│   └── features/        # Componentes por domínio de negócio
│       ├── dashboard/
│       ├── habits/
│       ├── profile/
│       ├── sounds/
│       ├── training/
│       ├── social/
│       └── settings/
├── contexts/
│   └── AuthContext.tsx  # Estado global de autenticação
├── hooks/               # Hooks customizados reutilizáveis
├── lib/
│   ├── supabase/        # Cliente + tipos gerados
│   ├── utils/           # Helpers (cn, datas, seeds)
│   └── validations/     # Schemas Zod
├── pages/               # Páginas (thin layer, sem lógica de negócio)
└── types/               # Tipos globais TypeScript
```

---

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run lint` | Verifica o código com ESLint |
| `npm test` | Executa os testes |
| `npm run preview` | Preview do build |

---

## Deploy

### Vercel (recomendado)

```bash
npm run build
# Deploy via Vercel CLI ou conecte o repositório no painel
```

Configure as variáveis de ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no painel do Vercel.

---

## Decisões de arquitetura

- **Sem backend separado:** O Supabase serve como BaaS completo. As Edge Functions em Deno lidam com operações sensíveis (chamadas OpenAI, exclusão de dados).
- **RLS habilitado em todas as tabelas:** Segurança de dados garantida em nível de banco.
- **React Query para servidor:** Todo estado remoto (dados do Supabase) gerenciado com `@tanstack/react-query`.
- **Autenticação via Supabase Auth:** Não há JWT customizado. O token é gerenciado automaticamente pelo cliente Supabase.
- **Google OAuth via Supabase direto:** A dependência `@lovable.dev/cloud-auth-js` foi removida. OAuth é feito nativamente via `supabase.auth.signInWithOAuth`.

---

## Melhorias futuras

- [ ] Testes E2E com Playwright
- [ ] PWA com notificações push
- [ ] Internacionalização (i18n)
- [ ] Onboarding guiado para novos usuários
- [ ] Integração com wearables (Apple Health, Google Fit)

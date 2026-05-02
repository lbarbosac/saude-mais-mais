# Saúde++

Aplicação web para bem-estar e saúde mental. Acompanhe hábitos, humor, treinos, sons relaxantes e sua evolução pessoal.

## Stack

- **React 18** + TypeScript
- **Vite** + Tailwind CSS
- **Supabase** — autenticação, banco de dados, storage e edge functions
- **shadcn/ui** + Radix UI — componentes de interface
- **TanStack Query** — gerenciamento de estado assíncrono
- **Framer Motion** — animações

## Funcionalidades

- Check-in diário de humor e energia
- Gerenciamento de hábitos com rotação diária
- Player de sons relaxantes (misture múltiplos ambientes)
- Geração de treinos personalizados via IA
- Registro de treinos e medidas corporais
- Calculadora de % de gordura corporal (método US Navy)
- Progresso semanal com gráficos
- Chat com assistente de saúde mental (Lucas)
- Sistema de amizades e desafios
- Perfil com upload de avatar
- Tema claro/escuro

## Desenvolvimento local

```bash
git clone <url-do-repositorio>
cd saude-mais-mais
npm install
cp .env.example .env
# Preencha o .env com suas credenciais do Supabase
npm run dev
```

## Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
```

Você encontra essas informações em **Project Settings → API** no painel do Supabase.

## Deploy

O projeto pode ser publicado em qualquer plataforma que suporte builds estáticos:

- [Vercel](https://vercel.com) — conecte o repositório e configure as variáveis de ambiente
- [Netlify](https://netlify.com) — idem
- Supabase Hosting (se disponível no seu plano)

## Edge Functions

As edge functions ficam em `supabase/functions/` e são implantadas via Supabase CLI:

```bash
supabase functions deploy chat-lucas
supabase functions deploy gerar-habitos
supabase functions deploy gerar-treino
supabase functions deploy excluir-dados
```

As funções requerem a variável `OPENAI_API_KEY` configurada nos secrets do projeto Supabase.

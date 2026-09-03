# Saúde++

> Plataforma digital de saúde e bem-estar que combina acompanhamento de hábitos, progresso e recursos de bem-estar com um assistente baseado em Inteligência Artificial.

## Sobre o projeto

O **Saúde++** nasceu de um problema simples: informações relacionadas à saúde e ao bem-estar costumam ficar espalhadas entre diferentes aplicativos e ferramentas.

A proposta do projeto é centralizar essa experiência em uma única aplicação, permitindo que o usuário acompanhe sua rotina, hábitos e evolução enquanto interage com recursos de Inteligência Artificial.

Mais do que reunir funcionalidades, o projeto busca conectar essas informações para criar uma experiência mais personalizada.

### Principais recursos

- 👤 Onboarding e personalização do usuário
- ✅ Acompanhamento de hábitos
- 🏋️ Treinos e atividades
- 📊 Visualização de progresso e indicadores
- 🧠 Recursos relacionados a foco, relaxamento e bem-estar
- 🤖 Assistente de Inteligência Artificial
- 🎮 Gamificação
- 👥 Recursos sociais
- ⚙️ Perfil e preferências
- 🌙 Tema claro e escuro
- 📱 Interface responsiva para desktop e dispositivos móveis

> **Importante:** o Saúde++ é um projeto de tecnologia voltado a bem-estar e não substitui avaliação, diagnóstico ou acompanhamento de profissionais de saúde.

---

## 🤖 Inteligência Artificial

Um dos principais recursos do projeto é o **Amigo Lucas**, um assistente de Inteligência Artificial integrado à plataforma.

A ideia é ir além de um chatbot isolado: o assistente pode utilizar o contexto disponível na aplicação para tornar a experiência mais personalizada, considerando informações fornecidas pelo usuário.

O projeto explora a utilização de IA como parte de um produto digital, e não apenas como uma funcionalidade independente.

### Objetivos do Amigo Lucas

- Auxiliar o usuário na interação com a plataforma
- Ajudar na interpretação de informações relacionadas à sua rotina
- Oferecer orientações gerais de bem-estar
- Utilizar contexto para gerar interações mais personalizadas

### Limitações

O assistente não realiza diagnósticos, não prescreve tratamentos e não substitui profissionais de saúde.

---

## 🏗️ Arquitetura

O Saúde++ foi desenvolvido com uma arquitetura baseada em **React + TypeScript**, organizada em componentes, páginas, hooks, contextos e módulos por domínio.

A aplicação utiliza o Supabase como backend, concentrando serviços de autenticação, banco de dados, armazenamento e funções de backend.

### Principais responsabilidades

```text
Frontend
│
├── React + TypeScript
├── Componentes reutilizáveis
├── Gerenciamento de estado
├── React Query
├── Autenticação
└── Interface responsiva

Backend / BaaS
│
└── Supabase
    ├── Authentication
    ├── PostgreSQL
    ├── Storage
    └── Edge Functions

Inteligência Artificial
│
└── OpenAI
    └── Integração através das Edge Functions

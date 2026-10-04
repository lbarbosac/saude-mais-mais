// Catálogo de hábitos: valores aceitos e lista padrão usada quando a IA não
// está disponível no primeiro acesso (o usuário nunca fica sem hábitos).

// Espelha ICON_MAP em src/lib/habitos.ts
export const ICONES = [
  "book-open", "dumbbell", "brain", "heart", "users", "moon", "droplets",
  "apple", "music", "eye", "check", "sun", "leaf", "smile", "coffee",
  "wind", "star", "shield", "clock", "target", "zap", "flame",
] as const;

// Espelha CATEGORIAS em src/lib/habitos.ts e a constraint habitos_categoria_valida
export const CATEGORIAS = [
  "movimento", "agua_alimentacao", "sono_descanso", "respiracao",
  "social_gratidao", "foco_aprendizado", "humor_emocao",
] as const;

export interface HabitoGerado {
  nome_habito: string;
  descricao: string;
  icone: string;
  categoria: string;
}

const h = (nome_habito: string, descricao: string, icone: string, categoria: string): HabitoGerado =>
  ({ nome_habito, descricao, icone, categoria });

export const HABITOS_PADRAO: HabitoGerado[] = [
  h("Caminhar 10 minutos", "Uma volta no quarteirão já ativa a circulação.", "dumbbell", "movimento"),
  h("Alongar o corpo ao acordar", "Dois minutos soltando pescoço, ombros e costas.", "sun", "movimento"),
  h("Subir escadas em vez do elevador", "Pequenos esforços somam ao longo do dia.", "zap", "movimento"),
  h("Levantar a cada hora sentado", "Fique de pé e mexa as pernas por um minuto.", "clock", "movimento"),
  h("Dançar uma música", "Coloque uma música que você gosta e se mexa.", "music", "movimento"),
  h("Beber um copo de água ao acordar", "Hidrata o corpo depois da noite de sono.", "droplets", "agua_alimentacao"),
  h("Comer uma fruta", "Uma porção de fruta como lanche.", "apple", "agua_alimentacao"),
  h("Mastigar devagar no almoço", "Comer com calma ajuda a perceber a saciedade.", "leaf", "agua_alimentacao"),
  h("Levar uma garrafa de água", "Água por perto lembra você de beber.", "droplets", "agua_alimentacao"),
  h("Incluir verdura no prato", "Uma porção de verdura ou legume em uma refeição.", "leaf", "agua_alimentacao"),
  h("Deitar no mesmo horário", "Um horário fixo ajuda o corpo a regular o sono.", "moon", "sono_descanso"),
  h("Desligar telas 30 minutos antes", "Menos luz de tela facilita pegar no sono.", "moon", "sono_descanso"),
  h("Fazer uma pausa de 5 minutos", "Afaste-se do que está fazendo e descanse a mente.", "coffee", "sono_descanso"),
  h("Evitar café depois das 16h", "A cafeína pode atrapalhar o sono da noite.", "coffee", "sono_descanso"),
  h("Respirar fundo 3 vezes", "Inspire em 4 segundos, solte em 6.", "wind", "respiracao"),
  h("Fazer 2 minutos de respiração", "Sente-se, feche os olhos e só observe o ar.", "wind", "respiracao"),
  h("Notar 5 coisas ao seu redor", "Um exercício rápido para voltar ao presente.", "eye", "respiracao"),
  h("Relaxar os ombros conscientemente", "Perceba a tensão e deixe os ombros caírem.", "heart", "respiracao"),
  h("Agradecer por algo hoje", "Pense ou anote uma coisa boa do dia.", "heart", "social_gratidao"),
  h("Mandar mensagem para alguém querido", "Um oi simples fortalece o vínculo.", "users", "social_gratidao"),
  h("Elogiar alguém", "Um elogio sincero melhora o dia dos dois.", "smile", "social_gratidao"),
  h("Conversar sem olhar o celular", "Dê atenção total a uma conversa.", "users", "social_gratidao"),
  h("Ler 10 páginas", "De um livro, artigo ou o que despertar curiosidade.", "book-open", "foco_aprendizado"),
  h("Organizar a mesa por 5 minutos", "Um espaço arrumado ajuda a concentrar.", "target", "foco_aprendizado"),
  h("Listar as 3 prioridades do dia", "Saber o que importa evita dispersão.", "target", "foco_aprendizado"),
  h("Fazer algo que te dá prazer", "Reserve um tempo para algo de que você gosta.", "star", "humor_emocao"),
  h("Anotar como você se sente", "Uma frase sobre o seu dia ajuda a entender as emoções.", "brain", "humor_emocao"),
  h("Tomar sol por 10 minutos", "Luz natural ajuda no humor e no sono.", "sun", "humor_emocao"),
];

const normalizarNome = (s: string) => s.toLocaleLowerCase("pt-BR").replace(/\s+/g, " ").trim();

/** Valida e normaliza a lista vinda da IA. Descarta o que não presta e remove repetidos. */
export function sanitizarHabitos(brutos: unknown, limite = 36): HabitoGerado[] {
  if (!Array.isArray(brutos)) return [];
  const vistos = new Set<string>();
  const saida: HabitoGerado[] = [];
  for (const item of brutos) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const nome = String(r.nome_habito ?? "").replace(/\s+/g, " ").trim().slice(0, 100);
    if (nome.length < 3 || vistos.has(normalizarNome(nome))) continue;
    vistos.add(normalizarNome(nome));
    saida.push({
      nome_habito: nome,
      descricao: String(r.descricao ?? "").replace(/\s+/g, " ").trim().slice(0, 300),
      icone: (ICONES as readonly string[]).includes(String(r.icone)) ? String(r.icone) : "check",
      categoria: (CATEGORIAS as readonly string[]).includes(String(r.categoria)) ? String(r.categoria) : "geral",
    });
    if (saida.length >= limite) break;
  }
  return saida;
}

// Textos de exibição para os valores gravados no banco.

export const SEXO: Record<string, string> = {
  masculino: "Masculino",
  feminino: "Feminino",
  outro: "Outro",
  prefiro_nao_dizer: "Prefiro não dizer",
};

export const NIVEL_ATIVIDADE: Record<string, string> = {
  sedentario: "Sedentário",
  leve: "Leve",
  moderado: "Moderado",
  intenso: "Intenso",
};

export const NIVEL_ESTRESSE: Record<string, string> = { baixo: "Baixo", moderado: "Moderado", alto: "Alto" };

export const QUALIDADE_SONO: Record<string, string> = { boa: "Boa", irregular: "Irregular", ruim: "Ruim" };

export const HUMOR_GERAL: Record<string, string> = { bom: "Bom", variavel: "Variável", ruim: "Ruim" };

export const ROTINA: Record<string, string> = { trabalho: "Trabalho", estudo: "Estudo", ambos: "Trabalho e estudo", nenhum: "Nenhuma das duas" };

/** Objetivos oferecidos no onboarding. No perfil o campo também aceita texto livre. */
export const OBJETIVO: Record<string, string> = {
  emagrecer: "Emagrecer",
  ganhar_massa: "Ganhar massa",
  saude_mental: "Cuidar da saúde mental",
  mais_energia: "Ter mais energia",
  dormir_melhor: "Dormir melhor",
  reduzir_estresse: "Reduzir o estresse",
};

/** Rótulo do valor, ou o próprio valor se não houver tradução. */
export function rotulo(mapa: Record<string, string>, valor: string | null | undefined): string | null {
  if (!valor) return null;
  return mapa[valor] ?? valor;
}

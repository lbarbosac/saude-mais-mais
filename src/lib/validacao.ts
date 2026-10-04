// Validações de formulário. As mesmas regras existem como constraints no banco;
// aqui elas servem para dar a mensagem certa antes de enviar.

export function emailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export function validarCadastro(f: { nome: string; email: string; senha: string }): string | null {
  if (f.nome.trim().length < 2) return "Informe seu nome (mínimo de 2 letras).";
  if (!emailValido(f.email)) return "Informe um e-mail válido.";
  if (f.senha.length < 8) return "A senha precisa ter pelo menos 8 caracteres.";
  return null;
}

export function validarLogin(f: { email: string; senha: string }): string | null {
  if (!emailValido(f.email)) return "Informe um e-mail válido.";
  if (!f.senha) return "Informe sua senha.";
  return null;
}

export interface ForcaSenha {
  pontos: number;
  rotulo: "" | "Fraca" | "Razoável" | "Boa" | "Forte";
}

export function forcaDaSenha(senha: string): ForcaSenha {
  if (!senha) return { pontos: 0, rotulo: "" };
  let pontos = 0;
  if (senha.length >= 8) pontos++;
  if (senha.length >= 12) pontos++;
  if (/[A-Z]/.test(senha)) pontos++;
  if (/[0-9]/.test(senha)) pontos++;
  if (/[^A-Za-z0-9]/.test(senha)) pontos++;
  if (pontos <= 1) return { pontos, rotulo: "Fraca" };
  if (pontos <= 2) return { pontos, rotulo: "Razoável" };
  if (pontos <= 3) return { pontos, rotulo: "Boa" };
  return { pontos, rotulo: "Forte" };
}

/** Deixa o nickname no formato aceito: minúsculas, sem acento, só [a-z0-9_.]. */
export function normalizarNickname(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_.]/g, "")
    .slice(0, 30);
}

export interface CamposPerfil {
  nome: string;
  nickname: string | null;
  idade: number | null;
  peso: number | null;
  altura: number | null;
  sexo: string | null;
  nivel_atividade: string | null;
  nivel_estresse: string | null;
  qualidade_sono: string | null;
  humor_geral: string | null;
  rotina: string | null;
  objetivo: string | null;
  tempo_livre: string | null;
}

type EntradaPerfil = Omit<CamposPerfil, "idade" | "peso" | "altura"> & { idade: string; peso: string; altura: string };

/** Converte "1,72" ou "1.72" em número; vazio vira null; inválido vira NaN. */
function numero(valor: string): number | null {
  const limpo = valor.trim().replace(",", ".");
  if (!limpo) return null;
  return /^\d+(\.\d+)?$/.test(limpo) ? Number(limpo) : NaN;
}

const vazioParaNull = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);

export function validarPerfil(f: EntradaPerfil): { dados: CamposPerfil; erros: Record<string, string> } {
  const erros: Record<string, string> = {};
  const nickname = vazioParaNull(f.nickname);
  const idade = numero(f.idade);
  const peso = numero(f.peso);
  let altura = numero(f.altura);

  if (f.nome.trim().length < 2) erros.nome = "Informe seu nome.";
  if (nickname && !/^[a-z0-9_.]{3,30}$/.test(nickname)) erros.nickname = "Use de 3 a 30 caracteres: letras minúsculas, números, ponto ou _.";
  if (idade !== null && (Number.isNaN(idade) || !Number.isInteger(idade) || idade < 10 || idade > 120)) erros.idade = "Idade entre 10 e 120.";
  if (peso !== null && (Number.isNaN(peso) || peso <= 20 || peso >= 400)) erros.peso = "Peso em kg, entre 20 e 400.";
  // Quem digita a altura em centímetros (172) recebe a conversão automática.
  if (altura !== null && !Number.isNaN(altura) && altura >= 50 && altura <= 260) altura = altura / 100;
  if (altura !== null && (Number.isNaN(altura) || altura < 0.5 || altura > 2.6)) erros.altura = "Altura em metros, como 1,72.";

  return {
    erros,
    dados: {
      nome: f.nome.trim().slice(0, 80),
      nickname,
      idade,
      peso: peso === null ? null : Math.round(peso * 10) / 10,
      altura: altura === null ? null : Math.round(altura * 100) / 100,
      sexo: vazioParaNull(f.sexo),
      nivel_atividade: vazioParaNull(f.nivel_atividade),
      nivel_estresse: vazioParaNull(f.nivel_estresse),
      qualidade_sono: vazioParaNull(f.qualidade_sono),
      humor_geral: vazioParaNull(f.humor_geral),
      rotina: vazioParaNull(f.rotina),
      objetivo: vazioParaNull(f.objetivo)?.slice(0, 300) ?? null,
      tempo_livre: vazioParaNull(f.tempo_livre)?.slice(0, 100) ?? null,
    },
  };
}

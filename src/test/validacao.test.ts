import { describe, expect, it } from "vitest";
import { emailValido, forcaDaSenha, normalizarNickname, validarCadastro, validarLogin, validarPerfil } from "@/lib/validacao";

describe("e-mail e senha", () => {
  it("aceita e-mails válidos e recusa os inválidos", () => {
    expect(emailValido("ana@exemplo.com")).toBe(true);
    expect(emailValido("  ana@exemplo.com.br ")).toBe(true);
    expect(emailValido("ana@exemplo")).toBe(false);
    expect(emailValido("ana exemplo.com")).toBe(false);
    expect(emailValido("")).toBe(false);
  });

  it("valida o cadastro na ordem nome, e-mail, senha", () => {
    expect(validarCadastro({ nome: "A", email: "a@b.co", senha: "12345678" })).toMatch(/nome/i);
    expect(validarCadastro({ nome: "Ana", email: "x", senha: "12345678" })).toMatch(/e-mail/i);
    expect(validarCadastro({ nome: "Ana", email: "a@b.co", senha: "1234567" })).toMatch(/8 caracteres/);
    expect(validarCadastro({ nome: "Ana", email: "a@b.co", senha: "12345678" })).toBeNull();
  });

  it("exige senha no login", () => {
    expect(validarLogin({ email: "a@b.co", senha: "" })).toMatch(/senha/i);
    expect(validarLogin({ email: "a@b.co", senha: "x" })).toBeNull();
  });

  it("classifica a força da senha", () => {
    expect(forcaDaSenha("").rotulo).toBe("");
    expect(forcaDaSenha("abc").rotulo).toBe("Fraca");
    expect(forcaDaSenha("abcdefgh1").rotulo).toBe("Razoável");
    expect(forcaDaSenha("Abcdefgh1!xyz").rotulo).toBe("Forte");
  });
});

describe("nickname", () => {
  it("normaliza para minúsculas sem acento e sem caracteres inválidos", () => {
    expect(normalizarNickname("@João Silva")).toBe("joao_silva");
    expect(normalizarNickname("Ana.Maria-99!")).toBe("ana.maria99");
    expect(normalizarNickname("x".repeat(40))).toHaveLength(30);
  });
});

describe("validarPerfil", () => {
  const base = {
    nome: "Ana", nickname: "", idade: "", peso: "", altura: "", sexo: "", nivel_atividade: "",
    nivel_estresse: "", qualidade_sono: "", humor_geral: "", rotina: "", objetivo: "", tempo_livre: "",
  };

  it("aceita vírgula decimal e converte vazios em null", () => {
    const { dados, erros } = validarPerfil({ ...base, peso: "70,55", altura: "1,72" });
    expect(erros).toEqual({});
    expect(dados.peso).toBe(70.6);
    expect(dados.altura).toBe(1.72);
    expect(dados.sexo).toBeNull();
    expect(dados.nickname).toBeNull();
  });

  it("converte altura digitada em centímetros", () => {
    expect(validarPerfil({ ...base, altura: "172" }).dados.altura).toBe(1.72);
  });

  it("aponta valores fora da faixa", () => {
    const { erros } = validarPerfil({ ...base, nome: "", idade: "5", peso: "abc", altura: "3", nickname: "a" });
    expect(Object.keys(erros).sort()).toEqual(["altura", "idade", "nickname", "nome", "peso"]);
  });
});

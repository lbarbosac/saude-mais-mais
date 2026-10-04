import { describe, it, expect } from "vitest";

// Regras de validação extraídas de Login.tsx para teste isolado
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function validateSignup(form: { name: string; email: string; password: string }): string | null {
  if (!form.name.trim() || form.name.trim().length < 2) return "Informe seu nome (mínimo 2 caracteres).";
  if (!isValidEmail(form.email)) return "E-mail inválido.";
  if (form.password.length < 8) return "A senha deve ter pelo menos 8 caracteres.";
  return null;
}

function getPasswordStrength(p: string): { score: number; label: string } {
  if (!p) return { score: 0, label: "" };
  let score = 0;
  if (p.length >= 8) score++;
  if (p.length >= 12) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  if (score <= 1) return { score, label: "Fraca" };
  if (score <= 2) return { score, label: "Razoável" };
  if (score <= 3) return { score, label: "Boa" };
  return { score, label: "Forte" };
}

describe("validação de e-mail", () => {
  it("aceita e-mails válidos", () => {
    expect(isValidEmail("user@gmail.com")).toBe(true);
    expect(isValidEmail("user.name+tag@example.co.uk")).toBe(true);
  });

  it("rejeita e-mails inválidos", () => {
    expect(isValidEmail("nao-tem-arroba")).toBe(false);
    expect(isValidEmail("@semlocal.com")).toBe(false);
    expect(isValidEmail("sem ponto.com")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });
});

describe("validação de cadastro", () => {
  const validForm = { name: "Lucas Silva", email: "lucas@gmail.com", password: "Senha123!" };

  it("aceita form válido", () => {
    expect(validateSignup(validForm)).toBeNull();
  });

  it("rejeita nome muito curto", () => {
    expect(validateSignup({ ...validForm, name: "A" })).not.toBeNull();
  });

  it("rejeita nome vazio", () => {
    expect(validateSignup({ ...validForm, name: "" })).not.toBeNull();
  });

  it("rejeita e-mail inválido", () => {
    expect(validateSignup({ ...validForm, email: "invalido" })).not.toBeNull();
  });

  it("rejeita senha curta (< 8 chars)", () => {
    expect(validateSignup({ ...validForm, password: "1234567" })).not.toBeNull();
  });
});

describe("força da senha", () => {
  it("senha fraca", () => {
    expect(getPasswordStrength("abc").label).toBe("Fraca");
  });

  it("senha forte com maiúscula + número + especial", () => {
    expect(getPasswordStrength("MyPass1!SecureXY").label).toBe("Forte");
  });

  it("senha vazia retorna score 0", () => {
    expect(getPasswordStrength("").score).toBe(0);
  });
});

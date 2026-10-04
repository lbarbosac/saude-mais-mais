// @vitest-environment node
//
// Testes do banco: aplica todas as migrations num Postgres em memória (PGlite)
// e confere RLS e regras de negócio agindo como usuários diferentes.
// Não precisa de Docker nem de um projeto Supabase.

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

const RAIZ = path.resolve(import.meta.dirname, "..");
const A = "00000000-0000-0000-0000-00000000000a";
const B = "00000000-0000-0000-0000-00000000000b";
const C = "00000000-0000-0000-0000-00000000000c";

let db: PGlite;
let hoje: string;

interface Resultado<T> {
  rows: T[];
  affected?: number;
  error?: string;
}

/** Executa como um usuário logado (ou anônimo, com null). */
async function como<T = Record<string, unknown>>(uid: string | null, sql: string, params: unknown[] = []): Promise<Resultado<T>> {
  await db.exec(`reset role; set request.jwt.claim.sub = '${uid ?? ""}'; set role ${uid ? "authenticated" : "anon"};`);
  try {
    const r = await db.query<T>(sql, params);
    return { rows: r.rows, affected: r.affectedRows };
  } catch (e) {
    return { rows: [], error: (e as Error).message };
  } finally {
    await db.exec("reset role;");
  }
}

async function admin<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
  return (await db.query<T>(sql, params)).rows;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(readFileSync(path.join(RAIZ, "tests/supabase-stub.sql"), "utf8"));
  const pasta = path.join(RAIZ, "migrations");
  for (const arquivo of readdirSync(pasta).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(path.join(pasta, arquivo), "utf8"));
  }
  await db.exec(`
    insert into auth.users (id, email, raw_user_meta_data) values
      ('${A}', 'a@x.com', '{"nome":"Ana","versao_termos":"2.0"}'),
      ('${B}', 'b@x.com', '{"full_name":"Bruno"}'),
      ('${C}', 'c@x.com', '{}');
  `);
  hoje = (await admin<{ d: string }>("select private.hoje()::text d"))[0].d;
}, 60_000);

describe("cadastro", () => {
  it("cria perfil com o nome e registra o aceite dos termos", async () => {
    const perfis = await admin<{ nome: string }>("select nome from perfil_usuario order by user_id");
    expect(perfis.map((p) => p.nome)).toEqual(["Ana", "Bruno", ""]);
    expect((await admin("select * from consentimento_usuario")).length).toBe(1);
  });
});

describe("perfil e privacidade", () => {
  it("valida o nickname e só deixa editar o próprio perfil", async () => {
    expect((await como(A, "update perfil_usuario set nickname = 'ana_1' where user_id = $1", [A])).error).toBeUndefined();
    expect((await como(A, "update perfil_usuario set nickname = 'Ana Maiúscula' where user_id = $1", [A])).error).toBeDefined();
    const r = await como(A, "update perfil_usuario set nome = 'x' where user_id = $1", [B]);
    expect(r.affected).toBe(0);
  });

  it("não deixa ler a linha de perfil de outra pessoa", async () => {
    await como(B, "update perfil_usuario set nickname = 'bruno', nivel_estresse = 'alto', peso = 80, show_saude_mental = true where user_id = $1", [B]);
    expect((await como(A, "select * from perfil_usuario where user_id = $1", [B])).rows).toHaveLength(0);
  });

  it("busca por nickname devolve só dados públicos e escapa curingas", async () => {
    const r = await como<{ nickname: string }>(A, "select * from buscar_perfis('bru')");
    expect(r.rows).toHaveLength(1);
    expect(Object.keys(r.rows[0]).sort()).toEqual(["avatar_url", "nickname", "nome", "user_id"]);
    expect((await como(A, "select * from buscar_perfis('_')")).rows).toHaveLength(0);
  });

  it("quem não é amigo não vê dados de saúde", async () => {
    const r = await como<{ p: Record<string, unknown> }>(A, "select perfil_publico($1) p", [B]);
    expect(r.rows[0].p.saude_mental).toBeUndefined();
    expect(r.rows[0].p.dados_fisicos).toBeUndefined();
  });

  it("anônimo não lê perfis nem chama funções", async () => {
    expect((await como(null, "select * from perfil_usuario")).rows).toHaveLength(0);
    expect((await como(null, "select * from buscar_perfis('bru')")).error).toBeDefined();
  });
});

describe("amizades", () => {
  it("não cria amizade já aceita nem pedido em nome de outro", async () => {
    expect((await como(A, "insert into amizades (user_id, amigo_id, status) values ($1, $2, 'aceito')", [A, C])).error).toBeDefined();
    expect((await como(A, "insert into amizades (user_id, amigo_id) values ($1, $2)", [B, C])).error).toBeDefined();
  });

  it("pedido pendente, sem duplicar o par ao contrário", async () => {
    expect((await como(A, "insert into amizades (user_id, amigo_id) values ($1, $2)", [A, B])).error).toBeUndefined();
    expect((await como(B, "insert into amizades (user_id, amigo_id) values ($1, $2)", [B, A])).error).toBeDefined();
  });

  it("só quem recebeu responde, e sem trocar os participantes", async () => {
    expect((await como(B, "update amizades set user_id = $1, status = 'aceito' where amigo_id = $2", [C, B])).error).toBeDefined();
    expect((await como(A, "update amizades set status = 'aceito' where user_id = $1", [A])).affected).toBe(0);
    const pedidos = await como<{ nome: string }>(B, "select * from listar_pedidos_amizade()");
    expect(pedidos.rows.map((p) => p.nome)).toEqual(["Ana"]);
    expect((await como(B, "update amizades set status = 'aceito' where amigo_id = $1", [B])).error).toBeUndefined();
    expect((await como(B, "update amizades set status = 'pendente' where amigo_id = $1", [B])).error).toBeDefined();
  });

  it("amigo vê só o que a pessoa liberou", async () => {
    const r = await como<{ p: { saude_mental?: { nivel_estresse: string }; dados_fisicos?: unknown } }>(A, "select perfil_publico($1) p", [B]);
    expect(r.rows[0].p.saude_mental?.nivel_estresse).toBe("alto");
    expect(r.rows[0].p.dados_fisicos).toBeUndefined();
    expect((await como<{ nome: string }>(A, "select * from listar_amigos()")).rows.map((x) => x.nome)).toEqual(["Bruno"]);
  });

  it("presença online só para o próprio usuário e amigos", async () => {
    expect((await como(C, "select * from presenca_online")).rows).toHaveLength(1);
    expect((await como(A, "select * from presenca_online")).rows).toHaveLength(2);
  });
});

describe("desafios", () => {
  let desafio: string;

  it("só entre amigos e no estado inicial", async () => {
    expect((await como(A, "insert into desafios (criador_id, desafiado_id, titulo) values ($1, $2, 'x1')", [A, C])).error).toBeDefined();
    expect((await como(A, "insert into desafios (criador_id, desafiado_id, titulo, progresso_criador) values ($1, $2, 'Correr', 5)", [A, B])).error).toBeDefined();
    const r = await como<{ id: string }>(A, "insert into desafios (criador_id, desafiado_id, titulo, meta) values ($1, $2, 'Correr', 3) returning id", [A, B]);
    desafio = r.rows[0].id;
  });

  it("não aceita update direto na tabela", async () => {
    const r = await como(A, "update desafios set progresso_desafiado = 3 where id = $1", [desafio]);
    expect(r.error !== undefined || r.affected === 0).toBe(true);
    expect((await admin<{ p: number }>("select progresso_desafiado p from desafios where id = $1", [desafio]))[0].p).toBe(0);
  });

  it("progresso soma só para quem chama e sinaliza registros rápidos", async () => {
    for (let i = 0; i < 3; i++) await como(A, "select registrar_progresso_desafio($1)", [desafio]);
    const [d] = await admin<{ progresso_criador: number; progresso_desafiado: number; flag_suspeito: boolean }>(
      "select progresso_criador, progresso_desafiado, flag_suspeito from desafios where id = $1",
      [desafio],
    );
    expect(d).toEqual({ progresso_criador: 3, progresso_desafiado: 0, flag_suspeito: true });
    expect((await como(A, "select registrar_progresso_desafio($1)", [desafio])).error).toBeDefined();
    expect((await como(C, "select registrar_progresso_desafio($1)", [desafio])).error).toBeDefined();
  });

  it("confirmação exige meta e prova precisa estar na pasta do usuário", async () => {
    expect((await como(B, "select confirmar_desafio($1)", [desafio])).error).toBeDefined();
    expect((await como<{ s: string }>(A, "select confirmar_desafio($1) s", [desafio])).rows[0].s).toBe("aguardando");
    expect((await como(A, "select anexar_prova_desafio($1, $2)", [desafio, `${desafio}/${B}-1.png`])).error).toBeDefined();
    expect((await como(A, "select anexar_prova_desafio($1, $2)", [desafio, `${desafio}/${A}-1.png`])).error).toBeUndefined();
  });

  it("listar_desafios traz os nomes dos dois lados", async () => {
    const r = await como<{ criador_nome: string; desafiado_nome: string }>(B, "select * from listar_desafios()");
    expect(r.rows[0]).toMatchObject({ criador_nome: "Ana", desafiado_nome: "Bruno" });
  });

  it("fotos-prova só por participantes", async () => {
    expect((await como(B, "insert into storage.objects (bucket_id, name) values ('provas-desafios', $1)", [`${desafio}/${B}-9.png`])).error).toBeUndefined();
    expect((await como(C, "insert into storage.objects (bucket_id, name) values ('provas-desafios', $1)", [`${desafio}/${C}-9.png`])).error).toBeDefined();
  });
});

describe("hábitos", () => {
  let idsA: string[];

  beforeAll(async () => {
    await db.exec(`
      insert into habitos (user_id, nome_habito, categoria, gerado_por_ia)
      select '${A}', 'Hábito ' || g,
             (array['movimento','agua_alimentacao','sono_descanso','respiracao','social_gratidao','foco_aprendizado','humor_emocao','geral'])[g],
             true
      from generate_series(1, 8) g;
      insert into habitos (user_id, nome_habito) values ('${B}', 'Hábito do B');
    `);
    idsA = (await admin<{ id: string }>("select id from habitos where user_id = $1 order by nome_habito", [A])).map((h) => h.id);
  });

  it("não registra hábito de outra pessoa", async () => {
    const [{ id }] = await admin<{ id: string }>("select id from habitos where user_id = $1", [B]);
    expect((await como(A, "insert into habito_registro (habito_id, user_id, data) values ($1, $2, $3)", [id, A, hoje])).error).toBeDefined();
  });

  it("a lista do dia é gravada uma vez e não muda", async () => {
    const primeira = await como<{ habito_id: string }>(A, "select * from definir_habitos_do_dia($1::date, $2::uuid[])", [hoje, idsA.slice(0, 6)]);
    expect(primeira.rows).toHaveLength(6);
    const segunda = await como<{ habito_id: string }>(A, "select * from definir_habitos_do_dia($1::date, $2::uuid[])", [hoje, idsA.slice(2, 8)]);
    expect(segunda.rows.map((r) => r.habito_id).sort()).toEqual(idsA.slice(0, 6).sort());
    expect((await como(A, "select * from definir_habitos_do_dia('2000-01-01'::date, $1::uuid[])", [idsA])).error).toBeDefined();
  });

  it("marcar como feito é um upsert", async () => {
    const r = await como(
      A,
      "insert into habito_registro (habito_id, user_id, data, concluido) values ($1, $2, $3, true) on conflict (habito_id, data) do update set concluido = excluded.concluido",
      [idsA[0], A, hoje],
    );
    expect(r.error).toBeUndefined();
  });

  it("renovar troca a lista sem apagar o histórico", async () => {
    const novos = Array.from({ length: 36 }, (_, i) => ({ nome_habito: `Novo ${i}`, descricao: "d", icone: "check", categoria: "movimento" }));
    const r = await como<{ n: number }>(A, "select substituir_habitos_ia($1::jsonb, $2::date) n", [JSON.stringify(novos), hoje]);
    expect(r.rows[0].n).toBe(36);
    expect((await admin<{ n: number }>("select count(*)::int n from habito_registro where user_id = $1 and data = $2", [A, hoje]))[0].n).toBe(1);
    expect((await admin<{ n: number }>("select count(*)::int n from habitos where user_id = $1 and not ativo", [A]))[0].n).toBe(8);
    expect((await como(A, `select substituir_habitos_ia('[{"nome_habito":"x","categoria":"invalida"}]'::jsonb, $1::date)`, [hoje])).error).toBeDefined();

    const ativos = (await admin<{ id: string }>("select id from habitos where user_id = $1 and ativo order by nome_habito limit 6", [A])).map((h) => h.id);
    expect((await como(A, "select * from definir_habitos_do_dia($1::date, $2::uuid[])", [hoje, ativos])).rows).toHaveLength(6);
  });

  it("calcula a sequência e o resumo diário", async () => {
    await db.exec(`
      insert into habito_registro (habito_id, user_id, data, concluido)
      select h.id, h.user_id, private.hoje() - d, true
      from (select id, user_id from habitos where user_id = '${A}' and not ativo order by nome_habito limit 2) h,
           generate_series(1, 3) d;
    `);
    expect((await como<{ s: number }>(A, "select minha_sequencia($1::date) s", [hoje])).rows[0].s).toBe(3);
    const resumo = await como<{ total: number; concluidos: number }>(A, "select * from resumo_habitos(($1::date - 6), $1::date)", [hoje]);
    expect(resumo.rows).toHaveLength(7);
    expect(resumo.rows[5]).toMatchObject({ total: 2, concluidos: 2 });
    // Hoje: o hábito antigo já concluído + os 6 da lista nova.
    expect(resumo.rows[6]).toMatchObject({ total: 7, concluidos: 1 });
  });
});

describe("check-in, chat e restauração", () => {
  it("check-in aceita só humor e valida valores", async () => {
    expect((await como(A, "insert into checkin_diario (user_id, data, humor) values ($1, $2, 'bom')", [A, hoje])).error).toBeUndefined();
    expect((await como(A, "insert into checkin_diario (user_id, data, humor) values ($1, '2026-01-01', 'feliz')", [A])).error).toBeDefined();
  });

  it("não escreve na conversa de outra pessoa", async () => {
    const conversa = await como<{ id: string }>(B, "insert into conversas_lucas (user_id) values ($1) returning id", [B]);
    const r = await como(A, "insert into mensagens_lucas (conversa_id, user_id, role, conteudo) values ($1, $2, 'user', 'oi')", [conversa.rows[0].id, A]);
    expect(r.error).toBeDefined();
  });

  it("restauração só para os dois últimos dias", async () => {
    expect((await como(A, "insert into streak_restauracoes (user_id, data_restaurada) values ($1, private.hoje() - 10)", [A])).error).toBeDefined();
    expect((await como(A, "insert into streak_restauracoes (user_id, data_restaurada) values ($1, private.hoje() - 1)", [A])).error).toBeUndefined();
  });
});

describe("storage", () => {
  it("avatar só na própria pasta e sons sem envio", async () => {
    expect((await como(A, "insert into storage.objects (bucket_id, name) values ('avatars', $1)", [`${B}/avatar.png`])).error).toBeDefined();
    expect((await como(A, "insert into storage.objects (bucket_id, name) values ('avatars', $1)", [`${A}/avatar.png`])).error).toBeUndefined();
    expect((await como(A, "insert into storage.objects (bucket_id, name) values ('sounds', 'x.mp3')")).error).toBeDefined();
  });
});

describe("ia: cota e plano de treino", () => {
  it("cota só pelo backend e bloqueia acima do limite", async () => {
    expect((await como(A, "select consumir_cota_ia($1, 'chat', 100, 10)", [A])).error).toBeDefined();
    const usos: boolean[] = [];
    for (let i = 0; i < 4; i++) usos.push((await admin<{ ok: boolean }>("select consumir_cota_ia($1, 'chat', 3, 600) ok", [A]))[0].ok);
    expect(usos).toEqual([true, true, true, false]);
  });

  it("novo plano substitui o antigo e preserva o histórico de cargas", async () => {
    const plano = [
      { nome: "Treino A", divisao: "Peito", dia_semana: 1, exercicios: [{ nome: "Supino", series: 4, repeticoes: "8-10", descanso_seg: 120 }] },
      { nome: "Treino B", divisao: "Costas", dia_semana: 3, exercicios: [{ nome: "Remada", series: 3, repeticoes: "10", descanso_seg: 90 }] },
    ];
    expect((await como<{ n: number }>(A, "select substituir_treinos_ia($1::jsonb) n", [JSON.stringify(plano)])).rows[0].n).toBe(2);
    await como(A, "insert into treino_registro (user_id, exercicio_id, exercicio_nome, peso_kg, repeticoes, series) select $1, id, nome, 40, 10, 3 from treino_exercicios where user_id = $1 limit 1", [A]);
    expect((await como<{ n: number }>(A, "select substituir_treinos_ia($1::jsonb) n", [JSON.stringify([plano[0]])])).rows[0].n).toBe(1);
    expect((await admin<{ n: number }>("select count(*)::int n from treino_registro where user_id = $1", [A]))[0].n).toBe(1);
    const invalido = await como(A, `select substituir_treinos_ia('[{"nome":"X","dia_semana":9,"exercicios":[{"nome":"a","series":3,"repeticoes":"10","descanso_seg":60}]}]'::jsonb)`);
    expect(invalido.error).toBeDefined();
    expect((await admin<{ n: number }>("select count(*)::int n from treinos where user_id = $1", [A]))[0].n).toBe(1);
  });
});

describe("exclusão de conta", () => {
  it("apagar o usuário apaga todos os dados dele", async () => {
    await db.exec(`delete from auth.users where id = '${A}'`);
    const tabelas = ["habitos", "habito_registro", "perfil_usuario", "streak_restauracoes", "consentimento_usuario", "desafio_progresso_log", "treinos", "uso_ia", "checkin_diario"];
    for (const t of tabelas) {
      expect((await admin<{ n: number }>(`select count(*)::int n from ${t} where user_id = $1`, [A]))[0].n, t).toBe(0);
    }
    expect((await admin<{ n: number }>("select count(*)::int n from desafios where criador_id = $1", [A]))[0].n).toBe(0);
  });
});

-- ═══════════════════════════════════════════════════════════════════════════
-- Integridade dos dados
--
-- As migrations anteriores nasceram no Lovable e deixaram lacunas: tabelas sem
-- chave estrangeira para auth.users (a exclusão da conta não apagava tudo),
-- colunas sem validação, check-in que exigia humor E energia ao mesmo tempo e
-- datas gravadas em UTC (às 21h de Brasília o "hoje" do banco já era amanhã).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Chaves estrangeiras que faltavam ───────────────────────────────────────
-- Sem elas, excluir um usuário deixava treinos, medidas e logs órfãos.

alter table public.treino_perfil
  add constraint treino_perfil_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade;
alter table public.treinos
  add constraint treinos_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade;
alter table public.treino_exercicios
  add constraint treino_exercicios_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade;
alter table public.treino_registro
  add constraint treino_registro_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade;
alter table public.medidas_corporais
  add constraint medidas_corporais_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade;
alter table public.streak_restauracoes
  add constraint streak_restauracoes_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade;
alter table public.desafio_progresso_log
  add constraint desafio_progresso_log_desafio_id_fkey foreign key (desafio_id) references public.desafios (id) on delete cascade,
  add constraint desafio_progresso_log_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade;
alter table public.audit_log
  add constraint audit_log_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade;
alter table public.consentimento_lgpd
  add constraint consentimento_lgpd_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade;

-- ─── Datas no fuso do Brasil ────────────────────────────────────────────────
-- O app sempre envia a data local; o default só vale quando ela não vem.

alter table public.checkin_diario    alter column data set default (now() at time zone 'America/Sao_Paulo')::date;
alter table public.habito_registro   alter column data set default (now() at time zone 'America/Sao_Paulo')::date;
alter table public.treino_registro   alter column data set default (now() at time zone 'America/Sao_Paulo')::date;
alter table public.medidas_corporais alter column data set default (now() at time zone 'America/Sao_Paulo')::date;

-- ─── Perfil ─────────────────────────────────────────────────────────────────

alter table public.perfil_usuario
  alter column onboarding_completo set not null,
  alter column created_at set not null,
  alter column updated_at set not null,
  -- Privacidade por padrão: dados de saúde só aparecem para outras pessoas se
  -- o próprio usuário ligar a opção.
  alter column show_dados_fisicos set default false,
  alter column show_saude_mental  set default false,
  alter column show_objetivos     set default false,
  add constraint perfil_nome_tamanho      check (char_length(nome) <= 80),
  add constraint perfil_nickname_formato  check (nickname ~ '^[a-z0-9_.]{3,30}$'),
  add constraint perfil_avatar_tamanho    check (char_length(avatar_url) <= 500),
  add constraint perfil_idade_faixa       check (idade between 10 and 120),
  add constraint perfil_peso_faixa        check (peso > 20 and peso < 400),
  add constraint perfil_altura_faixa      check (altura >= 0.5 and altura <= 2.6),
  add constraint perfil_objetivo_tamanho  check (char_length(objetivo) <= 300),
  add constraint perfil_tempo_livre_tam   check (char_length(tempo_livre) <= 100),
  add constraint perfil_sobre_voce_tam    check (char_length(sobre_voce) <= 2000);

-- O índice de nickname já é coberto pela constraint UNIQUE.
drop index if exists public.idx_perfil_nickname;

-- ─── Preferências ───────────────────────────────────────────────────────────

update public.preferencias_usuario set sons_favoritos = '{}' where sons_favoritos is null;

alter table public.preferencias_usuario
  alter column sons_favoritos set not null,
  alter column notificacoes_ativas set not null,
  alter column lucas_estilo set not null,
  alter column lucas_profundidade set not null,
  alter column lucas_tom set not null,
  alter column lucas_sugestoes set not null,
  add constraint pref_lucas_estilo       check (lucas_estilo in ('direto', 'equilibrado', 'detalhado')),
  add constraint pref_lucas_profundidade check (lucas_profundidade in ('superficial', 'moderado', 'profundo')),
  add constraint pref_lucas_tom          check (lucas_tom in ('acolhedor', 'neutro', 'racional')),
  add constraint pref_lucas_sugestoes    check (lucas_sugestoes in ('poucas', 'moderado', 'muitas')),
  add constraint pref_sons_favoritos_qtd check (cardinality(sons_favoritos) <= 50),
  add constraint pref_exercicios_fav_qtd check (cardinality(favoritos_exercicios) <= 200);

-- ─── Check-in diário ────────────────────────────────────────────────────────
-- Humor e energia são registrados em toques separados; exigir os dois na
-- mesma linha fazia o primeiro toque do dia falhar em silêncio.

alter table public.checkin_diario
  alter column humor drop not null,
  alter column energia drop not null,
  add column updated_at timestamptz not null default now(),
  add constraint checkin_humor_valido   check (humor in ('bom', 'normal', 'baixo')),
  add constraint checkin_energia_valida check (energia in ('baixa', 'media', 'alta')),
  add constraint checkin_obs_tamanho    check (char_length(observacao) <= 500);

-- idx_checkin_user_data duplica o índice da constraint UNIQUE (user_id, data).
drop index if exists public.idx_checkin_user_data;

-- ─── Hábitos ────────────────────────────────────────────────────────────────

alter table public.habitos
  alter column icone set not null,
  alter column ativo set not null,
  alter column gerado_por_ia set not null,
  alter column created_at set not null,
  add constraint habitos_nome_tamanho check (char_length(nome_habito) between 2 and 100),
  add constraint habitos_desc_tamanho check (char_length(descricao) <= 300),
  add constraint habitos_icone_tamanho check (char_length(icone) <= 30),
  add constraint habitos_categoria_valida check (categoria in (
    'movimento', 'agua_alimentacao', 'sono_descanso', 'respiracao',
    'social_gratidao', 'foco_aprendizado', 'humor_emocao', 'geral'
  ));

-- A seleção do dia passa a ser persistida em habito_registro (uma linha por
-- hábito exibido). Os índices antigos de seleção não servem mais.
drop index if exists public.idx_habitos_user_categoria;
drop index if exists public.idx_habitos_user;
create index if not exists habitos_user_ativo_idx on public.habitos (user_id, ativo);

comment on column public.habitos.ultima_exibicao is
  'Obsoleta: a última exibição agora é derivada de habito_registro. Mantida apenas por compatibilidade.';

-- Uma linha em habito_registro significa "este hábito estava na lista do dia";
-- concluido indica se foi feito.
alter table public.habito_registro
  alter column concluido set not null,
  add column updated_at timestamptz not null default now();

comment on table public.habito_registro is
  'Uma linha por hábito exibido ao usuário em um dia (a seleção do dia). concluido = feito.';

-- ─── Amigo Lucas ────────────────────────────────────────────────────────────

alter table public.conversas_lucas
  add constraint conversas_titulo_tamanho check (char_length(titulo) <= 100);

alter table public.mensagens_lucas
  add constraint mensagens_conteudo_tamanho check (char_length(conteudo) between 1 and 8000);

drop index if exists public.idx_conversas_user;
drop index if exists public.idx_mensagens_conversa;
create index if not exists conversas_lucas_user_recentes_idx on public.conversas_lucas (user_id, updated_at desc);
create index if not exists mensagens_lucas_conversa_idx on public.mensagens_lucas (conversa_id, created_at);

-- Nova mensagem "sobe" a conversa na lista.
create or replace function public.tocar_conversa_lucas()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.conversas_lucas set updated_at = now() where id = new.conversa_id;
  return new;
end;
$$;

create trigger mensagens_lucas_toca_conversa
  after insert on public.mensagens_lucas
  for each row execute function public.tocar_conversa_lucas();

-- ─── Amizades ───────────────────────────────────────────────────────────────

alter table public.amizades
  add column updated_at timestamptz not null default now(),
  add constraint amizades_sem_autoamizade check (user_id <> amigo_id);

-- Um único vínculo por par, independente de quem pediu.
create unique index if not exists amizades_par_unico_idx
  on public.amizades (least(user_id, amigo_id), greatest(user_id, amigo_id));

-- ─── Desafios ───────────────────────────────────────────────────────────────

alter table public.desafios rename column prova_criador_url to prova_criador_path;
alter table public.desafios rename column prova_desafiado_url to prova_desafiado_path;

alter table public.desafios
  alter column meta set not null,
  alter column progresso_criador set not null,
  alter column progresso_desafiado set not null,
  alter column status set not null,
  alter column confirmacao_criador set not null,
  alter column confirmacao_desafiado set not null,
  alter column flag_suspeito set not null,
  add column updated_at timestamptz not null default now(),
  add constraint desafios_titulo_tamanho check (char_length(titulo) between 2 and 80),
  add constraint desafios_desc_tamanho check (char_length(descricao) <= 300),
  add constraint desafios_meta_faixa check (meta between 1 and 365),
  add constraint desafios_progresso_faixa check (
    progresso_criador between 0 and meta and progresso_desafiado between 0 and meta
  ),
  add constraint desafios_participantes_distintos check (criador_id <> desafiado_id);

create index if not exists desafios_criador_idx on public.desafios (criador_id);
create index if not exists desafios_desafiado_idx on public.desafios (desafiado_id);
create index if not exists desafio_progresso_log_recentes_idx
  on public.desafio_progresso_log (desafio_id, user_id, created_at);

-- ─── Presença ───────────────────────────────────────────────────────────────
-- "Online" passa a ser derivado de ultimo_acesso (últimos 5 minutos).

update public.presenca_online set ultimo_acesso = now() where ultimo_acesso is null;
alter table public.presenca_online alter column ultimo_acesso set not null;
comment on column public.presenca_online.online is
  'Obsoleta: o status online é derivado de ultimo_acesso.';

-- ─── Treinos ────────────────────────────────────────────────────────────────

alter table public.treino_perfil
  add column descanso_pref smallint,
  add constraint treino_perfil_dias check (dias_semana between 1 and 7),
  add constraint treino_perfil_tempo check (tempo_treino between 10 and 240),
  add constraint treino_perfil_descanso check (descanso_pref between 15 and 600),
  add constraint treino_perfil_textos check (
    char_length(objetivo) <= 50 and char_length(local_treino) <= 50 and char_length(nivel) <= 30
    and char_length(grupo_foco) <= 50 and char_length(cardio) <= 30 and char_length(limitacoes) <= 500
  );

alter table public.treinos
  add constraint treinos_nome_tamanho check (char_length(nome) between 1 and 100),
  add constraint treinos_divisao_tamanho check (char_length(divisao) <= 50),
  add constraint treinos_dia_semana check (dia_semana between 0 and 6);

alter table public.treino_exercicios
  add constraint treino_exercicios_valores check (
    char_length(nome) between 1 and 100
    and series between 1 and 20
    and char_length(repeticoes) <= 20
    and descanso_seg between 0 and 600
    and char_length(observacao) <= 300
  );

alter table public.treino_registro
  add constraint treino_registro_valores check (
    char_length(exercicio_nome) between 1 and 100
    and peso_kg between 0 and 1000
    and repeticoes between 0 and 1000
    and series between 1 and 100
    and char_length(observacao) <= 300
  );

alter table public.medidas_corporais
  add constraint medidas_valores check (
    coalesce(peso, 1) > 0 and coalesce(peso, 1) < 400
    and coalesce(percent_gordura, 1) between 0 and 100
    and greatest(cintura, peito, quadril, gluteo, perna_dir, perna_esq, pescoco, bracos_dir, bracos_esq) < 300
    and least(cintura, peito, quadril, gluteo, perna_dir, perna_esq, pescoco, bracos_dir, bracos_esq) > 0
  );

create index if not exists treinos_user_idx on public.treinos (user_id, ativo);
create index if not exists treino_exercicios_treino_idx on public.treino_exercicios (treino_id, ordem);
create index if not exists treino_registro_user_data_idx on public.treino_registro (user_id, data);
create index if not exists medidas_corporais_user_data_idx on public.medidas_corporais (user_id, data desc);

-- ─── Push e analytics ───────────────────────────────────────────────────────

alter table public.push_subscriptions
  add constraint push_endpoint_tamanho check (char_length(endpoint) <= 1000);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.analytics_eventos
  add constraint analytics_evento_nome check (char_length(event_name) between 1 and 50),
  add constraint analytics_props_tamanho check (pg_column_size(properties) <= 2048),
  add constraint analytics_versao_tamanho check (char_length(app_version) <= 20);

-- ─── updated_at automático ──────────────────────────────────────────────────

create or replace function public.update_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger checkin_diario_updated_at   before update on public.checkin_diario     for each row execute function public.update_updated_at();
create trigger habito_registro_updated_at  before update on public.habito_registro    for each row execute function public.update_updated_at();
create trigger amizades_updated_at         before update on public.amizades           for each row execute function public.update_updated_at();
create trigger desafios_updated_at         before update on public.desafios           for each row execute function public.update_updated_at();
create trigger treino_perfil_updated_at    before update on public.treino_perfil      for each row execute function public.update_updated_at();
create trigger push_subscriptions_updated_at before update on public.push_subscriptions for each row execute function public.update_updated_at();

-- ─── Cadastro de usuário ────────────────────────────────────────────────────
-- Cria perfil, preferências e presença, e registra o aceite dos termos que o
-- formulário de cadastro envia nos metadados. Antes o aceite era gravado pelo
-- cliente depois do login, o que falhava quando o e-mail exigia confirmação.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nome text := left(coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'nome'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    ''
  ), 80);
begin
  insert into public.perfil_usuario (user_id, nome) values (new.id, v_nome);
  insert into public.preferencias_usuario (user_id) values (new.id);
  insert into public.presenca_online (user_id) values (new.id);

  if new.raw_user_meta_data ? 'versao_termos' then
    insert into public.consentimento_usuario (user_id, versao_termos, user_agent)
    values (
      new.id,
      left(new.raw_user_meta_data ->> 'versao_termos', 20),
      left(new.raw_user_meta_data ->> 'user_agent', 200)
    )
    on conflict (user_id, versao_termos) do nothing;
  end if;

  return new;
end;
$$;

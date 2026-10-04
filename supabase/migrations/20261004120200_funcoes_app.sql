-- ═══════════════════════════════════════════════════════════════════════════
-- Funções do app (RPC)
--
-- Regras que antes ficavam no cliente, e por isso podiam ser burladas ou
-- divergir entre telas, passam a morar no banco:
--   • seleção diária de hábitos persistida (Início e Hábitos leem o mesmo dado);
--   • troca atômica da lista de hábitos gerada pela IA, sem apagar histórico;
--   • progresso e sequência calculados em um só lugar;
--   • social (busca, perfil público, amigos, pedidos, desafios) respeitando as
--     opções de privacidade de cada pessoa;
--   • progresso, confirmação e prova de desafio sem acesso direto à tabela.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Auxiliares (schema privado) ────────────────────────────────────────────

create or replace function private.hoje()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Sao_Paulo')::date;
$$;

-- Aceita a data local enviada pelo app, desde que esteja a um dia do relógio do
-- servidor (cobre qualquer fuso do Brasil e a virada do dia).
create or replace function private.validar_data_local(p_data date)
returns date
language plpgsql
stable
set search_path = ''
as $$
begin
  if p_data is null or p_data not between private.hoje() - 1 and private.hoje() + 1 then
    raise exception 'Data inválida.' using errcode = '22023';
  end if;
  return p_data;
end;
$$;

-- Sequência = dias seguidos com todos os hábitos do dia concluídos (ou dia
-- restaurado). Se hoje ainda não foi fechado, conta a partir de ontem.
create or replace function private.calcular_sequencia(p_user uuid, p_hoje date)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_completos date[];
  v_cursor date := p_hoje;
  v_seq integer := 0;
begin
  select coalesce(array_agg(d), '{}') into v_completos
  from (
    select r.data as d
    from public.habito_registro r
    where r.user_id = p_user and r.data > p_hoje - 400 and r.data <= p_hoje
    group by r.data
    having count(*) > 0 and count(*) filter (where r.concluido) = count(*)
    union
    select s.data_restaurada
    from public.streak_restauracoes s
    where s.user_id = p_user and s.data_restaurada > p_hoje - 400
  ) dias;

  if not (v_cursor = any (v_completos)) then
    v_cursor := v_cursor - 1;
  end if;

  while v_cursor = any (v_completos) loop
    v_seq := v_seq + 1;
    v_cursor := v_cursor - 1;
  end loop;

  return v_seq;
end;
$$;

revoke all on function private.hoje() from public;
revoke all on function private.validar_data_local(date) from public;
revoke all on function private.calcular_sequencia(uuid, date) from public;
grant execute on function private.hoje() to authenticated;
grant execute on function private.validar_data_local(date) to authenticated;
grant execute on function private.calcular_sequencia(uuid, date) to authenticated;

-- ─── Hábitos ────────────────────────────────────────────────────────────────

-- Fixa a lista do dia. O app calcula a sugestão (ver habitSelection.ts), mas
-- só a primeira chamada do dia grava; as seguintes recebem a lista já fixada.
-- O advisory lock serializa chamadas simultâneas (duas abas, dois aparelhos).
create or replace function public.definir_habitos_do_dia(p_data date, p_habitos uuid[])
returns table (habito_id uuid, concluido boolean)
language plpgsql
security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid uuid := (select auth.uid());
  v_data date := private.validar_data_local(p_data);
begin
  if v_uid is null then
    raise exception 'Não autenticado.' using errcode = '42501';
  end if;
  if cardinality(p_habitos) > 12 then
    raise exception 'Lista de hábitos grande demais.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_uid::text || v_data::text, 0));

  if not exists (
    select 1
    from public.habito_registro r
    join public.habitos h on h.id = r.habito_id
    where r.user_id = v_uid and r.data = v_data and h.ativo
  ) then
    insert into public.habito_registro (habito_id, user_id, data)
    select h.id, v_uid, v_data
    from public.habitos h
    where h.id = any (p_habitos[1:6]) and h.user_id = v_uid and h.ativo
    on conflict on constraint habito_registro_habito_id_data_key do nothing;
  end if;

  return query
    select r.habito_id, r.concluido
    from public.habito_registro r
    join public.habitos h on h.id = r.habito_id
    where r.user_id = v_uid and r.data = v_data and h.ativo
    order by r.created_at, r.habito_id;
end;
$$;

-- Troca a lista gerada pela IA em uma única transação. Os hábitos antigos são
-- desativados (não apagados), preservando o histórico de conclusões. Só as
-- pendências de hoje dos hábitos antigos saem, para a nova lista entrar.
create or replace function public.substituir_habitos_ia(p_habitos jsonb, p_hoje date)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_hoje date := private.validar_data_local(p_hoje);
  v_total integer;
begin
  if v_uid is null then
    raise exception 'Não autenticado.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_habitos) <> 'array' or jsonb_array_length(p_habitos) not between 6 and 60 then
    raise exception 'Lista de hábitos inválida.' using errcode = '22023';
  end if;

  update public.habitos
    set ativo = false
    where user_id = v_uid and gerado_por_ia and ativo;

  delete from public.habito_registro r
    using public.habitos h
    where r.habito_id = h.id
      and h.user_id = v_uid
      and not h.ativo
      and r.data = v_hoje
      and not r.concluido;

  insert into public.habitos (user_id, nome_habito, descricao, icone, categoria, gerado_por_ia)
  select v_uid, x.nome_habito, nullif(x.descricao, ''), coalesce(x.icone, 'check'), coalesce(x.categoria, 'geral'), true
  from jsonb_to_recordset(p_habitos) as x (nome_habito text, descricao text, icone text, categoria text);

  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

-- Resumo diário para a tela de Progresso.
create or replace function public.resumo_habitos(p_inicio date, p_fim date)
returns table (data date, total integer, concluidos integer, restaurado boolean)
language sql
stable
security invoker
set search_path = ''
as $$
  with dias as (
    select generate_series(p_inicio, least(p_fim, p_inicio + 400), interval '1 day')::date as data
  )
  select
    d.data,
    count(r.id)::integer as total,
    count(r.id) filter (where r.concluido)::integer as concluidos,
    exists (
      select 1 from public.streak_restauracoes s
      where s.user_id = (select auth.uid()) and s.data_restaurada = d.data
    ) as restaurado
  from dias d
  left join public.habito_registro r
    on r.data = d.data and r.user_id = (select auth.uid())
  group by d.data
  order by d.data;
$$;

create or replace function public.minha_sequencia(p_hoje date)
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select private.calcular_sequencia((select auth.uid()), private.validar_data_local(p_hoje));
$$;

-- ─── Social ────────────────────────────────────────────────────────────────

-- Busca por nickname. Só aparece quem definiu um nickname.
create or replace function public.buscar_perfis(p_termo text)
returns table (user_id uuid, nome text, nickname text, avatar_url text)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid uuid := (select auth.uid());
  v_termo text := lower(trim(coalesce(p_termo, '')));
begin
  if v_uid is null then
    raise exception 'Não autenticado.' using errcode = '42501';
  end if;
  v_termo := ltrim(v_termo, '@');
  if char_length(v_termo) < 2 or char_length(v_termo) > 30 then
    return;
  end if;
  -- Escapa os curingas do LIKE para que "_" e "%" sejam literais.
  v_termo := replace(replace(replace(v_termo, '\', '\\'), '%', '\%'), '_', '\_');

  return query
    select p.user_id, p.nome, p.nickname, p.avatar_url
    from public.perfil_usuario p
    where p.nickname like '%' || v_termo || '%'
      and p.user_id <> v_uid
    order by (p.nickname like v_termo || '%') desc, p.nickname
    limit 10;
end;
$$;

-- Perfil visto por outra pessoa. Regras:
--   • perfil privado: quem não é amigo vê só nome, nickname e foto;
--   • progresso e sequência seguem show_progress / show_streak;
--   • dados físicos, saúde mental e objetivos só para amigos, e só se o dono
--     ligou a opção correspondente;
--   • p_como_amigo permite ao dono pré-visualizar o que os amigos veem.
create or replace function public.perfil_publico(p_user_id uuid, p_como_amigo boolean default false)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  p public.perfil_usuario%rowtype;
  v_proprio boolean;
  v_amigo boolean;
  v_restrito boolean;
  v_status text;
  v_resultado jsonb;
begin
  if v_uid is null then
    raise exception 'Não autenticado.' using errcode = '42501';
  end if;

  select * into p from public.perfil_usuario where user_id = p_user_id;
  if not found then
    return null;
  end if;

  v_proprio := p_user_id = v_uid and not p_como_amigo;
  v_amigo := (p_user_id = v_uid and p_como_amigo) or private.sao_amigos(v_uid, p_user_id);

  -- Quem não tem nickname não é encontrável por desconhecidos.
  if not v_proprio and not v_amigo and p.nickname is null then
    return null;
  end if;

  select case
           when a.status = 'aceito' then 'amigos'
           when a.status = 'pendente' and a.user_id = v_uid then 'pedido_enviado'
           when a.status = 'pendente' then 'pedido_recebido'
         end
    into v_status
  from public.amizades a
  where (a.user_id = v_uid and a.amigo_id = p_user_id) or (a.user_id = p_user_id and a.amigo_id = v_uid)
  limit 1;

  v_restrito := p.profile_private and not v_amigo and not v_proprio;

  v_resultado := jsonb_build_object(
    'user_id', p.user_id,
    'nome', p.nome,
    'nickname', p.nickname,
    'avatar_url', p.avatar_url,
    'eh_proprio', p_user_id = v_uid,
    'eh_amigo', v_amigo and p_user_id <> v_uid,
    'status_amizade', v_status,
    'restrito', v_restrito
  );

  if v_restrito then
    return v_resultado;
  end if;

  if v_proprio or p.show_progress then
    v_resultado := v_resultado || jsonb_build_object(
      'habitos_concluidos_30d',
      (select count(*) from public.habito_registro r
        where r.user_id = p_user_id and r.concluido and r.data > private.hoje() - 30)
    );
  end if;

  if v_proprio or p.show_streak then
    v_resultado := v_resultado || jsonb_build_object(
      'sequencia', private.calcular_sequencia(p_user_id, private.hoje())
    );
  end if;

  if v_proprio or (v_amigo and p.show_dados_fisicos) then
    v_resultado := v_resultado || jsonb_build_object('dados_fisicos', jsonb_build_object(
      'idade', p.idade, 'peso', p.peso, 'altura', p.altura,
      'sexo', p.sexo, 'nivel_atividade', p.nivel_atividade
    ));
  end if;

  if v_proprio or (v_amigo and p.show_saude_mental) then
    v_resultado := v_resultado || jsonb_build_object('saude_mental', jsonb_build_object(
      'nivel_estresse', p.nivel_estresse, 'qualidade_sono', p.qualidade_sono, 'humor_geral', p.humor_geral
    ));
  end if;

  if v_proprio or (v_amigo and p.show_objetivos) then
    v_resultado := v_resultado || jsonb_build_object('objetivos', jsonb_build_object(
      'objetivo', p.objetivo, 'rotina', p.rotina, 'tempo_livre', p.tempo_livre
    ));
  end if;

  return v_resultado;
end;
$$;

create or replace function public.listar_amigos()
returns table (user_id uuid, nome text, nickname text, avatar_url text, online boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select p.user_id, p.nome, p.nickname, p.avatar_url,
         coalesce(po.ultimo_acesso > now() - interval '5 minutes', false) as online
  from public.amizades a
  join public.perfil_usuario p
    on p.user_id = case when a.user_id = (select auth.uid()) then a.amigo_id else a.user_id end
  left join public.presenca_online po on po.user_id = p.user_id
  where a.status = 'aceito' and (select auth.uid()) in (a.user_id, a.amigo_id)
  order by online desc, p.nome;
$$;

create or replace function public.listar_pedidos_amizade()
returns table (id uuid, user_id uuid, nome text, nickname text, avatar_url text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, p.user_id, p.nome, p.nickname, p.avatar_url, a.created_at
  from public.amizades a
  join public.perfil_usuario p on p.user_id = a.user_id
  where a.amigo_id = (select auth.uid()) and a.status = 'pendente'
  order by a.created_at desc;
$$;

-- ─── Desafios ──────────────────────────────────────────────────────────────

create or replace function public.listar_desafios()
returns table (
  id uuid, titulo text, descricao text, meta integer, status text,
  criador_id uuid, desafiado_id uuid, criador_nome text, desafiado_nome text,
  progresso_criador integer, progresso_desafiado integer,
  confirmacao_criador boolean, confirmacao_desafiado boolean,
  prova_criador_path text, prova_desafiado_path text,
  flag_suspeito boolean, motivo_flag text, created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select d.id, d.titulo, d.descricao, d.meta, d.status,
         d.criador_id, d.desafiado_id, pc.nome, pd.nome,
         d.progresso_criador, d.progresso_desafiado,
         d.confirmacao_criador, d.confirmacao_desafiado,
         d.prova_criador_path, d.prova_desafiado_path,
         d.flag_suspeito, d.motivo_flag, d.created_at
  from public.desafios d
  left join public.perfil_usuario pc on pc.user_id = d.criador_id
  left join public.perfil_usuario pd on pd.user_id = d.desafiado_id
  where (select auth.uid()) in (d.criador_id, d.desafiado_id)
  order by d.created_at desc;
$$;

-- Soma 1 ao progresso de quem chama.
create or replace function public.registrar_progresso_desafio(p_desafio uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  d public.desafios%rowtype;
  v_anterior integer;
begin
  select * into d from public.desafios where id = p_desafio for update;
  if not found or v_uid is null or v_uid not in (d.criador_id, d.desafiado_id) then
    raise exception 'Desafio não encontrado.' using errcode = '42501';
  end if;
  if d.status <> 'ativo' then
    raise exception 'Este desafio não está ativo.' using errcode = '22023';
  end if;

  v_anterior := case when v_uid = d.criador_id then d.progresso_criador else d.progresso_desafiado end;
  if v_anterior >= d.meta then
    raise exception 'Você já atingiu a meta deste desafio.' using errcode = '22023';
  end if;

  if v_uid = d.criador_id then
    update public.desafios set progresso_criador = v_anterior + 1 where id = d.id;
  else
    update public.desafios set progresso_desafiado = v_anterior + 1 where id = d.id;
  end if;

  -- O gatilho trg_detect_suspicious (migration de abril) sinaliza o desafio
  -- quando há três ou mais registros no mesmo minuto.
  insert into public.desafio_progresso_log (desafio_id, user_id, progresso_anterior, progresso_novo)
  values (d.id, v_uid, v_anterior, v_anterior + 1);
end;
$$;

-- Confirma a conclusão. Exige ter atingido a meta; com as duas confirmações o
-- desafio é encerrado.
create or replace function public.confirmar_desafio(p_desafio uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  d public.desafios%rowtype;
begin
  select * into d from public.desafios where id = p_desafio for update;
  if not found or v_uid is null or v_uid not in (d.criador_id, d.desafiado_id) then
    raise exception 'Desafio não encontrado.' using errcode = '42501';
  end if;
  if d.status <> 'ativo' then
    raise exception 'Este desafio não está ativo.' using errcode = '22023';
  end if;

  if v_uid = d.criador_id then
    if d.progresso_criador < d.meta then
      raise exception 'Atinja a meta antes de confirmar.' using errcode = '22023';
    end if;
    d.confirmacao_criador := true;
  else
    if d.progresso_desafiado < d.meta then
      raise exception 'Atinja a meta antes de confirmar.' using errcode = '22023';
    end if;
    d.confirmacao_desafiado := true;
  end if;

  update public.desafios
    set confirmacao_criador = d.confirmacao_criador,
        confirmacao_desafiado = d.confirmacao_desafiado,
        status = case when d.confirmacao_criador and d.confirmacao_desafiado then 'concluido' else status end
    where id = d.id;

  return case when d.confirmacao_criador and d.confirmacao_desafiado then 'concluido' else 'aguardando' end;
end;
$$;

-- Registra o caminho da foto-prova enviada ao bucket provas-desafios.
create or replace function public.anexar_prova_desafio(p_desafio uuid, p_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  d public.desafios%rowtype;
begin
  select * into d from public.desafios where id = p_desafio for update;
  if not found or v_uid is null or v_uid not in (d.criador_id, d.desafiado_id) then
    raise exception 'Desafio não encontrado.' using errcode = '42501';
  end if;
  if p_path is null
     or p_path not like d.id::text || '/' || v_uid::text || '-%'
     or char_length(p_path) > 200
     or position('..' in p_path) > 0 then
    raise exception 'Caminho de arquivo inválido.' using errcode = '22023';
  end if;

  if v_uid = d.criador_id then
    update public.desafios set prova_criador_path = p_path where id = d.id;
  else
    update public.desafios set prova_desafiado_path = p_path where id = d.id;
  end if;
end;
$$;

-- ─── Permissões ────────────────────────────────────────────────────────────
-- Nada disso é acessível sem login.

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.definir_habitos_do_dia(date, uuid[])',
    'public.substituir_habitos_ia(jsonb, date)',
    'public.resumo_habitos(date, date)',
    'public.minha_sequencia(date)',
    'public.buscar_perfis(text)',
    'public.perfil_publico(uuid, boolean)',
    'public.listar_amigos()',
    'public.listar_pedidos_amizade()',
    'public.listar_desafios()',
    'public.registrar_progresso_desafio(uuid)',
    'public.confirmar_desafio(uuid)',
    'public.anexar_prova_desafio(uuid, text)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;

-- Funções de gatilho não devem ser chamáveis pela API.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.update_updated_at() from public, anon, authenticated;
revoke all on function public.tocar_conversa_lucas() from public, anon, authenticated;
revoke all on function public.detect_suspicious_progress() from public, anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- Suporte às funções de IA
--
-- • Cota por usuário persistida no banco. O limite em memória das Edge
--   Functions zerava a cada nova instância e não protegia a cota gratuita da
--   Gemini contra um único usuário abusivo.
-- • Troca atômica do plano de treino gerado pela IA (antes: apagava o plano
--   antigo e, se a inserção falhasse no meio, o usuário ficava sem treino).
-- ═══════════════════════════════════════════════════════════════════════════

create table public.uso_ia (
  user_id       uuid not null references auth.users (id) on delete cascade,
  recurso       text not null check (recurso ~ '^[a-z_]{1,30}$'),
  janela_inicio timestamptz not null default now(),
  contagem      integer not null default 0,
  primary key (user_id, recurso)
);

-- Sem políticas: ninguém acessa pela API. Só a função abaixo, chamada pelas
-- Edge Functions com a chave secreta.
alter table public.uso_ia enable row level security;

comment on table public.uso_ia is 'Contador de uso das funções de IA por usuário e recurso (janela deslizante simples).';

-- Registra um uso e diz se ainda está dentro do limite. Exclusiva do backend:
-- se o cliente pudesse chamá-la, poderia reiniciar a própria janela.
create or replace function public.consumir_cota_ia(
  p_user uuid,
  p_recurso text,
  p_limite integer,
  p_janela_segundos integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_contagem integer;
begin
  if p_user is null or p_limite not between 1 and 10000 or p_janela_segundos not between 10 and 604800 then
    raise exception 'Parâmetros de cota inválidos.' using errcode = '22023';
  end if;

  insert into public.uso_ia as u (user_id, recurso, janela_inicio, contagem)
  values (p_user, p_recurso, now(), 1)
  on conflict (user_id, recurso) do update
    set contagem = case
          when u.janela_inicio < now() - make_interval(secs => p_janela_segundos) then 1
          else u.contagem + 1
        end,
        janela_inicio = case
          when u.janela_inicio < now() - make_interval(secs => p_janela_segundos) then now()
          else u.janela_inicio
        end
  returning contagem into v_contagem;

  return v_contagem <= p_limite;
end;
$$;

revoke all on function public.consumir_cota_ia(uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consumir_cota_ia(uuid, text, integer, integer) to service_role;

-- Substitui o plano gerado pela IA em uma transação. Treinos criados à mão
-- não são tocados; o histórico de cargas (treino_registro) sobrevive porque
-- guarda o nome do exercício e usa ON DELETE SET NULL.
create or replace function public.substituir_treinos_ia(p_treinos jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_treino jsonb;
  v_ordem bigint;
  v_id uuid;
  v_total integer := 0;
begin
  if v_uid is null then
    raise exception 'Não autenticado.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_treinos) <> 'array' or jsonb_array_length(p_treinos) not between 1 and 7 then
    raise exception 'Plano de treino inválido.' using errcode = '22023';
  end if;

  delete from public.treinos where user_id = v_uid and gerado_por_ia;

  for v_treino, v_ordem in select value, ordinality from jsonb_array_elements(p_treinos) with ordinality loop
    if jsonb_typeof(v_treino -> 'exercicios') <> 'array'
       or jsonb_array_length(v_treino -> 'exercicios') not between 1 and 12 then
      raise exception 'Treino sem exercícios válidos.' using errcode = '22023';
    end if;

    insert into public.treinos (user_id, nome, divisao, dia_semana, ordem, gerado_por_ia)
    values (
      v_uid,
      v_treino ->> 'nome',
      nullif(v_treino ->> 'divisao', ''),
      (v_treino ->> 'dia_semana')::smallint,
      v_ordem - 1,
      true
    )
    returning id into v_id;

    insert into public.treino_exercicios (treino_id, user_id, nome, series, repeticoes, descanso_seg, observacao, ordem)
    select v_id, v_uid,
           e ->> 'nome',
           (e ->> 'series')::smallint,
           e ->> 'repeticoes',
           (e ->> 'descanso_seg')::smallint,
           nullif(e ->> 'observacao', ''),
           i - 1
    from jsonb_array_elements(v_treino -> 'exercicios') with ordinality as x (e, i);

    v_total := v_total + 1;
  end loop;

  return v_total;
end;
$$;

revoke all on function public.substituir_treinos_ia(jsonb) from public, anon;
grant execute on function public.substituir_treinos_ia(jsonb) to authenticated;

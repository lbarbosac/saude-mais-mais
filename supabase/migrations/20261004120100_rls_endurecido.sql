-- ═══════════════════════════════════════════════════════════════════════════
-- RLS revisado
--
-- Problemas corrigidos:
--   • qualquer usuário logado lia o perfil completo (inclusive dados de saúde)
--     de qualquer outro que tivesse nickname;
--   • dava para criar uma amizade já "aceita" ou, ao responder um pedido,
--     trocar o user_id e forjar amizade com terceiros;
--   • os participantes de um desafio podiam alterar qualquer coluna (progresso
--     do outro, flag de suspeita, confirmações);
--   • inserts em tabelas-filhas não conferiam o dono do registro pai
--     (habito_registro, mensagens_lucas, treino_exercicios, treino_registro);
--   • qualquer usuário podia enviar arquivos para o bucket de sons.
--
-- Todas as políticas das tabelas do app são recriadas do zero, com
-- (select auth.uid()) para o Postgres avaliar o usuário uma vez por consulta.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Schema privado para funções auxiliares ────────────────────────────────
-- Fica fora da API (o PostgREST só expõe "public"), mas pode ser usado pelas
-- políticas.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.sao_amigos(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.amizades
    where status = 'aceito'
      and ((user_id = a and amigo_id = b) or (user_id = b and amigo_id = a))
  );
$$;

create or replace function private.participa_desafio(p_desafio text, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.desafios d
    where d.id::text = p_desafio and (d.criador_id = p_user or d.desafiado_id = p_user)
  );
$$;

revoke all on function private.sao_amigos(uuid, uuid) from public;
revoke all on function private.participa_desafio(text, uuid) from public;
grant execute on function private.sao_amigos(uuid, uuid) to authenticated;
grant execute on function private.participa_desafio(text, uuid) to authenticated;

-- ─── Remove todas as políticas antigas das tabelas do app ──────────────────

do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
  loop
    execute format('drop policy %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end;
$$;

-- Garante RLS ligado em todas as tabelas do schema public.
do $$
declare
  t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end;
$$;

-- ─── Tabelas com dono único (user_id) ──────────────────────────────────────

-- perfil_usuario: só o próprio. Perfis de terceiros são lidos pelas funções
-- buscar_perfis / perfil_publico, que respeitam as opções de privacidade.
create policy perfil_select on public.perfil_usuario for select to authenticated
  using (user_id = (select auth.uid()));
create policy perfil_insert on public.perfil_usuario for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy perfil_update on public.perfil_usuario for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy pref_select on public.preferencias_usuario for select to authenticated
  using (user_id = (select auth.uid()));
create policy pref_insert on public.preferencias_usuario for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy pref_update on public.preferencias_usuario for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy checkin_select on public.checkin_diario for select to authenticated
  using (user_id = (select auth.uid()));
create policy checkin_insert on public.checkin_diario for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy checkin_update on public.checkin_diario for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy checkin_delete on public.checkin_diario for delete to authenticated
  using (user_id = (select auth.uid()));

create policy habitos_select on public.habitos for select to authenticated
  using (user_id = (select auth.uid()));
create policy habitos_insert on public.habitos for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy habitos_update on public.habitos for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy habitos_delete on public.habitos for delete to authenticated
  using (user_id = (select auth.uid()));

create policy hab_reg_select on public.habito_registro for select to authenticated
  using (user_id = (select auth.uid()));
create policy hab_reg_insert on public.habito_registro for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.habitos h where h.id = habito_id and h.user_id = (select auth.uid()))
  );
create policy hab_reg_update on public.habito_registro for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.habitos h where h.id = habito_id and h.user_id = (select auth.uid()))
  );
create policy hab_reg_delete on public.habito_registro for delete to authenticated
  using (user_id = (select auth.uid()));

create policy conv_select on public.conversas_lucas for select to authenticated
  using (user_id = (select auth.uid()));
create policy conv_insert on public.conversas_lucas for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy conv_update on public.conversas_lucas for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy conv_delete on public.conversas_lucas for delete to authenticated
  using (user_id = (select auth.uid()));

-- Mensagens não podem ser editadas: só lidas, criadas (na própria conversa) e
-- apagadas junto com a conversa.
create policy msg_select on public.mensagens_lucas for select to authenticated
  using (user_id = (select auth.uid()));
create policy msg_insert on public.mensagens_lucas for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.conversas_lucas c where c.id = conversa_id and c.user_id = (select auth.uid()))
  );
create policy msg_delete on public.mensagens_lucas for delete to authenticated
  using (user_id = (select auth.uid()));

create policy tp_select on public.treino_perfil for select to authenticated
  using (user_id = (select auth.uid()));
create policy tp_insert on public.treino_perfil for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy tp_update on public.treino_perfil for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy tp_delete on public.treino_perfil for delete to authenticated
  using (user_id = (select auth.uid()));

create policy tr_select on public.treinos for select to authenticated
  using (user_id = (select auth.uid()));
create policy tr_insert on public.treinos for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy tr_update on public.treinos for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy tr_delete on public.treinos for delete to authenticated
  using (user_id = (select auth.uid()));

create policy te_select on public.treino_exercicios for select to authenticated
  using (user_id = (select auth.uid()));
create policy te_insert on public.treino_exercicios for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.treinos t where t.id = treino_id and t.user_id = (select auth.uid()))
  );
create policy te_update on public.treino_exercicios for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.treinos t where t.id = treino_id and t.user_id = (select auth.uid()))
  );
create policy te_delete on public.treino_exercicios for delete to authenticated
  using (user_id = (select auth.uid()));

create policy trg_select on public.treino_registro for select to authenticated
  using (user_id = (select auth.uid()));
create policy trg_insert on public.treino_registro for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (exercicio_id is null or exists (
      select 1 from public.treino_exercicios e where e.id = exercicio_id and e.user_id = (select auth.uid())
    ))
  );
create policy trg_update on public.treino_registro for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (exercicio_id is null or exists (
      select 1 from public.treino_exercicios e where e.id = exercicio_id and e.user_id = (select auth.uid())
    ))
  );
create policy trg_delete on public.treino_registro for delete to authenticated
  using (user_id = (select auth.uid()));

create policy mc_select on public.medidas_corporais for select to authenticated
  using (user_id = (select auth.uid()));
create policy mc_insert on public.medidas_corporais for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy mc_update on public.medidas_corporais for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy mc_delete on public.medidas_corporais for delete to authenticated
  using (user_id = (select auth.uid()));

create policy sr_select on public.streak_restauracoes for select to authenticated
  using (user_id = (select auth.uid()));
create policy sr_insert on public.streak_restauracoes for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy consent_select on public.consentimento_usuario for select to authenticated
  using (user_id = (select auth.uid()));
create policy consent_insert on public.consentimento_usuario for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy push_select on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
create policy push_insert on public.push_subscriptions for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy push_update on public.push_subscriptions for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy push_delete on public.push_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()));

create policy analytics_select on public.analytics_eventos for select to authenticated
  using (user_id = (select auth.uid()));
create policy analytics_insert on public.analytics_eventos for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy analytics_delete on public.analytics_eventos for delete to authenticated
  using (user_id = (select auth.uid()));

-- Tabelas legadas sem uso no app: só leitura do próprio registro.
create policy audit_select on public.audit_log for select to authenticated
  using (user_id = (select auth.uid()));
create policy consent_lgpd_select on public.consentimento_lgpd for select to authenticated
  using (user_id = (select auth.uid()));

-- ─── Presença: o próprio usuário e seus amigos ─────────────────────────────

create policy presenca_select on public.presenca_online for select to authenticated
  using (user_id = (select auth.uid()) or private.sao_amigos((select auth.uid()), user_id));
create policy presenca_insert on public.presenca_online for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy presenca_update on public.presenca_online for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ─── Amizades ──────────────────────────────────────────────────────────────

create policy amiz_select on public.amizades for select to authenticated
  using ((select auth.uid()) in (user_id, amigo_id));

-- Pedido sempre nasce pendente e em nome de quem pede.
create policy amiz_insert on public.amizades for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pendente');

-- Só quem recebeu o pedido responde. O gatilho abaixo limita o que muda.
create policy amiz_update on public.amizades for update to authenticated
  using (amigo_id = (select auth.uid())) with check (amigo_id = (select auth.uid()));

-- Qualquer um dos dois pode desfazer a amizade ou cancelar o pedido.
create policy amiz_delete on public.amizades for delete to authenticated
  using ((select auth.uid()) in (user_id, amigo_id));

create or replace function private.proteger_amizade()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id <> old.user_id or new.amigo_id <> old.amigo_id then
    raise exception 'Os participantes de uma amizade não podem ser alterados.' using errcode = '42501';
  end if;
  if old.status <> 'pendente' or new.status not in ('aceito', 'recusado') then
    raise exception 'Só é possível aceitar ou recusar um pedido pendente.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger amizades_proteger
  before update on public.amizades
  for each row execute function private.proteger_amizade();

-- ─── Desafios ──────────────────────────────────────────────────────────────
-- Leitura pelos participantes; criação só com amigos e no estado inicial.
-- Progresso, confirmação e prova passam pelas funções da migration seguinte
-- (não há política de UPDATE para o cliente).

create policy desafio_select on public.desafios for select to authenticated
  using ((select auth.uid()) in (criador_id, desafiado_id));

create policy desafio_insert on public.desafios for insert to authenticated
  with check (
    criador_id = (select auth.uid())
    and status = 'ativo'
    and progresso_criador = 0 and progresso_desafiado = 0
    and not confirmacao_criador and not confirmacao_desafiado
    and not flag_suspeito and motivo_flag is null
    and prova_criador_path is null and prova_desafiado_path is null
    and private.sao_amigos(criador_id, desafiado_id)
  );

create policy dpl_select on public.desafio_progresso_log for select to authenticated
  using (private.participa_desafio(desafio_id::text, (select auth.uid())));

-- ─── Restauração de sequência: 3 por mês, só para ontem ou anteontem ───────

create or replace function private.limitar_restauracao()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_usadas integer;
begin
  if new.data_restaurada < v_hoje - 2 or new.data_restaurada >= v_hoje then
    raise exception 'Só é possível restaurar um dos dois últimos dias.' using errcode = '22023';
  end if;

  select count(*) into v_usadas
  from public.streak_restauracoes
  where user_id = new.user_id
    and created_at >= date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';

  if v_usadas >= 3 then
    raise exception 'Você já usou as 3 restaurações deste mês.' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger streak_restauracoes_limite
  before insert on public.streak_restauracoes
  for each row execute function private.limitar_restauracao();

-- ─── Storage ───────────────────────────────────────────────────────────────

update storage.buckets
  set public = true, file_size_limit = 2097152,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
  where id = 'avatars';

update storage.buckets
  set public = true, file_size_limit = 10485760, allowed_mime_types = array['audio/mpeg']
  where id = 'sounds';

update storage.buckets
  set public = false, file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
  where id = 'provas-desafios';

drop policy if exists avatar_upload on storage.objects;
drop policy if exists avatar_update on storage.objects;
drop policy if exists avatar_select on storage.objects;
drop policy if exists avatar_delete on storage.objects;
drop policy if exists sounds_public_read on storage.objects;
drop policy if exists sounds_auth_read on storage.objects;
drop policy if exists sounds_auth_write on storage.objects;
drop policy if exists provas_select on storage.objects;
drop policy if exists provas_insert on storage.objects;

-- Avatares: o bucket é público para exibição; escrita só na própria pasta
-- (<user_id>/...). O SELECT é necessário para o upsert do upload.
create policy avatars_select_proprio on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_insert_proprio on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_update_proprio on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_delete_proprio on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Sons: arquivos públicos enviados pelo painel. Usuários só listam.
create policy sons_listagem on storage.objects for select to authenticated
  using (bucket_id = 'sounds');

-- Provas de desafio: <desafio_id>/<user_id>-<timestamp>.<ext>
create policy provas_select_participantes on storage.objects for select to authenticated
  using (
    bucket_id = 'provas-desafios'
    and private.participa_desafio((storage.foldername(name))[1], (select auth.uid()))
  );
create policy provas_insert_participantes on storage.objects for insert to authenticated
  with check (
    bucket_id = 'provas-desafios'
    and private.participa_desafio((storage.foldername(name))[1], (select auth.uid()))
    and storage.filename(name) like (select auth.uid())::text || '-%'
  );

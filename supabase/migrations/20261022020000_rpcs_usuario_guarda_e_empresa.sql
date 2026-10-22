/*
  RPCs SECURITY DEFINER que recebiam p_usuario_id — 22/10/2026.

  Qualquer usuário logado podia chamá-las com o id de OUTRA pessoa, e
  obter_mensagens_nao_lidas não filtrava empresa: mensagens de uma empresa
  chegavam para usuários de outras (8 entregas cruzadas encontradas).

  - Guarda: com usuário logado, p_usuario_id tem de ser o próprio
    (chamadas internas/service role, sem auth.uid(), continuam valendo).
  - obter_mensagens_nao_lidas: só mensagens da empresa do usuário (ou globais,
    empresa_id nulo).
  - registrar_tentativa_entrega / marcar_push_enviada: só para mensagens que
    o usuário pode ver.
  - obter_registros_pendentes e verificar_permissao_limpeza: o app não chama;
    saem do alcance de authenticated.
*/

create or replace function public._garantir_proprio_usuario(p_usuario_id uuid)
returns void
language plpgsql
stable
set search_path = public, pg_temp
as $$
begin
  if (select auth.uid()) is not null and p_usuario_id is distinct from (select auth.uid()) then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
end;
$$;
revoke execute on function public._garantir_proprio_usuario(uuid) from public, anon, authenticated;

create or replace function public._mensagem_visivel_para(p_usuario_id uuid, p_mensagem_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from mensagens_broadcast mb
      join usuarios u on u.id = p_usuario_id
     where mb.id = p_mensagem_id
       and (mb.empresa_id is null or mb.empresa_id = u.empresa_id)
  );
$$;
revoke execute on function public._mensagem_visivel_para(uuid, uuid) from public, anon, authenticated;

create or replace function public.obter_mensagens_nao_lidas(p_usuario_id uuid)
returns table(mensagem_id uuid, titulo text, conteudo text, tipo text, bloqueia_sistema boolean, criada_em timestamp with time zone, tentativas_entrega integer)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._garantir_proprio_usuario(p_usuario_id);

  return query
  select
    mb.id,
    mb.titulo,
    mb.conteudo,
    mb.tipo,
    mb.bloqueia_sistema,
    mb.created_at,
    coalesce(mbl.tentativas_entrega, 0) as tentativas_entrega
  from mensagens_broadcast mb
  join usuarios u on u.id = p_usuario_id
  left join mensagens_broadcast_lidas mbl
    on mbl.mensagem_id = mb.id and mbl.usuario_id = p_usuario_id
  where mb.ativa = true
    and (mb.empresa_id is null or mb.empresa_id = u.empresa_id)
    and (
      mbl.id is null
      or (mbl.lida_em is null and mb.bloqueia_sistema = true)
    )
  order by
    mb.bloqueia_sistema desc,
    mb.created_at desc;
end;
$$;

create or replace function public.registrar_tentativa_entrega(p_usuario_id uuid, p_mensagem_id uuid, p_metodo text default 'verificacao'::text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_registro_id uuid;
begin
  perform public._garantir_proprio_usuario(p_usuario_id);
  if not public._mensagem_visivel_para(p_usuario_id, p_mensagem_id) then
    return;
  end if;

  select id into v_registro_id
    from mensagens_broadcast_lidas
   where usuario_id = p_usuario_id and mensagem_id = p_mensagem_id;

  if v_registro_id is null then
    insert into mensagens_broadcast_lidas (usuario_id, mensagem_id, tentativas_entrega, ultima_tentativa_entrega, metodo_entrega)
    values (p_usuario_id, p_mensagem_id, 1, now(), p_metodo);
  else
    update mensagens_broadcast_lidas
       set tentativas_entrega = tentativas_entrega + 1,
           ultima_tentativa_entrega = now(),
           metodo_entrega = coalesce(metodo_entrega, p_metodo)
     where id = v_registro_id and lida_em is null;
  end if;
end;
$$;

create or replace function public.marcar_push_enviada(p_usuario_id uuid, p_mensagem_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._garantir_proprio_usuario(p_usuario_id);
  if not public._mensagem_visivel_para(p_usuario_id, p_mensagem_id) then
    return;
  end if;

  update mensagens_broadcast_lidas
     set notificacao_push_enviada = true,
         metodo_entrega = 'push'
   where usuario_id = p_usuario_id and mensagem_id = p_mensagem_id;

  if not found then
    insert into mensagens_broadcast_lidas (usuario_id, mensagem_id, notificacao_push_enviada, metodo_entrega)
    values (p_usuario_id, p_mensagem_id, true, 'push');
  end if;
end;
$$;

do $$
declare
  v_def text;
begin
  -- obter_registros_pendentes_por_tempo: mesmo corpo, com a guarda no início
  select pg_get_functiondef('public.obter_registros_pendentes_por_tempo(uuid, numeric)'::regprocedure) into v_def;
  if position('_garantir_proprio_usuario' in v_def) = 0 then
    v_def := replace(v_def, E'BEGIN\n  RETURN QUERY', E'BEGIN\n  PERFORM public._garantir_proprio_usuario(p_usuario_id);\n  RETURN QUERY');
    if position('_garantir_proprio_usuario' in v_def) = 0 then
      raise exception 'corpo de obter_registros_pendentes_por_tempo mudou; ajustar a migração';
    end if;
    execute v_def;
  end if;
end;
$$;

revoke execute on function public.obter_registros_pendentes(uuid) from public, anon, authenticated;
revoke execute on function public.verificar_permissao_limpeza(uuid) from public, anon, authenticated;

/*
  Quem da equipe recebe notificações — 25/10/2026.
  Só 6 de 18 usuários ativos do LOTE20 tinham aparelho cadastrado.
  situacao_notificacoes_equipe(): para admin/gestor, por usuário ativo da
  própria empresa: aparelhos ativos e último envio com sucesso.
*/
create or replace function public.situacao_notificacoes_equipe()
returns table (usuario_id uuid, aparelhos int, ultimo_sucesso timestamptz, ultimo_uso timestamptz)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_empresa uuid;
begin
  select u.empresa_id into v_empresa
    from usuarios u
   where u.id = (select auth.uid()) and u.active
     and u.profile::text in ('admin', 'gestor', 'super_admin');
  if v_empresa is null then
    raise exception 'acesso negado' using errcode = '42501';
  end if;

  return query
  select u.id,
         count(t.id) filter (where t.is_active)::int,
         max(t.last_success_at) filter (where t.is_active),
         max(t.last_used_at) filter (where t.is_active)
    from usuarios u
    left join push_tokens t on t.usuario_id = u.id
   where u.empresa_id = v_empresa and u.active
   group by u.id;
end;
$$;
revoke execute on function public.situacao_notificacoes_equipe() from public, anon;
grant execute on function public.situacao_notificacoes_equipe() to authenticated;

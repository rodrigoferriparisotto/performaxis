/*
  Performance do dashboard do admin (Dados Gerais) — 21/10/2026.
  APLICADA EM PRODUÇÃO via MCP (registro para versionamento).

  1) Reescreve automaticamente as 220 policies RLS do schema public para
     avaliar auth.uid() e is_super_admin() uma vez por consulta
     (initplan) em vez de uma vez por linha. Advisor auth_rls_initplan: 187 -> 0.
  2) Índices compostos (empresa_id, data) nas 10 tabelas filtradas por período.
  3) Índices nas 9 chaves estrangeiras apontadas pelo advisor.
  4) dashboard_agregado / dashboard_dados_gerais (SECURITY INVOKER, respeita
     RLS): o banco devolve os totais por setor; o navegador só desenha.
     Validado contra contagens independentes (LOTE20, 30 dias): idêntico.
*/

do $$
declare
  r record;
  v_qual text;
  v_check text;
  v_sql text;
begin
  for r in
    select tablename, policyname, cmd, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (coalesce(qual,'') || coalesce(with_check,'')) ~ '(auth\.uid\(\)|is_super_admin\(\))'
  loop
    v_qual := r.qual;
    v_check := r.with_check;

    if v_qual is not null then
      v_qual := replace(replace(replace(replace(replace(replace(v_qual,
        '( SELECT auth.uid() AS uid)', '§UID§'),
        '( SELECT is_super_admin() AS is_super_admin)', '§SA§'),
        'auth.uid()', '( SELECT auth.uid() AS uid)'),
        'is_super_admin()', '( SELECT is_super_admin() AS is_super_admin)'),
        '§UID§', '( SELECT auth.uid() AS uid)'),
        '§SA§', '( SELECT is_super_admin() AS is_super_admin)');
    end if;

    if v_check is not null then
      v_check := replace(replace(replace(replace(replace(replace(v_check,
        '( SELECT auth.uid() AS uid)', '§UID§'),
        '( SELECT is_super_admin() AS is_super_admin)', '§SA§'),
        'auth.uid()', '( SELECT auth.uid() AS uid)'),
        'is_super_admin()', '( SELECT is_super_admin() AS is_super_admin)'),
        '§UID§', '( SELECT auth.uid() AS uid)'),
        '§SA§', '( SELECT is_super_admin() AS is_super_admin)');
    end if;

    v_sql := format('alter policy %I on public.%I', r.policyname, r.tablename);
    if v_qual is not null then
      v_sql := v_sql || format(' using (%s)', v_qual);
    end if;
    if v_check is not null then
      v_sql := v_sql || format(' with check (%s)', v_check);
    end if;

    execute v_sql;
  end loop;
end $$;

create index if not exists idx_reg_recepcao_empresa_data on public.registros_recepcao (empresa_id, data);
create index if not exists idx_reg_camararia_empresa_data on public.registros_camararia (empresa_id, data);
create index if not exists idx_reg_revisao_empresa_data on public.registros_revisao (empresa_id, data);
create index if not exists idx_reg_areas_comuns_empresa_data on public.registros_areas_comuns (empresa_id, data);
create index if not exists idx_reg_ativ_extras_empresa_data on public.registros_atividades_extras (empresa_id, data);
create index if not exists idx_reg_ativ_diarias_empresa_data on public.registros_atividades_diarias (empresa_id, data);
create index if not exists idx_reg_gestao_empresa_data on public.registros_gestao (empresa_id, data);
create index if not exists idx_reg_cozinha_empresa_data on public.registros_cozinha (empresa_id, data);
create index if not exists idx_reg_vendas_empresa_data on public.registros_vendas (empresa_id, data);
create index if not exists idx_manutencoes_empresa_data on public.manutencoes (empresa_id, data);

create index if not exists idx_blog_posts_autor_id on public.blog_posts (autor_id);
create index if not exists idx_blog_posts_tags_tag_id on public.blog_posts_tags (tag_id);
create index if not exists idx_fotos_cozinha_tipo on public.fotos_cozinha (tipo_cozinha_id);
create index if not exists idx_notif_freshness_empresa on public.notificacoes_freshness (empresa_id);
create index if not exists idx_reg_ativ_diarias_tipo on public.registros_atividades_diarias (tipo_atividade_id);
create index if not exists idx_reg_cozinha_tipo on public.registros_cozinha (tipo_cozinha_id);
create index if not exists idx_reg_gestao_tipo on public.registros_gestao (tipo_gestao_id);
create index if not exists idx_usuarios_conquistas_conquista on public.usuarios_conquistas (conquista_id);
create index if not exists idx_usuarios_conquistas_empresa on public.usuarios_conquistas (empresa_id);

create or replace function public.dashboard_agregado(p_empresa uuid, p_inicio date, p_fim date)
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with regs as (
    select 'recepcao'::text as setor, status::text as status, atividades, hora_inicio, hora_fim
      from registros_recepcao where empresa_id = p_empresa and data between p_inicio and p_fim
    union all
    select 'camararia', status::text, atividades, hora_inicio, hora_fim
      from registros_camararia where empresa_id = p_empresa and data between p_inicio and p_fim
       and status::text <> 'programado'
    union all
    select 'revisao', status::text, atividades, hora_inicio, hora_fim
      from registros_revisao where empresa_id = p_empresa and data between p_inicio and p_fim
    union all
    select 'areas_comuns', status::text, atividades, hora_inicio, hora_fim
      from registros_areas_comuns where empresa_id = p_empresa and data between p_inicio and p_fim
    union all
    select 'atividades_extras', status::text, atividades, hora_inicio, hora_fim
      from registros_atividades_extras where empresa_id = p_empresa and data between p_inicio and p_fim
    union all
    select 'atividades_diarias', status::text, atividades, hora_inicio, hora_fim
      from registros_atividades_diarias where empresa_id = p_empresa and data between p_inicio and p_fim
    union all
    select 'gestao', status::text, atividades, hora_inicio, hora_fim
      from registros_gestao where empresa_id = p_empresa and data between p_inicio and p_fim
    union all
    select 'cozinha', status::text, atividades, hora_inicio, hora_fim
      from registros_cozinha where empresa_id = p_empresa and data between p_inicio and p_fim
    union all
    select 'vendas', status::text, atividades, hora_inicio, hora_fim
      from registros_vendas where empresa_id = p_empresa and data between p_inicio and p_fim
  ),
  por_setor as (
    select
      setor,
      count(*) as quantidade,
      count(*) filter (where status = 'concluido') as concluidos,
      coalesce(sum(case when jsonb_typeof(atividades) = 'array'
                        then jsonb_array_length(atividades) else 0 end), 0) as total_atividades,
      coalesce(sum(case when jsonb_typeof(atividades) = 'array'
                        then (select count(*) from jsonb_array_elements(atividades) a
                              where a->>'status' = 'realizada')
                        else 0 end), 0) as atividades_realizadas,
      coalesce(sum(floor(extract(epoch from (hora_fim - hora_inicio)) / 60))
               filter (where hora_inicio is not null and hora_fim is not null), 0) as tempo_total_min,
      count(*) filter (where hora_inicio is not null and hora_fim is not null) as registros_com_tempo
    from regs
    group by setor
  ),
  man as (
    select count(*) as total,
           count(*) filter (where status::text = 'concluida') as concluidas
    from manutencoes
    where empresa_id = p_empresa and data between p_inicio and p_fim
  )
  select jsonb_build_object(
    'setores', coalesce((select jsonb_object_agg(setor, to_jsonb(p) - 'setor') from por_setor p), '{}'::jsonb),
    'manutencoes', (select to_jsonb(man) from man)
  );
$$;

create or replace function public.dashboard_dados_gerais(p_inicio date, p_fim date)
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select public.dashboard_agregado(
    (select empresa_id from usuarios where id = (select auth.uid())),
    p_inicio, p_fim
  );
$$;

revoke execute on function public.dashboard_agregado(uuid, date, date) from public, anon;
revoke execute on function public.dashboard_dados_gerais(date, date) from public, anon;
grant execute on function public.dashboard_agregado(uuid, date, date) to authenticated, service_role;
grant execute on function public.dashboard_dados_gerais(date, date) to authenticated, service_role;

/*
  Tempo estimado só para o admin — 25/10/2026 (pedido do usuário).

  As colunas tempo_estimado_* ficavam nas tabelas de serviços/tipos, que a
  equipe lê (e a governança até altera): RLS não esconde uma coluna só.
  - tabela tempos_estimados (origem + referencia_id), RLS: só admin da
    empresa (ou super admin) lê e grava
  - tempo_real_vs_estimado passa a ler daqui e só responde para admin
  - as colunas antigas são removidas em 20261025100500 (depois do deploy do app)
*/

create table if not exists public.tempos_estimados (
  origem text not null check (origem in (
    'servico_camararia', 'tipo_recepcao', 'tipo_gestao', 'tipo_atividade', 'tipo_extra', 'tipo_cozinha')),
  referencia_id uuid not null,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  minutos smallint check (minutos is null or minutos between 1 and 720),
  minutos_revisao smallint check (minutos_revisao is null or minutos_revisao between 1 and 720),
  atualizado_em timestamptz not null default now(),
  primary key (origem, referencia_id)
);
create index if not exists tempos_estimados_empresa_idx on public.tempos_estimados (empresa_id);
alter table public.tempos_estimados enable row level security;

create policy "so admin da empresa" on public.tempos_estimados
  for all to authenticated
  using (
    (select public.is_super_admin())
    or exists (select 1 from usuarios u
                where u.id = (select auth.uid()) and u.active
                  and u.profile = 'admin' and u.empresa_id = tempos_estimados.empresa_id))
  with check (
    (select public.is_super_admin())
    or exists (select 1 from usuarios u
                where u.id = (select auth.uid()) and u.active
                  and u.profile = 'admin' and u.empresa_id = tempos_estimados.empresa_id));

create or replace function public.tempo_real_vs_estimado(p_inicio date, p_fim date)
returns table (
  modulo text, tipo text, usuario_id uuid, usuario text,
  registros int, estimado_min int, media_real_min numeric,
  acima int, rapidos int, informados int
)
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
     and u.profile::text in ('admin', 'super_admin');
  if v_empresa is null then
    raise exception 'acesso negado' using errcode = '42501';
  end if;

  return query
  with est as (
    select origem, referencia_id, minutos, minutos_revisao from tempos_estimados where empresa_id = v_empresa
  ),
  servicos as (
    select servico_para_tipo(s.nome) tipo, max(s.nome) nome,
           max(e.minutos) est_limpeza, max(e.minutos_revisao) est_revisao
      from servicos_camararia s
      left join est e on e.origem = 'servico_camararia' and e.referencia_id = s.id
     where s.empresa_id = v_empresa and s.ativo
     group by 1
  ),
  regs as (
    select 'Governança' modulo, coalesce(sv.nome, r.tipo_servico::text) tipo, sv.est_limpeza est,
           coalesce(r.usuario_executor_id, r.usuario_id) uid, r.hora_inicio, r.hora_fim, r.minutos_informados
      from registros_camararia r left join servicos sv on sv.tipo = r.tipo_servico::text
     where r.empresa_id = v_empresa and r.status::text = 'concluido' and r.data between p_inicio and p_fim
    union all
    select 'Revisão', coalesce(sv.nome, r.tipo_servico::text), sv.est_revisao,
           coalesce(r.usuario_executor_id, r.usuario_id), r.hora_inicio, r.hora_fim, r.minutos_informados
      from registros_revisao r left join servicos sv on sv.tipo = r.tipo_servico::text
     where r.empresa_id = v_empresa and r.status::text = 'concluido' and r.data between p_inicio and p_fim
    union all
    select 'Recepção', t.nome, e.minutos,
           coalesce(r.usuario_executor_id, r.usuario_id), r.hora_inicio, r.hora_fim, r.minutos_informados
      from registros_recepcao r left join tipos_recepcao t on t.id = r.tipo_recepcao_id
      left join est e on e.origem = 'tipo_recepcao' and e.referencia_id = t.id
     where r.empresa_id = v_empresa and r.status::text = 'concluido' and r.data between p_inicio and p_fim
    union all
    select 'Gestão', t.nome, e.minutos,
           coalesce(r.usuario_executor_id, r.usuario_id), r.hora_inicio, r.hora_fim, r.minutos_informados
      from registros_gestao r left join tipos_gestao t on t.id = r.tipo_gestao_id
      left join est e on e.origem = 'tipo_gestao' and e.referencia_id = t.id
     where r.empresa_id = v_empresa and r.status::text = 'concluido' and r.data between p_inicio and p_fim
    union all
    select 'Cozinha', t.nome, e.minutos,
           coalesce(r.usuario_executor_id, r.usuario_id), r.hora_inicio, r.hora_fim, r.minutos_informados
      from registros_cozinha r left join tipos_cozinha t on t.id = r.tipo_cozinha_id
      left join est e on e.origem = 'tipo_cozinha' and e.referencia_id = t.id
     where r.empresa_id = v_empresa and r.status = 'concluido' and r.data between p_inicio and p_fim
    union all
    select 'Atividades Diárias', t.nome, e.minutos,
           coalesce(r.usuario_executor_id, r.usuario_id), r.hora_inicio, r.hora_fim, r.minutos_informados
      from registros_atividades_diarias r left join tipos_atividades t on t.id = r.tipo_atividade_id
      left join est e on e.origem = 'tipo_atividade' and e.referencia_id = t.id
     where r.empresa_id = v_empresa and r.status::text = 'concluido' and r.data between p_inicio and p_fim
    union all
    select 'Atividades Extras', t.nome, e.minutos,
           coalesce(r.usuario_executor_id, r.usuario_id), r.hora_inicio, r.hora_fim, r.minutos_informados
      from registros_atividades_extras r left join tipos_extras t on t.id = r.tipo_atividade_id
      left join est e on e.origem = 'tipo_extra' and e.referencia_id = t.id
     where r.empresa_id = v_empresa and r.status::text = 'concluido' and r.data between p_inicio and p_fim
    union all
    select 'Áreas Comuns', null, null,
           coalesce(r.usuario_executor_id, r.usuario_id), r.hora_inicio, r.hora_fim, r.minutos_informados
      from registros_areas_comuns r
     where r.empresa_id = v_empresa and r.status::text = 'concluido' and r.data between p_inicio and p_fim
    union all
    select 'Vendas', null, null,
           coalesce(r.usuario_executor_id, r.usuario_id), r.hora_inicio, r.hora_fim, r.minutos_informados
      from registros_vendas r
     where r.empresa_id = v_empresa and r.status::text = 'concluido' and r.data between p_inicio and p_fim
  ),
  medidos as (
    select g.*, coalesce(g.minutos_informados::numeric,
                         greatest(extract(epoch from (g.hora_fim - g.hora_inicio)) / 60, 0)) real_min
      from regs g
     where g.hora_fim is not null or g.minutos_informados is not null
  )
  select m.modulo, coalesce(m.tipo, '—'), m.uid, coalesce(u.name, 'Usuário removido'),
         count(*)::int,
         max(m.est)::int,
         round(avg(m.real_min), 1),
         count(*) filter (where m.est is not null and m.real_min > m.est * 1.2)::int,
         count(*) filter (where m.est is not null and m.real_min < m.est * 0.5)::int,
         count(*) filter (where m.minutos_informados is not null)::int
    from medidos m
    left join usuarios u on u.id = m.uid
   group by m.modulo, m.tipo, m.uid, u.name
   order by m.modulo, coalesce(m.tipo, '—'), avg(m.real_min) desc;
end;
$$;

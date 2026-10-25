/*
  Prazo (SLA) de manutenção — 25/10/2026.

  9 chamados abertos há ~22 dias em média, sem prazo nem alerta.
  Prazo pela prioridade, contado da abertura: alta 24h, normal 72h, baixa 168h
  (mesmos valores em src/utils/prazoManutencao.ts).
  manutencoes_vencidas_para_avisar(): abertas/pausadas que passaram do prazo e
  ainda não geraram aviso; a edge function avisar-tarefas-atrasadas avisa
  gestores/admins da empresa e grava em avisos_manutencao_vencida.
*/

create or replace function public.prazo_manutencao_horas(p_prioridade text)
returns int
language sql
immutable
as $$
  select case p_prioridade when 'alta' then 24 when 'normal' then 72 else 168 end;
$$;

create table if not exists public.avisos_manutencao_vencida (
  manutencao_id uuid primary key,
  empresa_id uuid not null,
  avisado_em timestamptz not null default now()
);
alter table public.avisos_manutencao_vencida enable row level security;

create or replace function public.manutencoes_vencidas_para_avisar()
returns table (
  manutencao_id uuid, empresa_id uuid, local text, descricao text,
  prioridade text, horas_abertas int, horas_atraso int
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.id, m.empresa_id, m.local, m.descricao, m.prioridade::text,
         floor(extract(epoch from now() - m.created_at) / 3600)::int,
         floor(extract(epoch from now() - m.created_at) / 3600)::int - prazo_manutencao_horas(m.prioridade::text)
    from manutencoes m
   where m.status::text in ('aberto', 'pausada')
     and now() > m.created_at + make_interval(hours => prazo_manutencao_horas(m.prioridade::text))
     and not exists (select 1 from avisos_manutencao_vencida a where a.manutencao_id = m.id);
$$;
revoke execute on function public.manutencoes_vencidas_para_avisar() from public, anon, authenticated;

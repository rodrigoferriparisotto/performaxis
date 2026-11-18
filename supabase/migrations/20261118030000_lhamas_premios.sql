/*
  Moeda de prêmios ("Lhamas") — 18/11/2026 (pedido do usuário).

  - Crédito automático no fechamento do mês pela FAIXA da meritocracia
    (Ouro/Prata/Bronze; bônus opcional do Selo 100%). Nome da moeda, créditos,
    validade e perda configuráveis por empresa (premios_config).
  - Conversão para reais (fator_real, padrão 5 Lhamas = R$ 1) é só da gestão:
    a tabela não é lida pelo app; premios_config() só devolve o fator para
    gestor/admin.
  - Validade: cada lote vale validade_meses (15); depois perde
    perda_mensal_pct (15%) do que resta, uma vez por mês.
  - Troca: colaborador pede (as Lhamas saem na hora, do lote mais antigo),
    gestão entrega em até prazo_entrega_dias (30) ou cancela (volta o saldo).
  - Desligamento: se o saldo não alcança nenhum prêmio ativo, é zerado.
  Tudo passa por funções; o app só lê lotes/movimentos/trocas pela RLS.
*/

-- ------------------------------------------------------------ tabelas
create table if not exists public.premios_config (
  empresa_id uuid primary key references public.empresas(id) on delete cascade,
  nome_moeda text not null default 'Lhamas' check (length(btrim(nome_moeda)) between 2 and 30),
  credito_ouro integer not null default 400 check (credito_ouro >= 0),
  credito_prata integer not null default 250 check (credito_prata >= 0),
  credito_bronze integer not null default 125 check (credito_bronze >= 0),
  credito_selo integer not null default 0 check (credito_selo >= 0),
  validade_meses integer not null default 15 check (validade_meses between 1 and 120),
  perda_mensal_pct numeric(5,2) not null default 15 check (perda_mensal_pct between 0 and 100),
  prazo_entrega_dias integer not null default 30 check (prazo_entrega_dias between 1 and 180),
  gestores_participam boolean not null default false,
  fator_real numeric(8,2) not null default 5 check (fator_real > 0),
  atualizado_em timestamptz not null default now()
);
alter table public.premios_config enable row level security;
revoke all on public.premios_config from anon, authenticated;

create table if not exists public.premios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null check (length(btrim(nome)) between 2 and 80),
  descricao text check (descricao is null or length(descricao) <= 300),
  foto_url text,
  custo integer not null check (custo > 0),
  ativo boolean not null default true,
  ordem integer not null default 0,
  criado_em timestamptz not null default now()
);
create index if not exists premios_empresa_idx on public.premios (empresa_id, ativo, custo);

create table if not exists public.lhamas_lotes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  origem text not null check (origem in ('mensal', 'ajuste')),
  referencia text,
  quantidade integer not null check (quantidade > 0),
  restante integer not null check (restante >= 0),
  creditado_em date not null,
  ultima_perda date,
  criado_em timestamptz not null default now(),
  unique (usuario_id, origem, referencia)
);
create index if not exists lhamas_lotes_usuario_idx on public.lhamas_lotes (usuario_id, creditado_em) where restante > 0;

create table if not exists public.lhamas_movimentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  tipo text not null check (tipo in ('credito', 'troca', 'estorno', 'perda_validade', 'perda_desligamento', 'ajuste')),
  quantidade integer not null,
  descricao text,
  resgate_id uuid,
  criado_por uuid,
  criado_em timestamptz not null default now()
);
create index if not exists lhamas_movimentos_usuario_idx on public.lhamas_movimentos (usuario_id, criado_em desc);

create table if not exists public.resgates (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  premio_id uuid references public.premios(id) on delete set null,
  premio_nome text not null,
  custo integer not null,
  status text not null default 'solicitado' check (status in ('solicitado', 'entregue', 'cancelado')),
  solicitado_em timestamptz not null default now(),
  solicitado_por uuid,
  prazo_entrega date not null,
  entregue_em timestamptz,
  resolvido_por uuid,
  motivo_cancelamento text
);
create index if not exists resgates_empresa_idx on public.resgates (empresa_id, status, solicitado_em desc);
create index if not exists resgates_usuario_idx on public.resgates (usuario_id, solicitado_em desc);

create table if not exists public.lhamas_consumos (
  resgate_id uuid not null references public.resgates(id) on delete cascade,
  lote_id uuid not null references public.lhamas_lotes(id) on delete cascade,
  quantidade integer not null check (quantidade > 0),
  primary key (resgate_id, lote_id)
);

-- ------------------------------------------------------------ acesso
create or replace function public.eh_gestao_da_empresa(p_empresa uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_super_admin()
      or exists (select 1 from usuarios u
                  where u.id = (select auth.uid()) and u.active
                    and u.profile::text in ('admin', 'gestor') and u.empresa_id = p_empresa);
$$;
revoke execute on function public.eh_gestao_da_empresa(uuid) from public, anon;
grant execute on function public.eh_gestao_da_empresa(uuid) to authenticated;

alter table public.premios enable row level security;
create policy "premios visiveis na empresa" on public.premios
  for select to authenticated
  using ((select public.is_super_admin())
         or empresa_id = (select u.empresa_id from usuarios u where u.id = (select auth.uid())));
create policy "gestao edita premios" on public.premios
  for all to authenticated
  using ((select public.eh_gestao_da_empresa(empresa_id)))
  with check ((select public.eh_gestao_da_empresa(empresa_id)));

alter table public.lhamas_lotes enable row level security;
create policy "lotes proprios ou da gestao" on public.lhamas_lotes
  for select to authenticated
  using (usuario_id = (select auth.uid()) or (select public.eh_gestao_da_empresa(empresa_id)));

alter table public.lhamas_movimentos enable row level security;
create policy "movimentos proprios ou da gestao" on public.lhamas_movimentos
  for select to authenticated
  using (usuario_id = (select auth.uid()) or (select public.eh_gestao_da_empresa(empresa_id)));

alter table public.resgates enable row level security;
create policy "trocas proprias ou da gestao" on public.resgates
  for select to authenticated
  using (usuario_id = (select auth.uid()) or (select public.eh_gestao_da_empresa(empresa_id)));

alter table public.lhamas_consumos enable row level security;
revoke all on public.lhamas_consumos from anon, authenticated;
revoke insert, update, delete on public.lhamas_lotes, public.lhamas_movimentos, public.resgates from anon, authenticated;

-- ------------------------------------------------------------ configuração
create or replace function public._premios_cfg(p_empresa uuid)
returns public.premios_config
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v public.premios_config;
begin
  select * into v from premios_config where empresa_id = p_empresa;
  if not found then
    v.empresa_id := p_empresa;
    v.nome_moeda := 'Lhamas'; v.credito_ouro := 400; v.credito_prata := 250; v.credito_bronze := 125;
    v.credito_selo := 0; v.validade_meses := 15; v.perda_mensal_pct := 15; v.prazo_entrega_dias := 30;
    v.gestores_participam := false; v.fator_real := 5;
  end if;
  return v;
end;
$$;
revoke execute on function public._premios_cfg(uuid) from public, anon, authenticated;

-- todos leem; fator_real (Lhamas por R$ 1) só para a gestão
create or replace function public.premios_config(p_empresa uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_empresa uuid := coalesce(p_empresa, (select empresa_id from usuarios where id = (select auth.uid())));
  v public.premios_config;
  v_json jsonb;
begin
  if v_empresa is null
     or not (public.eh_gestao_da_empresa(v_empresa)
             or exists (select 1 from usuarios where id = (select auth.uid()) and empresa_id = v_empresa)) then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
  v := public._premios_cfg(v_empresa);
  v_json := jsonb_build_object(
    'nome_moeda', v.nome_moeda, 'credito_ouro', v.credito_ouro, 'credito_prata', v.credito_prata,
    'credito_bronze', v.credito_bronze, 'credito_selo', v.credito_selo, 'validade_meses', v.validade_meses,
    'perda_mensal_pct', v.perda_mensal_pct, 'prazo_entrega_dias', v.prazo_entrega_dias,
    'gestores_participam', v.gestores_participam);
  if public.eh_gestao_da_empresa(v_empresa) then
    v_json := v_json || jsonb_build_object('fator_real', v.fator_real);
  end if;
  return v_json;
end;
$$;
revoke execute on function public.premios_config(uuid) from public, anon;
grant execute on function public.premios_config(uuid) to authenticated;

create or replace function public.salvar_premios_config(p_config jsonb, p_empresa uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_empresa uuid := coalesce(p_empresa, (select empresa_id from usuarios where id = (select auth.uid())));
  v public.premios_config;
begin
  if v_empresa is null or not public.eh_gestao_da_empresa(v_empresa) then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
  v := public._premios_cfg(v_empresa);
  insert into premios_config as c (empresa_id, nome_moeda, credito_ouro, credito_prata, credito_bronze, credito_selo,
                                   validade_meses, perda_mensal_pct, prazo_entrega_dias, gestores_participam, fator_real, atualizado_em)
  values (v_empresa,
          coalesce(nullif(btrim(p_config->>'nome_moeda'), ''), v.nome_moeda),
          coalesce((p_config->>'credito_ouro')::int, v.credito_ouro),
          coalesce((p_config->>'credito_prata')::int, v.credito_prata),
          coalesce((p_config->>'credito_bronze')::int, v.credito_bronze),
          coalesce((p_config->>'credito_selo')::int, v.credito_selo),
          coalesce((p_config->>'validade_meses')::int, v.validade_meses),
          coalesce((p_config->>'perda_mensal_pct')::numeric, v.perda_mensal_pct),
          coalesce((p_config->>'prazo_entrega_dias')::int, v.prazo_entrega_dias),
          coalesce((p_config->>'gestores_participam')::boolean, v.gestores_participam),
          coalesce((p_config->>'fator_real')::numeric, v.fator_real),
          now())
  on conflict (empresa_id) do update set
    nome_moeda = excluded.nome_moeda, credito_ouro = excluded.credito_ouro, credito_prata = excluded.credito_prata,
    credito_bronze = excluded.credito_bronze, credito_selo = excluded.credito_selo,
    validade_meses = excluded.validade_meses, perda_mensal_pct = excluded.perda_mensal_pct,
    prazo_entrega_dias = excluded.prazo_entrega_dias, gestores_participam = excluded.gestores_participam,
    fator_real = excluded.fator_real, atualizado_em = now();
  return public.premios_config(v_empresa);
end;
$$;
revoke execute on function public.salvar_premios_config(jsonb, uuid) from public, anon;
grant execute on function public.salvar_premios_config(jsonb, uuid) to authenticated;

-- ------------------------------------------------------------ saldo
create or replace function public._lhamas_saldo(p_usuario uuid)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(sum(restante), 0)::int from lhamas_lotes where usuario_id = p_usuario;
$$;
revoke execute on function public._lhamas_saldo(uuid) from public, anon, authenticated;

-- tira do lote mais antigo primeiro; registra de onde saiu (para devolver no cancelamento)
create or replace function public._consumir_lhamas(p_usuario uuid, p_quantidade integer, p_resgate uuid default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_falta integer := p_quantidade;
  v_lote record;
  v_tira integer;
begin
  if p_quantidade <= 0 then
    return;
  end if;
  for v_lote in
    select id, restante from lhamas_lotes
     where usuario_id = p_usuario and restante > 0
     order by creditado_em, criado_em
     for update
  loop
    exit when v_falta = 0;
    v_tira := least(v_lote.restante, v_falta);
    update lhamas_lotes set restante = restante - v_tira where id = v_lote.id;
    if p_resgate is not null then
      insert into lhamas_consumos (resgate_id, lote_id, quantidade) values (p_resgate, v_lote.id, v_tira);
    end if;
    v_falta := v_falta - v_tira;
  end loop;
  if v_falta > 0 then
    raise exception 'saldo insuficiente' using errcode = '22023';
  end if;
end;
$$;
revoke execute on function public._consumir_lhamas(uuid, integer, uuid) from public, anon, authenticated;

-- resumo do colaborador (ou de alguém da equipe, para a gestão)
create or replace function public.lhamas_resumo(p_usuario uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_usuario uuid := coalesce(p_usuario, (select auth.uid()));
  v_empresa uuid;
  v_cfg public.premios_config;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_venc record;
begin
  select empresa_id into v_empresa from usuarios where id = v_usuario;
  if v_empresa is null or not (v_usuario = (select auth.uid()) or public.eh_gestao_da_empresa(v_empresa)) then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
  v_cfg := public._premios_cfg(v_empresa);
  -- próximo lote a passar da validade (a partir daí começa a perder)
  select (creditado_em + make_interval(months => v_cfg.validade_meses))::date data, restante
    into v_venc
    from lhamas_lotes
   where usuario_id = v_usuario and restante > 0
     and (creditado_em + make_interval(months => v_cfg.validade_meses))::date > v_hoje
   order by creditado_em
   limit 1;
  return jsonb_build_object(
    'nome_moeda', v_cfg.nome_moeda,
    'saldo', public._lhamas_saldo(v_usuario),
    'vencido', (select coalesce(sum(restante), 0) from lhamas_lotes
                 where usuario_id = v_usuario and restante > 0
                   and (creditado_em + make_interval(months => v_cfg.validade_meses))::date <= v_hoje),
    'proximo_vencimento', v_venc.data,
    'proximo_vencimento_qtd', v_venc.restante,
    'perda_mensal_pct', v_cfg.perda_mensal_pct,
    'validade_meses', v_cfg.validade_meses,
    'reservado', (select coalesce(sum(custo), 0) from resgates where usuario_id = v_usuario and status = 'solicitado'));
end;
$$;
revoke execute on function public.lhamas_resumo(uuid) from public, anon;
grant execute on function public.lhamas_resumo(uuid) to authenticated;

-- saldos da equipe (gestão), com o equivalente em reais
create or replace function public.lhamas_saldos_equipe(p_empresa uuid default null)
returns table (usuario_id uuid, nome text, perfil text, ativo boolean, saldo integer, recebido integer,
               trocado integer, perdido integer, valor_reais numeric)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_empresa uuid := coalesce(p_empresa, (select empresa_id from usuarios where id = (select auth.uid())));
  v_cfg public.premios_config;
begin
  if v_empresa is null or not public.eh_gestao_da_empresa(v_empresa) then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
  v_cfg := public._premios_cfg(v_empresa);
  return query
  select u.id, u.name::text, u.profile::text, u.active,
         public._lhamas_saldo(u.id),
         coalesce((select sum(m.quantidade) from lhamas_movimentos m where m.usuario_id = u.id and m.quantidade > 0 and m.tipo in ('credito', 'ajuste')), 0)::int,
         coalesce((select -sum(m.quantidade) from lhamas_movimentos m where m.usuario_id = u.id and m.tipo in ('troca', 'estorno')), 0)::int,
         coalesce((select -sum(m.quantidade) from lhamas_movimentos m where m.usuario_id = u.id and m.tipo in ('perda_validade', 'perda_desligamento')), 0)::int,
         round(public._lhamas_saldo(u.id) / v_cfg.fator_real, 2)
    from usuarios u
   where u.empresa_id = v_empresa
     and (u.active or exists (select 1 from lhamas_lotes l where l.usuario_id = u.id and l.restante > 0))
   order by u.active desc, 5 desc, u.name;
end;
$$;
revoke execute on function public.lhamas_saldos_equipe(uuid) from public, anon;
grant execute on function public.lhamas_saldos_equipe(uuid) to authenticated;

-- ------------------------------------------------------------ trocas
create or replace function public._criar_troca(p_usuario uuid, p_premio uuid, p_por uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_premio record;
  v_empresa uuid;
  v_cfg public.premios_config;
  v_id uuid;
begin
  select empresa_id into v_empresa from usuarios where id = p_usuario;
  select * into v_premio from premios where id = p_premio and empresa_id = v_empresa and ativo;
  if v_premio.id is null then
    raise exception 'prêmio não encontrado' using errcode = '22023';
  end if;
  -- trava o saldo da pessoa durante a troca
  perform 1 from usuarios where id = p_usuario for update;
  if public._lhamas_saldo(p_usuario) < v_premio.custo then
    raise exception 'saldo insuficiente' using errcode = '22023';
  end if;
  v_cfg := public._premios_cfg(v_empresa);
  insert into resgates (empresa_id, usuario_id, premio_id, premio_nome, custo, solicitado_por, prazo_entrega)
  values (v_empresa, p_usuario, v_premio.id, v_premio.nome, v_premio.custo, p_por,
          (now() at time zone 'America/Sao_Paulo')::date + v_cfg.prazo_entrega_dias)
  returning id into v_id;
  perform public._consumir_lhamas(p_usuario, v_premio.custo, v_id);
  insert into lhamas_movimentos (empresa_id, usuario_id, tipo, quantidade, descricao, resgate_id, criado_por)
  values (v_empresa, p_usuario, 'troca', -v_premio.custo, 'Troca: ' || v_premio.nome, v_id, p_por);
  return v_id;
end;
$$;
revoke execute on function public._criar_troca(uuid, uuid, uuid) from public, anon, authenticated;

-- colaborador pede a troca
create or replace function public.solicitar_troca(p_premio uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (select 1 from usuarios where id = (select auth.uid()) and active) then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
  return public._criar_troca((select auth.uid()), p_premio, (select auth.uid()));
end;
$$;
revoke execute on function public.solicitar_troca(uuid) from public, anon;
grant execute on function public.solicitar_troca(uuid) to authenticated;

-- gestão registra a troca por alguém (ex.: quem saiu da empresa com saldo)
create or replace function public.solicitar_troca_para(p_usuario uuid, p_premio uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.eh_gestao_da_empresa((select empresa_id from usuarios where id = p_usuario)) then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
  return public._criar_troca(p_usuario, p_premio, (select auth.uid()));
end;
$$;
revoke execute on function public.solicitar_troca_para(uuid, uuid) from public, anon;
grant execute on function public.solicitar_troca_para(uuid, uuid) to authenticated;

create or replace function public.entregar_troca(p_resgate uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v record;
begin
  select * into v from resgates where id = p_resgate for update;
  if v.id is null or not public.eh_gestao_da_empresa(v.empresa_id) then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
  if v.status <> 'solicitado' then
    raise exception 'esta troca já foi resolvida' using errcode = '22023';
  end if;
  update resgates set status = 'entregue', entregue_em = now(), resolvido_por = (select auth.uid()) where id = p_resgate;
end;
$$;
revoke execute on function public.entregar_troca(uuid) from public, anon;
grant execute on function public.entregar_troca(uuid) to authenticated;

-- cancela (gestão, ou a própria pessoa enquanto não foi entregue): o saldo volta para os mesmos lotes
create or replace function public.cancelar_troca(p_resgate uuid, p_motivo text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v record;
  c record;
begin
  select * into v from resgates where id = p_resgate for update;
  if v.id is null or not (v.usuario_id = (select auth.uid()) or public.eh_gestao_da_empresa(v.empresa_id)) then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
  if v.status <> 'solicitado' then
    raise exception 'esta troca já foi resolvida' using errcode = '22023';
  end if;
  for c in select * from lhamas_consumos where resgate_id = p_resgate loop
    update lhamas_lotes set restante = least(quantidade, restante + c.quantidade) where id = c.lote_id;
  end loop;
  delete from lhamas_consumos where resgate_id = p_resgate;
  update resgates set status = 'cancelado', resolvido_por = (select auth.uid()),
         motivo_cancelamento = nullif(left(btrim(coalesce(p_motivo, '')), 300), '')
   where id = p_resgate;
  insert into lhamas_movimentos (empresa_id, usuario_id, tipo, quantidade, descricao, resgate_id, criado_por)
  values (v.empresa_id, v.usuario_id, 'estorno', v.custo, 'Troca cancelada: ' || v.premio_nome, p_resgate, (select auth.uid()));
end;
$$;
revoke execute on function public.cancelar_troca(uuid, text) from public, anon;
grant execute on function public.cancelar_troca(uuid, text) to authenticated;

-- ajuste manual da gestão (motivo obrigatório)
create or replace function public.ajustar_lhamas(p_usuario uuid, p_quantidade integer, p_motivo text)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_empresa uuid;
begin
  select empresa_id into v_empresa from usuarios where id = p_usuario;
  if v_empresa is null or not public.eh_gestao_da_empresa(v_empresa) then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
  if coalesce(p_quantidade, 0) = 0 or length(btrim(coalesce(p_motivo, ''))) < 3 then
    raise exception 'informe a quantidade e o motivo' using errcode = '22023';
  end if;
  perform 1 from usuarios where id = p_usuario for update;
  if p_quantidade > 0 then
    insert into lhamas_lotes (empresa_id, usuario_id, origem, referencia, quantidade, restante, creditado_em)
    values (v_empresa, p_usuario, 'ajuste', null, p_quantidade, p_quantidade, (now() at time zone 'America/Sao_Paulo')::date);
  else
    perform public._consumir_lhamas(p_usuario, -p_quantidade, null);
  end if;
  insert into lhamas_movimentos (empresa_id, usuario_id, tipo, quantidade, descricao, criado_por)
  values (v_empresa, p_usuario, 'ajuste', p_quantidade, 'Ajuste: ' || left(btrim(p_motivo), 200), (select auth.uid()));
  return public._lhamas_saldo(p_usuario);
end;
$$;
revoke execute on function public.ajustar_lhamas(uuid, integer, text) from public, anon;
grant execute on function public.ajustar_lhamas(uuid, integer, text) to authenticated;

-- ------------------------------------------------------------ rotinas mensais
-- crédito do mês pela faixa (uma vez por pessoa/mês)
create or replace function public.creditar_lhamas_mes(p_ano int, p_mes int, p_empresa uuid default null)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ref text := p_ano || '-' || lpad(p_mes::text, 2, '0');
  v_nome_mes text := (array['janeiro','fevereiro','março','abril','maio','junho','julho','agosto',
                            'setembro','outubro','novembro','dezembro'])[p_mes] || '/' || p_ano;
  v_qtd int := 0;
  r record;
  v_lote uuid;
  v_cfg public.premios_config;
  v_credito int;
begin
  for r in
    select m.usuario_id, m.empresa_id, m.faixa, m.selo_100, u.profile::text perfil
      from performance_mensal m
      join usuarios u on u.id = m.usuario_id and u.active
      join empresas e on e.id = m.empresa_id and e.ativo
     where m.ano = p_ano and m.mes = p_mes
       and (p_empresa is null or m.empresa_id = p_empresa)
       and (m.faixa is not null or m.selo_100)
  loop
    v_cfg := public._premios_cfg(r.empresa_id);
    continue when r.perfil in ('admin', 'gestor') and not v_cfg.gestores_participam;
    v_credito := case r.faixa when 'ouro' then v_cfg.credito_ouro when 'prata' then v_cfg.credito_prata
                              when 'bronze' then v_cfg.credito_bronze else 0 end
                 + case when r.selo_100 then v_cfg.credito_selo else 0 end;
    continue when v_credito <= 0;
    v_lote := null;
    insert into lhamas_lotes (empresa_id, usuario_id, origem, referencia, quantidade, restante, creditado_em)
    values (r.empresa_id, r.usuario_id, 'mensal', v_ref, v_credito, v_credito,
            (make_date(p_ano, p_mes, 1) + interval '1 month')::date)
    on conflict (usuario_id, origem, referencia) do nothing
    returning id into v_lote;
    if v_lote is not null then
      insert into lhamas_movimentos (empresa_id, usuario_id, tipo, quantidade, descricao)
      values (r.empresa_id, r.usuario_id, 'credito', v_credito,
              'Faixa ' || initcap(coalesce(r.faixa, '—')) || case when r.selo_100 then ' + Selo 100%' else '' end
              || ' de ' || v_nome_mes);
      v_qtd := v_qtd + 1;
    end if;
  end loop;
  return v_qtd;
end;
$$;
revoke execute on function public.creditar_lhamas_mes(int, int, uuid) from public, anon, authenticated;

-- lote vencido perde a % do que resta, uma vez por mês
create or replace function public.aplicar_perda_validade()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_mes date := date_trunc('month', (now() at time zone 'America/Sao_Paulo'))::date;
  v_qtd int := 0;
  r record;
  v_perda int;
begin
  for r in
    select l.*, c.validade_meses, c.perda_mensal_pct
      from lhamas_lotes l
      cross join lateral (select (public._premios_cfg(l.empresa_id)).*) c
     where l.restante > 0
       and (l.creditado_em + make_interval(months => c.validade_meses))::date <= v_hoje
       and (l.ultima_perda is null or l.ultima_perda < v_mes)
     for update of l
  loop
    v_perda := least(r.restante, ceil(r.restante * r.perda_mensal_pct / 100.0)::int);
    continue when v_perda <= 0;
    update lhamas_lotes set restante = restante - v_perda, ultima_perda = v_hoje where id = r.id;
    insert into lhamas_movimentos (empresa_id, usuario_id, tipo, quantidade, descricao)
    values (r.empresa_id, r.usuario_id, 'perda_validade', -v_perda,
            'Saldo com mais de ' || r.validade_meses || ' meses: -' || trim_scale(r.perda_mensal_pct) || '%');
    v_qtd := v_qtd + 1;
  end loop;
  return v_qtd;
end;
$$;
revoke execute on function public.aplicar_perda_validade() from public, anon, authenticated;

-- desligamento: saldo que não alcança nenhum prêmio é zerado
create or replace function public.lhamas_no_desligamento()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_saldo int;
  v_menor int;
begin
  if old.active and not new.active and new.empresa_id is not null then
    v_saldo := public._lhamas_saldo(new.id);
    if v_saldo > 0 then
      select min(custo) into v_menor from premios where empresa_id = new.empresa_id and ativo;
      if v_menor is null or v_saldo < v_menor then
        update lhamas_lotes set restante = 0 where usuario_id = new.id and restante > 0;
        insert into lhamas_movimentos (empresa_id, usuario_id, tipo, quantidade, descricao)
        values (new.empresa_id, new.id, 'perda_desligamento', -v_saldo, 'Desligamento: saldo não alcançava nenhum prêmio');
      end if;
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.lhamas_no_desligamento() from public, anon, authenticated;
drop trigger if exists trg_lhamas_no_desligamento on public.usuarios;
create trigger trg_lhamas_no_desligamento
  after update of active on public.usuarios
  for each row execute function public.lhamas_no_desligamento();

-- dia 1, 01:30 de Brasília (depois do fechamento do último dia às 00:15): crédito do mês anterior + perda por validade
select cron.schedule('lhamas-fechamento-mes', '30 4 1 * *', $$
  select public.creditar_lhamas_mes(extract(year from d)::int, extract(month from d)::int)
    from (select (now() at time zone 'America/Sao_Paulo')::date - 1 d) x;
  select public.aplicar_perda_validade();
$$);

/*
  Concierge do hóspede — 27/11/2026 (Fase 2).
  Cada suíte tem um código aleatório (impresso embaixo do QR Code no quarto).
  O hóspede abre performaxis.com.br/c/CODIGO (ou digita o código em /c) sem
  login. Tudo passa por funções: o código diz o hotel e a suíte, e só voltam
  as fichas marcadas visivel_hospede. A recepção/gestão pode gerar um código
  novo para a suíte (o antigo para de funcionar).
*/

create table if not exists public.concierge_codigos (
  suite_id uuid primary key references public.suites(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  codigo text not null unique check (codigo ~ '^[A-Z0-9]{6}$'),
  criado_em timestamptz not null default now()
);
alter table public.concierge_codigos enable row level security;
create policy "gestao ve os codigos" on public.concierge_codigos
  for select to authenticated using ((select public.eh_gestao_da_empresa(empresa_id)));
revoke insert, update, delete on public.concierge_codigos from anon, authenticated;

-- 6 caracteres sem os que confundem (0/O, 1/I/L)
create or replace function public._novo_codigo_concierge()
returns text
language plpgsql
volatile
set search_path = public, pg_temp
as $$
declare
  v_alfabeto constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_codigo text;
begin
  loop
    v_codigo := '';
    for i in 1..6 loop
      v_codigo := v_codigo || substr(v_alfabeto, 1 + floor(random() * length(v_alfabeto))::int, 1);
    end loop;
    exit when not exists (select 1 from concierge_codigos where codigo = v_codigo);
  end loop;
  return v_codigo;
end;
$$;
revoke execute on function public._novo_codigo_concierge() from public, anon, authenticated;

-- gestão/recepção: cria os códigos que faltam; com p_suite, gera um novo para ela
create or replace function public.gerar_codigos_concierge(p_suite uuid default null)
returns table (suite_id uuid, suite_nome text, andar int, codigo text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_empresa uuid;
  s record;
begin
  select u.empresa_id into v_empresa from usuarios u
   where u.id = (select auth.uid()) and u.active and u.profile::text in ('admin', 'gestor', 'recepcao');
  if v_empresa is null then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
  if p_suite is not null then
    if not exists (select 1 from suites where id = p_suite and empresa_id = v_empresa) then
      raise exception 'suíte não encontrada' using errcode = '22023';
    end if;
    delete from concierge_codigos where concierge_codigos.suite_id = p_suite;
  end if;
  for s in select x.id from suites x
            where x.empresa_id = v_empresa
              and not exists (select 1 from concierge_codigos c where c.suite_id = x.id)
  loop
    insert into concierge_codigos (suite_id, empresa_id, codigo) values (s.id, v_empresa, public._novo_codigo_concierge());
  end loop;
  return query
  select x.id, x.name::text, x.floor, c.codigo
    from suites x join concierge_codigos c on c.suite_id = x.id
   where x.empresa_id = v_empresa
   order by x.name;
end;
$$;
revoke execute on function public.gerar_codigos_concierge(uuid) from public, anon;
grant execute on function public.gerar_codigos_concierge(uuid) to authenticated;

-- hóspede (sem login): hotel, suíte e as fichas para hóspede
create or replace function public.concierge_hospede(p_codigo text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case when c.codigo is null or e.id is null then null else jsonb_build_object(
    'hotel', e.nome,
    'suite', jsonb_build_object('nome', s.name, 'tipo', s.type, 'andar', s.floor, 'como_chegar', s.como_chegar),
    'fichas', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', f.id, 'categoria', f.categoria, 'titulo', f.titulo, 'conteudo', f.conteudo,
               'perguntas', f.perguntas, 'fotos', f.fotos, 'ordem', f.ordem)
             order by f.categoria, f.ordem, f.titulo)
        from concierge_fichas f
       where f.empresa_id = c.empresa_id and f.ativo and f.visivel_hospede), '[]'::jsonb)
  ) end
    from (select upper(regexp_replace(coalesce(p_codigo, ''), '[^A-Za-z0-9]', '', 'g')) cod) q
    left join concierge_codigos c on c.codigo = q.cod
    left join suites s on s.id = c.suite_id
    left join empresas e on e.id = c.empresa_id and e.ativo;
$$;
revoke execute on function public.concierge_hospede(text) from public;
grant execute on function public.concierge_hospede(text) to anon, authenticated;

-- pergunta do hóspede (para a gestão ver o que falta); até 300 por hotel por dia
create or replace function public.concierge_hospede_registrar(p_codigo text, p_termo text, p_encontrou boolean, p_ficha uuid default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_empresa uuid;
  v_cod text := upper(regexp_replace(coalesce(p_codigo, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  select empresa_id into v_empresa from concierge_codigos where codigo = v_cod;
  if v_empresa is null or length(btrim(coalesce(p_termo, ''))) = 0 then
    return;
  end if;
  if (select count(*) from concierge_buscas b
       where b.empresa_id = v_empresa and b.origem = 'hospede' and b.criado_em > now() - interval '1 day') >= 300 then
    return;
  end if;
  insert into concierge_buscas (empresa_id, origem, termo, encontrou, ficha_id, usuario_id)
  values (v_empresa, 'hospede', left(btrim(p_termo), 300), coalesce(p_encontrou, false),
          (select f.id from concierge_fichas f where f.id = p_ficha and f.empresa_id = v_empresa), null);
end;
$$;
revoke execute on function public.concierge_hospede_registrar(text, text, boolean, uuid) from public;
grant execute on function public.concierge_hospede_registrar(text, text, boolean, uuid) to anon, authenticated;

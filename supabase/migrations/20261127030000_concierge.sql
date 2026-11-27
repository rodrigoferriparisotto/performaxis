/*
  Concierge — 27/11/2026 (ideia do usuário).
  Base de conhecimento do hotel em fichas; a busca roda no aparelho (sem IA,
  sem custo por pergunta). Fase 1: equipe. Fase 2 (depois): hóspede por QR
  Code + código por suíte, vendo só as fichas visivel_hospede.
  - concierge_fichas: o conteúdo (gestão escreve, todos da empresa leem)
  - concierge_buscas: perguntas feitas (gestão vê o que não teve resposta)
  - suites.como_chegar: "onde fica a suíte X"
*/

create table if not exists public.concierge_fichas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  categoria text not null default 'outros'
    check (categoria in ('hotel', 'alimentacao', 'suites', 'como_usar', 'servicos', 'contatos', 'regiao', 'outros')),
  titulo text not null check (length(btrim(titulo)) between 2 and 120),
  conteudo text not null default '' check (length(conteudo) <= 5000),
  perguntas text[] not null default '{}',
  fotos text[] not null default '{}',
  visivel_hospede boolean not null default false,
  ativo boolean not null default true,
  ordem integer not null default 0,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references public.usuarios(id) on delete set null
);
create index if not exists concierge_fichas_empresa_idx on public.concierge_fichas (empresa_id, ativo, categoria);

alter table public.concierge_fichas enable row level security;
create policy "empresa le o concierge" on public.concierge_fichas
  for select to authenticated
  using ((select public.is_super_admin())
         or empresa_id = (select u.empresa_id from usuarios u where u.id = (select auth.uid()) and u.active));
create policy "gestao escreve o concierge" on public.concierge_fichas
  for all to authenticated
  using ((select public.eh_gestao_da_empresa(empresa_id)))
  with check ((select public.eh_gestao_da_empresa(empresa_id)));

create table if not exists public.concierge_buscas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  origem text not null default 'equipe' check (origem in ('equipe', 'hospede')),
  termo text not null check (length(termo) between 1 and 300),
  encontrou boolean not null,
  ficha_id uuid references public.concierge_fichas(id) on delete set null,
  usuario_id uuid default auth.uid(),
  criado_em timestamptz not null default now()
);
create index if not exists concierge_buscas_empresa_idx on public.concierge_buscas (empresa_id, criado_em desc);

alter table public.concierge_buscas enable row level security;
create policy "equipe registra busca" on public.concierge_buscas
  for insert to authenticated
  with check (origem = 'equipe'
              and empresa_id = (select u.empresa_id from usuarios u where u.id = (select auth.uid()) and u.active));
create policy "gestao ve as buscas" on public.concierge_buscas
  for select to authenticated
  using ((select public.eh_gestao_da_empresa(empresa_id)));
revoke update, delete on public.concierge_buscas from anon, authenticated;

alter table public.suites add column if not exists como_chegar text check (como_chegar is null or length(como_chegar) <= 500);

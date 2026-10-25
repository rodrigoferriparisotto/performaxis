/*
  Cofre de acessos seguro — 25/10/2026 (regra do usuário: "gestão vê tudo,
  demais só o que está vinculado").

  Antes: senhas em texto puro ou "criptografadas" no navegador com chave
  derivada da chave PÚBLICA do app; qualquer usuário da empresa lia a tabela
  inteira (o filtro por área era só na tela); auditoria gravada pelo cliente.

  Agora:
  - chave aleatória guardada no Supabase Vault (nunca sai do banco)
  - gatilho cifra a senha ao salvar (pgp_sym_encrypt) e apaga o texto puro;
    o campo senha_cifrada não pode ser lido nem escrito pelo app
  - RLS de leitura: gestor/admin veem todos os acessos da empresa; os demais só
    os vinculados à área do seu perfil (ou à área 'geral')
  - acessos_revelar_senha(id, acao): confere a regra, registra quem viu/copiou
    e devolve a senha; é o único jeito de ler uma senha
  Senhas "criptografadas" pelo navegador (formato antigo) ficam por dentro da
  cifra nova e o app ainda as abre; ao editar, viram texto cifrado no servidor.
*/

-- chave do cofre (aleatória; só funções do banco leem)
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'acessos_chave') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'base64'), 'acessos_chave', 'Chave do cofre de acessos do Performaxis');
  end if;
end $$;

create or replace function public.chave_cofre_acessos()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'acessos_chave';
$$;
revoke execute on function public.chave_cofre_acessos() from public, anon, authenticated;

-- áreas que cada perfil enxerga
create or replace function public.acessos_areas_do_perfil(p_profile text)
returns text[]
language sql
immutable
as $$
  select array['geral'] || case p_profile
    when 'recepcao' then array['recepcao']
    when 'camararia' then array['camararia']
    when 'revisao' then array['revisao']
    when 'areas_comuns' then array['areas_comuns']
    when 'manutencao' then array['manutencao']
    when 'cozinha' then array['cozinha']
    when 'vendas' then array['vendas']
    when 'atividades_diarias' then array['atividades_diarias']
    when 'atividades_diurnas' then array['atividades_diarias']
    when 'atividades_noturnas' then array['atividades_diarias']
    when 'atividades_extras' then array['atividades_extras']
    else array[]::text[]
  end;
$$;

alter table public.acessos add column if not exists senha_cifrada bytea;
alter table public.acessos add column if not exists tem_senha boolean generated always as (senha_cifrada is not null) stored;

create or replace function public.cifrar_senha_acesso()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.senha is not null and btrim(new.senha) <> '' then
    new.senha_cifrada := extensions.pgp_sym_encrypt(new.senha, public.chave_cofre_acessos());
  elsif tg_op = 'UPDATE' then
    new.senha_cifrada := old.senha_cifrada;
  end if;
  new.senha := null;
  return new;
end;
$$;
revoke execute on function public.cifrar_senha_acesso() from public, anon, authenticated;

drop trigger if exists trg_cifrar_senha_acesso on public.acessos;
create trigger trg_cifrar_senha_acesso
  before insert or update on public.acessos
  for each row execute function public.cifrar_senha_acesso();

-- passivo: cifra o que estava guardado (texto puro ou formato antigo do navegador)
update public.acessos set senha = senha where senha is not null;

-- leitura pela regra de área
drop policy if exists "Users can view company acessos" on public.acessos;
create policy "Acessos visiveis pela area" on public.acessos
  for select to authenticated
  using (
    (select public.is_super_admin())
    or exists (select 1 from usuarios u
                where u.id = (select auth.uid()) and u.active
                  and u.empresa_id = acessos.empresa_id
                  and (u.profile in ('admin', 'gestor')
                       or acessos.area_vinculada && public.acessos_areas_do_perfil(u.profile::text))));

create or replace function public.acessos_revelar_senha(p_id uuid, p_acao text default 'visualizou_senha')
returns text
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_usuario usuarios%rowtype;
  v_acesso acessos%rowtype;
begin
  select * into v_usuario from usuarios where id = (select auth.uid()) and active;
  select * into v_acesso from acessos where id = p_id;
  if v_acesso.id is null or (v_usuario.id is null and not public.is_super_admin()) then
    raise exception 'acesso não encontrado' using errcode = '42501';
  end if;
  if not (public.is_super_admin()
          or (v_usuario.empresa_id = v_acesso.empresa_id
              and (v_usuario.profile in ('admin', 'gestor')
                   or v_acesso.area_vinculada && public.acessos_areas_do_perfil(v_usuario.profile::text)))) then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
  if v_acesso.senha_cifrada is null then
    return null;
  end if;

  insert into acessos_audit_log (acesso_id, usuario_id, empresa_id, acao)
  values (v_acesso.id, coalesce(v_usuario.id, (select auth.uid())), v_acesso.empresa_id,
          case when p_acao in ('visualizou_senha', 'copiou_senha') then p_acao else 'visualizou_senha' end);

  return extensions.pgp_sym_decrypt(v_acesso.senha_cifrada, public.chave_cofre_acessos());
end;
$$;
revoke execute on function public.acessos_revelar_senha(uuid, text) from public, anon;
grant execute on function public.acessos_revelar_senha(uuid, text) to authenticated;

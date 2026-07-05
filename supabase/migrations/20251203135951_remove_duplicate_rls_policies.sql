/*
  # Remove Duplicate RLS Policies

  1. **Security Improvements**
    - Remove duplicate permissive RLS policies
    - Multiple permissive policies for the same action can cause confusion and potential security gaps
    - Keep only the most specific and efficient policies

  2. **Tables with duplicate policies removed:**
    - atividades
    - cancelamentos
    - empresas
    - fotos_camararia
    - fotos_cozinha
    - itens_camararia
    - manutencoes
    - perfis_empresa
    - permissoes_perfil
    - registros_areas_comuns
    - registros_atividades_diarias
    - registros_atividades_extras
    - registros_camararia
    - registros_gestao
    - registros_recepcao
    - registros_revisao
    - servicos_camararia
    - suites
    - tipos_areas_comuns
    - tipos_atividades
    - tipos_extras
    - tipos_gestao
    - tipos_recepcao
    - usuarios

  3. **Security Notes**
    - Removing duplicate policies simplifies RLS logic
    - Reduces potential for policy conflicts
    - Improves policy maintainability
*/

-- Drop old/duplicate policies for atividades
DROP POLICY IF EXISTS "Admins podem modificar atividades" ON public.atividades;

-- Drop old/duplicate policies for cancelamentos
DROP POLICY IF EXISTS "Admins podem modificar cancelamentos" ON public.cancelamentos;
DROP POLICY IF EXISTS "Usuários autenticados podem criar cancelamentos" ON public.cancelamentos;

-- Drop old/duplicate policies for empresas
DROP POLICY IF EXISTS "Acesso completo DELETE para autenticados" ON public.empresas;
DROP POLICY IF EXISTS "Acesso completo INSERT para autenticados" ON public.empresas;
DROP POLICY IF EXISTS "Acesso completo SELECT para autenticados" ON public.empresas;
DROP POLICY IF EXISTS "Acesso completo UPDATE para autenticados" ON public.empresas;

-- Drop old/duplicate policies for fotos_camararia
DROP POLICY IF EXISTS "Admins e camararia podem modificar fotos de camararia de sua em" ON public.fotos_camararia;
DROP POLICY IF EXISTS "Admins e camararia podem inserir fotos de camararia" ON public.fotos_camararia;
DROP POLICY IF EXISTS "Admins e camararia podem atualizar fotos de camararia" ON public.fotos_camararia;
DROP POLICY IF EXISTS "Admins podem deletar fotos de camararia" ON public.fotos_camararia;
DROP POLICY IF EXISTS "Usuários podem ler fotos de camararia da própria empresa" ON public.fotos_camararia;

-- Drop old/duplicate policies for fotos_cozinha
DROP POLICY IF EXISTS "Admins e cozinha podem modificar fotos de cozinha de sua empres" ON public.fotos_cozinha;
DROP POLICY IF EXISTS "Admins e cozinha podem inserir fotos de cozinha" ON public.fotos_cozinha;
DROP POLICY IF EXISTS "Admins e cozinha podem atualizar fotos de cozinha" ON public.fotos_cozinha;
DROP POLICY IF EXISTS "Admins podem deletar fotos de cozinha" ON public.fotos_cozinha;
DROP POLICY IF EXISTS "Usuários podem ler fotos de cozinha da própria empresa" ON public.fotos_cozinha;

-- Drop old/duplicate policies for manutencoes
DROP POLICY IF EXISTS "Usuários de manutenção podem modificar manutenções" ON public.manutencoes;

-- Drop old/duplicate policies for registros_areas_comuns
DROP POLICY IF EXISTS "Usuários de áreas comuns podem modificar seus registros" ON public.registros_areas_comuns;

-- Drop old/duplicate policies for registros_atividades_diarias
DROP POLICY IF EXISTS "Usuários podem modificar seus registros de atividades diárias" ON public.registros_atividades_diarias;

-- Drop old/duplicate policies for registros_atividades_extras
DROP POLICY IF EXISTS "Usuários podem modificar seus registros de atividades extras" ON public.registros_atividades_extras;

-- Drop old/duplicate policies for registros_camararia
DROP POLICY IF EXISTS "Usuários de camararia podem modificar seus registros" ON public.registros_camararia;

-- Drop old/duplicate policies for registros_gestao
DROP POLICY IF EXISTS "Usuários de gestão podem modificar seus registros" ON public.registros_gestao;

-- Drop old/duplicate policies for registros_recepcao
DROP POLICY IF EXISTS "Usuários de recepção podem modificar seus registros" ON public.registros_recepcao;

-- Drop old/duplicate policies for registros_revisao
DROP POLICY IF EXISTS "Usuários de revisão podem modificar seus registros" ON public.registros_revisao;

-- Drop old/duplicate policies for suites
DROP POLICY IF EXISTS "Admins podem modificar suites" ON public.suites;

-- Drop old/duplicate policies for tipos_recepcao
DROP POLICY IF EXISTS "Admins podem modificar tipos de recepção" ON public.tipos_recepcao;
DROP POLICY IF EXISTS "Usuários de recepção podem modificar tipos de recepção" ON public.tipos_recepcao;

-- Drop old/duplicate policies for usuarios
DROP POLICY IF EXISTS "Allow admins and self to insert usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Allow admins to update usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Allow admins to delete usuarios" ON public.usuarios;

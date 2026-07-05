import { supabase } from '../lib/supabase';

export interface PerfilSistema {
  id: string;
  profile: string;
  nome_exibicao: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  permissoes: string[];
}


export class PermissionsService {
  // Buscar perfis padrão do sistema
  static async getSystemProfiles(): Promise<PerfilSistema[]> {
    try {
      // Retornar perfis padrão do sistema com IDs padronizados
      const perfisDefault: PerfilSistema[] = [
        {
          id: 'admin',
          profile: 'admin',
          nome_exibicao: 'Administrador',
          ativo: true,
          created_at: '',
          updated_at: '',
          permissoes: ['usuarios', 'suites', 'empresa', 'recepcao', 'camararia', 'revisao', 'areas_comuns', 'atividades_extras', 'atividades_diarias', 'gestao', 'cozinha', 'vendas', 'manutencao', 'relatorios', 'cadastros', 'perfis', 'acessos', 'ver_acessos', 'lembretes', 'configuracao_metas', 'recalcular_performance', 'monitoramento_performance']
        },
        {
          id: 'gestor',
          profile: 'gestor',
          nome_exibicao: 'Gestor',
          ativo: true,
          created_at: '',
          updated_at: '',
          permissoes: ['usuarios', 'suites', 'recepcao', 'camararia', 'revisao', 'areas_comuns', 'atividades_extras', 'atividades_diarias', 'gestao', 'cozinha', 'vendas', 'manutencao', 'relatorios', 'cadastros', 'perfis', 'acessos', 'ver_acessos', 'lembretes']
        },
        {
          id: 'recepcao',
          profile: 'recepcao',
          nome_exibicao: 'Recepção',
          ativo: true,
          created_at: '',
          updated_at: '',
          permissoes: ['recepcao', 'revisao', 'manutencao', 'ver_acessos']
        },
        {
          id: 'camararia',
          profile: 'camararia',
          nome_exibicao: 'Camararia',
          ativo: true,
          created_at: '',
          updated_at: '',
          permissoes: ['camararia', 'revisao', 'areas_comuns', 'atividades_extras', 'manutencao', 'ver_acessos']
        },
        {
          id: 'revisao',
          profile: 'revisao',
          nome_exibicao: 'Revisão',
          ativo: true,
          created_at: '',
          updated_at: '',
          permissoes: ['camararia', 'revisao', 'areas_comuns', 'manutencao', 'ver_acessos']
        },
        {
          id: 'areas_comuns',
          profile: 'areas_comuns',
          nome_exibicao: 'Áreas Comuns',
          ativo: true,
          created_at: '',
          updated_at: '',
          permissoes: ['camararia', 'revisao', 'areas_comuns', 'atividades_extras', 'manutencao', 'ver_acessos']
        },
        {
          id: 'manutencao',
          profile: 'manutencao',
          nome_exibicao: 'Manutenção',
          ativo: true,
          created_at: '',
          updated_at: '',
          permissoes: ['camararia', 'revisao', 'areas_comuns', 'atividades_diarias', 'manutencao', 'ver_acessos']
        },
        {
          id: 'atividades_extras',
          profile: 'atividades_extras',
          nome_exibicao: 'Atividades Extras',
          ativo: true,
          created_at: '',
          updated_at: '',
          permissoes: ['atividades_extras', 'manutencao', 'ver_acessos']
        },
        {
          id: 'atividades_diarias',
          profile: 'atividades_diarias',
          nome_exibicao: 'Atividades Diárias',
          ativo: true,
          created_at: '',
          updated_at: '',
          permissoes: ['atividades_diarias', 'atividades_extras', 'manutencao', 'ver_acessos']
        },
        {
          id: 'cozinha',
          profile: 'cozinha',
          nome_exibicao: 'Cozinha',
          ativo: true,
          created_at: '',
          updated_at: '',
          permissoes: ['cozinha', 'manutencao', 'ver_acessos']
        },
        {
          id: 'vendas',
          profile: 'vendas',
          nome_exibicao: 'Vendas',
          ativo: true,
          created_at: '',
          updated_at: '',
          permissoes: ['vendas', 'manutencao', 'ver_acessos']
        }
      ];

      return perfisDefault;
    } catch (error) {
      return [];
    }
  }

  // Atualizar permissões de um perfil no banco de dados (GLOBAL)
  static async updateProfilePermissions(profile: string, permissions: string[]): Promise<boolean> {
    try {
      // Verificar se o perfil já existe na tabela global
      const { data: existingProfile, error: selectError } = await supabase
        .from('perfis_sistema_permissoes')
        .select('*')
        .eq('profile', profile)
        .maybeSingle();

      if (selectError && selectError.code !== 'PGRST116') {
        return false;
      }

      // Se o perfil já existe, atualizar permissões
      if (existingProfile) {
        const { error: updateError } = await supabase
          .from('perfis_sistema_permissoes')
          .update({
            permissoes: permissions,
            updated_at: new Date().toISOString()
          })
          .eq('profile', profile);

        if (updateError) {
          return false;
        }

        return true;
      }

      // Se não existe, criar novo perfil global
      const { error: insertError } = await supabase
        .from('perfis_sistema_permissoes')
        .insert({
          profile: profile,
          permissoes: permissions
        });

      if (insertError) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  // Buscar permissões de um perfil do banco de dados (GLOBAL)
  static async getProfilePermissions(profile: string): Promise<string[]> {
    try {
      // Buscar permissões globais do perfil
      const { data: perfilGlobal, error: perfilError } = await supabase
        .from('perfis_sistema_permissoes')
        .select('permissoes')
        .eq('profile', profile)
        .maybeSingle();

      if (perfilError && perfilError.code !== 'PGRST116') {
        console.error('Error fetching global permissions:', perfilError);
      }

      // Se encontrou no banco, retornar as permissões
      if (perfilGlobal && perfilGlobal.permissoes) {
        return perfilGlobal.permissoes;
      }

      // Fallback: usar permissões padrão hardcoded
      const defaultProfile = (await this.getSystemProfiles()).find(p => p.profile === profile);
      return defaultProfile?.permissoes || [];
    } catch (error) {
      console.error('Error getting profile permissions:', error);
      const defaultProfile = (await this.getSystemProfiles()).find(p => p.profile === profile);
      return defaultProfile?.permissoes || [];
    }
  }

  // Verificar se um usuário tem acesso a um módulo (consulta banco de dados GLOBAL)
  static async hasAccess(userProfile: string, module: string): Promise<boolean> {
    try {
      // Admin sempre tem acesso
      if (userProfile === 'admin') {
        return true;
      }

      // Buscar permissões do banco de dados global
      const permissions = await this.getProfilePermissions(userProfile);

      if (permissions.length > 0) {
        return permissions.includes(module);
      }

      // Usar permissões padrão como fallback
      return this.getFallbackPermission(userProfile, module);
    } catch (error) {
      return this.getFallbackPermission(userProfile, module);
    }
  }

  // Fallback para permissões padrão (baseado no AuthService atual)
  private static getFallbackPermission(userProfile: string, module: string): boolean {
    const permissions: Record<string, string[]> = {
      admin: ['usuarios', 'suites', 'empresa', 'recepcao', 'camararia', 'revisao', 'areas_comuns', 'atividades_extras', 'atividades_diarias', 'gestao', 'cozinha', 'vendas', 'manutencao', 'relatorios', 'cadastros', 'perfis', 'acessos', 'ver_acessos', 'lembretes', 'configuracao_metas', 'recalcular_performance', 'monitoramento_performance'],
      recepcao: ['recepcao', 'revisao', 'manutencao', 'ver_acessos'],
      camararia: ['camararia', 'revisao', 'areas_comuns', 'atividades_extras', 'manutencao', 'ver_acessos'],
      revisao: ['camararia', 'revisao', 'areas_comuns', 'manutencao', 'ver_acessos'],
      areas_comuns: ['camararia', 'revisao', 'areas_comuns', 'atividades_extras', 'manutencao', 'ver_acessos'],
      manutencao: ['camararia', 'revisao', 'areas_comuns', 'atividades_diarias', 'manutencao', 'ver_acessos'],
      gestor: ['usuarios', 'suites', 'recepcao', 'camararia', 'revisao', 'areas_comuns', 'atividades_extras', 'atividades_diarias', 'gestao', 'cozinha', 'vendas', 'manutencao', 'relatorios', 'cadastros', 'perfis', 'acessos', 'ver_acessos', 'lembretes'],
      atividades_extras: ['atividades_extras', 'manutencao', 'ver_acessos'],
      atividades_diarias: ['atividades_diarias', 'atividades_extras', 'manutencao', 'ver_acessos'],
      cozinha: ['cozinha', 'manutencao', 'ver_acessos'],
      vendas: ['vendas', 'manutencao', 'ver_acessos'],
    };

    return permissions[userProfile]?.includes(module) || false;
  }

  // Obter perfis do sistema com permissões customizadas aplicadas (do banco de dados GLOBAL)
  static async getSystemProfilesWithCustomPermissions(): Promise<PerfilSistema[]> {
    try {
      const perfisDefault = await this.getSystemProfiles();

      // Buscar permissões customizadas do banco global
      const perfisComPermissoes = await Promise.all(
        perfisDefault.map(async (perfil) => {
          const permissoes = await this.getProfilePermissions(perfil.profile);
          return {
            ...perfil,
            permissoes: permissoes.length > 0 ? permissoes : perfil.permissoes
          };
        })
      );

      return perfisComPermissoes;
    } catch (error) {
      console.error('Error getting system profiles with custom permissions:', error);
      return await this.getSystemProfiles();
    }
  }

  // Listar módulos disponíveis
  static getAvailableModules(): { id: string; label: string }[] {
    return [
      { id: 'usuarios', label: 'Usuários' },
      { id: 'suites', label: 'Suítes' },
      { id: 'empresa', label: 'Empresa' },
      { id: 'recepcao', label: 'Recepção' },
      { id: 'camararia', label: 'Camararia' },
      { id: 'revisao', label: 'Revisão' },
      { id: 'areas_comuns', label: 'Áreas Comuns' },
      { id: 'atividades_extras', label: 'Atividades Extras' },
      { id: 'atividades_diarias', label: 'Atividades Diárias' },
      { id: 'gestao', label: 'Gestão' },
      { id: 'cozinha', label: 'Cozinha' },
      { id: 'vendas', label: 'Vendas' },
      { id: 'manutencao', label: 'Manutenção' },
      { id: 'relatorios', label: 'Relatórios' },
      { id: 'cadastros', label: 'Cadastros' },
      { id: 'perfis', label: 'Perfis' },
      { id: 'acessos', label: 'Acessos' },
      { id: 'ver_acessos', label: 'Ver Acessos' },
      { id: 'lembretes', label: 'Lembretes' },
      { id: 'configuracao_metas', label: 'Configuração de Metas' },
      { id: 'recalcular_performance', label: 'Recalcular Performance' },
      { id: 'monitoramento_performance', label: 'Monitoramento' }
    ];
  }

  // Obter todos os perfis disponíveis
  static getAllAvailableProfiles(): { id: string; label: string }[] {
    return [
      { id: 'admin', label: 'Administrador' },
      { id: 'gestor', label: 'Gestor' },
      { id: 'recepcao', label: 'Recepção' },
      { id: 'camararia', label: 'Camararia' },
      { id: 'revisao', label: 'Revisão' },
      { id: 'areas_comuns', label: 'Áreas Comuns' },
      { id: 'manutencao', label: 'Manutenção' },
      { id: 'atividades_extras', label: 'Atividades Extras' },
      { id: 'atividades_diarias', label: 'Atividades Diárias' },
      { id: 'cozinha', label: 'Cozinha' },
      { id: 'vendas', label: 'Vendas' }
    ];
  }
}
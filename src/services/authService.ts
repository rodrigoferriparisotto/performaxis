import { supabase } from '../lib/supabase';
import { AuthUser } from '../types';
import { PermissionsService } from './permissionsService';

export class AuthService {
  static async login(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, user: null, error: error.message };
      }

      if (!data.user) {
        return { success: false, user: null, error: 'Usuário não encontrado' };
      }
      // Buscar dados do usuário na tabela usuarios
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', data.user.id)
        .eq('active', true)
        .maybeSingle();

      if (userError || !userData) {
        await supabase.auth.signOut();
        return { success: false, user: null, error: 'Usuário não autorizado' };
      }
      const authUser: AuthUser = {
        id: userData.id,
        name: userData.name,
        login: data.user.email!,
        profile: userData.profile,
        active: userData.active,
        empresaId: userData.empresa_id,
        dataContratacao: userData.data_contratacao,
        telefone: userData.telefone,
      };

      return { success: true, user: authUser, error: null };
    } catch (error) {
      return { success: false, user: null, error: 'Erro interno do servidor' };
    }
  }

  static async logout() {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      // Silent fail
    }
  }

  static async getCurrentSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        if (
          error.message.includes('session_not_found') ||
          error.message.includes('Session from session_id claim in JWT does not exist') ||
          error.message.includes('Refresh Token Not Found') ||
          error.message.includes('refresh_token_not_found')
        ) {
          await supabase.auth.signOut();
        }
        return { user: null };
      }

      if (!session?.user) {
        return { user: null };
      }

      // Buscar dados do usuário na tabela usuarios
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', session.user.id)
        .eq('active', true)
        .maybeSingle();

      if (userError || !userData) {
        await supabase.auth.signOut();
        return { user: null };
      }

      const authUser: AuthUser = {
        id: userData.id,
        name: userData.name,
        login: userData.login,
        profile: userData.profile,
        active: userData.active,
        dataContratacao: userData.data_contratacao,
        telefone: userData.telefone,
        empresaId: userData.empresa_id,
      };

      return { user: authUser };
    } catch (error) {
      try {
        await supabase.auth.signOut();
      } catch (logoutError) {
        // Silent fail
      }
      return { user: null };
    }
  }

  static async register(userData: {
    name: string;
    email: string;
    password: string;
    telefone: string;
    profile: string;
    data_contratacao: string;
    login: string;
  }) {
    try {
      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
      });

      if (authError) {
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        return { success: false, error: 'Falha ao criar usuário' };
      }

      // Criar registro na tabela usuarios
      const { error: dbError } = await supabase
        .from('usuarios')
        .insert({
          id: authData.user.id,
          name: userData.name,
          telefone: userData.telefone,
          profile: userData.profile as any,
          data_contratacao: userData.data_contratacao,
          login: userData.login,
          active: true,
        });

      if (dbError) {
        await supabase.auth.admin.deleteUser(authData.user.id);
        return { success: false, error: 'Erro ao salvar dados do usuário' };
      }

      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: 'Erro interno do servidor' };
    }
  }

  static async resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      
      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: 'Erro interno do servidor' };
    }
  }

  static async createUser(userData: {
    email: string;
    password: string;
    name: string;
    telefone: string;
    profile: string;
    dataContratacao: string;
    active: boolean;
    empresaId?: string;
  }) {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        return { success: false, error: 'Sessão não encontrada', userId: null };
      }

      const { data: currentUserData, error: currentUserError } = await supabase
        .from('usuarios')
        .select('profile, empresa_id')
        .eq('id', session.user.id)
        .maybeSingle();

      if (currentUserError || !currentUserData) {
        return { success: false, error: 'Erro ao verificar permissões do usuário', userId: null };
      }

      const isAdmin = currentUserData.profile === 'admin' && currentUserData.empresa_id === null;
      const isCreatingManagerOrAdmin = userData.profile === 'gestor' || userData.profile === 'admin';

      let empresaIdFinal = userData.empresaId;

      if (!empresaIdFinal && !isAdmin) {
        if (currentUserData.empresa_id) {
          empresaIdFinal = currentUserData.empresa_id;
        }
      }

      if (!empresaIdFinal && !isCreatingManagerOrAdmin) {
        return { success: false, error: 'ID da empresa é obrigatório para este tipo de usuário', userId: null };
      }

      if (!empresaIdFinal && !isAdmin) {
        return { success: false, error: 'Apenas administradores podem criar usuários sem empresa', userId: null };
      }

      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
          name: userData.name,
          telefone: userData.telefone,
          profile: userData.profile,
          dataContratacao: userData.dataContratacao,
          active: userData.active,
          empresaId: empresaIdFinal || null,
        })
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result.details
          ? `${result.error}: ${result.details}`
          : (result.error || 'Erro ao criar usuário');
        return { success: false, error: errorMessage, userId: null };
      }

      return { success: true, error: null, userId: result.userId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
      return { success: false, error: errorMessage, userId: null };
    }
  }

  static async updateUserPassword(userId: string, newPassword: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        return { success: false, error: 'Sessão não encontrada' };
      }

      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user-password`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          newPassword
        })
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Erro ao atualizar senha' };
      }

      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: 'Erro interno do servidor' };
    }
  }

  static async deleteUser(userId: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        return { success: false, error: 'Sessão não encontrada' };
      }

      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId
        })
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Erro ao excluir usuário' };
      }

      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: 'Erro interno do servidor' };
    }
  }

  static async hasAccess(userProfile: string, module: string): Promise<boolean> {
    try {
      return await PermissionsService.hasAccess(userProfile, module);
    } catch (error) {
      return this.hasAccessFallback(userProfile, module);
    }
  }

  // Método síncrono para fallback
  static hasAccessFallback(userProfile: string, module: string): boolean {
    const permissions: Record<string, string[]> = {
      admin: ['usuarios', 'suites', 'empresa', 'recepcao', 'camararia', 'revisao', 'areas_comuns', 'atividades_extras', 'atividades_diarias', 'gestao', 'vendas', 'cozinha', 'manutencao', 'relatorios', 'cadastros', 'perfis'],
      recepcao: ['recepcao', 'revisao', 'manutencao'],
      camararia: ['camararia', 'revisao', 'areas_comuns', 'atividades_extras', 'manutencao'],
      revisao: ['camararia', 'revisao', 'areas_comuns', 'manutencao'],
      areas_comuns: ['camararia', 'revisao', 'areas_comuns', 'atividades_extras', 'manutencao'],
      manutencao: ['camararia', 'revisao', 'areas_comuns', 'atividades_diarias', 'manutencao'],
      gestor: ['usuarios', 'suites', 'recepcao', 'camararia', 'revisao', 'areas_comuns', 'atividades_extras', 'atividades_diarias', 'gestao', 'vendas', 'cozinha', 'manutencao', 'relatorios', 'cadastros', 'perfis'],
      atividades_extras: ['atividades_extras', 'manutencao'],
      atividades_diarias: ['atividades_diarias', 'atividades_extras', 'manutencao'],
      cozinha: ['cozinha', 'manutencao'],
      vendas: ['vendas', 'manutencao'],
    };
    return permissions[userProfile]?.includes(module) || false;
  }
}
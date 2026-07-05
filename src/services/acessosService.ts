import { supabase } from '../lib/supabase';
import { encryptPassword, decryptPassword } from './encryptionService';

export type AreaVinculada =
  | 'recepcao'
  | 'camararia'
  | 'revisao'
  | 'gestao'
  | 'vendas'
  | 'cozinha'
  | 'areas_comuns'
  | 'atividades_diarias'
  | 'atividades_extras'
  | 'manutencao'
  | 'geral';

export type UserProfile =
  | 'admin'
  | 'recepcao'
  | 'camararia'
  | 'revisao'
  | 'areas_comuns'
  | 'manutencao'
  | 'gestor'
  | 'cozinha'
  | 'vendas'
  | 'atividades_diarias'
  | 'atividades_extras';

export interface Acesso {
  id: string;
  titulo: string;
  login: string | null;
  senha: string | null;
  url_acesso: string | null;
  comentarios: string | null;
  area_vinculada: AreaVinculada[];
  empresa_id: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface AcessoInsert {
  titulo: string;
  login?: string;
  senha?: string;
  url_acesso?: string;
  comentarios?: string;
  area_vinculada: AreaVinculada[];
  empresa_id: string;
  ativo?: boolean;
}

export interface AcessoUpdate extends Partial<AcessoInsert> {}

export interface LogAcesso {
  id: string;
  usuario_id: string | null;
  empresa_id: string;
  usuario_nome: string;
  usuario_profile: string;
  data_hora: string;
  acao: string;
  modulo_acessado: string | null;
  detalhes: string | null;
  ip_address: string | null;
  navegador: string | null;
  dispositivo: string | null;
  created_at: string;
}

export interface LogAcessoCreateData {
  usuario_id?: string;
  empresa_id: string;
  usuario_nome: string;
  usuario_profile: string;
  acao: string;
  modulo_acessado?: string;
  detalhes?: string;
  ip_address?: string;
  navegador?: string;
  dispositivo?: string;
}

export interface AcessoAuditLog {
  id: string;
  acesso_id: string;
  usuario_id: string;
  empresa_id: string;
  acao: 'visualizou_senha' | 'copiou_senha' | 'visualizou_login' | 'copiou_login';
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

function mapProfileToArea(profile: UserProfile): AreaVinculada[] {
  const profileAreaMap: Record<UserProfile, AreaVinculada[]> = {
    admin: [], // Admin vê tudo, retorna vazio para indicar sem filtro
    recepcao: ['recepcao'],
    camararia: ['camararia'],
    revisao: ['revisao'],
    areas_comuns: ['areas_comuns'],
    manutencao: ['manutencao'],
    gestor: ['gestao'], // Gestor mapeia para gestao
    cozinha: ['cozinha'],
    vendas: ['vendas'],
    atividades_diarias: ['atividades_diarias'],
    atividades_extras: ['atividades_extras'],
  };

  return profileAreaMap[profile] || [];
}

export const acessosService = {
  async getAcessos(empresaId: string): Promise<Acesso[]> {
    const { data, error } = await supabase
      .from('acessos')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('titulo', { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
  },

  async getAcessosByUserProfile(empresaId: string, userProfile: UserProfile): Promise<Acesso[]> {
    const allowedAreas = mapProfileToArea(userProfile);

    if (userProfile === 'admin' || allowedAreas.length === 0) {
      return this.getAcessos(empresaId);
    }

    const { data, error } = await supabase
      .from('acessos')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('titulo', { ascending: true });

    if (error) {
      throw error;
    }

    const filteredData = (data || []).filter((acesso) =>
      acesso.area_vinculada.some((area) => allowedAreas.includes(area))
    );

    return filteredData;
  },

  async getAcessoById(id: string): Promise<Acesso | null> {
    const { data, error } = await supabase
      .from('acessos')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  },

  async getAcessosByArea(empresaId: string, area: AreaVinculada): Promise<Acesso[]> {
    const { data, error } = await supabase
      .from('acessos')
      .select('*')
      .eq('empresa_id', empresaId)
      .contains('area_vinculada', [area])
      .order('titulo', { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
  },

  async getAcessosAtivos(empresaId: string): Promise<Acesso[]> {
    const { data, error } = await supabase
      .from('acessos')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .order('titulo', { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
  },

  async createAcesso(acesso: AcessoInsert): Promise<Acesso> {
    const acessoToInsert = { ...acesso };

    if (acessoToInsert.senha) {
      acessoToInsert.senha = await encryptPassword(acessoToInsert.senha);
    }

    const { data, error } = await supabase
      .from('acessos')
      .insert(acessoToInsert)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  async updateAcesso(id: string, acesso: AcessoUpdate): Promise<Acesso> {
    const acessoToUpdate = { ...acesso };

    if (acessoToUpdate.senha) {
      acessoToUpdate.senha = await encryptPassword(acessoToUpdate.senha);
    }

    const { data, error } = await supabase
      .from('acessos')
      .update(acessoToUpdate)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  async deleteAcesso(id: string): Promise<void> {
    const { error } = await supabase
      .from('acessos')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  },

  async searchAcessos(empresaId: string, searchTerm: string): Promise<Acesso[]> {
    const { data, error } = await supabase
      .from('acessos')
      .select('*')
      .eq('empresa_id', empresaId)
      .or(`titulo.ilike.%${searchTerm}%,login.ilike.%${searchTerm}%,comentarios.ilike.%${searchTerm}%`)
      .order('titulo', { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
  },

  // Logs de Acesso
  async getAllLogs(empresaId: string, limit = 100, offset = 0): Promise<LogAcesso[]> {
    const { data, error } = await supabase
      .from('logs_acesso')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('data_hora', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return data || [];
  },

  async getLogsByUser(usuarioId: string, limit = 50): Promise<LogAcesso[]> {
    const { data, error } = await supabase
      .from('logs_acesso')
      .select('*')
      .eq('usuario_id', usuarioId)
      .order('data_hora', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return data || [];
  },

  async getLogsByDateRange(empresaId: string, startDate: string, endDate: string): Promise<LogAcesso[]> {
    const { data, error } = await supabase
      .from('logs_acesso')
      .select('*')
      .eq('empresa_id', empresaId)
      .gte('data_hora', startDate)
      .lte('data_hora', endDate)
      .order('data_hora', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  },

  async getLogsByAction(empresaId: string, acao: string, limit = 100): Promise<LogAcesso[]> {
    const { data, error } = await supabase
      .from('logs_acesso')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('acao', acao)
      .order('data_hora', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return data || [];
  },

  async getLogsByProfile(empresaId: string, profile: string, limit = 100): Promise<LogAcesso[]> {
    const { data, error } = await supabase
      .from('logs_acesso')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('usuario_profile', profile)
      .order('data_hora', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return data || [];
  },

  async createLog(logData: LogAcessoCreateData): Promise<LogAcesso> {
    const { data, error } = await supabase
      .from('logs_acesso')
      .insert(logData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  async countLogsByAction(empresaId: string): Promise<Record<string, number>> {
    const { data, error } = await supabase
      .from('logs_acesso')
      .select('acao')
      .eq('empresa_id', empresaId);

    if (error) {
      throw error;
    }

    const counts: Record<string, number> = {};
    data?.forEach((log) => {
      counts[log.acao] = (counts[log.acao] || 0) + 1;
    });

    return counts;
  },

  async getTotalLogsCount(empresaId: string): Promise<number> {
    const { count, error } = await supabase
      .from('logs_acesso')
      .select('*', { count: 'exact', head: true })
      .eq('empresa_id', empresaId);

    if (error) {
      throw error;
    }

    return count || 0;
  },

  async decryptSenha(encryptedSenha: string): Promise<string> {
    return await decryptPassword(encryptedSenha);
  },

  async createAuditLog(
    acessoId: string,
    usuarioId: string,
    empresaId: string,
    acao: 'visualizou_senha' | 'copiou_senha' | 'visualizou_login' | 'copiou_login'
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('acessos_audit_log')
        .insert({
          acesso_id: acessoId,
          usuario_id: usuarioId,
          empresa_id: empresaId,
          acao: acao,
          user_agent: navigator.userAgent,
        });

      if (error) {
        console.error('Failed to create audit log:', error);
      }
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  },

  async getAuditLogs(empresaId: string, limit = 100, offset = 0): Promise<AcessoAuditLog[]> {
    const { data, error } = await supabase
      .from('acessos_audit_log')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return data || [];
  },

  async getAuditLogsByAcesso(acessoId: string): Promise<AcessoAuditLog[]> {
    const { data, error } = await supabase
      .from('acessos_audit_log')
      .select('*')
      .eq('acesso_id', acessoId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  },
};

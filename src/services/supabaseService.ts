import { supabase, Database } from '../lib/supabase';
import { AuthUser } from '../types';

// Serviço para Empresas
export const empresaService = {
  async getEmpresa() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return null;
      }

      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', userData.empresa_id)
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  },

  async getAllEmpresas() {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .order('nome');

      if (error) {
        return [];
      }

      return data || [];
    } catch (error) {
      return [];
    }
  },

  async createEmpresa(empresaData: any) {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .insert(empresaData)
        .select()
        .single();

      if (error) {
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async updateEmpresa(id: string, empresaData: any) {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .update(empresaData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  },

  async deleteEmpresa(id: string) {
    try {
      // Verificar se a empresa tem usuários ou registros
      const [usuariosResult, registrosResult] = await Promise.all([
        supabase.from('usuarios').select('id').eq('empresa_id', id),
        supabase.from('registros_recepcao').select('id').eq('empresa_id', id).limit(1)
      ]);

      const temUsuarios = usuariosResult.data && usuariosResult.data.length > 0;
      const temRegistros = registrosResult.data && registrosResult.data.length > 0;

      if (temUsuarios && usuariosResult.data!.length > 1) {
        // Múltiplos usuários: inativar empresa
        const { error } = await supabase
          .from('empresas')
          .update({ ativo: false })
          .eq('id', id);

        if (error) {
          return false;
        }

        alert('Empresa inativada com sucesso!\n\nA empresa tinha múltiplos usuários, por isso foi inativada em vez de excluída.');
        return true;
      } else if (temRegistros) {
        // Tem registros: inativar empresa
        const { error } = await supabase
          .from('empresas')
          .update({ ativo: false })
          .eq('id', id);

        if (error) {
          return false;
        }

        alert('Empresa inativada com sucesso!\n\nA empresa tinha registros históricos, por isso foi inativada em vez de excluída.');
        return true;
      } else {
        // Pode excluir completamente
        const { error } = await supabase
          .from('empresas')
          .delete()
          .eq('id', id);

        if (error) {
          return false;
        }

        alert('Empresa excluída com sucesso!\n\nA empresa foi completamente removida do sistema.');
        return true;
      }
    } catch (error) {
      return false;
    }
  }
};

// Serviço para Usuários
export const usuarioService = {
  async getUsuarios() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id, profile')
        .eq('id', user.id)
        .single();

      if (userError) {
        return [];
      }

      const isSuperAdmin = userData?.profile === 'admin' && userData?.empresa_id === null;

      if (isSuperAdmin) {
        const { data, error } = await supabase
          .from('usuarios')
          .select(`
            *,
            empresa:empresas(id, nome, endereco, numero_usuarios, ativo)
          `)
          .order('name');

        if (error) {
          return [];
        }

        return data || [];
      }

      if (!userData?.empresa_id) {
        return [];
      }

      const { data, error } = await supabase
        .from('usuarios')
        .select(`
          *,
          empresa:empresas(id, nome, endereco, numero_usuarios, ativo)
        `)
        .eq('empresa_id', userData.empresa_id)
        .order('name');

      if (error) {
        return [];
      }

      return data || [];
    } catch (error) {
      return [];
    }
  },

  async updateUsuario(id: string, userData: any) {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .update(userData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  },

  async deleteUsuario(id: string) {
    try {
      const { error } = await supabase
        .from('usuarios')
        .delete()
        .eq('id', id);

      if (error) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }
};

// Serviço para Suítes
export const suiteService = {
  async getSuites() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return [];
      }

      const { data, error } = await supabase
        .from('suites')
        .select('*')
        .eq('empresa_id', userData.empresa_id)
        .order('name');

      if (error) {
        return [];
      }

      return data || [];
    } catch (error) {
      return [];
    }
  },

  async saveSuite(suiteData: any) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return null;
      }

      const { data, error } = await supabase
        .from('suites')
        .insert({
          ...suiteData,
          empresa_id: userData.empresa_id
        })
        .select()
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  },

  async updateSuite(id: string, suiteData: any) {
    try {
      const { data, error } = await supabase
        .from('suites')
        .update(suiteData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  },

  async deleteSuite(id: string) {
    try {
      const { error } = await supabase
        .from('suites')
        .delete()
        .eq('id', id);

      if (error) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }
};

// Serviço para Atividades
export const atividadeService = {
  async getAtividades() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return [];
      }

      const { data, error } = await supabase
        .from('atividades')
        .select('*')
        .eq('empresa_id', userData.empresa_id)
        .eq('active', true)
        .order('order_position');

      if (error) {
        return [];
      }

      return data || [];
    } catch (error) {
      return [];
    }
  },

  async getAtividadesByType(type: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return [];
      }

      const { data, error } = await supabase
        .from('atividades')
        .select('*')
        .eq('empresa_id', userData.empresa_id)
        .eq('type', type)
        .eq('active', true)
        .order('order_position');

      if (error) {
        return [];
      }

      return data || [];
    } catch (error) {
      return [];
    }
  },

  async saveAtividade(atividadeData: any) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return null;
      }

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError) {
        return null;
      }

      if (!userData?.empresa_id) {
        alert('Erro: Usuário não possui empresa vinculada. Entre em contato com o administrador.');
        return null;
      }

      const dataToInsert = {
        ...atividadeData,
        empresa_id: userData.empresa_id
      };

      const { data, error } = await supabase
        .from('atividades')
        .insert(dataToInsert)
        .select()
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  },

  async updateAtividade(id: string, atividadeData: any) {
    try {
      const { data, error } = await supabase
        .from('atividades')
        .update(atividadeData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  },

  async deleteAtividade(id: string) {
    try {
      const { error } = await supabase
        .from('atividades')
        .delete()
        .eq('id', id);

      if (error) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  },

  async reorderAtividades(reorderData: { id: string; order_position: number }[]) {
    try {
      const promises = reorderData.map(item =>
        supabase
          .from('atividades')
          .update({ order_position: item.order_position })
          .eq('id', item.id)
      );

      const results = await Promise.all(promises);
      const hasError = results.some(result => result.error);

      if (hasError) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }
};

// Serviço para Registros de Recepção
export const registroRecepcaoService = {
  async getRegistros(page = 0, pageSize = 15) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return [];
      }

      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data, error } = await supabase
        .from('registros_recepcao')
        .select('*')
        .eq('empresa_id', userData.empresa_id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        return [];
      }

      return data || [];
    } catch (error) {
      return [];
    }
  },

  async getRegistrosCount() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return 0;
      }

      const { count, error } = await supabase
        .from('registros_recepcao')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', userData.empresa_id);

      if (error) {
        return 0;
      }

      return count || 0;
    } catch (error) {
      return 0;
    }
  },

  async getRegistroEmAndamento(usuarioId: string, data?: string) {
    try {
      const { data: registros, error } = await supabase
        .from('registros_recepcao')
        .select('*')
        .eq('usuario_id', usuarioId)
        .eq('status', 'em_andamento')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        return null;
      }

      const registro = registros?.[0] || null;

      return registro;
    } catch (error) {
      return null;
    }
  },

  async saveRegistro(registroData: any) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return null;
      }

      const { data, error } = await supabase
        .from('registros_recepcao')
        .insert({
          ...registroData,
          empresa_id: userData.empresa_id,
          usuario_executor_id: registroData.usuario_executor_id || user.id
        })
        .select()
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  },

  async updateRegistro(id: string, registroData: any) {
    try {
      const { data, error } = await supabase
        .from('registros_recepcao')
        .update(registroData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  },

  async deleteRegistro(id: string) {
    try {
      const { error } = await supabase
        .from('registros_recepcao')
        .delete()
        .eq('id', id);

      if (error) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  },

  async getRegistrosByPeriodo(dataInicio: string, dataFim: string, usuarioId?: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return [];
      }

      let query = supabase
        .from('registros_recepcao')
        .select('*')
        .eq('empresa_id', userData.empresa_id)
        .gte('data', dataInicio)
        .lte('data', dataFim);

      if (usuarioId) {
        query = query.eq('usuario_id', usuarioId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        return [];
      }

      return data || [];
    } catch (error) {
      return [];
    }
  }
};

// Serviço para Registros de Camararia
export const registroCamarariaService = {
  async getRegistros(page = 0, pageSize = 15) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return [];
      }

      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data, error } = await supabase
        .from('registros_camararia')
        .select('*')
        .eq('empresa_id', userData.empresa_id)
        .neq('status', 'programado')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        return [];
      }

      return data || [];
    } catch (error) {
      return [];
    }
  },

  async getRegistrosCount() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return 0;
      }

      const { count, error } = await supabase
        .from('registros_camararia')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', userData.empresa_id)
        .neq('status', 'programado');

      if (error) {
        return 0;
      }

      return count || 0;
    } catch (error) {
      return 0;
    }
  },

  async getRegistroEmAndamento(usuarioId: string, data?: string) {
    try {
      let query = supabase
        .from('registros_camararia')
        .select('*')
        .eq('usuario_executor_id', usuarioId)
        .eq('status', 'em_andamento')
        .order('created_at', { ascending: false })
        .limit(1);

      if (data) {
        query = query.eq('data', data);
      }

      const { data: registro, error } = await query.maybeSingle();

      if (error) {
        if (error.code !== 'PGRST116') {
        }
        return null;
      }

      if (!registro) {
        return null;
      }

      return registro;
    } catch (error) {
      return null;
    }
  },

  async getAllRegistrosEmAndamento(usuarioId: string) {
    try {
      const { data: registros, error } = await supabase
        .from('registros_camararia')
        .select('*')
        .eq('usuario_executor_id', usuarioId)
        .eq('status', 'em_andamento')
        .order('data', { ascending: true });

      if (error) {
        return [];
      }

      return registros || [];
    } catch (error) {
      return [];
    }
  },

  async saveRegistro(registroData: any) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return null;
      }

      const { data, error } = await supabase
        .from('registros_camararia')
        .insert({
          ...registroData,
          empresa_id: userData.empresa_id
        })
        .select()
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  },

  async updateRegistro(id: string, registroData: any) {
    try {
      const { data, error } = await supabase
        .from('registros_camararia')
        .update(registroData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  },

  async deleteRegistro(id: string) {
    try {
      const { error } = await supabase
        .from('registros_camararia')
        .delete()
        .eq('id', id);

      if (error) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  },

  async getRegistrosByPeriodo(dataInicio: string, dataFim: string, usuarioId?: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return [];
      }

      let query = supabase
        .from('registros_camararia')
        .select('*')
        .eq('empresa_id', userData.empresa_id)
        .gte('data', dataInicio)
        .lte('data', dataFim)
        .neq('status', 'programado');

      if (usuarioId) {
        query = query.eq('usuario_id', usuarioId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        return [];
      }

      return data || [];
    } catch (error) {
      return [];
    }
  }
};

// Serviço para Registros de Revisão
export const registroRevisaoService = {
  async getRegistros(page = 0, pageSize = 15) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return [];
      }

      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data, error } = await supabase
        .from('registros_revisao')
        .select('*')
        .eq('empresa_id', userData.empresa_id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        return [];
      }

      return data || [];
    } catch (error) {
      return [];
    }
  },

  async getRegistrosCount() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return 0;
      }

      const { count, error } = await supabase
        .from('registros_revisao')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', userData.empresa_id);

      if (error) {
        return 0;
      }

      return count || 0;
    } catch (error) {
      return 0;
    }
  },

  async getRegistroEmAndamento(usuarioId: string, data?: string) {
    try {
      const { data: registros, error } = await supabase
        .from('registros_revisao')
        .select('*')
        .eq('usuario_id', usuarioId)
        .eq('status', 'em_andamento')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        return null;
      }

      const registro = registros?.[0] || null;

      return registro;
    } catch (error) {
      return null;
    }
  },

  async getRegistrosPendentesRevisao(data: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return [];
      }

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return [];
      }

      const { data: registrosCamararia, error } = await supabase
        .from('registros_camararia')
        .select('*')
        .eq('empresa_id', userData.empresa_id)
        .eq('data', data)
        .eq('status', 'concluido')
        .order('hora_fim', { ascending: false });

      if (error) {
        return [];
      }

      if (!registrosCamararia || registrosCamararia.length === 0) {
        return [];
      }

      const { data: revisoesExistentes, error: revisaoError } = await supabase
        .from('registros_revisao')
        .select('registro_camararia_id')
        .eq('empresa_id', userData.empresa_id)
        .in('registro_camararia_id', registrosCamararia.map(r => r.id));

      if (revisaoError) {
        return [];
      }

      const idsJaRevisados = new Set((revisoesExistentes || []).map(r => r.registro_camararia_id));

      const registrosPendentes = registrosCamararia.filter(registro => !idsJaRevisados.has(registro.id));

      return registrosPendentes;
    } catch (error) {
      return [];
    }
  },

  async saveRegistro(registroData: any) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return null;
      }

      const { data, error } = await supabase
        .from('registros_revisao')
        .insert({
          ...registroData,
          empresa_id: userData.empresa_id,
          usuario_executor_id: registroData.usuario_executor_id || user.id
        })
        .select()
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  },

  async updateRegistro(id: string, registroData: any) {
    try {
      const { data, error } = await supabase
        .from('registros_revisao')
        .update(registroData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  },

  async deleteRegistro(id: string) {
    try {
      const { error } = await supabase
        .from('registros_revisao')
        .delete()
        .eq('id', id);

      if (error) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  },

  async getRegistrosByPeriodo(dataInicio: string, dataFim: string, usuarioId?: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return [];
      }

      let query = supabase
        .from('registros_revisao')
        .select('*')
        .eq('empresa_id', userData.empresa_id)
        .gte('data', dataInicio)
        .lte('data', dataFim);

      if (usuarioId) {
        query = query.eq('usuario_id', usuarioId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        return [];
      }

      return data || [];
    } catch (error) {
      return [];
    }
  }
};

// Serviço para Registros de Áreas Comuns
export const registroAreasComunsService = {
  async getRegistros(page = 0, pageSize = 15) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return [];
      }

      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data, error } = await supabase
        .from('registros_areas_comuns')
        .select('*')
        .eq('empresa_id', userData.empresa_id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        return [];
      }

      return data || [];
    } catch (error) {
      return [];
    }
  },

  async getRegistrosCount() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return 0;
      }

      const { count, error } = await supabase
        .from('registros_areas_comuns')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', userData.empresa_id);

      if (error) {
        return 0;
      }

      return count || 0;
    } catch (error) {
      return 0;
    }
  },

  async getRegistroEmAndamento(usuarioId: string, data?: string) {
    try {
      const { data: registros, error } = await supabase
        .from('registros_areas_comuns')
        .select('*')
        .eq('usuario_id', usuarioId)
        .eq('status', 'em_andamento')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        return null;
      }

      const registro = registros?.[0] || null;

      return registro;
    } catch (error) {
      return null;
    }
  },

  async saveRegistro(registroData: any) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return null;
      }

      const { data, error } = await supabase
        .from('registros_areas_comuns')
        .insert({
          ...registroData,
          empresa_id: userData.empresa_id,
          usuario_executor_id: registroData.usuario_executor_id || user.id
        })
        .select()
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  },

  async updateRegistro(id: string, registroData: any) {
    try {
      const { data, error } = await supabase
        .from('registros_areas_comuns')
        .update(registroData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  },

  async deleteRegistro(id: string) {
    try {
      const { error } = await supabase
        .from('registros_areas_comuns')
        .delete()
        .eq('id', id);

      if (error) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  },

  async getRegistrosByPeriodo(dataInicio: string, dataFim: string, usuarioId?: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return [];
      }

      let query = supabase
        .from('registros_areas_comuns')
        .select('*')
        .eq('empresa_id', userData.empresa_id)
        .gte('data', dataInicio)
        .lte('data', dataFim);

      if (usuarioId) {
        query = query.eq('usuario_id', usuarioId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        return [];
      }

      return data || [];
    } catch (error) {
      return [];
    }
  }
};

// Serviço para Registros de Gestão
export const registroGestaoService = {
  async getRegistros(page = 0, pageSize = 15) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return [];
      }

      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data, error } = await supabase
        .from('registros_gestao')
        .select('*')
        .eq('empresa_id', userData.empresa_id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        return [];
      }

      return data || [];
    } catch (error) {
      return [];
    }
  },

  async getRegistrosCount() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return 0;
      }

      const { count, error } = await supabase
        .from('registros_gestao')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', userData.empresa_id);

      if (error) {
        return 0;
      }

      return count || 0;
    } catch (error) {
      return 0;
    }
  },

  async getRegistroEmAndamento(usuarioId: string, data?: string) {
    try {
      const { data: registros, error } = await supabase
        .from('registros_gestao')
        .select('*')
        .eq('usuario_id', usuarioId)
        .eq('status', 'em_andamento')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        return null;
      }

      const registro = registros?.[0] || null;

      return registro;
    } catch (error) {
      return null;
    }
  },

  async saveRegistro(registroData: any) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return null;
      }

      const { data, error } = await supabase
        .from('registros_gestao')
        .insert({
          ...registroData,
          empresa_id: userData.empresa_id,
          usuario_executor_id: registroData.usuario_executor_id || user.id
        })
        .select()
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  },

  async updateRegistro(id: string, registroData: any) {
    try {
      const { data, error } = await supabase
        .from('registros_gestao')
        .update(registroData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  },

  async deleteRegistro(id: string) {
    try {
      const { error } = await supabase
        .from('registros_gestao')
        .delete()
        .eq('id', id);

      if (error) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  },

  async getRegistrosByPeriodo(dataInicio: string, dataFim: string, usuarioId?: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return [];
      }

      let query = supabase
        .from('registros_gestao')
        .select('*')
        .eq('empresa_id', userData.empresa_id)
        .gte('data', dataInicio)
        .lte('data', dataFim);

      if (usuarioId) {
        query = query.eq('usuario_id', usuarioId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        return [];
      }

      return data || [];
    } catch (error) {
      return [];
    }
  }
};

// Serviço para Registros de Atividades Extras
export const registroAtividadesExtrasService = {
  async getRegistros(page = 0, pageSize = 15) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return [];
      }

      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data, error } = await supabase
        .from('registros_atividades_extras')
        .select('*')
        .eq('empresa_id', userData.empresa_id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        return [];
      }

      return data || [];
    } catch (error) {
      return [];
    }
  },

  async getRegistrosCount() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return 0;
      }

      const { count, error } = await supabase
        .from('registros_atividades_extras')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', userData.empresa_id);

      if (error) {
        return 0;
      }

      return count || 0;
    } catch (error) {
      return 0;
    }
  },

  async getRegistroEmAndamento(usuarioId: string, data?: string) {
    try {
      const { data: registros, error } = await supabase
        .from('registros_atividades_extras')
        .select('*')
        .eq('usuario_id', usuarioId)
        .eq('status', 'em_andamento')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        return null;
      }

      const registro = registros?.[0] || null;

      return registro;
    } catch (error) {
      return null;
    }
  },

  async saveRegistro(registroData: any) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return null;
      }

      const { data, error } = await supabase
        .from('registros_atividades_extras')
        .insert({
          ...registroData,
          empresa_id: userData.empresa_id,
          usuario_executor_id: registroData.usuario_executor_id || user.id
        })
        .select()
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  },

  async updateRegistro(id: string, registroData: any) {
    try {
      const { data, error } = await supabase
        .from('registros_atividades_extras')
        .update(registroData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  },

  async deleteRegistro(id: string) {
    try {
      const { error } = await supabase
        .from('registros_atividades_extras')
        .delete()
        .eq('id', id);

      if (error) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  },

  async getRegistrosByPeriodo(dataInicio: string, dataFim: string, usuarioId?: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return [];
      }

      let query = supabase
        .from('registros_atividades_extras')
        .select('*')
        .eq('empresa_id', userData.empresa_id)
        .gte('data', dataInicio)
        .lte('data', dataFim);

      if (usuarioId) {
        query = query.eq('usuario_id', usuarioId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        return [];
      }

      return data || [];
    } catch (error) {
      return [];
    }
  }
};

// Serviço para Registros de Atividades Diárias
export const registroAtividadesDiariasService = {
  async getRegistros(page = 0, pageSize = 15) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return [];
      }

      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data, error } = await supabase
        .from('registros_atividades_diarias')
        .select('*')
        .eq('empresa_id', userData.empresa_id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        return [];
      }

      return data || [];
    } catch (error) {
      return [];
    }
  },

  async getRegistrosCount() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return 0;
      }

      const { count, error } = await supabase
        .from('registros_atividades_diarias')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', userData.empresa_id);

      if (error) {
        return 0;
      }

      return count || 0;
    } catch (error) {
      return 0;
    }
  },

  async getRegistroEmAndamento(usuarioId: string, data?: string) {
    try {
      const { data: registros, error } = await supabase
        .from('registros_atividades_diarias')
        .select('*')
        .eq('usuario_id', usuarioId)
        .eq('status', 'em_andamento')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        return null;
      }

      const registro = registros?.[0] || null;

      return registro;
    } catch (error) {
      return null;
    }
  },

  async saveRegistro(registroData: any) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return null;
      }

      const { data, error } = await supabase
        .from('registros_atividades_diarias')
        .insert({
          ...registroData,
          empresa_id: userData.empresa_id,
          usuario_executor_id: registroData.usuario_executor_id || user.id
        })
        .select()
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  },

  async updateRegistro(id: string, registroData: any) {
    try {
      const { data, error } = await supabase
        .from('registros_atividades_diarias')
        .update(registroData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  },

  async deleteRegistro(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error, count } = await supabase
        .from('registros_atividades_diarias')
        .delete({ count: 'exact' })
        .eq('id', id);

      if (error) {
        return {
          success: false,
          error: error.message || 'Erro ao excluir registro'
        };
      }

      if (count === 0) {
        return {
          success: false,
          error: 'Registro não encontrado ou você não tem permissão para excluí-lo'
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Erro inesperado ao excluir registro'
      };
    }
  },

  async getRegistrosByPeriodo(dataInicio: string, dataFim: string, usuarioId?: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return [];
      }

      let query = supabase
        .from('registros_atividades_diarias')
        .select('*')
        .eq('empresa_id', userData.empresa_id)
        .gte('data', dataInicio)
        .lte('data', dataFim);

      if (usuarioId) {
        query = query.eq('usuario_id', usuarioId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        return [];
      }

      return data || [];
    } catch (error) {
      return [];
    }
  }
};

// Serviço para Manutenções
export const manutencaoService = {
  async getManutencoesByStatus(status: string[], currentPage?: number, pageSize?: number) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return [];
      }

      let query = supabase
        .from('manutencoes')
        .select(`
          *,
          solicitante:usuarios!solicitante_id(id, name)
        `)
        .eq('empresa_id', userData.empresa_id)
        .in('status', status)
        .order('order_position')
        .order('created_at', { ascending: false });

      if (currentPage !== undefined && pageSize !== undefined) {
        const offset = currentPage * pageSize;
        query = query.range(offset, offset + pageSize - 1);
      }

      const { data, error } = await query;

      if (error) {
        return [];
      }

      return data || [];
    } catch (error) {
      return [];
    }
  },

  async getManutencoesCount(status: string[]) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return 0;
      }

      const { count, error } = await supabase
        .from('manutencoes')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', userData.empresa_id)
        .in('status', status);

      if (error) {
        return 0;
      }

      return count || 0;
    } catch (error) {
      return 0;
    }
  },

  async saveManutencao(manutencaoData: any) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return null;
      }

      const { data, error } = await supabase
        .from('manutencoes')
        .insert({
          ...manutencaoData,
          empresa_id: userData.empresa_id,
          solicitante_id: user.id
        })
        .select()
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  },

  async updateManutencao(id: string, manutencaoData: any) {
    try {
      const { data, error } = await supabase
        .from('manutencoes')
        .update(manutencaoData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  },

  async deleteManutencao(id: string) {
    try {
      const { error } = await supabase
        .from('manutencoes')
        .delete()
        .eq('id', id);

      if (error) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  },

  async getManutencoesByPeriodo(dataInicio: string, dataFim: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return [];
      }

      const { data, error } = await supabase
        .from('manutencoes')
        .select('*')
        .eq('empresa_id', userData.empresa_id)
        .gte('data', dataInicio)
        .lte('data', dataFim)
        .order('created_at', { ascending: false });

      if (error) {
        return [];
      }

      return data || [];
    } catch (error) {
      return [];
    }
  },

  async reorderManutencoes(reorderData: { id: string; order_position: number }[]) {
    try {
      const promises = reorderData.map(item =>
        supabase
          .from('manutencoes')
          .update({ order_position: item.order_position })
          .eq('id', item.id)
      );

      const results = await Promise.all(promises);
      const hasError = results.some(result => result.error);

      if (hasError) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }
};

// Serviço para Cancelamentos
export const cancelamentoService = {
  async saveCancelamento(cancelamentoData: any) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return null;
      }

      const { data, error } = await supabase
        .from('cancelamentos')
        .insert({
          ...cancelamentoData,
          empresa_id: userData.empresa_id
        })
        .select()
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  },

  async getCancelamentosByPeriodo(dataInicio: string, dataFim: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return [];
      }

      const { data, error } = await supabase
        .from('cancelamentos')
        .select('*')
        .eq('empresa_id', userData.empresa_id)
        .gte('data_hora', dataInicio)
        .lte('data_hora', dataFim)
        .order('data_hora', { ascending: false });

      if (error) {
        return [];
      }

      return data || [];
    } catch (error) {
      return [];
    }
  }
};

// Serviço para Registros de Cozinha
export const registroCozinhaService = {
  async getRegistros(page = 0, pageSize = 15) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return [];
      }

      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data, error } = await supabase
        .from('registros_cozinha')
        .select('*')
        .eq('empresa_id', userData.empresa_id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        return [];
      }

      return data || [];
    } catch (error) {
      return [];
    }
  },

  async getRegistrosCount() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return 0;
      }

      const { count, error } = await supabase
        .from('registros_cozinha')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', userData.empresa_id);

      if (error) {
        return 0;
      }

      return count || 0;
    } catch (error) {
      return 0;
    }
  },

  async getRegistroEmAndamento(usuarioId: string, data?: string) {
    try {
      const { data: registros, error } = await supabase
        .from('registros_cozinha')
        .select('*')
        .eq('usuario_id', usuarioId)
        .eq('status', 'em_andamento')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        return null;
      }

      const registro = registros?.[0] || null;

      return registro;
    } catch (error) {
      return null;
    }
  },

  async saveRegistro(registroData: any) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return null;
      }

      const { data, error } = await supabase
        .from('registros_cozinha')
        .insert({
          ...registroData,
          empresa_id: userData.empresa_id,
          usuario_executor_id: registroData.usuario_executor_id || user.id
        })
        .select()
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  },

  async updateRegistro(id: string, registroData: any) {
    try {
      const { data, error } = await supabase
        .from('registros_cozinha')
        .update(registroData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  },

  async deleteRegistro(id: string) {
    try {
      const { error } = await supabase
        .from('registros_cozinha')
        .delete()
        .eq('id', id);

      if (error) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  },

  async getRegistrosByPeriodo(dataInicio: string, dataFim: string, usuarioId?: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return [];
      }

      let query = supabase
        .from('registros_cozinha')
        .select('*')
        .eq('empresa_id', userData.empresa_id)
        .gte('data', dataInicio)
        .lte('data', dataFim);

      if (usuarioId) {
        query = query.eq('usuario_id', usuarioId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        return [];
      }

      return data || [];
    } catch (error) {
      return [];
    }
  }
};

// Serviço para Registros de Vendas
export const registroVendasService = {
  async getRegistros(page = 0, pageSize = 15) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return [];
      }

      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data, error } = await supabase
        .from('registros_vendas')
        .select('*')
        .eq('empresa_id', userData.empresa_id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        return [];
      }

      return data || [];
    } catch (error) {
      return [];
    }
  },

  async getRegistrosCount() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return 0;
      }

      const { count, error } = await supabase
        .from('registros_vendas')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', userData.empresa_id);

      if (error) {
        return 0;
      }

      return count || 0;
    } catch (error) {
      return 0;
    }
  },

  async getRegistroEmAndamento(usuarioId: string, data?: string) {
    try {
      const { data: registros, error } = await supabase
        .from('registros_vendas')
        .select('*')
        .eq('usuario_id', usuarioId)
        .eq('status', 'em_andamento')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        return null;
      }

      const registro = registros?.[0] || null;

      return registro;
    } catch (error) {
      return null;
    }
  },

  async saveRegistro(registroData: any) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return null;
      }

      const { data, error } = await supabase
        .from('registros_vendas')
        .insert({
          ...registroData,
          empresa_id: userData.empresa_id,
          usuario_executor_id: registroData.usuario_executor_id || user.id
        })
        .select()
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  },

  async updateRegistro(id: string, registroData: any) {
    try {
      const { data, error } = await supabase
        .from('registros_vendas')
        .update(registroData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  },

  async deleteRegistro(id: string) {
    try {
      const { error } = await supabase
        .from('registros_vendas')
        .delete()
        .eq('id', id);

      if (error) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  },

  async getRegistrosByPeriodo(dataInicio: string, dataFim: string, usuarioId?: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) {
        return [];
      }

      let query = supabase
        .from('registros_vendas')
        .select('*')
        .eq('empresa_id', userData.empresa_id)
        .gte('data', dataInicio)
        .lte('data', dataFim);

      if (usuarioId) {
        query = query.eq('usuario_id', usuarioId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        return [];
      }

      return data || [];
    } catch (error) {
      return [];
    }
  }
};

// Exports para compatibilidade com código antigo (serão removidos após migração completa)
export const registroDiurnasService = registroAtividadesExtrasService;
export const registroNoturnasService = registroAtividadesDiariasService;
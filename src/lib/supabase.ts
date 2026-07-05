import { createClient } from '@supabase/supabase-js';

// Usar valores padrão se as variáveis não estiverem configuradas
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

// Verificar se as variáveis de ambiente estão configuradas
const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://placeholder.supabase.co' &&
  supabaseAnonKey !== 'placeholder-key' &&
  supabaseUrl.includes('supabase.co')
);

// Criar cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: {
      getItem: (key: string) => {
        try {
          return localStorage.getItem(key);
        } catch {
          return null;
        }
      },
      setItem: (key: string, value: string) => {
        try {
          localStorage.setItem(key, value);
        } catch {
        }
      },
      removeItem: (key: string) => {
        try {
          localStorage.removeItem(key);
        } catch {
        }
      }
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    },
    timeout: 20000,
    heartbeatIntervalMs: 15000
  },
  global: {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  },
});

// Listener para eventos de autenticação
supabase.auth.onAuthStateChange((async (event, session) => {
  // Silent listener
}) as any);

// Flag para verificar se Supabase está disponível
export const isSupabaseAvailable = isSupabaseConfigured;

// Tipos para o banco de dados
export type Database = {
  public: {
    Enums: {
      suite_status_enum: 'disponivel' | 'ocupada' | 'limpeza' | 'manutencao';
      user_profile_enum: 'admin' | 'recepcao' | 'camararia' | 'revisao' | 'areas_comuns' | 'manutencao' | 'gestor' | 'cozinha' | 'vendas' | 'atividades_extras' | 'atividades_diarias';
      activity_type_enum: 'recepcao' | 'camararia' | 'revisao' | 'areas_comuns' | 'manutencao' | 'gestao' | 'cozinha' | 'vendas';
      registro_status_enum: 'em_andamento' | 'concluido' | 'programado';
      tipo_servico_enum: 'suite_livre' | 'permanencia' | 'check_out' | 'check_in';
      manutencao_tipo_enum: 'correcao' | 'conserto' | 'nova_instalacao' | 'preventiva' | 'substituicao';
      manutencao_prioridade_enum: 'baixa' | 'normal' | 'alta';
      manutencao_status_enum: 'aberto' | 'em_andamento' | 'pausada' | 'concluida';
    };
    Tables: {
      empresas: {
        Row: {
          id: string;
          nome: string;
          endereco: string;
          email: string;
          whatsapp: string;
          contato: string;
          numero_quartos: number;
          numero_andares: number;
          numero_usuarios: number;
          ativo: boolean;
          created_at: string;
          updated_at: string;
          inicio_contrato: string | null;
          duracao_contrato_meses: number | null;
          final_contrato: string | null;
          valor_instalacao: number | null;
          valor_mensalidade: number | null;
          tipo_pagamento: string | null;
          forma_pagamento: string | null;
          valor_total: number | null;
          valor_mensal: number | null;
        };
        Insert: {
          nome: string;
          endereco: string;
          email: string;
          whatsapp: string;
          contato: string;
          numero_quartos?: number;
          numero_andares?: number;
          numero_usuarios?: number;
          ativo?: boolean;
          inicio_contrato?: string;
          duracao_contrato_meses?: number;
          valor_instalacao?: number;
          valor_mensalidade?: number;
          tipo_pagamento?: string;
          forma_pagamento?: string;
        };
        Update: Partial<Database['public']['Tables']['empresas']['Insert']>;
      };
      usuarios: {
        Row: {
          id: string;
          name: string;
          data_contratacao: string;
          telefone: string;
          login: string;
          profile: Database['public']['Enums']['user_profile_enum'];
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          data_contratacao: string;
          telefone: string;
          login: string;
          profile: Database['public']['Enums']['user_profile_enum'];
          active?: boolean;
        };
        Update: Partial<Database['public']['Tables']['usuarios']['Insert']>;
      };
      atividades: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          type: Database['public']['Enums']['activity_type_enum'];
          active: boolean;
          order_position: number;
          dias_semana: string[] | null;
          permanencia: boolean;
          suite_livre: boolean;
          created_at: string;
          updated_at: string;
          tipos_extras: string[] | null;
        };
        Insert: {
          name: string;
          description?: string;
          type: Database['public']['Enums']['activity_type_enum'];
          active?: boolean;
          order_position?: number;
          dias_semana?: string[];
          permanencia?: boolean;
          suite_livre?: boolean;
          tipos_extras?: string[];
        };
        Update: Partial<Database['public']['Tables']['atividades']['Insert']>;
      };
      suites: {
        Row: {
          id: string;
          name: string;
          type: string;
          status: Database['public']['Enums']['suite_status_enum'];
          floor: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          type: string;
          status?: Database['public']['Enums']['suite_status_enum'];
          floor: number;
        };
        Update: Partial<Database['public']['Tables']['suites']['Insert']>;
      };
      registros_recepcao: {
        Row: {
          id: string;
          data: string;
          usuario_id: string;
          hora_inicio: string;
          hora_fim: string | null;
          atividades: any;
          observacoes: string | null;
          fotos: string[];
          status: Database['public']['Enums']['registro_status_enum'];
          tipo_recepcao_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          data: string;
          usuario_id: string;
          hora_inicio: string;
          hora_fim?: string;
          atividades?: any;
          observacoes?: string;
          fotos?: string[];
          status?: Database['public']['Enums']['registro_status_enum'];
          tipo_recepcao_id?: string;
        };
        Update: Partial<Database['public']['Tables']['registros_recepcao']['Insert']>;
      };
      registros_camararia: {
        Row: {
          id: string;
          data: string;
          suite_id: string;
          tipo_servico: Database['public']['Enums']['tipo_servico_enum'];
          usuario_id: string;
          hora_inicio: string;
          hora_fim: string | null;
          atividades: any;
          observacoes: string | null;
          fotos: string[];
          status: Database['public']['Enums']['registro_status_enum'];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          data: string;
          suite_id: string;
          tipo_servico: Database['public']['Enums']['tipo_servico_enum'];
          usuario_id: string;
          hora_inicio: string;
          hora_fim?: string;
          atividades?: any;
          observacoes?: string;
          fotos?: string[];
          status?: Database['public']['Enums']['registro_status_enum'];
        };
        Update: Partial<Database['public']['Tables']['registros_camararia']['Insert']>;
      };
      registros_revisao: {
        Row: {
          id: string;
          data: string;
          suite_id: string;
          tipo_servico: Database['public']['Enums']['tipo_servico_enum'];
          usuario_id: string;
          hora_inicio: string;
          hora_fim: string | null;
          atividades: any;
          observacoes: string | null;
          fotos: string[];
          status: Database['public']['Enums']['registro_status_enum'];
          registro_camararia_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          data: string;
          suite_id: string;
          tipo_servico?: Database['public']['Enums']['tipo_servico_enum'];
          usuario_id: string;
          hora_inicio: string;
          hora_fim?: string;
          atividades?: any;
          observacoes?: string;
          fotos?: string[];
          status?: Database['public']['Enums']['registro_status_enum'];
          registro_camararia_id?: string;
        };
        Update: Partial<Database['public']['Tables']['registros_revisao']['Insert']>;
      };
      registros_areas_comuns: {
        Row: {
          id: string;
          data: string;
          usuario_id: string;
          hora_inicio: string;
          hora_fim: string | null;
          atividades: any;
          observacoes: string | null;
          fotos: string[];
          status: Database['public']['Enums']['registro_status_enum'];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          data: string;
          usuario_id: string;
          hora_inicio: string;
          hora_fim?: string;
          atividades?: any;
          observacoes?: string;
          fotos?: string[];
          status?: Database['public']['Enums']['registro_status_enum'];
        };
        Update: Partial<Database['public']['Tables']['registros_areas_comuns']['Insert']>;
      };
      registros_gestao: {
        Row: {
          id: string;
          data: string;
          usuario_id: string;
          hora_inicio: string;
          hora_fim: string | null;
          atividades: any;
          observacoes: string | null;
          fotos: string[];
          status: Database['public']['Enums']['registro_status_enum'];
          tipo_gestao_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          data: string;
          usuario_id: string;
          hora_inicio: string;
          hora_fim?: string;
          atividades?: any;
          observacoes?: string;
          fotos?: string[];
          status?: Database['public']['Enums']['registro_status_enum'];
          tipo_gestao_id?: string;
        };
        Update: Partial<Database['public']['Tables']['registros_gestao']['Insert']>;
      };
      registros_vendas: {
        Row: {
          id: string;
          data: string;
          usuario_id: string;
          empresa_id: string;
          hora_inicio: string;
          hora_fim: string | null;
          atividades: any;
          observacoes: string | null;
          fotos: string[];
          status: Database['public']['Enums']['registro_status_enum'];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          data: string;
          usuario_id: string;
          empresa_id: string;
          hora_inicio: string;
          hora_fim?: string;
          atividades?: any;
          observacoes?: string;
          fotos?: string[];
          status?: Database['public']['Enums']['registro_status_enum'];
        };
        Update: Partial<Database['public']['Tables']['registros_vendas']['Insert']>;
      };
      registros_atividades_diarias: {
        Row: {
          id: string;
          data: string;
          usuario_id: string;
          empresa_id: string;
          hora_inicio: string;
          hora_fim: string | null;
          atividades: any;
          observacoes: string | null;
          fotos: string[];
          status: Database['public']['Enums']['registro_status_enum'];
          tipo_atividade_id: string | null;
          created_at: string;
          updated_at: string;
          usuario_executor_id: string | null;
        };
        Insert: {
          data: string;
          usuario_id: string;
          empresa_id: string;
          hora_inicio: string;
          hora_fim?: string;
          atividades?: any;
          observacoes?: string;
          fotos?: string[];
          status?: Database['public']['Enums']['registro_status_enum'];
          tipo_atividade_id?: string;
          usuario_executor_id?: string;
        };
        Update: Partial<Database['public']['Tables']['registros_atividades_diarias']['Insert']>;
      };
      registros_atividades_extras: {
        Row: {
          id: string;
          data: string;
          usuario_id: string;
          empresa_id: string;
          hora_inicio: string;
          hora_fim: string | null;
          atividades: any;
          observacoes: string | null;
          fotos: string[];
          status: Database['public']['Enums']['registro_status_enum'];
          tipo_atividade_id: string | null;
          created_at: string;
          updated_at: string;
          usuario_executor_id: string | null;
        };
        Insert: {
          data: string;
          usuario_id: string;
          empresa_id: string;
          hora_inicio: string;
          hora_fim?: string;
          atividades?: any;
          observacoes?: string;
          fotos?: string[];
          status?: Database['public']['Enums']['registro_status_enum'];
          tipo_atividade_id?: string;
          usuario_executor_id?: string;
        };
        Update: Partial<Database['public']['Tables']['registros_atividades_extras']['Insert']>;
      };
      registros_cozinha: {
        Row: {
          id: string;
          data: string;
          usuario_id: string;
          empresa_id: string;
          hora_inicio: string;
          hora_fim: string | null;
          atividades: any;
          observacoes: string | null;
          fotos: string[];
          status: Database['public']['Enums']['registro_status_enum'];
          tipo_cozinha_id: string | null;
          created_at: string;
          updated_at: string;
          usuario_executor_id: string | null;
        };
        Insert: {
          data: string;
          usuario_id: string;
          empresa_id: string;
          hora_inicio: string;
          hora_fim?: string;
          atividades?: any;
          observacoes?: string;
          fotos?: string[];
          status?: Database['public']['Enums']['registro_status_enum'];
          tipo_cozinha_id?: string;
          usuario_executor_id?: string;
        };
        Update: Partial<Database['public']['Tables']['registros_cozinha']['Insert']>;
      };
      manutencoes: {
        Row: {
          id: string;
          data: string;
          local: string;
          tipo: Database['public']['Enums']['manutencao_tipo_enum'];
          prioridade: Database['public']['Enums']['manutencao_prioridade_enum'];
          descricao: string;
          observacoes: string | null;
          fotos: string[];
          status: Database['public']['Enums']['manutencao_status_enum'];
          usuario_id: string | null;
          usuario_executor_id: string | null;
          hora_inicio: string | null;
          hora_fim: string | null;
          pausas: any | null;
          tempo_total: number | null;
          order_position: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          data: string;
          local: string;
          tipo: Database['public']['Enums']['manutencao_tipo_enum'];
          prioridade: Database['public']['Enums']['manutencao_prioridade_enum'];
          descricao: string;
          observacoes?: string;
          fotos?: string[];
          status?: Database['public']['Enums']['manutencao_status_enum'];
          usuario_id?: string;
          usuario_executor_id?: string;
          hora_inicio?: string;
          hora_fim?: string;
          pausas?: any;
          tempo_total?: number;
          order_position?: number;
        };
        Update: Partial<Database['public']['Tables']['manutencoes']['Insert']>;
      };
      cancelamentos: {
        Row: {
          id: string;
          tipo: string;
          usuario_id: string;
          data_hora: string;
          registro_id: string | null;
          suite_id: string | null;
          motivo: string | null;
          created_at: string;
        };
        Insert: {
          tipo: string;
          usuario_id: string;
          data_hora: string;
          registro_id?: string;
          suite_id?: string;
          motivo?: string;
        };
        Update: Partial<Database['public']['Tables']['cancelamentos']['Insert']>;
      };
      tipos_extras: {
        Row: {
          id: string;
          nome: string;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          nome: string;
          ativo?: boolean;
        };
        Update: Partial<Database['public']['Tables']['tipos_extras']['Insert']>;
      };
      tipos_areas_comuns: {
        Row: {
          id: string;
          nome: string;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          nome: string;
          ativo?: boolean;
        };
        Update: Partial<Database['public']['Tables']['tipos_areas_comuns']['Insert']>;
      };
      tipos_funcoes_comerciais: {
        Row: {
          id: string;
          nome: string;
          ativo: boolean;
          empresa_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          nome: string;
          ativo?: boolean;
          empresa_id: string;
        };
        Update: Partial<Database['public']['Tables']['tipos_funcoes_comerciais']['Insert']>;
      };
      perfis_sistema_permissoes: {
        Row: {
          id: string;
          profile: string;
          permissoes: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          profile: string;
          permissoes: string[];
        };
        Update: Partial<Database['public']['Tables']['perfis_sistema_permissoes']['Insert']>;
      };
      acessos: {
        Row: {
          id: string;
          titulo: string;
          login: string | null;
          senha: string | null;
          url_acesso: string | null;
          comentarios: string | null;
          area_vinculada: ('recepcao' | 'camararia' | 'revisao' | 'gestao' | 'vendas' | 'cozinha' | 'areas_comuns' | 'atividades_diarias' | 'atividades_extras' | 'manutencao' | 'geral')[];
          empresa_id: string;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          titulo: string;
          login?: string;
          senha?: string;
          url_acesso?: string;
          comentarios?: string;
          area_vinculada: ('recepcao' | 'camararia' | 'revisao' | 'gestao' | 'vendas' | 'cozinha' | 'areas_comuns' | 'atividades_diarias' | 'atividades_extras' | 'manutencao' | 'geral')[];
          empresa_id: string;
          ativo?: boolean;
        };
        Update: Partial<Database['public']['Tables']['acessos']['Insert']>;
      };
    };
  };
};
export interface AuthUser {
  id: string;
  name: string;
  login: string;
  profile: 'admin' | 'recepcao' | 'camararia' | 'revisao' | 'areas_comuns' | 'manutencao' | 'gestor' | 'cozinha' | 'vendas' | 'atividades_diarias' | 'atividades_extras';
  dataContratacao: string;
  telefone: string;
  active: boolean;
  empresaId: string | null;
}

export interface Empresa {
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
  modulos_contratados?: string[];
  // Campos contratuais
  inicio_contrato?: string;
  duracao_contrato_meses?: number;
  final_contrato?: string;
  valor_instalacao?: number;
  valor_mensalidade?: number;
  tipo_pagamento?: string;
  forma_pagamento?: string;
  valor_total?: number;
  valor_mensal?: number;
}

export interface Activity {
  id: string;
  name: string;
  description: string;
  type: 'recepcao' | 'camararia' | 'revisao' | 'areas_comuns';
  active: boolean;
  order: number;
  diasSemana?: string[];
}

export interface AuthContextType {
  user: AuthUser | null;
  empresa: any | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasAccess: (module: string) => boolean;
  hasModuleAccess: (module: string) => boolean;
  getEmpresaModulos: () => string[];
  reloadPermissions: () => Promise<void>;
}

export interface RegistroRecepcao {
  id: string;
  data: string;
  usuarioId: string;
  horaInicio: string;
  horaFim?: string;
  atividades: {
    atividadeId: string;
    status: 'pendente' | 'realizada' | 'nao_realizada';
  }[];
  observacoes: string;
  fotos: string[];
  status: 'em_andamento' | 'concluido';
}

export interface Manutencao {
  id: string;
  data: string;
  local: string;
  tipo: 'correcao' | 'conserto' | 'nova_instalacao' | 'preventiva' | 'substituicao';
  prioridade: 'baixa' | 'normal' | 'alta';
  descricao: string;
  observacoes: string;
  fotos: string[];
  status: 'aberto' | 'em_andamento' | 'pausada' | 'concluida';
  usuarioId: string;
  
  // Controle de tempo
  horaInicio?: string;
  horaFim?: string;
  pausas: {
    horaPausa: string;
    horaRetomada?: string;
  }[];
  tempoTotal?: number; // em minutos
}
export interface RegistroCamararia {
  id: string;
  data: string;
  suiteId: string;
  tipoServico: 'suite_livre' | 'permanencia' | 'check_out';
  usuarioId: string;
  horaInicio: string;
  horaFim?: string;
  atividades: {
    atividadeId: string;
    status: 'pendente' | 'realizada' | 'nao_realizada';
  }[];
  observacoes: string;
  fotos: string[];
  status: 'em_andamento' | 'concluido';
}

export interface RegistroRevisao {
  id: string;
  data: string;
  suiteId: string;
  tipoServico: 'suite_livre';
  usuarioId: string;
  horaInicio: string;
  horaFim?: string;
  atividades: {
    atividadeId: string;
    status: 'pendente' | 'realizada';
  }[];
  observacoes: string;
  fotos: string[];
  status: 'em_andamento' | 'concluido';
  registroCamarariaId?: string;
}

export interface RegistroAreasComuns {
  id: string;
  data: string;
  usuarioId: string;
  horaInicio: string;
  horaFim?: string;
  atividades: {
    atividadeId: string;
    status: 'pendente' | 'realizada' | 'nao_realizada';
  }[];
  observacoes: string;
  fotos: string[];
  status: 'em_andamento' | 'concluido';
}
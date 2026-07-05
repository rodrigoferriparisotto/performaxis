export interface DashboardStats {
  registrosAtivos: number;
  concluidosHoje: number;
  usuariosAtivos: number;
  tempoMedio: number;
  tempoTotal?: number;
}

export interface DepartmentData {
  id: string;
  nome: string;
  cor: string;
  atividadesEmAndamento: number;
  usuarios: UsuarioAtivo[];
  progresso: number;
  tempoMedio: number;
}

export interface Atividade {
  nome: string;
  status: 'realizada' | 'nao_realizada' | 'pendente' | 'em_andamento' | 'pausada';
  tipo?: string;
  descricao?: string;
  prioridade?: string;
  isManutencao?: boolean;
}

export interface UsuarioAtivo {
  id: string;
  nome: string;
  foto?: string;
  progresso: number;
  totalAtividades: number;
  atividadesCompletas: number;
  tempoDecorrido: number;
  registroId: string;
  horaInicio: string;
  departamento: string;
  local?: string;
  observacoes?: string;
  atividades?: Atividade[];
  isManutencao?: boolean;
  tipo?: string;
  prioridade?: string;
  pausas?: any[];
  descricaoAtividade?: string;
}

export interface HistoricalComparison {
  hoje: number;
  ontem: number;
  media7Dias: number;
  media30Dias: number;
  variacao: number;
  tendencia: 'up' | 'down' | 'stable';
}

export interface Ranking {
  posicao: number;
  usuarioId: string;
  usuarioNome: string;
  valor: number;
  badge?: string;
}

export interface MetaDiaria {
  id: string;
  data: string;
  departamento: string;
  metaRegistros: number;
  registrosConcluidos: number;
  progresso: number;
}

export interface Conquista {
  id: string;
  nome: string;
  descricao: string;
  tipo: string;
  icone: string;
  cor: string;
  criterio: any;
}

export interface UsuarioConquista {
  id: string;
  usuarioId: string;
  conquistaId: string;
  dataObtencao: string;
  conquista?: Conquista;
}

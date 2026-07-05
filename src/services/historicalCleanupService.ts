import { supabase } from '../lib/supabase';
import { logger } from './loggerService';

export interface TabelaRegistro {
  tabela: string;
  nome_exibicao: string;
  quantidade: number;
}

export interface TabelaProcessada {
  tabela: string;
  registros_excluidos: number;
  status: 'sucesso' | 'erro';
  erro?: string;
}

export interface ResultadoLimpeza {
  log_id: string;
  status: 'sucesso' | 'erro_parcial' | 'erro';
  total_excluidos: number;
  tempo_execucao_ms: number;
  tabelas_processadas: TabelaProcessada[];
  detalhes_erro: string | null;
}

export interface LogLimpeza {
  id: string;
  empresa_id: string;
  usuario_id: string;
  data_execucao: string;
  periodo_meses: number;
  tabelas_processadas: TabelaProcessada[];
  total_registros_excluidos: number;
  tempo_execucao_ms: number;
  observacoes: string | null;
  status: string;
  detalhes_erro: string | null;
  created_at: string;
  usuario?: {
    name: string;
  };
}

export const historicalCleanupService = {
  async validarPermissaoUsuario(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('profile')
        .eq('id', user.id)
        .maybeSingle();

      return usuario?.profile === 'admin' || usuario?.profile === 'gestor';
    } catch (error) {
      logger.error('Erro ao validar permissão', error, 'HistoricalCleanup');
      return false;
    }
  },

  async consultarRegistrosAntigos(empresaId: string, periodoMeses: number): Promise<TabelaRegistro[]> {
    try {
      logger.debug('Buscando registros antigos', { empresaId, periodoMeses }, 'HistoricalCleanup');

      const { data, error } = await supabase
        .rpc('consultar_registros_antigos', {
          p_empresa_id: empresaId,
          p_periodo_meses: periodoMeses
        });

      if (error) {
        logger.error('Erro ao chamar RPC consultar_registros_antigos', error, 'HistoricalCleanup');
        throw new Error(`Erro ao buscar registros: ${error.message}`);
      }

      logger.debug('Registros encontrados', data, 'HistoricalCleanup');
      return data || [];
    } catch (error: any) {
      logger.error('Erro ao consultar registros antigos', error, 'HistoricalCleanup');
      throw new Error(error.message || 'Erro desconhecido ao buscar registros antigos');
    }
  },

  async executarLimpeza(
    empresaId: string,
    usuarioId: string,
    periodoMeses: number,
    tabelasSelecionadas: string[],
    observacoes?: string
  ): Promise<ResultadoLimpeza> {
    try {
      logger.info('Executando limpeza', {
        empresaId,
        usuarioId,
        periodoMeses,
        tabelasSelecionadas
      }, 'HistoricalCleanup');

      const { data, error } = await supabase
        .rpc('executar_limpeza_historico', {
          p_empresa_id: empresaId,
          p_usuario_id: usuarioId,
          p_periodo_meses: periodoMeses,
          p_tabelas_selecionadas: tabelasSelecionadas,
          p_observacoes: observacoes || null
        });

      if (error) {
        logger.error('Erro ao executar RPC executar_limpeza_historico', error, 'HistoricalCleanup');
        throw new Error(`Erro ao executar limpeza: ${error.message}`);
      }

      logger.info('Limpeza concluída', data, 'HistoricalCleanup');
      return data;
    } catch (error: any) {
      logger.error('Erro ao executar limpeza', error, 'HistoricalCleanup');
      throw new Error(error.message || 'Erro desconhecido ao executar limpeza');
    }
  },

  async buscarHistoricoLimpezas(
    empresaId: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ logs: LogLimpeza[]; total: number }> {
    try {
      const offset = (page - 1) * pageSize;

      const { count } = await supabase
        .from('logs_limpeza_historico')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', empresaId);

      const { data, error } = await supabase
        .from('logs_limpeza_historico')
        .select(`
          *,
          usuario:usuarios(name)
        `)
        .eq('empresa_id', empresaId)
        .order('data_execucao', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) throw error;

      return {
        logs: data || [],
        total: count || 0
      };
    } catch (error) {
      logger.error('Erro ao buscar histórico de limpezas', error, 'HistoricalCleanup');
      throw error;
    }
  },

  async obterDetalhesLog(logId: string): Promise<LogLimpeza | null> {
    try {
      const { data, error } = await supabase
        .from('logs_limpeza_historico')
        .select(`
          *,
          usuario:usuarios(name)
        `)
        .eq('id', logId)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Erro ao obter detalhes do log', error, 'HistoricalCleanup');
      throw error;
    }
  },

  formatarTempoExecucao(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}min`;
  },

  formatarDataHora(dataISO: string): string {
    const data = new Date(dataISO);
    return data.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
};

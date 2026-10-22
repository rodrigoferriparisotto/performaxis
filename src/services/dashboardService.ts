import { supabase } from '../lib/supabase';
import { differenceInMinutes } from 'date-fns';
import { getBrazilDateString } from '../utils/dateUtils';

// Os dados da tela Dashboard ao Vivo vêm da RPC dashboard_ao_vivo
// (supabase/migrations/20261022010000_dashboard_ao_vivo_rpc.sql).
// Aqui ficam os cálculos e rótulos usados pela tela e pelos cards.
export class DashboardService {
  static async getMetasDiarias(empresaId: string) {
    const hoje = getBrazilDateString();

    const { data, error } = await supabase
      .from('metas_diarias')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('data', hoje);

    if (error || !data) return [];

    return data.map(meta => ({
      ...meta,
      progresso: meta.meta_registros > 0
        ? Math.round((meta.registros_concluidos / meta.meta_registros) * 100)
        : 0
    }));
  }

  static async getConquistasUsuario(usuarioId: string) {
    const { data, error } = await supabase
      .from('usuarios_conquistas')
      .select(`
        *,
        conquistas:conquista_id(*)
      `)
      .eq('usuario_id', usuarioId)
      .order('data_obtencao', { ascending: false });

    if (error) return [];
    return data || [];
  }

  static calcularProgresso(atividades: any[]): number {
    if (!atividades || atividades.length === 0) return 0;

    const completas = atividades.filter(
      a => a.status === 'realizada'
    ).length;

    return Math.round((completas / atividades.length) * 100);
  }

  static calcularTempoDecorrido(horaInicio: string): number {
    if (!horaInicio) return 0;

    try {
      const inicio = new Date(horaInicio);
      const agora = new Date();

      if (isNaN(inicio.getTime())) {
        return 0;
      }

      const diffMinutos = differenceInMinutes(agora, inicio);
      return Math.max(0, diffMinutos);
    } catch {
      return 0;
    }
  }

  static calcularTempoDecorridoComPausas(registro: any): number {
    if (!registro?.hora_inicio) return 0;

    try {
      const isManutencao = registro.table === 'manutencoes';

      if (!isManutencao) {
        // Para departamentos não-manutenção, usar lógica simples
        return this.calcularTempoDecorrido(registro.hora_inicio);
      }

      // Lógica específica para manutenções com pausas
      const inicio = new Date(registro.hora_inicio).getTime();
      let tempoPausas = 0;
      let pontoFinal = Date.now();

      // Garantir que pausas seja sempre um array
      const pausas = Array.isArray(registro.pausas) ? registro.pausas : [];

      // Se a manutenção está pausada, usar a hora da última pausa como ponto final
      if (registro.status === 'pausada') {
        const pausaAtiva = pausas.find((p: any) => !p.hora_retomada);
        if (pausaAtiva && pausaAtiva.hora_pausa) {
          pontoFinal = new Date(pausaAtiva.hora_pausa).getTime();
        }
      }

      // Calcular tempo total de pausas já concluídas
      pausas.forEach((pausa: any) => {
        if (pausa.hora_retomada) {
          // Pausa já foi retomada, somar o tempo total da pausa
          tempoPausas += new Date(pausa.hora_retomada).getTime() - new Date(pausa.hora_pausa).getTime();
        }
      });

      // Tempo decorrido = tempo de trabalho efetivo (ponto final - inicio - pausas concluídas)
      const tempoDecorridoMs = pontoFinal - inicio - tempoPausas;
      return Math.floor(Math.max(0, tempoDecorridoMs) / (1000 * 60));
    } catch {
      return 0;
    }
  }

  static getDepartamentoNome(dept: string): string {
    const map: { [key: string]: string } = {
      'recepcao': 'Recepção',
      'camararia': 'Governança',
      'revisao': 'Revisão',
      'areas_comuns': 'Áreas Comuns',
      'gestao': 'Gestão',
      'cozinha': 'Cozinha',
      'vendas': 'Vendas',
      'atividades_diarias': 'Atividades Diárias',
      'atividades_extras': 'Atividades Extras',
      'manutencao': 'Manutenção'
    };
    return map[dept] || dept;
  }

  static getDepartamentoCor(dept: string): string {
    const map: { [key: string]: string } = {
      'recepcao': '#3B82F6',
      'camararia': '#10B981',
      'revisao': '#8B5CF6',
      'areas_comuns': '#F59E0B',
      'gestao': '#EF4444',
      'cozinha': '#EC4899',
      'vendas': '#F97316',
      'atividades_diarias': '#06B6D4',
      'atividades_extras': '#14B8A6',
      'manutencao': '#84CC16'
    };
    return map[dept] || '#6B7280';
  }
}

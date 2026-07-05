import { supabase } from '../lib/supabase';
import { format, subDays, parseISO, differenceInMinutes } from 'date-fns';
import { getBrazilDateString, subtractDaysBrazil, getBrazilDate } from '../utils/dateUtils';

export class DashboardService {
  private static getUsuariosFKName(table: string): string {
    const fkMap: { [key: string]: string } = {
      'registros_recepcao': 'registros_recepcao_usuario_id_fkey',
      'registros_camararia': 'registros_camararia_usuario_id_fkey',
      'registros_revisao': 'registros_revisao_usuario_id_fkey',
      'registros_areas_comuns': 'registros_areas_comuns_usuario_id_fkey',
      'registros_gestao': 'registros_gestao_usuario_id_fkey',
      'registros_atividades_diarias': 'fk_usuario_atividades_diarias',
      'registros_atividades_extras': 'fk_usuario_atividades_extras'
    };
    return fkMap[table] || 'usuarios';
  }

  private static getTableConfig(table: string) {
    const tablesWithSuiteId = ['registros_camararia', 'registros_revisao'];
    const tablesWithUsuariosFK = [
      'registros_recepcao',
      'registros_camararia',
      'registros_revisao',
      'registros_areas_comuns',
      'registros_gestao',
      'registros_atividades_diarias',
      'registros_atividades_extras'
    ];
    const tablesWithoutFotos = ['registros_cozinha', 'manutencoes'];
    const tablesWithoutAtividades = ['manutencoes'];

    return {
      hasSuiteId: tablesWithSuiteId.includes(table),
      hasUsuariosFK: tablesWithUsuariosFK.includes(table),
      hasFotos: !tablesWithoutFotos.includes(table),
      hasAtividades: !tablesWithoutAtividades.includes(table)
    };
  }

  static async getRegistrosAtivos(empresaId: string) {
    const hoje = getBrazilDateString();

    const tables = [
      'registros_recepcao',
      'registros_camararia',
      'registros_revisao',
      'registros_areas_comuns',
      'registros_gestao',
      'registros_cozinha',
      'registros_vendas',
      'registros_atividades_diarias',
      'registros_atividades_extras'
    ];

    const promises = tables.map(async (table) => {
      try {
        const config = this.getTableConfig(table);

        const baseFields = `
          id,
          data,
          usuario_id,
          usuario_executor_id,
          hora_inicio,
          hora_fim,
          status,
          atividades,
          observacoes${config.hasFotos ? ',\n          fotos' : ''}
        `;

        const suiteField = config.hasSuiteId ? ', suite_id, suites(name)' : '';
        const fkName = this.getUsuariosFKName(table);
        const usuariosJoin = config.hasUsuariosFK
          ? `, usuarios!${fkName}(id, name, profile, empresa_id)`
          : '';

        let query = supabase
          .from(table)
          .select(`${baseFields}${suiteField}${usuariosJoin}`)
          .eq('status', 'em_andamento')
          .eq('data', hoje);

        if (config.hasUsuariosFK) {
          query = query.eq(`usuarios.empresa_id`, empresaId);
        } else {
          const { data: usuarios } = await supabase
            .from('usuarios')
            .select('id')
            .eq('empresa_id', empresaId);

          if (!usuarios || usuarios.length === 0) return [];

          const usuarioIds = usuarios.map(u => u.id);
          query = query.in('usuario_id', usuarioIds);
        }

        const { data, error } = await query;

        if (error) throw error;

        if (!config.hasUsuariosFK && data && data.length > 0) {
          const usuarioIds = [...new Set(data.map((r: any) => r.usuario_id))];
          const executorIds = [...new Set(data.map((r: any) => r.usuario_executor_id).filter((id: any) => id))];
          const allIds = [...new Set([...usuarioIds, ...executorIds])];

          const { data: usuariosData } = await supabase
            .from('usuarios')
            .select('id, name, profile, empresa_id')
            .in('id', allIds);

          const usuariosMap = new Map(
            (usuariosData || []).map((u: any) => [u.id, u])
          );

          return (data || []).map((registro: any) => ({
            ...registro,
            fotos: registro.fotos || [],
            usuarios: usuariosMap.get(registro.usuario_executor_id || registro.usuario_id) || {
              id: registro.usuario_executor_id || registro.usuario_id,
              name: 'Usuário não encontrado',
              profile: 'outros',
              empresa_id: empresaId
            },
            departamento: this.getDepartamentoFromTable(table),
            table
          }));
        }

        if (data && data.length > 0) {
          const executorIds = [...new Set(data.map((r: any) => r.usuario_executor_id).filter((id: any) => id))];

          if (executorIds.length > 0) {
            const { data: executoresData } = await supabase
              .from('usuarios')
              .select('id, name, profile, empresa_id')
              .in('id', executorIds);

            const executoresMap = new Map(
              (executoresData || []).map((u: any) => [u.id, u])
            );

            return (data || []).map((registro: any) => ({
              ...registro,
              fotos: registro.fotos || [],
              usuarios: registro.usuario_executor_id
                ? (executoresMap.get(registro.usuario_executor_id) || registro.usuarios)
                : registro.usuarios,
              departamento: this.getDepartamentoFromTable(table),
              table
            }));
          }
        }

        return (data || []).map((registro: any) => ({
          ...registro,
          fotos: registro.fotos || [],
          departamento: this.getDepartamentoFromTable(table),
          table
        }));
      } catch (error) {
        return [];
      }
    });

    const manutencoesPromise = this.getManutencoesAtivas(empresaId, hoje);

    const results = await Promise.all([...promises, manutencoesPromise]);
    return results.flat();
  }

  private static async getManutencoesAtivas(empresaId: string, hoje: string) {
    try {
      const { data: usuarios } = await supabase
        .from('usuarios')
        .select('id')
        .eq('empresa_id', empresaId);

      if (!usuarios || usuarios.length === 0) return [];

      const usuarioIds = usuarios.map(u => u.id);

      const { data, error } = await supabase
        .from('manutencoes')
        .select('id, data, usuario_id, hora_inicio, hora_fim, status, observacoes, local, tipo, prioridade, pausas, descricao')
        .eq('empresa_id', empresaId)
        .in('status', ['em_andamento', 'pausada'])
        .in('usuario_id', usuarioIds);

      if (error) throw error;

      if (data && data.length > 0) {
        const usuarioIds = [...new Set(data.map((r: any) => r.usuario_id))];
        const { data: usuariosData } = await supabase
          .from('usuarios')
          .select('id, name, profile, empresa_id')
          .in('id', usuarioIds);

        const usuariosMap = new Map(
          (usuariosData || []).map((u: any) => [u.id, u])
        );

        return (data || []).map((registro: any) => ({
          ...registro,
          atividades: [{
            nome: registro.descricao || registro.local || 'Manutenção',
            status: registro.status === 'pausada' ? 'pausada' : 'em_andamento',
            tipo: registro.tipo,
            prioridade: registro.prioridade,
            isManutencao: true
          }],
          fotos: [],
          usuarios: usuariosMap.get(registro.usuario_id) || {
            id: registro.usuario_id,
            name: 'Usuário não encontrado',
            profile: 'outros',
            empresa_id: empresaId
          },
          departamento: 'manutencao',
          table: 'manutencoes',
          isManutencao: true
        }));
      }

      return [];
    } catch (error) {
      return [];
    }
  }

  static async getConcluidosHoje(empresaId: string) {
    const hoje = getBrazilDateString();

    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuarios')
      .select('id')
      .eq('empresa_id', empresaId);

    if (usuariosError || !usuarios) return 0;

    const usuarioIds = usuarios.map(u => u.id);
    if (usuarioIds.length === 0) return 0;

    const tables = [
      'registros_recepcao',
      'registros_camararia',
      'registros_revisao',
      'registros_areas_comuns',
      'registros_gestao',
      'registros_cozinha',
      'registros_vendas',
      'registros_atividades_diarias',
      'registros_atividades_extras'
    ];

    const countPromises = tables.map(async (table) => {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('usuario_id, usuario_executor_id')
          .eq('status', 'concluido')
          .eq('data', hoje);

        if (error || !data) return 0;

        const count = data.filter(r => {
          const executorId = r.usuario_executor_id || r.usuario_id;
          return usuarioIds.includes(executorId);
        }).length;

        return count;
      } catch (error) {
        return 0;
      }
    });

    const manutencoesCount = supabase
      .from('manutencoes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'concluida')
      .eq('data', hoje)
      .eq('empresa_id', empresaId)
      .in('usuario_id', usuarioIds)
      .then(({ count, error }) => (!error && count ? count : 0))
      .catch(() => 0);

    const counts = await Promise.all([...countPromises, manutencoesCount]);
    return counts.reduce((sum, count) => sum + count, 0);
  }

  static async getHistoricData(empresaId: string, days: number) {
    const dates = Array.from({ length: days }, (_, i) =>
      subtractDaysBrazil(i)
    );

    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuarios')
      .select('id')
      .eq('empresa_id', empresaId);

    if (usuariosError || !usuarios) return {};

    const usuarioIds = usuarios.map(u => u.id);
    if (usuarioIds.length === 0) return {};

    const tables = [
      'registros_recepcao',
      'registros_camararia',
      'registros_revisao',
      'registros_areas_comuns',
      'registros_gestao',
      'registros_cozinha',
      'registros_vendas',
      'registros_atividades_diarias',
      'registros_atividades_extras'
    ];

    const oldestDate = subtractDaysBrazil(days - 1);
    const today = getBrazilDateString();

    const tablePromises = tables.map(async (table) => {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('data, usuario_id, usuario_executor_id')
          .eq('status', 'concluido')
          .gte('data', oldestDate)
          .lte('data', today);

        if (error || !data) return [];

        return data
          .filter((r: any) => {
            const executorId = r.usuario_executor_id || r.usuario_id;
            return usuarioIds.includes(executorId);
          })
          .map((r: any) => r.data);
      } catch (error) {
        return [];
      }
    });

    const manutencoesPromise = supabase
      .from('manutencoes')
      .select('data')
      .eq('status', 'concluida')
      .gte('data', oldestDate)
      .lte('data', today)
      .eq('empresa_id', empresaId)
      .in('usuario_id', usuarioIds)
      .then(({ data, error }) => {
        if (error || !data) return [];
        return data.map((r: any) => r.data);
      })
      .catch(() => []);

    const allDatesArrays = await Promise.all([...tablePromises, manutencoesPromise]);
    const allDates = allDatesArrays.flat();

    const historicData: { [date: string]: number } = {};
    dates.forEach(date => {
      historicData[date] = allDates.filter(d => d === date).length;
    });

    return historicData;
  }

  static async getRankingUsuarios(empresaId: string) {
    const hoje = getBrazilDateString();

    const { data: usuarios, error } = await supabase
      .from('usuarios')
      .select('id, name, profile')
      .eq('empresa_id', empresaId)
      .eq('active', true);

    if (error || !usuarios) return [];

    const usuarioIds = usuarios.map(u => u.id);
    if (usuarioIds.length === 0) return [];

    const tables = [
      'registros_recepcao',
      'registros_camararia',
      'registros_revisao',
      'registros_areas_comuns',
      'registros_gestao',
      'registros_cozinha',
      'registros_vendas',
      'registros_atividades_diarias',
      'registros_atividades_extras'
    ];

    const tablePromises = tables.map(async (table) => {
      try {
        const { data: registros } = await supabase
          .from(table)
          .select('usuario_id, usuario_executor_id, hora_inicio, hora_fim')
          .eq('status', 'concluido')
          .eq('data', hoje);

        if (!registros) return [];

        return registros.filter(r => {
          const executorId = r.usuario_executor_id || r.usuario_id;
          return usuarioIds.includes(executorId);
        }).map(r => ({
          ...r,
          usuario_id: r.usuario_executor_id || r.usuario_id
        }));
      } catch (error) {
        return [];
      }
    });

    const manutencoesPromise = supabase
      .from('manutencoes')
      .select('usuario_id, hora_inicio, hora_fim, pausas, tempo_total')
      .eq('status', 'concluida')
      .eq('data', hoje)
      .eq('empresa_id', empresaId)
      .in('usuario_id', usuarioIds)
      .then(({ data }) => data || [])
      .catch(() => []);

    const allRegistrosArrays = await Promise.all([...tablePromises, manutencoesPromise]);
    const allRegistros = allRegistrosArrays.flat();

    const userMap = new Map(
      usuarios.map(u => [u.id, {
        usuario: u,
        totalConcluidos: 0,
        totalTempo: 0,
        countComTempo: 0
      }])
    );

    allRegistros.forEach((reg: any) => {
      const userData = userMap.get(reg.usuario_id);
      if (!userData) return;

      userData.totalConcluidos++;

      if (reg.tempo_total !== undefined && reg.tempo_total !== null) {
        userData.totalTempo += reg.tempo_total;
        userData.countComTempo++;
      } else if (reg.hora_inicio && reg.hora_fim) {
        try {
          const inicio = new Date(reg.hora_inicio);
          const fim = new Date(reg.hora_fim);

          if (!isNaN(inicio.getTime()) && !isNaN(fim.getTime())) {
            const diff = differenceInMinutes(fim, inicio);
            if (diff >= 0) {
              userData.totalTempo += diff;
              userData.countComTempo++;
            }
          }
        } catch {
        }
      }
    });

    const userCounts = Array.from(userMap.values()).map(userData => ({
      usuario: userData.usuario,
      totalConcluidos: userData.totalConcluidos,
      tempoTotal: Math.round(userData.totalTempo),
      tempoMedio: userData.countComTempo > 0
        ? Math.round(userData.totalTempo / userData.countComTempo)
        : 0
    }));

    return userCounts
      .filter(u => u.totalConcluidos > 0)
      .sort((a, b) => b.totalConcluidos - a.totalConcluidos);
  }

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
      const agora = getBrazilDate();

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

  static getDepartamentoFromTable(table: string): string {
    const map: { [key: string]: string } = {
      'registros_recepcao': 'recepcao',
      'registros_camararia': 'camararia',
      'registros_revisao': 'revisao',
      'registros_areas_comuns': 'areas_comuns',
      'registros_gestao': 'gestao',
      'registros_cozinha': 'cozinha',
      'registros_vendas': 'vendas',
      'registros_atividades_diarias': 'atividades_diarias',
      'registros_atividades_extras': 'atividades_extras',
      'manutencoes': 'manutencao'
    };
    return map[table] || table;
  }

  static getDepartamentoNome(dept: string): string {
    const map: { [key: string]: string } = {
      'recepcao': 'Recepção',
      'camararia': 'Camararia',
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

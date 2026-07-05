import { supabase } from '../lib/supabase';

interface AtividadeRegistro {
  status: string;
  [key: string]: any;
}

interface EfetividadeResult {
  totalProgramadas: number;
  totalRealizadas: number;
  percentual: number;
}

interface PerformanceDiariaData {
  usuarioId: string;
  empresaId: string;
  data: string;
  totalAtividadesProgramadas: number;
  totalAtividadesRealizadas: number;
  percentualEfetividade: number;
  pontosDia: number;
  totalHorasTrabalhadas: number;
}

interface RegistroGenerico {
  atividades?: any;
  hora_inicio?: string;
  hora_fim?: string;
  [key: string]: any;
}

export const rankingMeritocraciaService = {
  calcularEfetividadeRegistro(atividades: AtividadeRegistro[]): EfetividadeResult {
    if (!atividades || !Array.isArray(atividades) || atividades.length === 0) {
      return {
        totalProgramadas: 0,
        totalRealizadas: 0,
        percentual: 0
      };
    }

    const totalProgramadas = atividades.length;
    const totalRealizadas = atividades.filter(
      (atividade) => atividade.status === 'realizada'
    ).length;

    const percentual = totalProgramadas > 0
      ? (totalRealizadas / totalProgramadas) * 100
      : 0;

    return {
      totalProgramadas,
      totalRealizadas,
      percentual
    };
  },

  calcularPontosPorEfetividade(percentual: number): number {
    if (percentual < 70) return 0;
    if (percentual >= 70 && percentual < 80) return 1;
    if (percentual >= 80 && percentual < 90) return 1.5;
    return 2;
  },

  calcularHorasTrabalhadas(horaInicio: string | null, horaFim: string | null): number {
    if (!horaInicio || !horaFim) return 0;

    try {
      let inicio: Date;
      let fim: Date;

      if (horaInicio.includes('T')) {
        inicio = new Date(horaInicio);
      } else {
        inicio = new Date(`1970-01-01T${horaInicio}`);
      }

      if (horaFim.includes('T')) {
        fim = new Date(horaFim);
      } else {
        fim = new Date(`1970-01-01T${horaFim}`);
      }

      if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) {
        return 0;
      }

      const diferencaMs = fim.getTime() - inicio.getTime();
      const horas = diferencaMs / (1000 * 60 * 60);

      return horas > 0 ? horas : 0;
    } catch (error) {
      return 0;
    }
  },

  async buscarTodosRegistrosDia(
    usuarioId: string,
    data: string,
    empresaId: string
  ): Promise<RegistroGenerico[]> {
    const registros: RegistroGenerico[] = [];

    const tabelas = [
      'registros_camararia',
      'registros_recepcao',
      'registros_revisao',
      'registros_areas_comuns',
      'registros_gestao',
      'registros_cozinha',
      'registros_vendas',
      'registros_atividades_diarias',
      'registros_atividades_extras'
    ];

    for (const tabela of tabelas) {
      try {
        const { data: registrosTabela, error } = await supabase
          .from(tabela)
          .select('*')
          .eq('usuario_id', usuarioId)
          .eq('empresa_id', empresaId)
          .eq('data', data)
          .eq('status', 'concluido');

        if (error) {
          continue;
        }

        if (registrosTabela && registrosTabela.length > 0) {
          registros.push(...registrosTabela);
        }
      } catch (error) {
      }
    }

    return registros;
  },

  async calcularPerformanceDiariaUsuario(
    usuarioId: string,
    data: string,
    empresaId: string
  ): Promise<PerformanceDiariaData | null> {
    const registros = await this.buscarTodosRegistrosDia(usuarioId, data, empresaId);

    if (registros.length === 0) {
      return null;
    }

    let totalAtividadesProgramadas = 0;
    let totalAtividadesRealizadas = 0;
    let totalHorasTrabalhadas = 0;

    for (const registro of registros) {
      const efetividade = this.calcularEfetividadeRegistro(registro.atividades || []);
      totalAtividadesProgramadas += efetividade.totalProgramadas;
      totalAtividadesRealizadas += efetividade.totalRealizadas;

      const horas = this.calcularHorasTrabalhadas(
        registro.hora_inicio || null,
        registro.hora_fim || null
      );
      totalHorasTrabalhadas += horas;
    }

    const percentualEfetividade = totalAtividadesProgramadas > 0
      ? (totalAtividadesRealizadas / totalAtividadesProgramadas) * 100
      : 0;

    const pontosDia = this.calcularPontosPorEfetividade(percentualEfetividade);

    return {
      usuarioId,
      empresaId,
      data,
      totalAtividadesProgramadas,
      totalAtividadesRealizadas,
      percentualEfetividade: Math.round(percentualEfetividade * 100) / 100,
      pontosDia,
      totalHorasTrabalhadas: Math.round(totalHorasTrabalhadas * 100) / 100
    };
  },

  async salvarPerformanceDiaria(performance: PerformanceDiariaData): Promise<any> {
    const { data, error } = await supabase
      .from('performance_diaria')
      .upsert({
        usuario_id: performance.usuarioId,
        empresa_id: performance.empresaId,
        data: performance.data,
        total_atividades_programadas: performance.totalAtividadesProgramadas,
        total_atividades_realizadas: performance.totalAtividadesRealizadas,
        percentual_efetividade: performance.percentualEfetividade,
        pontos_dia: performance.pontosDia,
        total_horas_trabalhadas: performance.totalHorasTrabalhadas,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'usuario_id,data'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  async calcularRankingDiario(empresaId: string, data: string): Promise<any[]> {
    const { data: performances, error } = await supabase
      .from('performance_diaria')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('data', data)
      .order('pontos_dia', { ascending: false })
      .order('total_horas_trabalhadas', { ascending: false });

    if (error) {
      throw error;
    }

    if (!performances || performances.length === 0) {
      return [];
    }

    for (let i = 0; i < performances.length; i++) {
      const ranking = i + 1;
      await supabase
        .from('performance_diaria')
        .update({ ranking_dia: ranking })
        .eq('id', performances[i].id);

      performances[i].ranking_dia = ranking;
    }

    return performances;
  },

  async consolidarPerformanceMensal(
    empresaId: string,
    mes: number,
    ano: number
  ): Promise<any[]> {
    const dataInicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const dataFim = `${ano}-${String(mes).padStart(2, '0')}-${ultimoDia}`;

    const { data: performancesDiarias, error: errorDiarias } = await supabase
      .from('performance_diaria')
      .select('*')
      .eq('empresa_id', empresaId)
      .gte('data', dataInicio)
      .lte('data', dataFim);

    if (errorDiarias) {
      throw errorDiarias;
    }

    if (!performancesDiarias || performancesDiarias.length === 0) {
      return [];
    }

    const usuariosMap = new Map<string, any>();

    for (const perf of performancesDiarias) {
      if (!usuariosMap.has(perf.usuario_id)) {
        usuariosMap.set(perf.usuario_id, {
          usuario_id: perf.usuario_id,
          empresa_id: perf.empresa_id,
          totalVezesPrimeiroLugar: 0,
          totalVezesSegundoLugar: 0,
          totalVezesTerceiroLugar: 0,
          somaPontosDia: 0,
          somaEfetividade: 0,
          somaHoras: 0,
          totalDias: 0
        });
      }

      const usuario = usuariosMap.get(perf.usuario_id);

      if (perf.ranking_dia === 1) usuario.totalVezesPrimeiroLugar++;
      if (perf.ranking_dia === 2) usuario.totalVezesSegundoLugar++;
      if (perf.ranking_dia === 3) usuario.totalVezesTerceiroLugar++;

      usuario.somaPontosDia += perf.pontos_dia || 0;
      usuario.somaEfetividade += perf.percentual_efetividade || 0;
      usuario.somaHoras += perf.total_horas_trabalhadas || 0;
      usuario.totalDias++;
    }

    const performancesMensais: any[] = [];

    for (const [usuarioId, stats] of usuariosMap.entries()) {
      const mediaPontosDia = stats.totalDias > 0
        ? stats.somaPontosDia / stats.totalDias
        : 0;

      const mediaEfetividade = stats.totalDias > 0
        ? stats.somaEfetividade / stats.totalDias
        : 0;

      const { data, error } = await supabase
        .from('performance_mensal')
        .upsert({
          usuario_id: usuarioId,
          empresa_id: stats.empresa_id,
          mes,
          ano,
          total_dias_trabalhados: stats.totalDias,
          total_vezes_primeiro_lugar: stats.totalVezesPrimeiroLugar,
          total_vezes_segundo_lugar: stats.totalVezesSegundoLugar,
          total_vezes_terceiro_lugar: stats.totalVezesTerceiroLugar,
          media_pontos_dia: Math.round(mediaPontosDia * 100) / 100,
          total_pontos_mes: Math.round(stats.somaPontosDia * 100) / 100,
          media_efetividade: Math.round(mediaEfetividade * 100) / 100,
          total_horas_mes: Math.round(stats.somaHoras * 100) / 100,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'usuario_id,mes,ano'
        })
        .select()
        .single();

      if (error) {
        continue;
      }

      performancesMensais.push(data);
    }

    // Ordenar seguindo critérios de meritocracia:
    // 1º - Mais vezes em primeiro lugar
    // 2º - Maior média de pontos diários
    // 3º - Maior média de efetividade
    // 4º - Mais horas trabalhadas
    performancesMensais.sort((a, b) => {
      if (b.total_vezes_primeiro_lugar !== a.total_vezes_primeiro_lugar) {
        return b.total_vezes_primeiro_lugar - a.total_vezes_primeiro_lugar;
      }
      if (b.media_pontos_dia !== a.media_pontos_dia) {
        return b.media_pontos_dia - a.media_pontos_dia;
      }
      if (b.media_efetividade !== a.media_efetividade) {
        return b.media_efetividade - a.media_efetividade;
      }
      return b.total_horas_mes - a.total_horas_mes;
    });

    // Atualizar ranking_posicao para todos os registros
    for (let i = 0; i < performancesMensais.length; i++) {
      const ranking = i + 1;
      const { error: updateError } = await supabase
        .from('performance_mensal')
        .update({ ranking_posicao: ranking })
        .eq('id', performancesMensais[i].id);

      if (!updateError) {
        performancesMensais[i].ranking_posicao = ranking;
      }
    }

    return performancesMensais;
  },

  async processarCalculoCompleto(
    empresaId: string,
    dataInicio?: string,
    dataFim?: string
  ): Promise<{
    diasProcessados: number;
    usuariosProcessados: Set<string>;
    mesesConsolidados: number;
  }> {
    const hoje = new Date();
    const fim = dataFim
      ? new Date(dataFim)
      : hoje;

    const inicio = dataInicio
      ? new Date(dataInicio)
      : new Date(hoje.getTime() - 90 * 24 * 60 * 60 * 1000);

    const usuariosProcessados = new Set<string>();
    const mesesSet = new Set<string>();
    let diasProcessados = 0;

    const currentDate = new Date(inicio);

    while (currentDate <= fim) {
      const dataStr = currentDate.toISOString().split('T')[0];

      const { data: usuarios, error } = await supabase
        .from('usuarios')
        .select('id')
        .eq('empresa_id', empresaId)
        .eq('active', true);

      if (error) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      if (usuarios && usuarios.length > 0) {
        for (const usuario of usuarios) {
          try {
            const performance = await this.calcularPerformanceDiariaUsuario(
              usuario.id,
              dataStr,
              empresaId
            );

            if (performance) {
              await this.salvarPerformanceDiaria(performance);
              usuariosProcessados.add(usuario.id);
            }
          } catch (error) {
          }
        }

        await this.calcularRankingDiario(empresaId, dataStr);
        diasProcessados++;

        const mesAno = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}`;
        mesesSet.add(mesAno);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    for (const mesAno of mesesSet) {
      const [ano, mes] = mesAno.split('-').map(Number);
      try {
        await this.consolidarPerformanceMensal(empresaId, mes, ano);
      } catch (error) {
      }
    }

    return {
      diasProcessados,
      usuariosProcessados,
      mesesConsolidados: mesesSet.size
    };
  }
};

import { createClient } from 'npm:@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface AtividadeRegistro {
  status: string;
  [key: string]: any;
}

interface RegistroGenerico {
  atividades?: any;
  hora_inicio?: string;
  hora_fim?: string;
  [key: string]: any;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const inicioCalculo = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestData = await req.json().catch(() => ({}));
    const dataCalcular = requestData?.data || new Date().toISOString().split('T')[0];
    const empresaIdFiltro = requestData?.empresa_id || null;

    console.log(`Iniciando cálculo de performance para ${dataCalcular}`);
    console.log(`Dados recebidos:`, { data: dataCalcular, empresa_id: empresaIdFiltro });

    let query = supabase.from('empresas').select('id, nome').eq('ativo', true);
    if (empresaIdFiltro) {
      query = query.eq('id', empresaIdFiltro);
    }

    const { data: empresas, error: empresasError } = await query;

    if (empresasError || !empresas) {
      throw new Error(`Erro ao buscar empresas: ${empresasError?.message}`);
    }

    console.log(`Encontradas ${empresas.length} empresas para processar`);

    let totalSucesso = 0;
    let totalErros = 0;
    const detalhesEmpresas = [];

    for (const empresa of empresas) {
      const inicioEmpresa = Date.now();

      try {
        console.log(`\n=== Processando empresa: ${empresa.nome} ===`);

        const { data: usuarios, error: usuariosError } = await supabase
          .from('usuarios')
          .select('id, name')
          .eq('empresa_id', empresa.id)
          .eq('active', true);

        if (usuariosError || !usuarios) {
          console.error(`Erro ao buscar usuários:`, usuariosError);
          detalhesEmpresas.push({
            empresa: empresa.nome,
            erro: `Erro ao buscar usuários: ${usuariosError?.message}`,
          });
          continue;
        }

        console.log(`Encontrados ${usuarios.length} usuários ativos`);

        let sucessoEmpresa = 0;
        let errosEmpresa = 0;

        for (const usuario of usuarios) {
          try {
            const performance = await calcularPerformanceDiariaUsuario(
              supabase,
              usuario.id,
              dataCalcular,
              empresa.id
            );

            if (performance) {
              await salvarPerformanceDiaria(supabase, performance);
              sucessoEmpresa++;
              totalSucesso++;
            }
          } catch (error) {
            console.error(`Erro ao processar usuário ${usuario.name}:`, error);
            errosEmpresa++;
            totalErros++;
          }
        }

        console.log(`Calculando ranking diário...`);
        await calcularRankingDiario(supabase, empresa.id, dataCalcular);

        const mesAtual = new Date(dataCalcular).getMonth() + 1;
        const anoAtual = new Date(dataCalcular).getFullYear();

        console.log(`Consolidando performance mensal (${mesAtual}/${anoAtual})...`);
        await consolidarPerformanceMensal(supabase, empresa.id, mesAtual, anoAtual);

        const tempoEmpresa = Date.now() - inicioEmpresa;

        await supabase.from('logs_calculo_performance').insert({
          empresa_id: empresa.id,
          data_calculo: dataCalcular,
          tipo_calculo: 'diario',
          usuarios_processados: sucessoEmpresa + errosEmpresa,
          usuarios_com_erro: errosEmpresa,
          tempo_execucao_ms: tempoEmpresa,
          status: errosEmpresa === 0 ? 'sucesso' : sucessoEmpresa > 0 ? 'parcial' : 'erro',
          mensagem_erro: errosEmpresa > 0 ? `${errosEmpresa} erros encontrados` : null,
          detalhes_json: {
            usuarios_sucesso: sucessoEmpresa,
            usuarios_erro: errosEmpresa,
            data_calculada: dataCalcular,
          },
        });

        detalhesEmpresas.push({
          empresa: empresa.nome,
          usuarios_processados: usuarios.length,
          sucesso: sucessoEmpresa,
          erros: errosEmpresa,
          tempo_ms: tempoEmpresa,
        });

        console.log(`Empresa ${empresa.nome} concluída: ${sucessoEmpresa} sucessos, ${errosEmpresa} erros em ${tempoEmpresa}ms`);
      } catch (error) {
        console.error(`Erro ao processar empresa ${empresa.nome}:`, error);
        detalhesEmpresas.push({
          empresa: empresa.nome,
          erro: error.message,
        });
      }
    }

    const tempoTotal = Date.now() - inicioCalculo;

    const resultado = {
      sucesso: true,
      data: dataCalcular,
      empresas_processadas: empresas.length,
      total_usuarios_sucesso: totalSucesso,
      total_usuarios_erros: totalErros,
      tempo_execucao_ms: tempoTotal,
      detalhes: detalhesEmpresas,
    };

    console.log('\n=== Cálculo concluído ===');
    console.log(JSON.stringify(resultado, null, 2));

    return new Response(JSON.stringify(resultado), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Erro crítico:', error);

    return new Response(
      JSON.stringify({
        sucesso: false,
        erro: error.message,
        stack: error.stack,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

function calcularEfetividadeRegistro(atividades: AtividadeRegistro[]): {
  totalProgramadas: number;
  totalRealizadas: number;
  percentual: number;
} {
  if (!atividades || !Array.isArray(atividades) || atividades.length === 0) {
    return { totalProgramadas: 0, totalRealizadas: 0, percentual: 0 };
  }

  const totalProgramadas = atividades.length;
  const totalRealizadas = atividades.filter((a) => a.status === 'realizada').length;
  const percentual = totalProgramadas > 0 ? (totalRealizadas / totalProgramadas) * 100 : 0;

  return { totalProgramadas, totalRealizadas, percentual };
}

function calcularPontosPorEfetividade(percentual: number): number {
  if (percentual < 70) return 0;
  if (percentual >= 70 && percentual < 80) return 1;
  if (percentual >= 80 && percentual < 90) return 1.5;
  return 2;
}

function calcularHorasTrabalhadas(horaInicio: string | null, horaFim: string | null): number {
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
      console.error('Datas inválidas ao calcular horas:', { horaInicio, horaFim });
      return 0;
    }

    const diferencaMs = fim.getTime() - inicio.getTime();
    const horas = diferencaMs / (1000 * 60 * 60);
    return horas > 0 ? horas : 0;
  } catch (error) {
    console.error('Erro ao calcular horas trabalhadas:', error, { horaInicio, horaFim });
    return 0;
  }
}

async function buscarTodosRegistrosDia(
  supabase: any,
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
    'registros_atividades_extras',
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

      if (!error && registrosTabela && registrosTabela.length > 0) {
        console.log(`✓ Encontrados ${registrosTabela.length} registros em ${tabela}`);
        registros.push(...registrosTabela);
      } else if (error) {
        console.error(`✗ Erro ao buscar ${tabela}:`, error);
      }
    } catch (error) {
      console.error(`Erro ao buscar ${tabela}:`, error);
    }
  }

  return registros;
}

async function calcularPerformanceDiariaUsuario(
  supabase: any,
  usuarioId: string,
  data: string,
  empresaId: string
): Promise<any | null> {
  const registros = await buscarTodosRegistrosDia(supabase, usuarioId, data, empresaId);

  if (registros.length === 0) {
    return null;
  }

  let totalAtividadesProgramadas = 0;
  let totalAtividadesRealizadas = 0;
  let totalHorasTrabalhadas = 0;

  for (const registro of registros) {
    const efetividade = calcularEfetividadeRegistro(registro.atividades || []);
    totalAtividadesProgramadas += efetividade.totalProgramadas;
    totalAtividadesRealizadas += efetividade.totalRealizadas;

    const horas = calcularHorasTrabalhadas(
      registro.hora_inicio || null,
      registro.hora_fim || null
    );
    totalHorasTrabalhadas += horas;
  }

  const percentualEfetividade =
    totalAtividadesProgramadas > 0
      ? (totalAtividadesRealizadas / totalAtividadesProgramadas) * 100
      : 0;

  const pontosDia = calcularPontosPorEfetividade(percentualEfetividade);

  return {
    usuarioId,
    empresaId,
    data,
    totalAtividadesProgramadas,
    totalAtividadesRealizadas,
    percentualEfetividade: Math.round(percentualEfetividade * 100) / 100,
    pontosDia,
    totalHorasTrabalhadas: Math.round(totalHorasTrabalhadas * 100) / 100,
  };
}

async function salvarPerformanceDiaria(supabase: any, performance: any): Promise<void> {
  const { error } = await supabase.from('performance_diaria').upsert(
    {
      usuario_id: performance.usuarioId,
      empresa_id: performance.empresaId,
      data: performance.data,
      total_atividades_programadas: performance.totalAtividadesProgramadas,
      total_atividades_realizadas: performance.totalAtividadesRealizadas,
      percentual_efetividade: performance.percentualEfetividade,
      pontos_dia: performance.pontosDia,
      total_horas_trabalhadas: performance.totalHorasTrabalhadas,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'usuario_id,data',
    }
  );

  if (error) {
    console.error('Erro ao salvar performance diária:', error);
    throw error;
  }
}

async function calcularRankingDiario(
  supabase: any,
  empresaId: string,
  data: string
): Promise<void> {
  const { data: performances, error } = await supabase
    .from('performance_diaria')
    .select('id')
    .eq('empresa_id', empresaId)
    .eq('data', data)
    .order('percentual_efetividade', { ascending: false })
    .order('total_horas_trabalhadas', { ascending: false });

  if (error || !performances || performances.length === 0) {
    return;
  }

  for (let i = 0; i < performances.length; i++) {
    await supabase
      .from('performance_diaria')
      .update({ ranking_dia: i + 1 })
      .eq('id', performances[i].id);
  }
}

async function consolidarPerformanceMensal(
  supabase: any,
  empresaId: string,
  mes: number,
  ano: number
): Promise<void> {
  const dataInicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const dataFim = `${ano}-${String(mes).padStart(2, '0')}-${ultimoDia}`;

  const { data: performancesDiarias, error } = await supabase
    .from('performance_diaria')
    .select('*')
    .eq('empresa_id', empresaId)
    .gte('data', dataInicio)
    .lte('data', dataFim);

  if (error || !performancesDiarias || performancesDiarias.length === 0) {
    return;
  }

  const usuariosMap = new Map<string, any>();

  for (const perf of performancesDiarias) {
    if (!usuariosMap.has(perf.usuario_id)) {
      usuariosMap.set(perf.usuario_id, {
        totalVezesPrimeiroLugar: 0,
        totalVezesSegundoLugar: 0,
        totalVezesTerceiroLugar: 0,
        somaPontosDia: 0,
        somaEfetividade: 0,
        somaHoras: 0,
        totalDias: 0,
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
    const mediaPontosDia = stats.totalDias > 0 ? stats.somaPontosDia / stats.totalDias : 0;
    const mediaEfetividade = stats.totalDias > 0 ? stats.somaEfetividade / stats.totalDias : 0;

    const { data, error: upsertError } = await supabase
      .from('performance_mensal')
      .upsert(
        {
          usuario_id: usuarioId,
          empresa_id: empresaId,
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
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'usuario_id,mes,ano',
        }
      )
      .select()
      .single();

    if (!upsertError && data) {
      performancesMensais.push(data);
    }
  }

  performancesMensais.sort((a, b) => {
    // Primeiro critério: média de efetividade (maior primeiro)
    if (b.media_efetividade !== a.media_efetividade) {
      return b.media_efetividade - a.media_efetividade;
    }
    // Segundo critério (em caso de empate): total de horas trabalhadas no mês (maior primeiro)
    return b.total_horas_mes - a.total_horas_mes;
  });

  for (let i = 0; i < performancesMensais.length; i++) {
    await supabase
      .from('performance_mensal')
      .update({ ranking_posicao: i + 1 })
      .eq('id', performancesMensais[i].id);
  }
}

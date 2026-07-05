import { supabase } from '../lib/supabase';

export interface PerformanceDiariaData {
  id: string;
  usuario_id: string;
  empresa_id: string;
  data: string;
  perfil: string;
  total_atividades: number;
  atividades_no_prazo: number;
  atividades_atrasadas: number;
  tempo_medio_conclusao: string | null;
  taxa_cumprimento: number;
  pontuacao: number;
  usuario?: {
    name: string;
  };
}

export interface PerformanceMensalData {
  id: string;
  usuario_id: string;
  empresa_id: string;
  mes: number;
  ano: number;
  perfil: string;
  total_dias_trabalhados: number;
  media_atividades_dia: number;
  taxa_cumprimento_media: number;
  pontuacao_total: number;
  pontuacao_media: number;
  ranking_posicao: number | null;
  usuario?: {
    name: string;
  };
}

export interface MetaPerformanceData {
  id: string;
  empresa_id: string;
  perfil: string;
  meta_diaria_atividades: number;
  tempo_medio_ideal: string;
  peso_prazo: number;
  peso_quantidade: number;
  peso_qualidade: number;
  ativo: boolean;
}

// Função para calcular performance diária de um usuário
export async function calcularPerformanceDiaria(
  usuarioId: string,
  empresaId: string,
  data: string,
  perfil: string
): Promise<PerformanceDiariaData | null> {
  try {
    // Buscar a meta de performance para o perfil
    const { data: meta } = await supabase
      .from('metas_performance')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('perfil', perfil)
      .eq('ativo', true)
      .maybeSingle();

    // Se não houver meta configurada, usar valores padrão
    const metaDiaria = meta?.meta_diaria_atividades || 10;
    const pesoQuantidade = meta?.peso_quantidade || 0.3;
    const pesoPrazo = meta?.peso_prazo || 0.4;
    const pesoQualidade = meta?.peso_qualidade || 0.3;

    // Buscar atividades do dia de acordo com o perfil
    let query;
    const dataInicio = `${data}T00:00:00`;
    const dataFim = `${data}T23:59:59`;

    switch (perfil) {
      case 'camararia':
        query = supabase
          .from('registros_camararia')
          .select('*')
          .eq('usuario_id', usuarioId)
          .gte('created_at', dataInicio)
          .lte('created_at', dataFim);
        break;
      case 'recepcao':
        query = supabase
          .from('registros_recepcao')
          .select('*')
          .eq('usuario_id', usuarioId)
          .gte('created_at', dataInicio)
          .lte('created_at', dataFim);
        break;
      case 'areas_comuns':
        query = supabase
          .from('registros_areas_comuns')
          .select('*')
          .eq('usuario_id', usuarioId)
          .gte('created_at', dataInicio)
          .lte('created_at', dataFim);
        break;
      case 'cozinha':
        query = supabase
          .from('registros_cozinha')
          .select('*')
          .eq('usuario_id', usuarioId)
          .gte('created_at', dataInicio)
          .lte('created_at', dataFim);
        break;
      case 'vendas':
        query = supabase
          .from('registros_vendas')
          .select('*')
          .eq('usuario_id', usuarioId)
          .gte('created_at', dataInicio)
          .lte('created_at', dataFim);
        break;
      case 'atividades_diarias':
        query = supabase
          .from('registros_atividades_diarias')
          .select('*')
          .eq('usuario_id', usuarioId)
          .gte('created_at', dataInicio)
          .lte('created_at', dataFim);
        break;
      case 'atividades_extras':
        query = supabase
          .from('registros_atividades_extras')
          .select('*')
          .eq('usuario_id', usuarioId)
          .gte('created_at', dataInicio)
          .lte('created_at', dataFim);
        break;
      default:
        return null;
    }

    const { data: registros, error } = await query;

    if (error) {
      return null;
    }

    const totalAtividades = registros?.length || 0;

    // Calcular atividades no prazo e atrasadas (simplificado)
    // TODO: Implementar lógica real baseada em prazos e timestamps
    const atividadesNoPrazo = Math.floor(totalAtividades * 0.85); // 85% no prazo (exemplo)
    const atividadesAtrasadas = totalAtividades - atividadesNoPrazo;

    // Calcular taxa de cumprimento
    const taxaCumprimento = metaDiaria > 0 ? (totalAtividades / metaDiaria) * 100 : 0;

    // Calcular pontuação baseada nos pesos
    const pontuacaoQuantidade = (totalAtividades / metaDiaria) * 100 * pesoQuantidade;
    const pontuacaoPrazo = ((atividadesNoPrazo / (totalAtividades || 1)) * 100) * pesoPrazo;
    const pontuacaoQualidade = 85 * pesoQualidade; // Qualidade fixa em 85% (pode ser melhorado)

    const pontuacaoTotal = pontuacaoQuantidade + pontuacaoPrazo + pontuacaoQualidade;

    // Inserir ou atualizar performance diária
    const { data: performanceData, error: perfError } = await supabase
      .from('performance_diaria')
      .upsert({
        usuario_id: usuarioId,
        empresa_id: empresaId,
        data,
        perfil,
        total_atividades: totalAtividades,
        atividades_no_prazo: atividadesNoPrazo,
        atividades_atrasadas: atividadesAtrasadas,
        tempo_medio_conclusao: null, // TODO: Calcular tempo médio real
        taxa_cumprimento: Math.min(taxaCumprimento, 100),
        pontuacao: Math.round(pontuacaoTotal * 100) / 100,
      }, {
        onConflict: 'usuario_id,data,perfil'
      })
      .select()
      .single();

    if (perfError) {
      return null;
    }

    return performanceData;
  } catch (error) {
    return null;
  }
}

// Função para buscar performance diária
export async function buscarPerformanceDiaria(
  empresaId: string,
  data: string,
  perfil?: string
): Promise<PerformanceDiariaData[]> {
  try {
    let query = supabase
      .from('performance_diaria')
      .select(`
        *,
        usuario:usuarios(name)
      `)
      .eq('empresa_id', empresaId)
      .eq('data', data)
      .order('pontuacao', { ascending: false });

    if (perfil) {
      query = query.eq('perfil', perfil);
    }

    const { data: performances, error } = await query;

    if (error) {
      return [];
    }

    return performances || [];
  } catch (error) {
    return [];
  }
}

// Função para consolidar performance mensal
export async function consolidarPerformanceMensal(
  usuarioId: string,
  empresaId: string,
  mes: number,
  ano: number,
  perfil: string
): Promise<PerformanceMensalData | null> {
  try {
    // Buscar todas as performances diárias do mês
    const dataInicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const dataFim = `${ano}-${String(mes).padStart(2, '0')}-${ultimoDia}`;

    const { data: performances, error } = await supabase
      .from('performance_diaria')
      .select('*')
      .eq('usuario_id', usuarioId)
      .eq('empresa_id', empresaId)
      .eq('perfil', perfil)
      .gte('data', dataInicio)
      .lte('data', dataFim);

    if (error) {
      return null;
    }

    if (!performances || performances.length === 0) {
      return null;
    }

    // Calcular estatísticas mensais
    const totalDiasTrabalhados = performances.length;
    const totalAtividades = performances.reduce((sum, p) => sum + p.total_atividades, 0);
    const mediaAtividadesDia = totalAtividades / totalDiasTrabalhados;
    const somaTaxaCumprimento = performances.reduce((sum, p) => sum + p.taxa_cumprimento, 0);
    const taxaCumprimentoMedia = somaTaxaCumprimento / totalDiasTrabalhados;
    const pontuacaoTotal = performances.reduce((sum, p) => sum + p.pontuacao, 0);
    const pontuacaoMedia = pontuacaoTotal / totalDiasTrabalhados;

    // Inserir ou atualizar performance mensal
    const { data: performanceMensal, error: perfError } = await supabase
      .from('performance_mensal')
      .upsert({
        usuario_id: usuarioId,
        empresa_id: empresaId,
        mes,
        ano,
        perfil,
        total_dias_trabalhados: totalDiasTrabalhados,
        media_atividades_dia: Math.round(mediaAtividadesDia * 100) / 100,
        taxa_cumprimento_media: Math.round(taxaCumprimentoMedia * 100) / 100,
        pontuacao_total: Math.round(pontuacaoTotal * 100) / 100,
        pontuacao_media: Math.round(pontuacaoMedia * 100) / 100,
      }, {
        onConflict: 'usuario_id,mes,ano,perfil'
      })
      .select()
      .single();

    if (perfError) {
      return null;
    }

    return performanceMensal;
  } catch (error) {
    return null;
  }
}

// Função para atualizar ranking mensal
export async function atualizarRankingMensal(
  empresaId: string,
  mes: number,
  ano: number,
  perfil?: string
): Promise<void> {
  try {
    let query = supabase
      .from('performance_mensal')
      .select('id')
      .eq('empresa_id', empresaId)
      .eq('mes', mes)
      .eq('ano', ano)
      .order('pontuacao_total', { ascending: false });

    if (perfil) {
      query = query.eq('perfil', perfil);
    }

    const { data: performances, error } = await query;

    if (error || !performances) {
      return;
    }

    // Atualizar posição no ranking
    for (let i = 0; i < performances.length; i++) {
      await supabase
        .from('performance_mensal')
        .update({ ranking_posicao: i + 1 })
        .eq('id', performances[i].id);
    }
  } catch (error) {
  }
}

// Função para buscar performance mensal
export async function buscarPerformanceMensal(
  empresaId: string,
  mes: number,
  ano: number,
  perfil?: string
): Promise<PerformanceMensalData[]> {
  try {
    let query = supabase
      .from('performance_mensal')
      .select(`
        *,
        usuario:usuarios(name)
      `)
      .eq('empresa_id', empresaId)
      .eq('mes', mes)
      .eq('ano', ano)
      .order('ranking_posicao', { ascending: true });

    if (perfil) {
      query = query.eq('perfil', perfil);
    }

    const { data: performances, error } = await query;

    if (error) {
      return [];
    }

    return performances || [];
  } catch (error) {
    return [];
  }
}

// Função para buscar metas de performance
export async function buscarMetasPerformance(
  empresaId: string,
  perfil?: string
): Promise<MetaPerformanceData[]> {
  try {
    let query = supabase
      .from('metas_performance')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('ativo', true);

    if (perfil) {
      query = query.eq('perfil', perfil);
    }

    const { data: metas, error } = await query;

    if (error) {
      return [];
    }

    return metas || [];
  } catch (error) {
    return [];
  }
}

// Função para criar ou atualizar meta de performance
export async function salvarMetaPerformance(
  meta: Partial<MetaPerformanceData>
): Promise<MetaPerformanceData | null> {
  try {
    const { data, error } = await supabase
      .from('metas_performance')
      .upsert(meta, {
        onConflict: 'empresa_id,perfil'
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
}

// Função para calcular performance retroativa (últimos N dias)
export async function calcularPerformanceRetroativa(
  empresaId: string,
  dias: number = 31,
  onProgress?: (info: { processados: number; total: number; usuarioAtual: string }) => void
): Promise<{ sucesso: number; erros: number; detalhes: string[] }> {
  const resultado = {
    sucesso: 0,
    erros: 0,
    detalhes: [] as string[]
  };

  try {
    // Buscar todos usuários ativos da empresa
    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuarios')
      .select('id, name, profile, empresa_id')
      .eq('empresa_id', empresaId)
      .eq('active', true);

    if (usuariosError || !usuarios) {
      resultado.detalhes.push(`Erro ao buscar usuários: ${usuariosError?.message}`);
      return resultado;
    }

    resultado.detalhes.push(`Encontrados ${usuarios.length} usuários ativos`);

    // Gerar lista de datas (hoje até N dias atrás)
    const datas: string[] = [];
    const hoje = new Date();
    for (let i = 0; i < dias; i++) {
      const data = new Date(hoje);
      data.setDate(data.getDate() - i);
      datas.push(data.toISOString().split('T')[0]);
    }

    resultado.detalhes.push(`Calculando performance para ${datas.length} dias`);

    let totalProcessados = 0;
    const totalOperacoes = usuarios.length * datas.length;

    // Processar cada usuário
    for (const usuario of usuarios) {
      try {
        // Processar cada data
        for (const data of datas) {
          const performance = await calcularPerformanceDiaria(
            usuario.id,
            empresaId,
            data,
            usuario.profile
          );

          if (performance) {
            resultado.sucesso++;
          } else {
            resultado.erros++;
          }

          totalProcessados++;

          // Reportar progresso
          if (onProgress) {
            onProgress({
              processados: totalProcessados,
              total: totalOperacoes,
              usuarioAtual: usuario.name
            });
          }
        }

        // Consolidar performance mensal para o mês atual
        const mesAtual = hoje.getMonth() + 1;
        const anoAtual = hoje.getFullYear();

        await consolidarPerformanceMensal(
          usuario.id,
          empresaId,
          mesAtual,
          anoAtual,
          usuario.profile
        );

      } catch (error) {
        resultado.erros++;
        resultado.detalhes.push(`Erro ao processar usuário ${usuario.name}: ${error}`);
      }
    }

    // Atualizar ranking mensal
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();
    await atualizarRankingMensal(empresaId, mesAtual, anoAtual);

    resultado.detalhes.push(`Cálculo concluído: ${resultado.sucesso} sucessos, ${resultado.erros} erros`);

    return resultado;
  } catch (error) {
    resultado.detalhes.push(`Erro geral no cálculo retroativo: ${error}`);
    return resultado;
  }
}

// Função para calcular performance de todos usuários para uma data específica
export async function calcularPerformanceDiaTodos(
  empresaId: string,
  data: string
): Promise<{ sucesso: number; erros: number; detalhes: string[] }> {
  const resultado = {
    sucesso: 0,
    erros: 0,
    detalhes: [] as string[]
  };

  try {
    // Buscar todos usuários ativos da empresa
    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuarios')
      .select('id, name, profile')
      .eq('empresa_id', empresaId)
      .eq('active', true);

    if (usuariosError || !usuarios) {
      resultado.detalhes.push(`Erro ao buscar usuários: ${usuariosError?.message}`);
      return resultado;
    }

    // Processar cada usuário
    for (const usuario of usuarios) {
      try {
        const performance = await calcularPerformanceDiaria(
          usuario.id,
          empresaId,
          data,
          usuario.profile
        );

        if (performance) {
          resultado.sucesso++;
        } else {
          resultado.erros++;
          resultado.detalhes.push(`Falha ao calcular performance de ${usuario.name}`);
        }
      } catch (error) {
        resultado.erros++;
        resultado.detalhes.push(`Erro ao processar ${usuario.name}: ${error}`);
      }
    }

    return resultado;
  } catch (error) {
    resultado.detalhes.push(`Erro geral no cálculo: ${error}`);
    return resultado;
  }
}

// Função para registrar log de cálculo
export async function registrarLogCalculo(
  empresaId: string,
  dataCalculo: string,
  tipoCalculo: 'diario' | 'mensal' | 'retroativo',
  usuariosProcessados: number,
  usuariosComErro: number,
  tempoExecucaoMs: number,
  status: 'sucesso' | 'erro' | 'parcial',
  mensagemErro?: string,
  detalhesJson?: any
): Promise<void> {
  try {
    await supabase
      .from('logs_calculo_performance')
      .insert({
        empresa_id: empresaId,
        data_calculo: dataCalculo,
        tipo_calculo: tipoCalculo,
        usuarios_processados: usuariosProcessados,
        usuarios_com_erro: usuariosComErro,
        tempo_execucao_ms: tempoExecucaoMs,
        status,
        mensagem_erro: mensagemErro,
        detalhes_json: detalhesJson || {}
      });
  } catch (error) {
  }
}

// Função para buscar logs de cálculo
export async function buscarLogsCalculo(
  empresaId: string,
  limite: number = 50
): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('logs_calculo_performance')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(limite);

    if (error) {
      return [];
    }

    return data || [];
  } catch (error) {
    return [];
  }
}

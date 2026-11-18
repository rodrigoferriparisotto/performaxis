import React, { useEffect, useState } from 'react';
import {
  Trophy, CalendarDays, RotateCcw, Search, Users, Gauge, Clock, AlarmClockOff, CheckCircle2,
  AlertTriangle, MinusCircle, Ban, Hourglass,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getBrazilDateString, subtractDaysBrazil, formatarData, formatarHorario } from '../../utils/dateUtils';
import { LoadingState, EmptyState } from '../ui/Estados';
import { FaixaBadge, estiloFaixa, faixaValida, fmtNum } from './meritocracia';

interface PerformanceDiariaProps {
  empresaId: string;
  perfil?: string;
}

interface PerformanceData {
  id: string;
  usuario_id: string;
  empresa_id: string;
  data: string;
  indice: number | null;
  nota_uso: number | null;
  nota_qualidade: number | null;
  nota_ritmo: number | null;
  faixa: string | null;
  ranking_dia: number | null;
  sem_uso: boolean | null;
  dia_escala: boolean | null;
  fechou_tudo: boolean | null;
  registros_esquecidos: number | null;
  iniciou_no_horario: boolean | null;
  turno_inicio: string | null;
  primeiro_inicio: string | null;
  percentual_efetividade: number | null;
  itens_nao_aplicaveis: number | null;
  total_atividades_programadas: number | null;
  total_atividades_realizadas: number | null;
  total_horas_trabalhadas: number | null;
  usuario?: {
    name: string;
    profile?: string;
  };
}

const horaCurta = (hora: string | null) => (hora ? hora.slice(0, 5) : '');

/** Chip compacto de um bloco do índice (Uso / Qualidade / Ritmo). */
function ChipBloco({
  rotulo,
  valor,
  vazio,
  detalhe,
  apagado,
}: {
  rotulo: string;
  valor: number | null;
  vazio: string;
  detalhe?: string;
  apagado?: boolean;
}) {
  const semDado = valor === null || valor === undefined;
  const cor = apagado || semDado
    ? 'bg-gray-50 border-gray-200 text-gray-400'
    : Number(valor) >= 90
      ? 'bg-green-50 border-green-200 text-green-700'
      : Number(valor) >= 70
        ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
        : 'bg-red-50 border-red-200 text-red-700';
  return (
    <div className={`rounded-lg border px-2 py-1.5 min-w-0 ${cor}`}>
      <p className="text-[10px] uppercase tracking-wide font-medium opacity-80 truncate">{rotulo}</p>
      {semDado ? (
        <p className="text-xs font-medium leading-tight truncate" title={vazio}>{vazio}</p>
      ) : (
        <p className="text-base font-bold leading-tight">{fmtNum(valor)}</p>
      )}
      {detalhe && !semDado && <p className="text-[10px] opacity-80 truncate">{detalhe}</p>}
    </div>
  );
}

const PerformanceDiaria: React.FC<PerformanceDiariaProps> = ({ empresaId, perfil }) => {
  const [performances, setPerformances] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSelecionada, setDataSelecionada] = useState<string>(getBrazilDateString());
  const [inputDataValue, setInputDataValue] = useState<string>(getBrazilDateString());

  useEffect(() => {
    carregarPerformances();
  }, [empresaId, dataSelecionada, perfil]);

  useEffect(() => {
    setInputDataValue(dataSelecionada);
  }, [dataSelecionada]);

  const carregarPerformances = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('performance_diaria')
        .select(`
          *,
          usuario:usuarios(name, profile)
        `)
        .eq('empresa_id', empresaId)
        .eq('data', dataSelecionada)
        .order('indice', { ascending: false, nullsFirst: false });

      if (error) throw error;

      let lista = (data || []) as PerformanceData[];

      if (perfil && lista.length > 0) {
        lista = lista.filter((p) => p.usuario?.profile === perfil);
      }

      // índice maior primeiro; empate pela posição do dia na empresa
      lista.sort((a, b) => {
        const ia = a.indice === null ? -1 : Number(a.indice);
        const ib = b.indice === null ? -1 : Number(b.indice);
        if (ib !== ia) return ib - ia;
        return (a.ranking_dia ?? 9999) - (b.ranking_dia ?? 9999);
      });

      setPerformances(lista);
    } catch (error) {
      console.error('Erro ao carregar performances:', error);
      setPerformances([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputDataValue(e.target.value);
  };

  const handleBuscarData = () => {
    const dataMinima = subtractDaysBrazil(31);
    const dataMaxima = getBrazilDateString();

    if (inputDataValue && inputDataValue >= dataMinima && inputDataValue <= dataMaxima) {
      setDataSelecionada(inputDataValue);
    } else {
      setInputDataValue(dataSelecionada);
    }
  };

  const voltarParaHoje = () => {
    const hoje = getBrazilDateString();
    setDataSelecionada(hoje);
    setInputDataValue(hoje);
  };

  const dataMinima = subtractDaysBrazil(31);
  const dataMaxima = getBrazilDateString();

  const calcularResumo = () => {
    const comIndice = performances.filter((p) => p.indice !== null);
    const media = comIndice.length
      ? comIndice.reduce((acc, p) => acc + Number(p.indice), 0) / comIndice.length
      : null;
    const contar = (f: string) => performances.filter((p) => faixaValida(p.faixa) === f).length;
    const comEscala = performances.filter((p) => p.iniciou_no_horario !== null);
    return {
      media,
      ouro: contar('ouro'),
      prata: contar('prata'),
      bronze: contar('bronze'),
      noHorario: comEscala.filter((p) => p.iniciou_no_horario === true).length,
      comEscala: comEscala.length,
      semUso: performances.filter((p) => p.sem_uso).length,
    };
  };

  const resumo = calcularResumo();

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-lg p-4 sm:p-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 p-3 rounded-lg">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">Índice do Dia</h3>
            <p className="text-sm text-gray-600">{formatarData(dataSelecionada)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm px-3 py-2 border border-gray-200 flex-1 md:flex-none">
            <CalendarDays className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <input
              type="date"
              value={inputDataValue}
              onChange={handleDataChange}
              min={dataMinima}
              max={dataMaxima}
              className="border-none outline-none text-sm text-gray-700 font-medium cursor-pointer bg-transparent w-full"
            />
          </div>

          <button
            onClick={handleBuscarData}
            disabled={loading || inputDataValue === dataSelecionada}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-sm hover:shadow-md hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Search className="w-4 h-4" />
            Buscar
          </button>

          {dataSelecionada !== getBrazilDateString() && (
            <button
              onClick={voltarParaHoje}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg shadow-sm hover:shadow-md hover:from-green-600 hover:to-green-700 transition-all duration-200 text-sm font-medium"
            >
              <RotateCcw className="w-4 h-4" />
              Hoje
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg">
          <LoadingState texto="Carregando índice do dia..." compacto />
        </div>
      ) : performances.length === 0 ? (
        <div className="bg-white rounded-lg">
          <EmptyState
            icon={Trophy}
            titulo="Nenhum índice calculado nesta data"
            descricao="O índice é calculado a partir dos registros do dia e da escala de cada pessoa."
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-blue-600" />
                <p className="text-xs text-gray-600">Pessoas</p>
              </div>
              <p className="text-2xl font-bold text-gray-800">{performances.length}</p>
            </div>

            <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <Gauge className="w-4 h-4 text-indigo-600" />
                <p className="text-xs text-gray-600">Índice médio</p>
              </div>
              <p className="text-2xl font-bold text-indigo-600">{fmtNum(resumo.media)}</p>
            </div>

            <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
              <p className="text-xs text-gray-600 mb-1.5">Faixas do dia</p>
              <div className="flex flex-wrap gap-1 text-xs font-semibold">
                <span className="px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-900">{resumo.ouro} Ouro</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">{resumo.prata} Prata</span>
                <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-800">{resumo.bronze} Bronze</span>
              </div>
            </div>

            <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-green-600" />
                <p className="text-xs text-gray-600">No horário</p>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {resumo.comEscala > 0 ? `${resumo.noHorario}/${resumo.comEscala}` : '—'}
              </p>
              {resumo.semUso > 0 && (
                <p className="text-[11px] text-red-600 font-medium">{resumo.semUso} sem uso</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {performances.map((perf) => {
              const semUso = !!perf.sem_uso;
              const estilo = estiloFaixa(semUso ? null : perf.faixa);
              const naoAplicaveis = Number(perf.itens_nao_aplicaveis || 0);
              const aplicaveis = Math.max(Number(perf.total_atividades_programadas || 0) - naoAplicaveis, 0);
              const esquecidos = Number(perf.registros_esquecidos || 0);

              return (
                <div
                  key={perf.id}
                  className={`bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 ${
                    semUso ? 'border-l-red-400' : estilo.borda
                  } p-3 sm:p-4`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="font-bold text-gray-800 text-base truncate">
                        {perf.usuario?.name || 'Funcionário'}
                      </h4>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {semUso ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 text-red-700 px-2.5 py-0.5 text-xs font-semibold">
                            <Ban className="w-3.5 h-3.5" />
                            Sem uso
                          </span>
                        ) : (
                          <FaixaBadge faixa={perf.faixa} />
                        )}
                        {perf.ranking_dia ? (
                          <span className="text-xs text-gray-500" title="Posição no dia, na empresa">
                            {perf.ranking_dia}º do dia
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-4xl font-extrabold leading-none ${semUso ? 'text-red-600' : estilo.numero}`}>
                        {semUso ? '0' : fmtNum(perf.indice)}
                      </p>
                      <p className="text-[10px] uppercase tracking-wide text-gray-500 mt-1">índice</p>
                    </div>
                  </div>

                  {semUso ? (
                    <p className="mt-3 text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">
                      Dia de escala sem nenhum uso do sistema — índice zerado.
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      <ChipBloco rotulo="Uso" valor={perf.nota_uso} vazio="—" />
                      <ChipBloco
                        rotulo="Qualidade"
                        valor={perf.nota_qualidade}
                        vazio="sem itens"
                        detalhe={`${perf.total_atividades_realizadas ?? 0}/${aplicaveis} itens`}
                      />
                      <ChipBloco rotulo="Ritmo" valor={perf.nota_ritmo} vazio="sem tempo estimado" />
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3 text-xs">
                    {perf.iniciou_no_horario === true && (
                      <span className="inline-flex items-center gap-1 text-green-700" title="Começou até 30 min após o início do turno">
                        <Clock className="w-3.5 h-3.5" />
                        No horário{perf.turno_inicio ? ` (turno ${horaCurta(perf.turno_inicio)})` : ''}
                      </span>
                    )}
                    {perf.iniciou_no_horario === false && (
                      <span className="inline-flex items-center gap-1 text-red-600" title="Começou mais de 30 min após o início do turno">
                        <AlarmClockOff className="w-3.5 h-3.5" />
                        Atrasou
                        {perf.turno_inicio ? ` (turno ${horaCurta(perf.turno_inicio)}` : ''}
                        {perf.turno_inicio && perf.primeiro_inicio ? `, início ${formatarHorario(perf.primeiro_inicio)})` : perf.turno_inicio ? ')' : ''}
                      </span>
                    )}
                    {perf.iniciou_no_horario === null && (
                      <span className="inline-flex items-center gap-1 text-gray-400">
                        <Clock className="w-3.5 h-3.5" />
                        Sem escala
                      </span>
                    )}

                    {perf.fechou_tudo === true && (
                      <span className="inline-flex items-center gap-1 text-green-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Fechou tudo
                      </span>
                    )}
                    {perf.fechou_tudo === false && (
                      <span className="inline-flex items-center gap-1 text-amber-700">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {esquecidos > 0
                          ? `${esquecidos} ${esquecidos === 1 ? 'registro esquecido' : 'registros esquecidos'} aberto${esquecidos === 1 ? '' : 's'}`
                          : 'Não fechou tudo'}
                      </span>
                    )}

                    {naoAplicaveis > 0 && (
                      <span className="inline-flex items-center gap-1 text-gray-500" title="Itens marcados como “Não se aplica” ficam fora da Qualidade">
                        <MinusCircle className="w-3.5 h-3.5" />
                        {naoAplicaveis} N/A
                      </span>
                    )}

                    {Number(perf.total_horas_trabalhadas || 0) > 0 && (
                      <span className="inline-flex items-center gap-1 text-gray-400" title="Apenas informativo — não entra no índice">
                        <Hourglass className="w-3.5 h-3.5" />
                        {fmtNum(perf.total_horas_trabalhadas)}h
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default PerformanceDiaria;

import React from 'react';
import { X, Clock, MapPin, User, CheckCircle, Circle, XCircle, Wrench, AlertTriangle, Pause } from 'lucide-react';
import { UsuarioAtivo } from '../../types/dashboard';
import { DashboardService } from '../../services/dashboardService';

interface DetailModalProps {
  usuario: UsuarioAtivo;
  onClose: () => void;
}

const DetailModal: React.FC<DetailModalProps> = ({ usuario, onClose }) => {
  const formatarTempo = (minutos: number): string => {
    if (minutos < 60) return `${minutos} minutos`;
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas} hora${horas > 1 ? 's' : ''}${mins > 0 ? ` e ${mins} minutos` : ''}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'realizada':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'nao_realizada':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'em_andamento':
        return <Wrench className="w-5 h-5 text-blue-500" />;
      case 'pausada':
        return <Pause className="w-5 h-5 text-yellow-500" />;
      default:
        return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'realizada':
        return 'Realizada';
      case 'nao_realizada':
        return 'Não Realizada';
      case 'em_andamento':
        return 'Em Andamento';
      case 'pausada':
        return 'Pausada';
      default:
        return 'Pendente';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'realizada':
        return 'bg-green-50 border-green-200';
      case 'nao_realizada':
        return 'bg-red-50 border-red-200';
      case 'em_andamento':
        return 'bg-blue-50 border-blue-200';
      case 'pausada':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getTipoManutencaoLabel = (tipo: string) => {
    const tiposMap: { [key: string]: string } = {
      'correcao': 'Correção',
      'conserto': 'Conserto',
      'nova_instalacao': 'Nova Instalação',
      'preventiva': 'Preventiva',
      'substituicao': 'Substituição'
    };
    return tiposMap[tipo] || tipo;
  };

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case 'alta':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'normal':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'baixa':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPrioridadeLabel = (prioridade: string) => {
    switch (prioridade) {
      case 'alta':
        return 'Alta';
      case 'normal':
        return 'Normal';
      case 'baixa':
        return 'Baixa';
      default:
        return prioridade;
    }
  };

  const calcularTempoPausas = () => {
    if (!usuario.pausas || usuario.pausas.length === 0) return 0;

    let totalPausas = 0;
    const agora = Date.now();

    usuario.pausas.forEach((pausa: any) => {
      if (pausa.hora_retomada) {
        totalPausas += new Date(pausa.hora_retomada).getTime() - new Date(pausa.hora_pausa).getTime();
      } else {
        totalPausas += agora - new Date(pausa.hora_pausa).getTime();
      }
    });

    return Math.floor(totalPausas / (1000 * 60));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white" id="modal-title">
                    {usuario.nome}
                  </h3>
                  <p className="text-sm text-blue-100">
                    {DashboardService.getDepartamentoNome(usuario.departamento)}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="px-6 py-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-600">Tempo Decorrido</span>
                </div>
                <p className="text-xl font-bold text-gray-900">
                  {formatarTempo(usuario.tempoDecorrido)}
                </p>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-600">Progresso</span>
                </div>
                <p className="text-xl font-bold text-gray-900">
                  {usuario.atividadesCompletas}/{usuario.totalAtividades}
                </p>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <MapPin className="w-4 h-4 text-purple-600" />
                  <span className="text-sm text-gray-600">Local</span>
                </div>
                <p className="text-lg font-bold text-gray-900 truncate">
                  {usuario.local || 'Não especificado'}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-semibold text-gray-900">Progresso Geral</h4>
                <span className="text-2xl font-bold text-blue-600">{usuario.progresso}%</span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${usuario.progresso}%` }}
                ></div>
              </div>
            </div>

            {usuario.observacoes && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Observações</h4>
                <p className="text-sm text-gray-700">{usuario.observacoes}</p>
              </div>
            )}

            {usuario.isManutencao && (
              <div className="mb-6 space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  Informações da Manutenção
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  {usuario.tipo && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Wrench className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-gray-600">Tipo</span>
                      </div>
                      <p className="text-base font-semibold text-gray-900">
                        {getTipoManutencaoLabel(usuario.tipo)}
                      </p>
                    </div>
                  )}

                  {usuario.prioridade && (
                    <div className={`p-4 border rounded-lg ${getPrioridadeColor(usuario.prioridade)}`}>
                      <div className="flex items-center space-x-2 mb-2">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm font-medium">Prioridade</span>
                      </div>
                      <p className="text-base font-semibold">
                        {getPrioridadeLabel(usuario.prioridade)}
                      </p>
                    </div>
                  )}
                </div>

                {usuario.pausas && usuario.pausas.length > 0 && (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Pause className="w-4 h-4 text-orange-600" />
                      <span className="text-sm font-medium text-gray-600">Tempo em Pausas</span>
                    </div>
                    <p className="text-base font-semibold text-gray-900">
                      {formatarTempo(calcularTempoPausas())}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {usuario.pausas.length} pausa{usuario.pausas.length > 1 ? 's' : ''} registrada{usuario.pausas.length > 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                {usuario.isManutencao ? 'Status da Manutenção' : 'Timeline de Atividades'}
              </h4>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {usuario.atividades && usuario.atividades.length > 0 ? (
                  <div className="space-y-2">
                    {usuario.atividades.map((atividade, index) => {
                      return (
                        <div
                          key={index}
                          className={`flex items-center space-x-3 p-3 rounded-lg border ${getStatusColor(atividade.status)} transition-all`}
                        >
                          {getStatusIcon(atividade.status)}
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {atividade.nome}
                            </p>
                            <p className="text-sm text-gray-600">
                              {getStatusLabel(atividade.status)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : usuario.totalAtividades > 0 ? (
                  <div className="space-y-2">
                    {Array.from({ length: usuario.totalAtividades }).map((_, index) => {
                      const isCompleted = index < usuario.atividadesCompletas;
                      const status = isCompleted ? 'realizada' : 'pendente';

                      return (
                        <div
                          key={index}
                          className={`flex items-center space-x-3 p-3 rounded-lg border ${getStatusColor(status)} transition-all`}
                        >
                          {getStatusIcon(status)}
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              Atividade {index + 1}
                            </p>
                            <p className="text-sm text-gray-600">
                              {getStatusLabel(status)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Circle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Nenhuma atividade registrada</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-6 py-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailModal;

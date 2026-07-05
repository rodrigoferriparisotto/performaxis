import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, AlertCircle } from 'lucide-react';
import { reminderService } from '../../services/reminderService';

interface PendingRecordsBadgeProps {
  userId: string | null;
  onRecordsUpdate?: (count: number) => void;
}

interface PendingRecord {
  id: string;
  tipo: string;
  tipoRegistro: string;
  descricao: string;
  horasDecorridas: number;
  minutosDecorridos: number;
  nivel: 'low' | 'medium' | 'high' | 'critical';
  modulePage: string;
}

export default function PendingRecordsBadge({ userId, onRecordsUpdate }: PendingRecordsBadgeProps) {
  const [records, setRecords] = useState<PendingRecord[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userId) {
      loadPendingRecords();
      const interval = setInterval(loadPendingRecords, 60000);
      return () => clearInterval(interval);
    }
  }, [userId]);

  const loadPendingRecords = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const data = await reminderService.getPendingRecordsWithDetails(userId);
      setRecords(data);

      if (onRecordsUpdate) {
        onRecordsUpdate(data.length);
      }
    } catch (error) {
      console.error('Error loading pending records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToRecord = (record: PendingRecord) => {
    // Navegar para o módulo correto
    window.location.hash = record.modulePage;

    // Fechar o modal
    setIsOpen(false);
  };

  const getLevelColor = (nivel: string) => {
    switch (nivel) {
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getLevelIcon = (nivel: string) => {
    switch (nivel) {
      case 'low':
        return <Clock className="w-4 h-4" />;
      case 'medium':
        return <AlertTriangle className="w-4 h-4" />;
      case 'high':
      case 'critical':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  if (!userId || records.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        title="Registros Pendentes"
      >
        <Clock className="w-6 h-6 text-gray-700" />
        {records.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {records.length > 9 ? '9+' : records.length}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[500px] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900">
                Registros Pendentes ({records.length})
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                Atividades em andamento que precisam ser finalizadas
              </p>
            </div>

            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="p-4 text-center text-gray-500">Carregando...</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {records.map((record) => (
                    <button
                      key={record.id}
                      onClick={() => handleNavigateToRecord(record)}
                      className="w-full block p-4 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 text-sm">{record.tipo}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{record.descricao}</p>
                        </div>
                        <div
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getLevelColor(record.nivel)}`}
                        >
                          {getLevelIcon(record.nivel)}
                          <span>
                            {record.horasDecorridas}h{record.minutosDecorridos > 0 && ` ${record.minutosDecorridos}m`}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={loadPendingRecords}
                disabled={loading}
                className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-400"
              >
                {loading ? 'Atualizando...' : 'Atualizar'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Volume2, Volume1, VolumeX, Play, Save } from 'lucide-react';
import { soundService } from '../../services/soundService';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function ConfiguracoesSom() {
  const { user } = useAuth();
  const [volume, setVolume] = useState(1.0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadUserVolume();
  }, [user]);

  const loadUserVolume = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('volume_notificacao_som')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data?.volume_notificacao_som !== null && data?.volume_notificacao_som !== undefined) {
        const userVolume = parseFloat(data.volume_notificacao_som.toString());
        setVolume(userVolume);
        soundService.setVolume(userVolume);
      }
    } catch (error) {
      console.error('Erro ao carregar volume:', error);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    soundService.setVolume(newVolume);
  };

  const handleSave = async () => {
    if (!user?.id) return;

    setSaving(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ volume_notificacao_som: volume })
        .eq('id', user.id);

      if (error) throw error;

      setMessage('Volume salvo com sucesso!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Erro ao salvar volume:', error);
      setMessage('Erro ao salvar volume.');
    } finally {
      setSaving(false);
    }
  };

  const testSound = async (level: 'info' | 'warning' | 'urgent' | 'critical') => {
    await soundService.play(level);
  };

  const getVolumeIcon = () => {
    if (volume === 0) return <VolumeX className="w-5 h-5" />;
    if (volume < 0.5) return <Volume1 className="w-5 h-5" />;
    return <Volume2 className="w-5 h-5" />;
  };

  const getVolumeLabel = () => {
    if (volume === 0) return 'Silenciado';
    if (volume < 0.3) return 'Muito Baixo';
    if (volume < 0.5) return 'Baixo';
    if (volume < 0.7) return 'Médio';
    if (volume < 0.9) return 'Alto';
    return 'Máximo';
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          Configurações de Som
        </h1>

        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">
              Volume das Notificações
            </h2>
            <p className="text-sm text-blue-700 mb-4">
              Ajuste o volume dos sons de notificação do sistema. Use os botões abaixo para testar cada tipo de som.
            </p>

            <div className="flex items-center gap-4 mb-4">
              <div className="text-blue-600">
                {getVolumeIcon()}
              </div>
              <div className="flex-1">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
              <div className="text-sm font-medium text-blue-900 w-24">
                {getVolumeLabel()}
              </div>
              <div className="text-sm text-blue-700 w-12 text-right">
                {Math.round(volume * 100)}%
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar Volume'}
            </button>

            {message && (
              <p className={`mt-2 text-sm ${message.includes('sucesso') ? 'text-green-600' : 'text-red-600'}`}>
                {message}
              </p>
            )}
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Testar Sons de Notificação
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Clique nos botões para ouvir cada tipo de notificação com o volume atual.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={() => testSound('info')}
                className="flex items-center justify-between p-4 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors group"
              >
                <div className="text-left">
                  <div className="font-medium text-blue-900">Informação</div>
                  <div className="text-xs text-blue-700">Som suave e curto</div>
                </div>
                <Play className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
              </button>

              <button
                onClick={() => testSound('warning')}
                className="flex items-center justify-between p-4 bg-yellow-100 hover:bg-yellow-200 rounded-lg transition-colors group"
              >
                <div className="text-left">
                  <div className="font-medium text-yellow-900">Aviso</div>
                  <div className="text-xs text-yellow-700">Som duplo de atenção</div>
                </div>
                <Play className="w-5 h-5 text-yellow-600 group-hover:scale-110 transition-transform" />
              </button>

              <button
                onClick={() => testSound('urgent')}
                className="flex items-center justify-between p-4 bg-orange-100 hover:bg-orange-200 rounded-lg transition-colors group"
              >
                <div className="text-left">
                  <div className="font-medium text-orange-900">Urgente</div>
                  <div className="text-xs text-orange-700">Som triplo insistente</div>
                </div>
                <Play className="w-5 h-5 text-orange-600 group-hover:scale-110 transition-transform" />
              </button>

              <button
                onClick={() => testSound('critical')}
                className="flex items-center justify-between p-4 bg-red-100 hover:bg-red-200 rounded-lg transition-colors group"
              >
                <div className="text-left">
                  <div className="font-medium text-red-900">Crítico</div>
                  <div className="text-xs text-red-700">Som alto e repetitivo</div>
                </div>
                <Play className="w-5 h-5 text-red-600 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 mb-2">Melhorias Implementadas</h3>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Volume aumentado em até 4x comparado ao anterior</li>
              <li>• Sons mais ricos usando múltiplas frequências simultâneas</li>
              <li>• Duração dos tons aumentada para melhor percepção</li>
              <li>• Controle de volume personalizado por usuário</li>
              <li>• Sons distintos para cada nível de prioridade</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

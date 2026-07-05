import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { suiteService } from '../../services/supabaseService';
import { getDataAtual, formatarData } from '../../utils/dateUtils';
import { 
  Calendar,
  Home,
  Plus,
  ChevronDown,
  Save,
  X,
  Edit,
  Trash2,
  Clock,
  User
} from 'lucide-react';

interface RegistroProgramado {
  id: string;
  data: string;
  suite_id: string;
  tipo_servico: string;
  usuario_id: string;
  status: 'programado';
  created_at: string;
  usuarios?: {
    name: string;
  };
  suites?: {
    name: string;
    type: string;
  };
}

const ProgramacaoCamararia: React.FC = () => {
  const { user } = useAuth();
  const [suites, setSuites] = useState<any[]>([]);
  const [servicosCamararia, setServicosCamararia] = useState<any[]>([]);
  const [registrosProgramados, setRegistrosProgramados] = useState<RegistroProgramado[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingRegistro, setEditingRegistro] = useState<RegistroProgramado | null>(null);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [suitesData] = await Promise.all([
        suiteService.getSuites(),
        carregarServicosCamararia(),
        carregarRegistrosProgramados()
      ]);
      setSuites(suitesData);
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  const carregarServicosCamararia = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) return;

      const { data, error } = await supabase
        .from('servicos_camararia')
        .select('*')
        .eq('empresa_id', userData.empresa_id)
        .eq('ativo', true)
        .order('nome');

      if (!error) {
        setServicosCamararia(data || []);
      }
    } catch (error) {

    }
  };

  const carregarRegistrosProgramados = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.empresa_id) return;

      // Buscar registros programados da empresa
      const { data, error } = await supabase
        .from('registros_camararia')
        .select(`
          *,
          suites(name, type),
          usuarios!registros_camararia_usuario_id_fkey(name)
        `)
        .eq('empresa_id', userData.empresa_id)
        .eq('status', 'programado')
        .gte('data', getDataAtual());

      if (!error && data) {
        // Ordenar por nome da suíte alfabeticamente
        const registrosOrdenados = data.sort((a, b) => {
          const nomeA = a.suites?.name || '';
          const nomeB = b.suites?.name || '';

          // Converter para números se forem numéricos, senão comparar como string
          const numA = parseFloat(nomeA);
          const numB = parseFloat(nomeB);

          if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
          }

          return nomeA.localeCompare(nomeB, 'pt-BR', { numeric: true, sensitivity: 'base' });
        });

        setRegistrosProgramados(registrosOrdenados);
      }
    } catch (error) {

    }
  };

  const mapearServicoParaEnum = (nomeServico: string): string => {
    const nomeNormalizado = nomeServico.toLowerCase().trim();
    
    const mapeamentos: Record<string, string> = {
      'check-in': 'check_in',
      'checkin': 'check_in',
      'check in': 'check_in',
      'chegada': 'check_in',
      'entrada': 'check_in',
      'check-out': 'check_out',
      'checkout': 'check_out',
      'check out': 'check_out',
      'saida': 'check_out',
      'saída': 'check_out',
      'permanencia': 'permanencia',
      'permanência': 'permanencia',
      'suite livre': 'suite_livre',
      'suite_livre': 'suite_livre',
      'suitelivre': 'suite_livre',
      'livre': 'suite_livre'
    };
    
    return mapeamentos[nomeNormalizado] || 'suite_livre';
  };

  const handleSaveRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const formData = new FormData(e.target as HTMLFormElement);
    const dataPrograma = formData.get('data') as string;
    const suiteId = formData.get('suite_id') as string;
    
    // Verificar se a suíte já está programada para esta data (apenas para novos registros)
    if (!editingRegistro) {
      const jaProgramada = registrosProgramados.some(r => 
        r.suite_id === suiteId && r.data === dataPrograma
      );
      
      if (jaProgramada) {
        alert('Esta suíte já possui uma programação para esta data.');
        setSaving(false);
        return;
      }
    }
    
    const registroData = {
      data: dataPrograma,
      suite_id: suiteId,
      tipo_servico: formData.get('tipo_servico') as string,
      usuario_id: user?.id,
      status: 'programado' as const,
      hora_inicio: `${dataPrograma}T00:00:00Z`,
      atividades: [],
      observacoes: '',
      fotos: []
    };

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        alert('Usuário não autenticado');
        setSaving(false);
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', authUser.id)
        .single();

      if (userError || !userData?.empresa_id) {
        alert('Usuário não possui empresa vinculada');
        setSaving(false);
        return;
      }

      const registroComEmpresa = {
        ...registroData,
        empresa_id: userData.empresa_id
      };

      let result;
      if (editingRegistro) {
        const { data, error } = await supabase
          .from('registros_camararia')
          .update(registroComEmpresa)
          .eq('id', editingRegistro.id)
          .select()
          .single();
        
        result = { data, error };
      } else {
        const { data, error } = await supabase
          .from('registros_camararia')
          .insert(registroComEmpresa)
          .select()
          .single();
        
        result = { data, error };
      }

      if (result.error) {

        alert('Erro ao salvar programação');
      } else {
        await carregarRegistrosProgramados();
        setShowModal(false);
        setEditingRegistro(null);
        alert(editingRegistro ? 'Programação atualizada com sucesso!' : 'Registro programado com sucesso!');
      }
    } catch (error) {

      alert('Erro ao salvar programação');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRegistro = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta programação?')) {
      try {
        // Optimistic update: remover da lista imediatamente
        const registroAnterior = registrosProgramados.find(r => r.id === id);
        setRegistrosProgramados(prev => prev.filter(r => r.id !== id));

        const { error } = await supabase
          .from('registros_camararia')
          .delete()
          .eq('id', id);

        if (error) {
          // Se houver erro, reverter a remoção otimista
          if (registroAnterior) {
            setRegistrosProgramados(prev => [...prev, registroAnterior]);
          }
          alert('Erro ao excluir programação');
        } else {
          // Sucesso: a lista já foi atualizada com o optimistic update
          alert('Programação excluída com sucesso!');
          // Opcional: recarregar para garantir sincronização
          await carregarRegistrosProgramados();
        }
      } catch (error) {
        // Em caso de exceção, recarregar a lista
        await carregarRegistrosProgramados();
        alert('Erro ao excluir programação');
      }
    }
  };

  const handleEditRegistro = (registro: RegistroProgramado) => {
    setEditingRegistro(registro);
    setShowModal(true);
  };

  const handleNewRegistro = () => {
    setEditingRegistro(null);
    setShowModal(true);
  };

  const getSuiteNome = (suiteId: string) => {
    const suite = suites.find(s => s.id === suiteId);
    return suite ? `Suíte ${suite.name}` : 'Suíte não encontrada';
  };

  const getSuitesDisponiveis = (dataPrograma: string) => {
    // Para edição, incluir a suíte atual
    if (editingRegistro) {
      return suites;
    }
    
    // Para novo registro, filtrar suítes já programadas para a data
    const suitesJaProgramadas = registrosProgramados
      .filter(r => r.data === dataPrograma)
      .map(r => r.suite_id);
    
    return suites.filter(suite => !suitesJaProgramadas.includes(suite.id));
  };

  const getTipoServicoLabel = (tipo: string) => {
    const servico = servicosCamararia.find(s => mapearServicoParaEnum(s.nome) === tipo);
    return servico ? servico.nome : tipo;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Programação - Camararia</h1>
          <p className="text-gray-600">Programe registros de camararia antecipadamente</p>
        </div>
        <button 
          onClick={handleNewRegistro}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2 transition-colors duration-200"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Programação</span>
        </button>
      </div>

      {/* Lista de Registros Programados */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Registros Programados</h2>
              <p className="text-sm text-gray-600">{registrosProgramados.length} registros programados</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {registrosProgramados.length > 0 ? (
            <div className="space-y-4">
              {registrosProgramados.map((registro) => (
                <div key={registro.id} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <Home className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-gray-800">{getSuiteNome(registro.suite_id)}</span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                          {getTipoServicoLabel(registro.tipo_servico)}
                        </span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                          Programado
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatarData(registro.data)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <User className="w-3 h-3" />
                          <span>{registro.usuarios?.name || 'Usuário não encontrado'}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>Criado: {new Date(registro.created_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => handleEditRegistro(registro)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                        title="Editar programação"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {(user?.profile === 'admin' || registro.usuario_id === user?.id) && (
                        <button 
                          onClick={() => handleDeleteRegistro(registro.id)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors duration-200"
                          title="Excluir programação"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">Nenhum registro programado</h3>
              <p className="text-gray-600 mb-4">Programe registros de camararia antecipadamente</p>
              <button 
                onClick={handleNewRegistro}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2 mx-auto transition-colors duration-200"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Programação</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Programação */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">
                  {editingRegistro ? 'Editar Programação' : 'Nova Programação'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveRegistro} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data *
                </label>
                <input
                  type="date"
                  name="data"
                  id="data-programacao"
                  defaultValue={editingRegistro?.data || getDataAtual()}
                  min={getDataAtual()}
                  onChange={(e) => {
                    // Forçar re-render do select de suítes quando a data mudar
                    const suiteSelect = document.getElementById('suite-programacao') as HTMLSelectElement;
                    if (suiteSelect) {
                      const currentValue = suiteSelect.value;
                      suiteSelect.innerHTML = '';
                      
                      // Adicionar opção padrão
                      const defaultOption = document.createElement('option');
                      defaultOption.value = '';
                      defaultOption.textContent = 'Selecione uma suíte';
                      suiteSelect.appendChild(defaultOption);
                      
                      // Adicionar suítes disponíveis
                      const suitesDisponiveis = getSuitesDisponiveis(e.target.value);
                      suitesDisponiveis.forEach(suite => {
                        const option = document.createElement('option');
                        option.value = suite.id;
                        option.textContent = `Suíte ${suite.name} - ${suite.type}`;
                        suiteSelect.appendChild(option);
                      });
                      
                      // Manter valor selecionado se ainda disponível
                      if (suitesDisponiveis.some(s => s.id === currentValue)) {
                        suiteSelect.value = currentValue;
                      }
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Suíte *
                </label>
                <div className="relative">
                  <select
                    name="suite_id"
                    id="suite-programacao"
                    defaultValue={editingRegistro?.suite_id || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none"
                    required
                  >
                    <option value="">Selecione uma suíte</option>
                    {getSuitesDisponiveis(editingRegistro?.data || getDataAtual()).map(suite => (
                      <option key={suite.id} value={suite.id}>
                        Suíte {suite.name} - {suite.type}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                {!editingRegistro && getSuitesDisponiveis(getDataAtual()).length < suites.length && (
                  <p className="text-xs text-blue-600 mt-1">
                    {suites.length - getSuitesDisponiveis(getDataAtual()).length} suíte(s) já programada(s) para esta data
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Serviço *
                </label>
                <div className="relative">
                  <select
                    name="tipo_servico"
                    defaultValue={editingRegistro?.tipo_servico || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none"
                    required
                  >
                    <option value="">Selecione o tipo</option>
                    {servicosCamararia.map(servico => (
                      <option key={servico.id} value={mapearServicoParaEnum(servico.nome)}>
                        {servico.nome}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`flex-1 px-4 py-2 rounded-md flex items-center justify-center space-x-2 transition-colors duration-200 ${
                    saving 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-green-600 hover:bg-green-700'
                  } text-white`}
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Salvando...' : 'Salvar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Programados</p>
              <p className="text-2xl font-bold text-gray-800">{registrosProgramados.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Para Hoje</p>
              <p className="text-2xl font-bold text-gray-800">
                {registrosProgramados.filter(r => r.data === getDataAtual()).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Calendar className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Próximos Dias</p>
              <p className="text-2xl font-bold text-gray-800">
                {registrosProgramados.filter(r => r.data > getDataAtual()).length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgramacaoCamararia;
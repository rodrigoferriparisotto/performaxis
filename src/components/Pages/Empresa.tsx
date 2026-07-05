import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { empresaService, usuarioService } from '../../services/supabaseService';
import { AuthService } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';
import { modulosService } from '../../services/modulosService';
import { getBrazilDateString } from '../../utils/dateUtils';
import {
  Building,
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  Save,
  Users,
  MapPin,
  Phone,
  Mail,
  Hash,
  Eye,
  EyeOff,
  Shield,
  Check
} from 'lucide-react';

const Empresa: React.FC = () => {
  const { user, hasAccess } = useAuth();
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [gestoresSemEmpresa, setGestoresSemEmpresa] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [whatsappValue, setWhatsappValue] = useState('');
  const [telefoneGestorValue, setTelefoneGestorValue] = useState('');
  const [gestorExistenteId, setGestorExistenteId] = useState<string>('');
  const [criarNovoGestor, setCriarNovoGestor] = useState(false);
  const [gestoresVinculados, setGestoresVinculados] = useState<any[]>([]);
  const [gestoresDisponiveis, setGestoresDisponiveis] = useState<any[]>([]);
  const [loadingGestores, setLoadingGestores] = useState(false);

  // Estados para cálculos em tempo real
  const [valorTotal, setValorTotal] = useState(0);
  const [valorMensal, setValorMensal] = useState(0);
  const [dataFinal, setDataFinal] = useState('');
  const [mesesRestantes, setMesesRestantes] = useState(0);
  const [modulosSelecionados, setModulosSelecionados] = useState<string[]>([]);

  const canEdit = hasAccess('empresa');
  const isAdmin = user?.profile === 'admin' && user?.empresaId === null;

  React.useEffect(() => {
    carregarEmpresas();
  }, []);

  const carregarEmpresas = async () => {
    setLoading(true);

    try {
      if (isAdmin) {
        // Admin pode ver todas as empresas
        const empresasData = await empresaService.getAllEmpresas();
        // Ordenar empresas alfabeticamente por nome
        const empresasOrdenadas = (empresasData || []).sort((a, b) =>
          a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
        );
        setEmpresas(empresasOrdenadas);

        // Carregar gestores sem empresa (empresa_id NULL e profile = gestor)
        const { data: gestoresData, error } = await supabase
          .from('usuarios')
          .select('*')
          .eq('profile', 'gestor')
          .is('empresa_id', null)
          .eq('active', true)
          .order('name');

        if (!error && gestoresData) {
          setGestoresSemEmpresa(gestoresData);
        }
      } else {
        // Outros usuários veem apenas sua empresa
        const empresaData = await empresaService.getEmpresa();
        setEmpresas(empresaData ? [empresaData] : []);
      }
    } catch (error) {

      setEmpresas([]);
    }

    setLoading(false);
  };

  const handleSaveEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdmin) {
      alert('Apenas Administradores podem criar ou editar empresas');
      return;
    }

    setSaving(true);

    const formData = new FormData(e.target as HTMLFormElement);

    // Dados da empresa
    const empresaData: any = {
      nome: formData.get('nome') as string,
      endereco: formData.get('endereco') as string,
      email: formData.get('email') as string,
      whatsapp: formData.get('whatsapp') as string,
      contato: formData.get('contato') as string,
      numero_quartos: parseInt(formData.get('numeroQuartos') as string),
      numero_andares: parseInt(formData.get('numeroAndares') as string),
      numero_usuarios: parseInt(formData.get('numeroUsuarios') as string),
      ativo: formData.get('ativo') === 'true',
      // Campos contratuais
      inicio_contrato: formData.get('inicioContrato') as string || null,
      duracao_contrato_meses: formData.get('duracaoContratoMeses') ? parseInt(formData.get('duracaoContratoMeses') as string) : null,
      valor_instalacao: formData.get('valorInstalacao') ? parseFloat(formData.get('valorInstalacao') as string) : 0,
      valor_mensalidade: formData.get('valorMensalidade') ? parseFloat(formData.get('valorMensalidade') as string) : 0,
      tipo_pagamento: formData.get('tipoPagamento') as string || null,
      forma_pagamento: formData.get('formaPagamento') as string || null,
      modulos_contratados: modulosSelecionados
    };
    
    // Dados do usuário gestor (apenas para nova empresa)
    let gestorData = null;
    if (!editingEmpresa) {
      // Verificar se está usando gestor existente ou criando novo
      if (gestorExistenteId) {
        // Usar gestor existente
        gestorData = { existenteId: gestorExistenteId };
      } else if (criarNovoGestor) {
        // Criar novo gestor
        gestorData = {
          login: formData.get('loginGestor') as string,
          password: formData.get('passwordGestor') as string,
          confirmPassword: formData.get('confirmPasswordGestor') as string,
          nomeGestor: formData.get('nomeGestor') as string,
          telefoneGestor: formData.get('telefoneGestor') as string
        };

        // Validações para novo gestor
        if (!gestorData.login || !gestorData.password || !gestorData.nomeGestor) {
          alert('Todos os campos do gestor são obrigatórios para criar um novo gestor');
          setSaving(false);
          return;
        }

        if (!validarTelefone(gestorData.telefoneGestor)) {
          alert('O telefone do gestor deve ter 10 ou 11 dígitos');
          setSaving(false);
          return;
        }

        if (gestorData.password.length < 6) {
          alert('A senha do gestor deve ter pelo menos 6 caracteres');
          setSaving(false);
          return;
        }

        if (gestorData.password !== gestorData.confirmPassword) {
          alert('As senhas do gestor não coincidem');
          setSaving(false);
          return;
        }
      } else {
        alert('Selecione um gestor existente ou marque a opção para criar um novo');
        setSaving(false);
        return;
      }
    }
    
    // Validar WhatsApp da empresa
    if (!validarTelefone(empresaData.whatsapp)) {
      alert('O WhatsApp da empresa deve ter 10 ou 11 dígitos');
      setSaving(false);
      return;
    }
    
    let result;
    if (editingEmpresa) {
      // Atualizar empresa existente
      const empresaAnterior = empresas.find(e => e.id === editingEmpresa.id);
      const empresaFoiInativada = empresaAnterior?.ativo === true && empresaData.ativo === false;
      
      result = await empresaService.updateEmpresa(editingEmpresa.id, empresaData);

      if (result) {
        // Limpar cache de módulos da empresa atualizada
        modulosService.clearCache(editingEmpresa.id);

        // Se a empresa foi inativada, inativar todos os usuários vinculados
        if (empresaFoiInativada) {

          try {
            const { error: updateUsersError } = await supabase
              .from('usuarios')
              .update({ active: false })
              .eq('empresa_id', editingEmpresa.id);

            if (updateUsersError) {

              alert('Empresa atualizada, mas houve erro ao inativar os usuários vinculados.');
            } else {

            }
          } catch (userUpdateError) {

            alert('Empresa atualizada, mas houve erro ao inativar os usuários vinculados.');
          }
        }

        await carregarEmpresas();
        setShowModal(false);
        setEditingEmpresa(null);
        
        if (empresaFoiInativada) {
          alert(`Empresa "${empresaData.nome}" foi inativada com sucesso!\n\nTodos os usuários vinculados a esta empresa também foram inativados automaticamente.`);
        } else {
          alert('Empresa atualizada com sucesso!');
        }
      } else {
        alert('Erro ao atualizar empresa');
      }
    } else {
      // Criar nova empresa + vincular ou criar usuário gestor

      const empresaResult = await empresaService.createEmpresa(empresaData);

      if (empresaResult.error) {
        console.error('Erro detalhado ao criar empresa:', empresaResult.error);

        // Mensagens de erro específicas baseadas no código do erro
        if (empresaResult.error.code === 'PGRST301' || empresaResult.error.message?.includes('permission denied')) {
          alert('Erro de permissão ao criar empresa.\n\nVerifique se você tem perfil de administrador.\n\nSe o problema persistir, entre em contato com o suporte técnico.');
        } else if (empresaResult.error.code === '23505') {
          alert('Já existe uma empresa com estes dados.\n\nVerifique se o nome ou email já estão cadastrados.');
        } else {
          alert(`Erro ao criar empresa: ${empresaResult.error.message || 'Erro desconhecido'}\n\nVerifique os dados e tente novamente.`);
        }

        setSaving(false);
        return;
      }

      const empresaCriada = empresaResult.data;

      if (empresaCriada && gestorData) {
        if ((gestorData as any).existenteId) {
          // Vincular gestor existente à empresa
          const { error: updateError } = await supabase
            .from('usuarios')
            .update({ empresa_id: empresaCriada.id })
            .eq('id', (gestorData as any).existenteId);

          if (!updateError) {
            const gestorVinculado = gestoresSemEmpresa.find(g => g.id === (gestorData as any).existenteId);
            await carregarEmpresas();
            setShowModal(false);
            setEditingEmpresa(null);
            alert(`Empresa "${empresaData.nome}" criada com sucesso!\n\nGestor "${gestorVinculado?.name}" vinculado à empresa.`);
          } else {
            alert(`Empresa "${empresaData.nome}" criada com sucesso!\n\nMas houve erro ao vincular o gestor. Vincule manualmente na seção Usuários.`);
          }
        } else {
          // Criar novo usuário gestor usando AuthService
          const gestorDataCompleto = gestorData as any;
          const { success, error, userId } = await AuthService.createUser({
            email: gestorDataCompleto.login,
            password: gestorDataCompleto.password,
            name: gestorDataCompleto.nomeGestor,
            telefone: gestorDataCompleto.telefoneGestor,
            profile: 'gestor',
            dataContratacao: getBrazilDateString(),
            active: true,
            empresaId: empresaCriada.id
          });

          if (success) {
            await carregarEmpresas();
            setShowModal(false);
            setEditingEmpresa(null);
            alert(`Empresa "${empresaData.nome}" criada com sucesso!\n\nUsuário gestor "${gestorDataCompleto.nomeGestor}" criado e vinculado à empresa.\n\nLogin: ${gestorDataCompleto.login}\nPerfil: Gestor`);
          } else {
            alert(`Empresa "${empresaData.nome}" criada com sucesso!\n\nMas houve erro ao criar o usuário gestor: ${error}\n\nCrie o usuário gestor manualmente na seção Usuários.`);
          }
        }
      } else if (empresaCriada) {
        // Empresa criada mas sem dados do gestor (não deveria acontecer)
        await carregarEmpresas();
        setShowModal(false);
        setEditingEmpresa(null);
        alert(`Empresa "${empresaData.nome}" criada com sucesso!`);
      }

      result = empresaCriada; // Para manter compatibilidade com o código existente
    }
    
    setSaving(false);
  };

  const handleEditEmpresa = async (empresa: any) => {
    setEditingEmpresa(empresa);
    setWhatsappValue(empresa.whatsapp || '');
    setTelefoneGestorValue('');

    // Carregar módulos contratados da empresa
    const modulosEmpresa = empresa.modulos_contratados || [];
    setModulosSelecionados(modulosEmpresa);

    // Inicializar valores calculados
    if (empresa.valor_total) setValorTotal(empresa.valor_total);
    if (empresa.valor_mensal) setValorMensal(empresa.valor_mensal);
    if (empresa.final_contrato) setDataFinal(empresa.final_contrato);

    // Calcular meses restantes
    if (empresa.final_contrato) {
      const hoje = new Date();
      const dataFinalContrato = new Date(empresa.final_contrato);
      const diffTime = dataFinalContrato.getTime() - hoje.getTime();
      const diffMonths = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30)));
      setMesesRestantes(diffMonths);
    }

    // Carregar gestores vinculados e disponíveis
    await carregarGestores(empresa.id);

    setShowModal(true);
  };

  const carregarGestores = async (empresaId: string) => {
    if (!isAdmin) return;

    setLoadingGestores(true);
    try {
      // Carregar gestores vinculados a esta empresa
      const { data: vinculados, error: errorVinculados } = await supabase
        .from('usuarios')
        .select('*')
        .eq('profile', 'gestor')
        .eq('empresa_id', empresaId)
        .order('name');

      if (!errorVinculados && vinculados) {
        setGestoresVinculados(vinculados);
      }

      // Carregar gestores disponíveis (apenas sem empresa)
      const { data: disponiveis, error: errorDisponiveis } = await supabase
        .from('usuarios')
        .select('*')
        .eq('profile', 'gestor')
        .eq('active', true)
        .is('empresa_id', null)
        .order('name');

      if (!errorDisponiveis && disponiveis) {
        setGestoresDisponiveis(disponiveis);
      }
    } catch (error) {
      console.error('Erro ao carregar gestores:', error);
    } finally {
      setLoadingGestores(false);
    }
  };

  const handleVincularGestor = async (gestorId: string) => {
    if (!editingEmpresa) return;

    if (confirm('Tem certeza que deseja vincular este gestor a esta empresa?')) {
      try {
        const { error } = await supabase
          .from('usuarios')
          .update({ empresa_id: editingEmpresa.id })
          .eq('id', gestorId);

        if (!error) {
          alert('Gestor vinculado com sucesso!');
          await carregarGestores(editingEmpresa.id);
        } else {
          alert('Erro ao vincular gestor');
        }
      } catch (error) {
        alert('Erro ao vincular gestor');
      }
    }
  };

  const handleDesvincularGestor = async (gestorId: string) => {
    if (!editingEmpresa) return;

    if (confirm('Tem certeza que deseja desvincular este gestor desta empresa?\n\nO gestor ficará sem empresa vinculada.')) {
      try {
        const { error } = await supabase
          .from('usuarios')
          .update({ empresa_id: null })
          .eq('id', gestorId);

        if (!error) {
          alert('Gestor desvinculado com sucesso!');
          await carregarGestores(editingEmpresa.id);
        } else {
          alert('Erro ao desvincular gestor');
        }
      } catch (error) {
        alert('Erro ao desvincular gestor');
      }
    }
  };

  const handleNewEmpresa = () => {
    setEditingEmpresa(null);
    setWhatsappValue('');
    setTelefoneGestorValue('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setGestorExistenteId('');
    setCriarNovoGestor(false);

    // Inicializar com todos os módulos selecionados por padrão
    const todosModulos = modulosService.getModulosDisponiveis().map(m => m.id);
    setModulosSelecionados(todosModulos);

    // Resetar valores calculados
    setValorTotal(0);
    setValorMensal(0);
    setDataFinal('');
    setMesesRestantes(0);

    setShowModal(true);
  };

  const handleModuloToggle = (moduloId: string) => {
    if (!isAdmin) return;

    setModulosSelecionados(prev => {
      if (prev.includes(moduloId)) {
        if (prev.length === 1) {
          alert('A empresa deve ter ao menos 1 módulo contratado');
          return prev;
        }
        return prev.filter(m => m !== moduloId);
      } else {
        return [...prev, moduloId];
      }
    });
  };

  const formatarTelefone = (valor: string) => {
    // Remove tudo que não é número
    const apenasNumeros = valor.replace(/\D/g, '');
    
    // Limita a 11 dígitos
    const limitado = apenasNumeros.slice(0, 11);
    
    // Aplica formatação baseada no tamanho
    if (limitado.length <= 2) {
      return limitado;
    } else if (limitado.length <= 6) {
      return `(${limitado.slice(0, 2)}) ${limitado.slice(2)}`;
    } else if (limitado.length <= 10) {
      return `(${limitado.slice(0, 2)}) ${limitado.slice(2, 6)}-${limitado.slice(6)}`;
    } else {
      return `(${limitado.slice(0, 2)}) ${limitado.slice(2, 7)}-${limitado.slice(7)}`;
    }
  };

  const validarTelefone = (telefone: string) => {
    const apenasNumeros = telefone.replace(/\D/g, '');
    return apenasNumeros.length === 10 || apenasNumeros.length === 11;
  };

  const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorFormatado = formatarTelefone(e.target.value);
    setWhatsappValue(valorFormatado);
  };

  const handleTelefoneGestorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorFormatado = formatarTelefone(e.target.value);
    setTelefoneGestorValue(valorFormatado);
  };
  
  // Função para calcular valores em tempo real
  const calcularValores = () => {
    const inicioContrato = (document.getElementById('inicioContrato') as HTMLInputElement)?.value;
    const duracaoMeses = parseInt((document.getElementById('duracaoContratoMeses') as HTMLInputElement)?.value || '0');
    const valorInstalacao = parseFloat((document.getElementById('valorInstalacao') as HTMLInputElement)?.value || '0');
    const valorMensalidade = parseFloat((document.getElementById('valorMensalidade') as HTMLInputElement)?.value || '0');
    
    // Calcular data final
    if (inicioContrato && duracaoMeses > 0) {
      const dataInicio = new Date(inicioContrato);
      const dataFinalCalculada = new Date(dataInicio);
      dataFinalCalculada.setMonth(dataFinalCalculada.getMonth() + duracaoMeses);
      
      const ano = dataFinalCalculada.getFullYear();
      const mes = String(dataFinalCalculada.getMonth() + 1).padStart(2, '0');
      const dia = String(dataFinalCalculada.getDate()).padStart(2, '0');
      const dataFinalFormatada = `${ano}-${mes}-${dia}`;
      
      setDataFinal(dataFinalFormatada);
      
      // Calcular meses restantes
      const hoje = new Date();
      const diffTime = dataFinalCalculada.getTime() - hoje.getTime();
      const diffMonths = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30)));
      setMesesRestantes(diffMonths);
    } else {
      setDataFinal('');
      setMesesRestantes(0);
    }
    
    // Calcular valor total
    if (duracaoMeses > 0) {
      const total = valorInstalacao + (valorMensalidade * duracaoMeses);
      setValorTotal(total);
      
      // Calcular valor mensal efetivo
      const mensalEfetivo = total / duracaoMeses;
      setValorMensal(mensalEfetivo);
    } else {
      setValorTotal(valorInstalacao);
      setValorMensal(0);
    }
  };
  
  // Função para obter data final calculada
  const calcularDataFinal = () => {
    return dataFinal;
  };

  const handleDeleteEmpresa = async (id: string) => {
    if (!isAdmin) {
      alert('Apenas administradores podem excluir empresas');
      return;
    }

    if (confirm('⚠️ ATENÇÃO: O sistema verificará se a empresa pode ser excluída ou deve ser inativada.\n\n• Se tem apenas 1 usuário e nenhum registro: será EXCLUÍDA\n• Se tem múltiplos usuários ou registros: será INATIVADA\n\nDeseja continuar?')) {
      const success = await empresaService.deleteEmpresa(id);
      if (success) {
        await carregarEmpresas();
        // A mensagem de sucesso já é exibida no serviço
      } else {
        alert('Erro ao processar solicitação de exclusão/inativação');
      }
    }
  };

  const filteredEmpresas = empresas.filter(empresa =>
    empresa.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    empresa.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {isAdmin ? 'Gerenciar Empresas' : 'Minha Empresa'}
          </h1>
          <p className="text-gray-600">
            {isAdmin ? 'Gerencie todas as empresas do sistema' : 'Visualize os dados da sua empresa'}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleNewEmpresa}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors duration-200"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Empresa</span>
          </button>
        )}
      </div>

      {/* Filtro de busca - apenas para admin */}
      {isAdmin && (
        <div className="flex items-center justify-between">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar empresas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Lista de Empresas */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Building className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                {isAdmin ? 'Lista de Empresas' : 'Dados da Empresa'}
              </h2>
              <p className="text-sm text-gray-600">
                {filteredEmpresas.length} {filteredEmpresas.length === 1 ? 'empresa' : 'empresas'} {isAdmin ? 'cadastradas' : 'vinculada'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {filteredEmpresas.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredEmpresas.map((empresa) => (
                <div key={empresa.id} className="bg-gray-50 rounded-lg border border-gray-200 p-6 hover:bg-gray-100 transition-colors duration-200">
                  <div className="flex items-start justify-between mb-4 gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-gray-800 mb-2 break-words">{empresa.nome}</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start space-x-2 text-gray-600">
                          <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span className="break-words">{empresa.endereco}</span>
                        </div>
                        <div className="flex items-start space-x-2 text-gray-600">
                          <Mail className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span className="break-all">{empresa.email}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Phone className="w-4 h-4 flex-shrink-0" />
                          <span>{empresa.whatsapp}</span>
                        </div>
                        <div className="flex items-start space-x-2 text-gray-600">
                          <Users className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span className="break-words">{empresa.contato}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <button
                        onClick={() => handleEditEmpresa(empresa)}
                        disabled={!isAdmin}
                        className={`p-2 rounded-lg transition-colors duration-200 ${
                          isAdmin
                            ? 'text-blue-600 hover:bg-blue-100'
                            : 'text-gray-400 cursor-not-allowed'
                        }`}
                        title={isAdmin ? "Editar empresa" : "Apenas Administradores"}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteEmpresa(empresa.id)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors duration-200"
                          title="Excluir empresa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Estatísticas da Empresa */}
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">{empresa.numero_quartos}</div>
                      <div className="text-xs text-gray-500">Quartos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">{empresa.numero_andares}</div>
                      <div className="text-xs text-gray-500">Andares</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-600">{empresa.numero_usuarios}</div>
                      <div className="text-xs text-gray-500">Usuários</div>
                    </div>
                  </div>

                  {/* Status da Empresa */}
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        empresa.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {empresa.ativo ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>
                  </div>

                  {/* ID da Empresa (apenas para admin) */}
                  {isAdmin && (
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <Hash className="w-3 h-3" />
                        <span className="font-mono">{empresa.id}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Building className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">
                {searchTerm ? 'Nenhuma empresa encontrada' : 'Nenhuma empresa cadastrada'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm 
                  ? 'Tente ajustar o termo de busca'
                  : isAdmin 
                    ? 'Comece criando a primeira empresa do sistema'
                    : 'Sua empresa ainda não foi configurada'
                }
              </p>
              {isAdmin && !searchTerm && (
                <button
                  onClick={handleNewEmpresa}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 mx-auto transition-colors duration-200"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nova Empresa</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Cadastro/Edição */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">
                  {editingEmpresa ? 'Editar Empresa' : 'Nova Empresa'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveEmpresa} className="p-6 space-y-6">
              {/* Seção da Empresa */}
              <div>
                <h4 className="text-lg font-medium text-gray-800 mb-4 pb-2 border-b border-gray-200">
                  Dados da Empresa
                </h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome da Empresa *
                  </label>
                  <input
                    type="text"
                    name="nome"
                    defaultValue={editingEmpresa?.nome || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Hotel Paradise, Pousada Bella Vista..."
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={editingEmpresa?.email || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="contato@empresa.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Endereço Completo *
                </label>
                <textarea
                  name="endereco"
                  defaultValue={editingEmpresa?.endereco || ''}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Rua, número, bairro, cidade, estado, CEP"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status da Empresa *
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="ativo"
                      value="true"
                      defaultChecked={editingEmpresa?.ativo !== false}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Ativa</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="ativo"
                      value="false"
                      defaultChecked={editingEmpresa?.ativo === false}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Inativa</span>
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  ⚠️ Ao marcar como inativa, todos os usuários da empresa também serão inativados
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    WhatsApp *
                  </label>
                  <input
                    type="text"
                    name="whatsapp"
                    value={whatsappValue}
                    onChange={handleWhatsappChange}
                    placeholder="(11) 99999-9999 ou (11) 9999-9999"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Digite apenas números. Aceita 10 ou 11 dígitos.
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contato Responsável *
                  </label>
                  <input
                    type="text"
                    name="contato"
                    defaultValue={editingEmpresa?.contato || ''}
                    placeholder="Nome - Cargo"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número de Quartos *
                  </label>
                  <input
                    type="number"
                    name="numeroQuartos"
                    defaultValue={editingEmpresa?.numero_quartos || 25}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número de Andares *
                  </label>
                  <input
                    type="number"
                    name="numeroAndares"
                    defaultValue={editingEmpresa?.numero_andares || 3}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Limite de Usuários *
                  </label>
                  <input
                    type="number"
                    name="numeroUsuarios"
                    defaultValue={editingEmpresa?.numero_usuarios || 10}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Seção Contratual e Financeira */}
              <div className="pt-6 border-t border-gray-200">
                <h4 className="text-lg font-medium text-gray-800 mb-4 pb-2 border-b border-gray-200">
                  Informações Contratuais e Financeiras
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Início do Contrato
                  </label>
                  <input
                    type="date"
                    name="inicioContrato"
                    id="inicioContrato"
                    defaultValue={editingEmpresa?.inicio_contrato || ''}
                    onChange={calcularValores}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duração do Contrato (meses)
                  </label>
                  <input
                    type="number"
                    name="duracaoContratoMeses"
                    id="duracaoContratoMeses"
                    defaultValue={editingEmpresa?.duracao_contrato_meses || ''}
                    min="1"
                    onChange={calcularValores}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: 12, 24, 36..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Final do Contrato
                  </label>
                  <input
                    type="date"
                    name="finalContrato"
                    id="finalContrato"
                    value={calcularDataFinal()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                    readOnly
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Calculado automaticamente
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor de Instalação (R$)
                  </label>
                  <input
                    type="number"
                    name="valorInstalacao"
                    id="valorInstalacao"
                    defaultValue={editingEmpresa?.valor_instalacao || ''}
                    min="0"
                    step="0.01"
                    onChange={calcularValores}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor da Mensalidade (R$)
                  </label>
                  <input
                    type="number"
                    name="valorMensalidade"
                    id="valorMensalidade"
                    defaultValue={editingEmpresa?.valor_mensalidade || ''}
                    min="0"
                    step="0.01"
                    onChange={calcularValores}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Pagamento
                  </label>
                  <select
                    name="tipoPagamento"
                    defaultValue={editingEmpresa?.tipo_pagamento || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione o tipo</option>
                    <option value="mensal">Mensal</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="semestral">Semestral</option>
                    <option value="anual">Anual</option>
                    <option value="unico">Pagamento Único</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Forma de Pagamento
                  </label>
                  <select
                    name="formaPagamento"
                    defaultValue={editingEmpresa?.forma_pagamento || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione a forma</option>
                    <option value="pix">PIX</option>
                    <option value="boleto">Boleto Bancário</option>
                    <option value="cartao_credito">Cartão de Crédito</option>
                    <option value="cartao_debito">Cartão de Débito</option>
                    <option value="transferencia">Transferência Bancária</option>
                    <option value="dinheiro">Dinheiro</option>
                  </select>
                </div>
              </div>

              {/* Campos calculados - exibição em tempo real */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h5 className="text-sm font-medium text-blue-800 mb-3">Valores Calculados</h5>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">Valor Total:</span>
                    <div className="font-medium text-blue-800">
                      R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div>
                    <span className="text-blue-700">Valor Mensal Efetivo:</span>
                    <div className="font-medium text-blue-800">
                      R$ {valorMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div>
                    <span className="text-blue-700">Data Final:</span>
                    <div className="font-medium text-blue-800">
                      {dataFinal ? new Date(dataFinal).toLocaleDateString('pt-BR') : 'Não calculada'}
                    </div>
                  </div>
                  <div>
                    <span className="text-blue-700">Meses Restantes:</span>
                    <div className="font-medium text-blue-800">
                      {mesesRestantes} meses
                    </div>
                  </div>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  Os valores são calculados automaticamente: Total = Instalação + (Mensalidade × Duração)
                </p>
              </div>

              {/* Seção de Gestores Vinculados - apenas para empresa existente */}
              {editingEmpresa && isAdmin && (
                <>
                  <div className="pt-6 border-t border-gray-200">
                    <h4 className="text-lg font-medium text-gray-800 mb-4">
                      Gestores Vinculados
                    </h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Gerencie os gestores vinculados a esta empresa
                    </p>
                  </div>

                  {loadingGestores ? (
                    <div className="flex justify-center items-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <>
                      {/* Lista de gestores vinculados */}
                      {gestoresVinculados.length > 0 ? (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                          <h5 className="text-sm font-medium text-gray-700 mb-3">
                            Gestores Atualmente Vinculados ({gestoresVinculados.length})
                          </h5>
                          <div className="space-y-2">
                            {gestoresVinculados.map((gestor) => (
                              <div key={gestor.id} className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900">{gestor.name}</span>
                                    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${
                                      gestor.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                      {gestor.active ? 'Ativo' : 'Inativo'}
                                    </span>
                                  </div>
                                  <div className="text-sm text-gray-600 mt-1">
                                    <div>{gestor.login}</div>
                                    <div>{gestor.telefone}</div>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDesvincularGestor(gestor.id)}
                                  className="ml-3 px-3 py-1.5 text-sm bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                                >
                                  Desvincular
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                          <p className="text-sm text-yellow-800">
                            Nenhum gestor vinculado a esta empresa no momento.
                          </p>
                        </div>
                      )}

                      {/* Adicionar novo gestor */}
                      {gestoresDisponiveis.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h5 className="text-sm font-medium text-blue-800 mb-3">
                            Adicionar Gestor ({gestoresDisponiveis.length} disponíveis)
                          </h5>
                          <div className="space-y-2">
                            {gestoresDisponiveis.map((gestor) => (
                              <div key={gestor.id} className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900">{gestor.name}</span>
                                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                                      Sem empresa
                                    </span>
                                  </div>
                                  <div className="text-sm text-gray-600 mt-1">
                                    <div>{gestor.login}</div>
                                    <div>{gestor.telefone}</div>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleVincularGestor(gestor.id)}
                                  className="ml-3 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                  Vincular
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {/* Seção do Usuário Gestor - apenas para nova empresa */}
              {!editingEmpresa && (
                <>
                  <div className="pt-6 border-t border-gray-200">
                    <h4 className="text-lg font-medium text-gray-800 mb-4">
                      Usuário Gestor
                    </h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Selecione um gestor existente ou crie um novo
                    </p>
                  </div>

                  {/* Seleção de gestor existente ou criar novo */}
                  {gestoresSemEmpresa.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={!criarNovoGestor && gestoresSemEmpresa.length > 0}
                          onChange={() => {
                            setCriarNovoGestor(false);
                            setGestorExistenteId('');
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-blue-800">
                          Vincular Gestor Existente
                        </span>
                      </label>

                      {!criarNovoGestor && (
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Selecione o Gestor *
                          </label>
                          <select
                            value={gestorExistenteId}
                            onChange={(e) => setGestorExistenteId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            required={!criarNovoGestor}
                          >
                            <option value="">Selecione um gestor</option>
                            {gestoresSemEmpresa.map(gestor => (
                              <option key={gestor.id} value={gestor.id}>
                                {gestor.name} ({gestor.login})
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-blue-600 mt-1">
                            {gestoresSemEmpresa.length} gestor(es) disponível(is) sem empresa
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className={gestoresSemEmpresa.length > 0 ? 'bg-gray-50 border border-gray-200 rounded-lg p-4' : ''}>
                    <label className="flex items-center space-x-2 cursor-pointer mb-4">
                      <input
                        type="radio"
                        checked={criarNovoGestor || gestoresSemEmpresa.length === 0}
                        onChange={() => {
                          setCriarNovoGestor(true);
                          setGestorExistenteId('');
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-800">
                        Criar Novo Gestor
                      </span>
                    </label>

                    {(criarNovoGestor || gestoresSemEmpresa.length === 0) && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Nome Completo do Gestor *
                            </label>
                            <input
                              type="text"
                              name="nomeGestor"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Nome completo do gestor"
                              required={criarNovoGestor || gestoresSemEmpresa.length === 0}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Telefone do Gestor *
                            </label>
                            <input
                              type="tel"
                              name="telefoneGestor"
                              value={telefoneGestorValue}
                              onChange={handleTelefoneGestorChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="(11) 99999-9999 ou (11) 9999-9999"
                              required={criarNovoGestor || gestoresSemEmpresa.length === 0}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Digite apenas números. Aceita 10 ou 11 dígitos.
                            </p>
                          </div>
                        </div>

                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email/Login do Gestor *
                          </label>
                          <input
                            type="email"
                            name="loginGestor"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="gestor@empresa.com"
                            required={criarNovoGestor || gestoresSemEmpresa.length === 0}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Senha do Gestor *
                            </label>
                            <div className="relative">
                              <input
                                type={showPassword ? 'text' : 'password'}
                                name="passwordGestor"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                                placeholder="Mínimo 6 caracteres"
                                required={criarNovoGestor || gestoresSemEmpresa.length === 0}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4 text-gray-400" />
                                ) : (
                                  <Eye className="h-4 w-4 text-gray-400" />
                                )}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Confirmar Senha *
                            </label>
                            <div className="relative">
                              <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                name="confirmPasswordGestor"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                                placeholder="Confirme a senha"
                                required={criarNovoGestor || gestoresSemEmpresa.length === 0}
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                              >
                                {showConfirmPassword ? (
                                  <EyeOff className="h-4 w-4 text-gray-400" />
                                ) : (
                                  <Eye className="h-4 w-4 text-gray-400" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}

              {/* Seção de Módulos Contratados - Apenas para Super Admin */}
              <div>
                <h4 className="text-lg font-medium text-gray-800 mb-4 pb-2 border-b border-gray-200 flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <span>Módulos Contratados</span>
                </h4>

                {!isAdmin && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 text-sm">
                      <strong>Atenção:</strong> Apenas Administradores podem gerenciar os módulos contratados pela empresa.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {modulosService.getModulosDisponiveis().map((modulo) => {
                    const Icon = modulo.icon;
                    const isSelected = modulosSelecionados.includes(modulo.id);

                    return (
                      <div
                        key={modulo.id}
                        onClick={() => isAdmin && handleModuloToggle(modulo.id)}
                        className={`relative p-4 border-2 rounded-lg transition-all duration-200 ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 bg-white'
                        } ${
                          isAdmin
                            ? 'cursor-pointer hover:shadow-md'
                            : 'cursor-not-allowed opacity-60'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`p-2 rounded-lg ${
                            isSelected ? 'bg-blue-100' : 'bg-gray-100'
                          }`}>
                            <Icon className={`w-5 h-5 ${
                              isSelected ? 'text-blue-600' : 'text-gray-600'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <h5 className={`font-medium ${
                              isSelected ? 'text-blue-900' : 'text-gray-900'
                            }`}>
                              {modulo.nome}
                            </h5>
                            <p className="text-xs text-gray-600 mt-1">
                              {modulo.descricao}
                            </p>
                          </div>
                          {isSelected && (
                            <div className="absolute top-2 right-2">
                              <div className="bg-blue-500 rounded-full p-1">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Módulos Fixos (Sempre Ativos) */}
                <div className="mt-6">
                  <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center space-x-2">
                    <span>Módulos Sempre Ativos</span>
                    <span className="text-xs text-gray-500">(não podem ser desativados)</span>
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {modulosService.getModulosFixos().map((modulo) => {
                      const Icon = modulo.icon;
                      return (
                        <div
                          key={modulo.id}
                          className="p-3 border-2 border-green-200 bg-green-50 rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                              <Icon className="w-4 h-4 text-green-600" />
                            </div>
                            <div className="flex-1">
                              <h5 className="font-medium text-green-900 text-sm">
                                {modulo.nome}
                              </h5>
                              <p className="text-xs text-green-700 mt-0.5">
                                {modulo.descricao}
                              </p>
                            </div>
                            <div className="bg-green-500 rounded-full p-1">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800 text-sm">
                    <strong>Módulos Selecionados:</strong> {modulosSelecionados.length} de {modulosService.getModulosDisponiveis().length} disponíveis
                  </p>
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
                  disabled={saving || !isAdmin}
                  className={`flex-1 px-4 py-2 rounded-md flex items-center justify-center space-x-2 transition-colors duration-200 ${
                    saving || !isAdmin
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white`}
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {saving ? 'Salvando...' :
                     editingEmpresa ? 'Atualizar Empresa' :
                     'Criar Empresa + Gestor'}
                  </span>
                </button>
              </div>
              
              {!isAdmin && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 text-sm">
                    ⚠️ <strong>Acesso restrito:</strong> Apenas Administradores podem criar ou editar dados da empresa.
                    Entre em contato com um Super Admin para realizar alterações.
                  </p>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Estatísticas Gerais - apenas para admin */}
      {isAdmin && empresas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Building className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Empresas</p>
                <p className="text-2xl font-bold text-gray-800">{empresas.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Hash className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Quartos</p>
                <p className="text-2xl font-bold text-gray-800">
                  {empresas.reduce((acc, emp) => acc + emp.numero_quartos, 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Usuários</p>
                <p className="text-2xl font-bold text-gray-800">
                  {empresas.reduce((acc, emp) => acc + emp.numero_usuarios, 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Building className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Média de Quartos</p>
                <p className="text-2xl font-bold text-gray-800">
                  {empresas.length > 0 ? Math.round(empresas.reduce((acc, emp) => acc + emp.numero_quartos, 0) / empresas.length) : 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Aviso sobre permissões */}
      {!isAdmin && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Building className="w-5 h-5 text-blue-600" />
            <p className="text-blue-800 font-medium">Informação</p>
          </div>
          <p className="text-blue-700 text-sm mt-2">
            Você está visualizando apenas os dados da sua empresa. Para gerenciar múltiplas empresas, 
            é necessário ter perfil de administrador.
          </p>
        </div>
      )}
    </div>
  );
};

export default Empresa;
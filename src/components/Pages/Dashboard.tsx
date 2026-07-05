import React, { useState, useEffect } from 'react';
import { 
  registroRecepcaoService, 
  registroCamarariaService, 
  registroRevisaoService, 
  registroAreasComunsService,
  manutencaoService,
  usuarioService, 
  suiteService 
} from '../../services/supabaseService';
import { formatarData, formatarHorario } from '../../utils/dateUtils';
import {
  Users,
  Building,
  Activity,
  Clock,
  Phone,
  Bed,
  Eye,
  Wrench,
  Home,
  Crown,
  BarChart3,
  Calendar,
  User,
  CheckCircle,
  MapPin,
  Sun,
  Moon,
  ChefHat,
  ShoppingBag
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getDataAtual, getDataAtualFormatada } from '../../utils/dateUtils';

const Dashboard: React.FC = () => {
  const { user, hasModuleAccess } = useAuth();
  const [timeOfDay, setTimeOfDay] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [registrosRecentes, setRegistrosRecentes] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [suites, setSuites] = useState<any[]>([]);

  useEffect(() => {
    // Configurar horário
    const updateTimeOfDay = () => {
      // Usar horário brasileiro
      const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
      const hour = now.getHours();
      setCurrentTime(now);
      if (hour < 12) setTimeOfDay('Bom dia');
      else if (hour < 18) setTimeOfDay('Boa tarde');
      else setTimeOfDay('Boa noite');
    };
    
    updateTimeOfDay();
    
    // Atualizar horário a cada segundo
    const timeInterval = setInterval(() => {
      updateTimeOfDay();
    }, 1000);
    
    // Carregar dados se não for admin
    if (user?.profile !== 'admin') {
      carregarRegistrosRecentes();
    }
    
    return () => {
      clearInterval(timeInterval);
    };
  }, [user]);

  const carregarRegistrosRecentes = async () => {
    setLoading(true);
    try {
      const [
        registrosRecepcao,
        registrosCamararia,
        registrosRevisao,
        registrosAreasComuns,
        manutencoes,
        usuariosData,
        suitesData
      ] = await Promise.all([
        registroRecepcaoService.getRegistros(20),
        registroCamarariaService.getRegistros(20),
        registroRevisaoService.getRegistros(20),
        registroAreasComunsService.getRegistros(20),
        manutencaoService.getManutencoesByStatus(['concluida']),
        usuarioService.getUsuarios(),
        suiteService.getSuites()
      ]);

      // Filtrar apenas registros concluídos
      const registrosConcluidos = [
        ...registrosRecepcao.filter(r => r.status === 'concluido').map(r => ({
          ...r,
          tipo: 'recepcao',
          icone: Phone,
          cor: 'blue',
          label: 'Recepção'
        })),
        ...registrosCamararia.filter(r => r.status === 'concluido').map(r => ({
          ...r,
          tipo: 'camararia',
          icone: Bed,
          cor: 'green',
          label: 'Camararia'
        })),
        ...registrosRevisao.filter(r => r.status === 'concluido').map(r => ({
          ...r,
          tipo: 'revisao',
          icone: Eye,
          cor: 'yellow',
          label: 'Revisão'
        })),
        ...registrosAreasComuns.filter(r => r.status === 'concluido').map(r => ({
          ...r,
          tipo: 'areas_comuns',
          icone: Building,
          cor: 'indigo',
          label: 'Áreas Comuns'
        })),
        ...manutencoes.filter(m => m.status === 'concluida').map(m => ({
          ...m,
          tipo: 'manutencao',
          icone: Wrench,
          cor: 'orange',
          label: 'Manutenção'
        }))
      ];

      // Ordenar por data/hora mais recente
      const registrosOrdenados = registrosConcluidos
        .sort((a, b) => {
          const dataA = new Date(a.updated_at || a.created_at).getTime();
          const dataB = new Date(b.updated_at || b.created_at).getTime();
          return dataB - dataA;
        })
        .slice(0, 15); // Últimos 15 registros

      setRegistrosRecentes(registrosOrdenados);
      setUsuarios(usuariosData);
      setSuites(suitesData);
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  const getProfileTheme = (profile: string) => {
    switch (profile) {
      case 'admin':
        return {
          gradient: 'from-blue-600 via-purple-600 to-indigo-700',
          accent: 'blue',
          icon: Crown,
          title: 'Painel Executivo'
        };
      case 'recepcao':
        return {
          gradient: 'from-blue-500 to-blue-600',
          accent: 'blue',
          icon: Phone,
          title: 'Central de Recepção'
        };
      case 'camararia':
        return {
          gradient: 'from-green-500 to-green-600',
          accent: 'green',
          icon: Bed,
          title: 'Central de Limpeza'
        };
      case 'revisao':
        return {
          gradient: 'from-yellow-500 to-yellow-600',
          accent: 'yellow',
          icon: Eye,
          title: 'Central de Qualidade'
        };
      case 'areas_comuns':
        return {
          gradient: 'from-indigo-500 to-purple-600',
          accent: 'indigo',
          icon: Building,
          title: 'Central de Áreas Comuns'
        };
      case 'manutencao':
        return {
          gradient: 'from-orange-500 to-red-600',
          accent: 'orange',
          icon: Wrench,
          title: 'Central Técnica'
        };
      case 'atividades_extras':
        return {
          gradient: 'from-yellow-400 to-orange-500',
          accent: 'yellow',
          icon: Sun,
          title: 'Central de Atividades Extras'
        };
      case 'atividades_diarias':
        return {
          gradient: 'from-indigo-600 to-purple-700',
          accent: 'indigo',
          icon: Moon,
          title: 'Central de Atividades Diárias'
        };
      case 'cozinha':
        return {
          gradient: 'from-cyan-500 to-cyan-600',
          accent: 'cyan',
          icon: ChefHat,
          title: 'Central de Cozinha'
        };
      case 'vendas':
        return {
          gradient: 'from-emerald-500 to-green-600',
          accent: 'emerald',
          icon: ShoppingBag,
          title: 'Central de Vendas'
        };
      default:
        return {
          gradient: 'from-gray-500 to-gray-600',
          accent: 'gray',
          icon: Users,
          title: 'Dashboard'
        };
    }
  };

  const getUsuarioNome = (usuarioId: string) => {
    const usuario = usuarios.find(u => u.id === usuarioId);
    return usuario?.name || 'Usuário não encontrado';
  };

  const getSuiteNome = (suiteId: string) => {
    const suite = suites.find(s => s.id === suiteId);
    return suite ? `Suíte ${suite.name}` : '';
  };

  const getButtonClasses = (color: string) => {
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-600 hover:bg-blue-700',
      green: 'bg-green-600 hover:bg-green-700',
      yellow: 'bg-yellow-600 hover:bg-yellow-700',
      indigo: 'bg-indigo-600 hover:bg-indigo-700',
      orange: 'bg-orange-600 hover:bg-orange-700',
      cyan: 'bg-cyan-600 hover:bg-cyan-700',
      emerald: 'bg-emerald-600 hover:bg-emerald-700',
    };
    return colorMap[color] || 'bg-gray-600 hover:bg-gray-700';
  };

  const getCardClasses = (color: string) => {
    const colorMap: Record<string, {bg: string, border: string, iconBg: string, iconText: string, text: string}> = {
      blue: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        iconBg: 'bg-blue-100',
        iconText: 'text-blue-600',
        text: 'text-blue-800'
      },
      green: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        iconBg: 'bg-green-100',
        iconText: 'text-green-600',
        text: 'text-green-800'
      },
      yellow: {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        iconBg: 'bg-yellow-100',
        iconText: 'text-yellow-600',
        text: 'text-yellow-800'
      },
      indigo: {
        bg: 'bg-indigo-50',
        border: 'border-indigo-200',
        iconBg: 'bg-indigo-100',
        iconText: 'text-indigo-600',
        text: 'text-indigo-800'
      },
      orange: {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        iconBg: 'bg-orange-100',
        iconText: 'text-orange-600',
        text: 'text-orange-800'
      },
      cyan: {
        bg: 'bg-cyan-50',
        border: 'border-cyan-200',
        iconBg: 'bg-cyan-100',
        iconText: 'text-cyan-600',
        text: 'text-cyan-800'
      },
      emerald: {
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        iconBg: 'bg-emerald-100',
        iconText: 'text-emerald-600',
        text: 'text-emerald-800'
      }
    };
    return colorMap[color] || {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      iconBg: 'bg-gray-100',
      iconText: 'text-gray-600',
      text: 'text-gray-800'
    };
  };

  const renderAcoesRapidas = () => {
    const acoesPorPerfil = {
      recepcao: [
        { label: 'Novo Registro', icon: Phone, href: '#recepcao', color: 'blue', module: 'recepcao', isPrimaryAction: true },
        { label: 'Revisão', icon: Eye, href: '#revisao', color: 'yellow', module: 'revisao' },
        { label: 'Manutenção', icon: Wrench, href: '#manutencao', color: 'orange', module: 'manutencao' }
      ],
      camararia: [
        { label: 'Nova Limpeza', icon: Bed, href: '#camararia', color: 'green', module: 'camararia', isPrimaryAction: true },
        { label: 'Revisão', icon: Eye, href: '#revisao', color: 'yellow', module: 'revisao' },
        { label: 'Áreas Comuns', icon: Building, href: '#areas-comuns', color: 'indigo', module: 'areas_comuns' }
      ],
      revisao: [
        { label: 'Nova Revisão', icon: Eye, href: '#revisao', color: 'yellow', module: 'revisao', isPrimaryAction: true },
        { label: 'Camararia', icon: Bed, href: '#camararia', color: 'green', module: 'camararia' },
        { label: 'Manutenção', icon: Wrench, href: '#manutencao', color: 'orange', module: 'manutencao' }
      ],
      areas_comuns: [
        { label: 'Iniciar Atividades', icon: Building, href: '#areas-comuns', color: 'indigo', module: 'areas_comuns', isPrimaryAction: true },
        { label: 'Camararia', icon: Bed, href: '#camararia', color: 'green', module: 'camararia' },
        { label: 'Revisão', icon: Eye, href: '#revisao', color: 'yellow', module: 'revisao' }
      ],
      manutencao: [
        { label: 'Nova Manutenção', icon: Wrench, href: '#manutencao', color: 'orange', module: 'manutencao', isPrimaryAction: true },
        { label: 'Camararia', icon: Bed, href: '#camararia', color: 'green', module: 'camararia' },
        { label: 'Áreas Comuns', icon: Building, href: '#areas-comuns', color: 'indigo', module: 'areas_comuns' }
      ],
      atividades_extras: [
        { label: 'Atividades Extras', icon: Sun, href: '#atividades-extras', color: 'yellow', module: 'atividades_extras', isPrimaryAction: true },
        { label: 'Manutenção', icon: Wrench, href: '#manutencao', color: 'orange', module: 'manutencao' }
      ],
      atividades_diarias: [
        { label: 'Atividades Diárias', icon: Moon, href: '#atividades-diarias', color: 'indigo', module: 'atividades_diarias', isPrimaryAction: true },
        { label: 'Atividades Extras', icon: Sun, href: '#atividades-extras', color: 'blue', module: 'atividades_extras' },
        { label: 'Manutenção', icon: Wrench, href: '#manutencao', color: 'orange', module: 'manutencao' }
      ],
      cozinha: [
        { label: 'Novo Registro', icon: ChefHat, href: '#cozinha', color: 'cyan', module: 'cozinha', isPrimaryAction: true },
        { label: 'Manutenção', icon: Wrench, href: '#manutencao', color: 'orange', module: 'manutencao' }
      ],
      vendas: [
        { label: 'Novo Registro', icon: ShoppingBag, href: '#vendas', color: 'emerald', module: 'vendas', isPrimaryAction: true },
        { label: 'Manutenção', icon: Wrench, href: '#manutencao', color: 'orange', module: 'manutencao' }
      ]
    };

    const todasAcoes = acoesPorPerfil[user?.profile as keyof typeof acoesPorPerfil] || [];

    // Filtrar ações baseado nos módulos contratados pela empresa
    const acoes = todasAcoes.filter(acao => {
      // Sempre mostrar a ação primária do usuário (seu próprio módulo)
      if (acao.isPrimaryAction) return true;

      // Sempre mostrar manutenção (módulo fixo)
      if (acao.module === 'manutencao') return true;

      // Para outras ações, verificar se o módulo está contratado
      return hasModuleAccess(acao.module);
    });

    return (
      <div className="bg-white rounded-lg shadow-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-blue-500" />
            Ações Rápidas
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:gap-4">
            {acoes.map((acao, index) => {
              const Icon = acao.icon;
              return (
                <a
                  key={index}
                  href={acao.href}
                  className={`${getButtonClasses(acao.color)} text-white p-3 lg:p-4 rounded-lg shadow-md transition-colors duration-200 flex items-center space-x-2 lg:space-x-3 no-underline`}
                >
                  <Icon className="w-5 h-5 lg:w-6 lg:h-6 flex-shrink-0" />
                  <span className="font-medium text-sm lg:text-base">{acao.label}</span>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderRegistrosRecentes = () => (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
          Registros Concluídos Recentes
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Últimas atividades finalizadas por toda a equipe
        </p>
      </div>
      <div className="p-6">
        {registrosRecentes.length > 0 ? (
          <div className="space-y-3">
            {registrosRecentes.map((registro, index) => {
              const Icon = registro.icone;
              const cardClasses = getCardClasses(registro.cor);
              return (
                <div key={index} className={`p-3 lg:p-4 ${cardClasses.bg} border ${cardClasses.border} rounded-lg`}>
                  <div className="flex items-center space-x-3">
                    <div className={`p-1.5 lg:p-2 ${cardClasses.iconBg} rounded-lg flex-shrink-0`}>
                      <Icon className={`w-4 h-4 lg:w-5 lg:h-5 ${cardClasses.iconText}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-2 mb-1">
                        <span className={`font-medium ${cardClasses.text}`}>
                          {registro.label}
                        </span>
                        <span className="text-sm text-gray-500 hidden lg:inline">•</span>
                        <span className="text-xs lg:text-sm text-gray-600">
                          {getUsuarioNome(registro.usuario_id)}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 lg:space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3 flex-shrink-0" />
                          <span>{formatarData(registro.data)}</span>
                        </div>
                        
                        {registro.hora_fim && (
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            <span>{formatarHorario(registro.hora_fim)}</span>
                          </div>
                        )}
                        
                        {registro.suite_id && (
                          <div className="flex items-center space-x-1 hidden lg:flex">
                            <Home className="w-3 h-3 flex-shrink-0" />
                            <span>{getSuiteNome(registro.suite_id)}</span>
                          </div>
                        )}
                        
                        {registro.tipo === 'manutencao' && (
                          <div className="flex items-center space-x-1 hidden lg:flex">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span>{registro.local}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right flex-shrink-0">
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full whitespace-nowrap">
                        Concluído
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h4 className="text-lg font-medium text-gray-800 mb-2">Nenhum registro concluído</h4>
            <p className="text-gray-600">Os registros finalizados aparecerão aqui</p>
          </div>
        )}
      </div>
    </div>
  );

  // Para admin, redirecionar para relatórios
  if (user?.profile === 'admin') {
    // Redirecionar para relatórios mantendo o hash
    React.useEffect(() => {
      if (window.location.hash === '#dashboard') {
        window.location.hash = '#dados-gerais';
      }
    }, []);

    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <BarChart3 className="w-16 h-16 mx-auto mb-4 text-blue-600" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">Redirecionando para Dados Gerais</h3>
          <p className="text-gray-600">Administradores acessam diretamente os dados gerais do sistema</p>
        </div>
      </div>
    );
  }

  const theme = getProfileTheme(user?.profile || 'admin');
  const ThemeIcon = theme.icon;
  const dataAtual = getDataAtualFormatada();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6 max-w-7xl">
      {/* Header Personalizado por Perfil */}
      <div className={`bg-gradient-to-r ${theme.gradient} rounded-lg shadow-lg p-4 lg:p-6 text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 lg:space-x-4">
            <div className="p-2 lg:p-3 bg-white bg-opacity-20 rounded-full">
              <ThemeIcon className="w-6 h-6 lg:w-8 lg:h-8" />
            </div>
            <div>
              <h1 className="text-xl lg:text-3xl font-bold">{timeOfDay}, {user?.name}!</h1>
              <p className="text-white text-opacity-90 mt-1 text-sm lg:text-base">{theme.title}</p>
              <p className="text-white text-opacity-75 text-xs lg:text-sm mt-1 capitalize hidden lg:block">{dataAtual}</p>
            </div>
          </div>
          <div className="text-right hidden lg:block">
            <div className="text-xl lg:text-2xl font-bold">
              {currentTime.toLocaleTimeString('pt-BR', { 
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'America/Sao_Paulo'
              })}
              <span className="text-base lg:text-lg">:{currentTime.toLocaleTimeString('pt-BR', { 
                second: '2-digit',
                timeZone: 'America/Sao_Paulo'
              }).split(':')[2]}</span>
            </div>
            <div className="text-white text-opacity-75 text-sm">Horário atual</div>
          </div>
        </div>
      </div>

      {/* Ações Rápidas */}
      {renderAcoesRapidas()}

      {/* Registros Recentes */}
      {renderRegistrosRecentes()}
    </div>
  );
};

export default Dashboard;
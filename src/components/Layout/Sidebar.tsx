import React from 'react';
import {
  Settings,
  Users,
  Phone,
  Bed,
  CheckCircle,
  Wrench,
  FileText,
  LogOut,
  Home,
  Building,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Sun,
  Activity,
  TrendingUp,
  Package,
  Camera,
  Briefcase,
  ChevronLeft,
  ChefHat,
  ShoppingBag,
  Trophy,
  Key,
  Eye,
  FolderOpen,
  Monitor,
  Lightbulb,
  Bell,
  Trash2,
  MessageSquare,
  Volume2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSidebar } from '../../contexts/SidebarContext';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange, isOpen, onToggle }) => {
  const { user, logout, hasAccess, hasModuleAccess } = useAuth();
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const [cadastrosOpen, setCadastrosOpen] = React.useState(false);
  const [relatoriosOpen, setRelatoriosOpen] = React.useState(false);
  
  // Estados para submenus de cadastros
  const [recepcaoOpen, setRecepcaoOpen] = React.useState(false);
  const [camarariaOpen, setCamarariaOpen] = React.useState(false);
  const [revisaoOpen, setRevisaoOpen] = React.useState(false);
  const [gestaoOpen, setGestaoOpen] = React.useState(false);
  const [areasComunsOpen, setAreasComunsOpen] = React.useState(false);
  const [atividadesDiariasOpen, setAtividadesDiariasOpen] = React.useState(false);
  const [atividadesExtrasOpen, setAtividadesExtrasOpen] = React.useState(false);
  const [cozinhaOpen, setCozinhaOpen] = React.useState(false);
  const [vendasOpen, setVendasOpen] = React.useState(false);
  const [adminOpen, setAdminOpen] = React.useState(false);
  const [sistemaOpen, setSistemaOpen] = React.useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, access: true },
    { id: 'dashboard-ao-vivo', label: 'Dashboard Ao Vivo', icon: Monitor, access: user?.profile === 'admin' || user?.profile === 'gestor' },
    { id: 'atividades-diarias', label: 'Atividades Diárias', icon: Activity, access: hasModuleAccess('atividades_diarias') },
    { id: 'recepcao', label: 'Recepção', icon: Phone, access: hasModuleAccess('recepcao') },
    { id: 'areas-comuns', label: 'Áreas Comuns', icon: Building, access: hasModuleAccess('areas_comuns') },
    { id: 'camararia', label: 'Camararia', icon: Bed, access: hasModuleAccess('camararia') },
    { id: 'revisao', label: 'Revisão', icon: CheckCircle, access: hasModuleAccess('revisao') },
    { id: 'cozinha', label: 'Cozinha', icon: ChefHat, access: hasModuleAccess('cozinha') },
    { id: 'manutencao', label: 'Manutenção', icon: Wrench, access: hasAccess('manutencao') },
    { id: 'gestao', label: 'Gestão', icon: Briefcase, access: hasModuleAccess('gestao') },
    { id: 'vendas', label: 'Vendas', icon: ShoppingBag, access: hasModuleAccess('vendas') },
    { id: 'atividades-extras', label: 'Atividades Extras', icon: Sun, access: hasModuleAccess('atividades_extras') },
    { id: 'ver-acessos', label: 'Ver Acessos', icon: Eye, access: hasAccess('ver_acessos') },
    { id: 'relatorios', label: 'Relatórios', icon: FileText, access: hasAccess('relatorios') }
  ];

  const relatoriosItems = [
    { id: 'dashboard-relatorios', label: 'Visão Geral', icon: FileText },
    { id: 'analise-operacional', label: 'Análise Operacional', icon: Settings },
    { id: 'analise-funcionario', label: 'Análise por Funcionário', icon: Users },
    { id: 'dados-gerais', label: 'Dados Gerais', icon: FileText },
    { id: 'eficiencia-area', label: 'Eficiência por Área', icon: TrendingUp },
    { id: 'ranking-meritocracia', label: 'Ranking por Meritocracia', icon: Trophy }
  ];

  // Definir itens de cadastros organizados por categoria
  const cadastrosItems = {
    recepcao: [
      { id: 'tipos-recepcao', label: 'Tipos de Recepção', icon: Phone },
      { id: 'atividades-recepcao', label: 'Atividades Recepção', icon: Phone }
    ],
    camararia: [
      { id: 'itens-camararia', label: 'Itens Camararia', icon: Package },
      { id: 'servicos-camararia', label: 'Serviços Camararia', icon: Bed },
      { id: 'fotos-camararia', label: 'Fotos Camararia', icon: Camera },
      { id: 'atividades-camararia', label: 'Atividades Camararia', icon: Bed }
    ],
    revisao: [
      { id: 'atividades-revisao', label: 'Atividades Revisão', icon: CheckCircle }
    ],
    gestao: [
      { id: 'tipos-gestao', label: 'Tipos de Gestão', icon: Briefcase },
      { id: 'atividades-gestao', label: 'Atividades Gestão', icon: Settings }
    ],
    cozinha: [
      { id: 'tipos-cozinha', label: 'Tipos de Cozinha', icon: ChefHat },
      { id: 'atividades-cozinha', label: 'Atividades Cozinha', icon: ChefHat },
      { id: 'fotos-cozinha', label: 'Fotos Cozinha', icon: Camera }
    ],
    areasComuns: [
      { id: 'tipos-areas-comuns', label: 'Tipos de Áreas Comuns', icon: Building },
      { id: 'atividades-areas-comuns', label: 'Atividades Áreas Comuns', icon: Building }
    ],
    vendas: [
      { id: 'tipos-funcoes-comerciais', label: 'Tipos de Funções Comerciais', icon: ShoppingBag },
      { id: 'atividades-comerciais', label: 'Atividades Comerciais', icon: ShoppingBag }
    ],
    atividadesDiarias: [
      { id: 'tipos-atividades', label: 'Tipos de Atividades', icon: Settings },
      { id: 'atividades-diarias-config', label: 'Atividades Diárias', icon: Activity }
    ],
    atividadesExtras: [
      { id: 'tipos-extras', label: 'Tipos de Extras', icon: Settings },
      { id: 'atividades-extras-config', label: 'Config. Atividades Extras', icon: Sun }
    ]
  };

  // Definir itens de sistema separadamente
  const sistemaItems = [
    { id: 'configuracoes-lembretes', label: 'Lembretes', icon: Bell, access: hasAccess('lembretes') },
    { id: 'configuracoes-som', label: 'Som', icon: Volume2, access: true },
    { id: 'diagnostico-notificacoes', label: 'Diagnóstico de Notificações', icon: Activity, access: true }
  ];

  // Definir itens de administração separadamente
  const adminItems = [
    { id: 'usuarios', label: 'Usuários', icon: Users, access: hasAccess('usuarios') },
    { id: 'empresa', label: 'Empresa', icon: Building, access: hasAccess('empresa') },
    { id: 'perfis', label: 'Perfis', icon: Users, access: hasAccess('perfis') },
    { id: 'acessos', label: 'Acessos', icon: Key, access: hasAccess('acessos') },
    { id: 'suites', label: 'Suítes', icon: Home, access: hasAccess('suites') },
    { id: 'configuracao-metas', label: 'Configuração de Metas', icon: TrendingUp, access: hasAccess('configuracao_metas') },
    { id: 'recalcular-performance', label: 'Recalcular Performance', icon: Activity, access: hasAccess('recalcular_performance') },
    { id: 'monitoramento-performance', label: 'Monitoramento', icon: Activity, access: hasAccess('monitoramento_performance') },
    { id: 'gerenciar-tokens-push', label: 'Gerenciar Tokens Push', icon: Bell, access: user?.profile === 'admin' },
    { id: 'monitoramento-push', label: 'Dashboard de Push', icon: Bell, access: user?.profile === 'admin' },
    { id: 'limpeza-historico', label: 'Limpeza de Histórico', icon: Trash2, access: user?.profile === 'admin' || user?.profile === 'gestor' },
    { id: 'publicar-versao', label: 'Publicar Versão', icon: Package, access: user?.profile === 'admin' },
    { id: 'enviar-mensagem', label: 'Enviar Mensagem', icon: MessageSquare, access: user?.profile === 'gestor' },
    { id: 'teste-notificacoes', label: 'Teste Push Notifications', icon: Bell, access: user?.profile === 'admin' },
    { id: 'blog-admin', label: 'Blog', icon: FileText, access: user?.profile === 'admin' }
  ];

  // Verificar se algum item de cadastros está ativo (sem admin)
  const allCadastrosItems = Object.values(cadastrosItems).flat();
  const isCadastrosActive = allCadastrosItems.some(item => currentPage === item.id);
  const isRelatoriosActive = relatoriosItems.some(item => currentPage === item.id) || currentPage === 'relatorios';
  const isSistemaActive = sistemaItems.some(item => currentPage === item.id);
  const isAdminActive = adminItems.some(item => currentPage === item.id) || currentPage.startsWith('blog-admin');

  // Verificar quais submenus devem estar abertos
  const isRecepcaoActive = cadastrosItems.recepcao.some(item => currentPage === item.id);
  const isCamarariaActive = cadastrosItems.camararia.some(item => currentPage === item.id);
  const isRevisaoActive = cadastrosItems.revisao.some(item => currentPage === item.id);
  const isGestaoActive = cadastrosItems.gestao.some(item => currentPage === item.id);
  const isCozinhaActive = cadastrosItems.cozinha.some(item => currentPage === item.id);
  const isAreasComunsActive = cadastrosItems.areasComuns.some(item => currentPage === item.id);
  const isVendasActive = cadastrosItems.vendas.some(item => currentPage === item.id);
  const isAtividadesDiariasActive = cadastrosItems.atividadesDiarias.some(item => currentPage === item.id);
  const isAtividadesExtrasActive = cadastrosItems.atividadesExtras.some(item => currentPage === item.id);

  // Abrir automaticamente se um item de cadastros estiver ativo
  React.useEffect(() => {
    if (isCadastrosActive) {
      setCadastrosOpen(true);
    }
    if (isRecepcaoActive) setRecepcaoOpen(true);
    if (isCamarariaActive) setCamarariaOpen(true);
    if (isRevisaoActive) setRevisaoOpen(true);
    if (isGestaoActive) setGestaoOpen(true);
    if (isCozinhaActive) setCozinhaOpen(true);
    if (isAreasComunsActive) setAreasComunsOpen(true);
    if (isVendasActive) setVendasOpen(true);
    if (isAtividadesDiariasActive) setAtividadesDiariasOpen(true);
    if (isAtividadesExtrasActive) setAtividadesExtrasOpen(true);
  }, [isCadastrosActive, isRecepcaoActive, isCamarariaActive, isRevisaoActive, isGestaoActive, isCozinhaActive, isAreasComunsActive, isVendasActive, isAtividadesDiariasActive, isAtividadesExtrasActive]);

  // Abrir automaticamente se um item de relatórios estiver ativo
  React.useEffect(() => {
    setRelatoriosOpen(isRelatoriosActive);
  }, [isRelatoriosActive]);

  // Abrir automaticamente se um item de sistema estiver ativo
  React.useEffect(() => {
    if (isSistemaActive) {
      setSistemaOpen(true);
    }
  }, [isSistemaActive]);

  // Abrir automaticamente se um item de administração estiver ativo
  React.useEffect(() => {
    if (isAdminActive) {
      setAdminOpen(true);
    }
  }, [isAdminActive]);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const renderSubMenu = (items: any[], isOpen: boolean, setOpen: (open: boolean) => void, title: string, icon: any, hasAccessCheck: boolean = true) => {
    if (!hasAccessCheck) return null;

    const Icon = icon;
    const hasActiveItem = items.some(item => currentPage === item.id);

    return (
      <div>
        <button
          onClick={() => setOpen(!isOpen)}
          className={`w-full flex items-center justify-between px-8 py-1.5 text-left text-sm transition-colors duration-200 ${
            hasActiveItem
              ? 'bg-blue-100 text-emerald-700 border-r-2 border-blue-700'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center min-w-0 flex-1">
            <Icon className={`w-4 h-4 mr-3 flex-shrink-0 ${hasActiveItem ? 'text-emerald-700' : 'text-gray-400'}`} />
            <span className="truncate text-xs">{title}</span>
          </div>
          <div className="flex-shrink-0 ml-2">
            {isOpen ? (
              <ChevronDown className={`w-3 h-3 ${hasActiveItem ? 'text-emerald-700' : 'text-gray-500'}`} />
            ) : (
              <ChevronRight className={`w-3 h-3 ${hasActiveItem ? 'text-emerald-700' : 'text-gray-500'}`} />
            )}
          </div>
        </button>

        {isOpen && (
          <div className="bg-gray-100">
            {items.map((item) => {
              // Verificar permissões específicas para cada item
              let hasItemAccess = false;

              if (item.id === 'empresa') {
                hasItemAccess = hasAccess('empresa');
              } else if (item.id === 'perfis') {
                hasItemAccess = hasAccess('perfis');
              } else if (item.id === 'usuarios') {
                hasItemAccess = hasAccess('usuarios');
              } else if (item.id === 'suites') {
                hasItemAccess = hasAccess('suites');
              } else {
                // Para atividades, verificar se tem acesso a cadastros
                hasItemAccess = hasAccess('cadastros');
              }

              // Se não tem acesso, não renderizar o item
              if (!hasItemAccess) return null;

              const ItemIcon = item.icon;
              const isActive = currentPage === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onPageChange(item.id)}
                  className={`w-full flex items-center px-12 py-1.5 text-left text-sm transition-colors duration-200 ${
                    isActive
                      ? 'bg-emerald-200 text-emerald-700 border-r-2 border-blue-700'
                      : 'text-gray-600 hover:bg-gray-200 hover:text-gray-700'
                  }`}
                >
                  <ItemIcon className={`w-3 h-3 mr-3 flex-shrink-0 ${isActive ? 'text-emerald-700' : 'text-gray-400'}`} />
                  <span className="truncate text-xs">{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-[65] lg:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-[70] lg:z-auto
        bg-white shadow-lg flex flex-col h-full
        transform transition-all duration-300 ease-in-out lg:transform-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'lg:w-20' : 'w-72'}
      `}>
        {/* Mobile Close Button */}
        <div className="lg:hidden absolute top-4 right-4">
          <button
            onClick={onToggle}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Header fixo */}
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className={`flex items-center space-x-3 ${isCollapsed ? 'lg:hidden' : ''}`}>
              <div>
                <img
                  src="/logo_performaxis_azul.png"
                  alt="PERFORMAXIS Logo"
                  className="h-10 w-auto object-contain"
                />
                <p className="text-xs text-gray-600 mt-1">Gestão Inteligente, Resultados Reais.</p>
              </div>
            </div>

            {isCollapsed && (
              <div className="hidden lg:flex items-center justify-center w-full">
                <img
                  src="/r_t_b.png"
                  alt="Logo"
                  className="w-10 h-10 object-contain"
                />
              </div>
            )}

            <button
              onClick={toggleCollapse}
              className="hidden lg:block p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
            >
              {isCollapsed ? (
                <ChevronRight className="w-5 h-5" />
              ) : (
                <ChevronLeft className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* User info fixo */}
        <div className={`px-4 py-3 border-b border-gray-200 flex-shrink-0 ${isCollapsed ? 'lg:px-0 lg:flex lg:justify-center' : ''}`}>
          <div className={`flex items-center ${isCollapsed ? 'lg:flex-col lg:space-x-0' : 'space-x-3'}`}>
            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-white" />
            </div>
            <div className={`min-w-0 flex-1 ${isCollapsed ? 'lg:hidden' : ''}`}>
              <p className="font-medium text-gray-800 text-sm truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.profile}</p>
            </div>
          </div>
        </div>

        {/* Menu navegável */}
        <div className="flex-1 overflow-y-auto">
          <nav className="py-1">
            {menuItems.map((item) => {
              if (!item.access) return null;

              // Pular o item relatórios pois será tratado separadamente
              if (item.id === 'relatorios') return null;

              // Pular manutenção aqui, será renderizado após Cadastros
              if (item.id === 'manutencao') return null;

              // Pular ver-acessos aqui, será renderizado após Manutenção
              if (item.id === 'ver-acessos') return null;

              const Icon = item.icon;
              const isActive = currentPage === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onPageChange(item.id)}
                  className={`w-full flex items-center text-left text-sm transition-colors duration-200 relative group ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 border-r-2 border-emerald-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  } ${isCollapsed ? 'lg:justify-center lg:px-0 lg:py-2' : 'px-4 py-2'}`}
                  title={isCollapsed ? item.label : ''}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-emerald-700' : 'text-gray-500'} ${isCollapsed ? 'lg:mr-0' : 'mr-3'}`} />
                  <span className={`truncate ${isCollapsed ? 'lg:hidden' : ''}`}>{item.label}</span>

                  {isCollapsed && (
                    <div className="hidden lg:block fixed left-20 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[9999]">
                      {item.label}
                    </div>
                  )}
                </button>
              );
            })}

            {/* Botão Manutenção */}
            {hasAccess('manutencao') && (
              <button
                onClick={() => onPageChange('manutencao')}
                className={`w-full flex items-center text-left text-sm transition-colors duration-200 relative group ${
                  currentPage === 'manutencao'
                    ? 'bg-emerald-50 text-emerald-700 border-r-2 border-emerald-700'
                    : 'text-gray-700 hover:bg-gray-50'
                } ${isCollapsed ? 'lg:justify-center lg:px-0 lg:py-2' : 'px-4 py-2'}`}
                title={isCollapsed ? 'Manutenção' : ''}
              >
                <Wrench className={`w-5 h-5 flex-shrink-0 ${currentPage === 'manutencao' ? 'text-emerald-700' : 'text-gray-500'} ${isCollapsed ? 'lg:mr-0' : 'mr-3'}`} />
                <span className={`truncate ${isCollapsed ? 'lg:hidden' : ''}`}>Manutenção</span>

                {isCollapsed && (
                  <div className="hidden lg:block fixed left-20 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[9999]">
                    Manutenção
                  </div>
                )}
              </button>
            )}

            {/* Botão Ver Acessos */}
            {hasAccess('ver_acessos') && (
              <button
                onClick={() => onPageChange('ver-acessos')}
                className={`w-full flex items-center text-left text-sm transition-colors duration-200 relative group ${
                  currentPage === 'ver-acessos'
                    ? 'bg-emerald-50 text-emerald-700 border-r-2 border-emerald-700'
                    : 'text-gray-700 hover:bg-gray-50'
                } ${isCollapsed ? 'lg:justify-center lg:px-0 lg:py-2' : 'px-4 py-2'}`}
                title={isCollapsed ? 'Ver Acessos' : ''}
              >
                <Eye className={`w-5 h-5 flex-shrink-0 ${currentPage === 'ver-acessos' ? 'text-emerald-700' : 'text-gray-500'} ${isCollapsed ? 'lg:mr-0' : 'mr-3'}`} />
                <span className={`truncate ${isCollapsed ? 'lg:hidden' : ''}`}>Ver Acessos</span>

                {isCollapsed && (
                  <div className="hidden lg:block fixed left-20 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[9999]">
                    Ver Acessos
                  </div>
                )}
              </button>
            )}

            {/* Menu Sistema Expansível */}
            {!isCollapsed && (
              <div>
                <button
                  onClick={() => setSistemaOpen(!sistemaOpen)}
                  className={`w-full flex items-center justify-between px-4 py-2 text-left text-sm transition-colors duration-200 ${
                    isSistemaActive
                      ? 'bg-emerald-50 text-emerald-700 border-r-2 border-emerald-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center min-w-0 flex-1">
                    <Settings className={`w-5 h-5 mr-3 flex-shrink-0 ${isSistemaActive ? 'text-emerald-700' : 'text-gray-500'}`} />
                    <span className="truncate">Sistema</span>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    {sistemaOpen ? (
                      <ChevronDown className={`w-3 h-3 ${isSistemaActive ? 'text-emerald-700' : 'text-gray-500'}`} />
                    ) : (
                      <ChevronRight className={`w-3 h-3 ${isSistemaActive ? 'text-emerald-700' : 'text-gray-500'}`} />
                    )}
                  </div>
                </button>

                {sistemaOpen && (
                  <div className="bg-gray-50">
                    {sistemaItems.map((item) => {
                      if (!item.access) return null;

                      const Icon = item.icon;
                      const isActive = currentPage === item.id;

                      return (
                        <button
                          key={item.id}
                          onClick={() => onPageChange(item.id)}
                          className={`w-full flex items-center px-8 py-1.5 text-left text-sm transition-colors duration-200 ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-700 border-r-2 border-emerald-700'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-700'
                          }`}
                        >
                          <Icon className={`w-4 h-4 mr-3 flex-shrink-0 ${isActive ? 'text-emerald-700' : 'text-gray-400'}`} />
                          <span className="truncate text-xs">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Menu Relatórios Expansível */}
            {hasAccess('relatorios') && !isCollapsed && (
              <div>
                <button
                  onClick={() => setRelatoriosOpen(!relatoriosOpen)}
                  className={`w-full flex items-center justify-between px-4 py-2 text-left text-sm transition-colors duration-200 ${
                    isRelatoriosActive
                      ? 'bg-emerald-50 text-emerald-700 border-r-2 border-emerald-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center min-w-0 flex-1">
                    <FileText className={`w-5 h-5 mr-3 flex-shrink-0 ${isRelatoriosActive ? 'text-emerald-700' : 'text-gray-500'}`} />
                    <span className="truncate">Relatórios</span>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    {relatoriosOpen ? (
                      <ChevronDown className={`w-3 h-3 ${isRelatoriosActive ? 'text-emerald-700' : 'text-gray-500'}`} />
                    ) : (
                      <ChevronRight className={`w-3 h-3 ${isRelatoriosActive ? 'text-emerald-700' : 'text-gray-500'}`} />
                    )}
                  </div>
                </button>

                {relatoriosOpen && (
                  <div className="bg-gray-50">
                    {relatoriosItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentPage === item.id;

                      return (
                        <button
                          key={item.id}
                          onClick={() => onPageChange(item.id)}
                          className={`w-full flex items-center px-8 py-1.5 text-left text-sm transition-colors duration-200 ${
                            isActive
                              ? 'bg-blue-100 text-emerald-700 border-r-2 border-blue-700'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-700'
                          }`}
                        >
                          <Icon className={`w-4 h-4 mr-3 flex-shrink-0 ${isActive ? 'text-emerald-700' : 'text-gray-400'}`} />
                          <span className="truncate text-xs">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Menu Cadastros Expansível */}
            {hasAccess('usuarios') && !isCollapsed && (
              <div>
                <button
                  onClick={() => setCadastrosOpen(!cadastrosOpen)}
                  className={`w-full flex items-center justify-between px-4 py-2 text-left text-sm transition-colors duration-200 ${
                    isCadastrosActive
                      ? 'bg-emerald-50 text-emerald-700 border-r-2 border-emerald-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center min-w-0 flex-1">
                    <FolderOpen className={`w-5 h-5 mr-3 flex-shrink-0 ${isCadastrosActive ? 'text-emerald-700' : 'text-gray-500'}`} />
                    <span className="truncate">Cadastros</span>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    {cadastrosOpen ? (
                      <ChevronDown className={`w-3 h-3 ${isCadastrosActive ? 'text-emerald-700' : 'text-gray-500'}`} />
                    ) : (
                      <ChevronRight className={`w-3 h-3 ${isCadastrosActive ? 'text-emerald-700' : 'text-gray-500'}`} />
                    )}
                  </div>
                </button>

                {cadastrosOpen && (
                  <div className="bg-gray-50">
                    {/* Recepção */}
                    {hasModuleAccess('recepcao') && renderSubMenu(
                      cadastrosItems.recepcao,
                      recepcaoOpen,
                      setRecepcaoOpen,
                      'Recepção',
                      Phone
                    )}

                    {/* Camararia */}
                    {hasModuleAccess('camararia') && renderSubMenu(
                      cadastrosItems.camararia,
                      camarariaOpen,
                      setCamarariaOpen,
                      'Camararia',
                      Bed
                    )}

                    {/* Revisão */}
                    {hasModuleAccess('revisao') && renderSubMenu(
                      cadastrosItems.revisao,
                      revisaoOpen,
                      setRevisaoOpen,
                      'Revisão',
                      CheckCircle
                    )}

                    {/* Gestão */}
                    {hasModuleAccess('gestao') && renderSubMenu(
                      cadastrosItems.gestao,
                      gestaoOpen,
                      setGestaoOpen,
                      'Gestão',
                      Briefcase
                    )}

                    {/* Cozinha */}
                    {hasModuleAccess('cozinha') && renderSubMenu(
                      cadastrosItems.cozinha,
                      cozinhaOpen,
                      setCozinhaOpen,
                      'Cozinha',
                      ChefHat
                    )}

                    {/* Áreas Comuns */}
                    {hasModuleAccess('areas_comuns') && renderSubMenu(
                      cadastrosItems.areasComuns,
                      areasComunsOpen,
                      setAreasComunsOpen,
                      'Áreas Comuns',
                      Building
                    )}

                    {/* Vendas */}
                    {hasModuleAccess('vendas') && renderSubMenu(
                      cadastrosItems.vendas,
                      vendasOpen,
                      setVendasOpen,
                      'Vendas',
                      ShoppingBag
                    )}

                    {/* Atividades Diárias */}
                    {hasModuleAccess('atividades_diarias') && renderSubMenu(
                      cadastrosItems.atividadesDiarias,
                      atividadesDiariasOpen,
                      setAtividadesDiariasOpen,
                      'Atividades Diárias',
                      Activity
                    )}

                    {/* Atividades Extras */}
                    {hasModuleAccess('atividades_extras') && renderSubMenu(
                      cadastrosItems.atividadesExtras,
                      atividadesExtrasOpen,
                      setAtividadesExtrasOpen,
                      'Atividades Extras',
                      Sun
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Menu Administração Expansível */}
            {hasAccess('usuarios') && !isCollapsed && (
              <div>
                <button
                  onClick={() => setAdminOpen(!adminOpen)}
                  className={`w-full flex items-center justify-between px-4 py-2 text-left text-sm transition-colors duration-200 ${
                    isAdminActive
                      ? 'bg-emerald-50 text-emerald-700 border-r-2 border-emerald-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center min-w-0 flex-1">
                    <Settings className={`w-5 h-5 mr-3 flex-shrink-0 ${isAdminActive ? 'text-emerald-700' : 'text-gray-500'}`} />
                    <span className="truncate">Administração</span>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    {adminOpen ? (
                      <ChevronDown className={`w-3 h-3 ${isAdminActive ? 'text-emerald-700' : 'text-gray-500'}`} />
                    ) : (
                      <ChevronRight className={`w-3 h-3 ${isAdminActive ? 'text-emerald-700' : 'text-gray-500'}`} />
                    )}
                  </div>
                </button>

                {adminOpen && (
                  <div className="bg-gray-50">
                    {adminItems.map((item) => {
                      if (!item.access) return null;

                      const Icon = item.icon;
                      const isActive = currentPage === item.id;

                      return (
                        <button
                          key={item.id}
                          onClick={() => onPageChange(item.id)}
                          className={`w-full flex items-center px-8 py-1.5 text-left text-sm transition-colors duration-200 ${
                            isActive
                              ? 'bg-blue-100 text-emerald-700 border-r-2 border-blue-700'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-700'
                          }`}
                        >
                          <Icon className={`w-4 h-4 mr-3 flex-shrink-0 ${isActive ? 'text-emerald-700' : 'text-gray-400'}`} />
                          <span className="truncate text-xs">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Botão Agente IA */}
            {hasAccess('usuarios') && (
              <button
                onClick={() => window.open('https://performaxis-ia.com.br/', '_blank')}
                className={`w-full flex items-center text-left text-sm transition-colors duration-200 relative group text-gray-700 hover:bg-gray-50 ${
                  isCollapsed ? 'lg:justify-center lg:px-0 lg:py-2' : 'px-4 py-2'
                }`}
                title={isCollapsed ? 'Agente IA' : ''}
              >
                <Lightbulb className={`w-5 h-5 flex-shrink-0 text-gray-500 ${isCollapsed ? 'lg:mr-0' : 'mr-3'}`} />
                <span className={`truncate ${isCollapsed ? 'lg:hidden' : ''}`}>Agente IA</span>

                {isCollapsed && (
                  <div className="hidden lg:block fixed left-20 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[9999]">
                    Agente IA
                  </div>
                )}
              </button>
            )}
          </nav>
        </div>

        {/* Footer fixo */}
        <div className={`border-t border-gray-200 p-3 flex-shrink-0 ${isCollapsed ? 'lg:px-0 lg:flex lg:justify-center' : ''}`}>
          <button
            onClick={logout}
            className={`w-full flex items-center text-gray-700 hover:bg-gray-50 rounded-md transition-colors duration-200 text-sm relative group ${
              isCollapsed ? 'lg:justify-center lg:px-0 lg:py-2' : 'px-3 py-2'
            }`}
            title={isCollapsed ? 'Sair' : ''}
          >
            <LogOut className={`w-5 h-5 text-gray-500 flex-shrink-0 ${isCollapsed ? 'lg:mr-0' : 'mr-3'}`} />
            <span className={`${isCollapsed ? 'lg:hidden' : ''}`}>Sair</span>

            {isCollapsed && (
              <div className="hidden lg:block fixed left-20 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[9999]">
                Sair
              </div>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
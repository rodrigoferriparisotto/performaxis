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
  Volume2,
  Timer,
  Rocket,
  LayoutGrid,
  SlidersHorizontal,
  Gift,
  ClipboardCheck,
  Hotel,
  Network,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSidebar } from '../../contexts/SidebarContext';
import { supabase } from '../../lib/supabase';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

interface ItemMenu {
  id: string;
  label: string;
  icon: any;
  access?: boolean;
}

type Grupo = 'setores' | 'relatorios' | 'sistema' | 'cadastros' | 'admin';

// até este número de setores o menu mostra os setores soltos (funcionário com 1–3 áreas)
const SETORES_SOLTOS_ATE = 3;

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange, isOpen, onToggle }) => {
  const { user, empresa, logout, hasAccess, hasModuleAccess } = useAuth();
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const ehGestao = user?.profile === 'admin' || user?.profile === 'gestor';

  const topoItems: ItemMenu[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, access: true },
    { id: 'dashboard-ao-vivo', label: 'Dashboard Ao Vivo', icon: Monitor, access: ehGestao },
  ];

  const setoresItems: ItemMenu[] = [
    { id: 'atividades-diarias', label: 'Atividades Diárias', icon: Activity, access: hasModuleAccess('atividades_diarias') },
    { id: 'recepcao', label: 'Recepção', icon: Phone, access: hasModuleAccess('recepcao') },
    { id: 'areas-comuns', label: 'Áreas Comuns', icon: Building, access: hasModuleAccess('areas_comuns') },
    { id: 'camararia', label: 'Governança', icon: Bed, access: hasModuleAccess('camararia') },
    { id: 'revisao', label: 'Revisão', icon: CheckCircle, access: hasModuleAccess('revisao') },
    { id: 'cozinha', label: 'Cozinha', icon: ChefHat, access: hasModuleAccess('cozinha') },
    { id: 'gestao', label: 'Gestão', icon: Briefcase, access: hasModuleAccess('gestao') },
    { id: 'vendas', label: 'Vendas', icon: ShoppingBag, access: hasModuleAccess('vendas') },
    { id: 'atividades-extras', label: 'Atividades Extras', icon: Sun, access: hasModuleAccess('atividades_extras') },
    { id: 'manutencao', label: 'Manutenção', icon: Wrench, access: hasAccess('manutencao') },
  ].filter((i) => i.access);

  const verAcessos: ItemMenu = { id: 'ver-acessos', label: 'Ver Acessos', icon: Eye, access: hasAccess('ver_acessos') };
  // a equipe só vê os prêmios quando a empresa liberou (cadastro da empresa)
  const premiosItem: ItemMenu = { id: 'premios', label: 'Prêmios', icon: Gift, access: ehGestao || empresa?.premios_visivel_equipe === true };
  const premiosGestaoItem: ItemMenu = { id: 'premios-gestao', label: 'Gestão de prêmios', icon: ClipboardCheck, access: ehGestao };

  // grupo de hotéis: corporativo troca o hotel ativo e vê o painel consolidado
  const [hoteis, setHoteis] = React.useState<{ empresa_id: string; nome: string; ativa: boolean }[]>([]);
  const [temGrupo, setTemGrupo] = React.useState(false);
  React.useEffect(() => {
    if (!user?.id) return;
    supabase.rpc('minhas_empresas').then(({ data }) => setHoteis((data as any[]) || []));
    supabase.rpc('meus_grupos').then(({ data }) => setTemGrupo(((data as any[]) || []).length > 0));
  }, [user?.id]);
  const trocarHotel = async (empresaId: string) => {
    const { error } = await supabase.rpc('trocar_empresa_ativa', { p_empresa: empresaId });
    if (error) return;
    window.location.hash = 'dashboard';
    window.location.reload();
  };
  const painelGrupoItem: ItemMenu = { id: 'painel-grupo', label: 'Painel do grupo', icon: Network, access: temGrupo };

  // pedidos de troca aguardando entrega (aviso no menu da gestão)
  const [pedidosPendentes, setPedidosPendentes] = React.useState(0);
  React.useEffect(() => {
    if (!ehGestao || !user?.empresaId) return;
    supabase
      .from('resgates')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', user.empresaId)
      .eq('status', 'solicitado')
      .then(({ count }) => setPedidosPendentes(count || 0));
  }, [ehGestao, user?.empresaId, currentPage]);

  const relatoriosItems: ItemMenu[] = [
    { id: 'dashboard-relatorios', label: 'Visão Geral', icon: FileText },
    { id: 'analise-operacional', label: 'Análise Operacional', icon: Settings },
    { id: 'analise-funcionario', label: 'Análise por Funcionário', icon: Users },
    { id: 'dados-gerais', label: 'Dados Gerais', icon: FileText },
    { id: 'eficiencia-area', label: 'Eficiência por Área', icon: TrendingUp },
    { id: 'tempo-real-estimado', label: 'Tempo Real × Estimado', icon: Timer, access: ehGestao },
    { id: 'ranking-meritocracia', label: 'Ranking por Meritocracia', icon: Trophy },
  ].filter((i) => i.access !== false);

  // cadastros por setor (cada setor abre os seus)
  const cadastrosSetores: { id: string; titulo: string; icon: any; modulo: string; itens: ItemMenu[] }[] = [
    { id: 'recepcao', titulo: 'Recepção', icon: Phone, modulo: 'recepcao', itens: [
      { id: 'tipos-recepcao', label: 'Tipos de Recepção', icon: Phone },
      { id: 'atividades-recepcao', label: 'Atividades Recepção', icon: Phone },
    ] },
    { id: 'camararia', titulo: 'Governança', icon: Bed, modulo: 'camararia', itens: [
      { id: 'itens-camararia', label: 'Itens Governança', icon: Package },
      { id: 'servicos-camararia', label: 'Serviços Governança', icon: Bed },
      { id: 'fotos-camararia', label: 'Fotos Governança', icon: Camera },
      { id: 'atividades-camararia', label: 'Atividades Governança', icon: Bed },
    ] },
    { id: 'revisao', titulo: 'Revisão', icon: CheckCircle, modulo: 'revisao', itens: [
      { id: 'atividades-revisao', label: 'Atividades Revisão', icon: CheckCircle },
    ] },
    { id: 'gestao', titulo: 'Gestão', icon: Briefcase, modulo: 'gestao', itens: [
      { id: 'tipos-gestao', label: 'Tipos de Gestão', icon: Briefcase },
      { id: 'atividades-gestao', label: 'Atividades Gestão', icon: Settings },
    ] },
    { id: 'cozinha', titulo: 'Cozinha', icon: ChefHat, modulo: 'cozinha', itens: [
      { id: 'tipos-cozinha', label: 'Tipos de Cozinha', icon: ChefHat },
      { id: 'atividades-cozinha', label: 'Atividades Cozinha', icon: ChefHat },
      { id: 'fotos-cozinha', label: 'Fotos Cozinha', icon: Camera },
    ] },
    { id: 'areas-comuns', titulo: 'Áreas Comuns', icon: Building, modulo: 'areas_comuns', itens: [
      { id: 'tipos-areas-comuns', label: 'Tipos de Áreas Comuns', icon: Building },
      { id: 'atividades-areas-comuns', label: 'Atividades Áreas Comuns', icon: Building },
    ] },
    { id: 'vendas', titulo: 'Vendas', icon: ShoppingBag, modulo: 'vendas', itens: [
      { id: 'tipos-funcoes-comerciais', label: 'Tipos de Funções Comerciais', icon: ShoppingBag },
      { id: 'atividades-comerciais', label: 'Atividades Comerciais', icon: ShoppingBag },
    ] },
    { id: 'atividades-diarias', titulo: 'Atividades Diárias', icon: Activity, modulo: 'atividades_diarias', itens: [
      { id: 'tipos-atividades', label: 'Tipos de Atividades', icon: Settings },
      { id: 'atividades-diarias-config', label: 'Atividades Diárias', icon: Activity },
    ] },
    { id: 'atividades-extras', titulo: 'Atividades Extras', icon: Sun, modulo: 'atividades_extras', itens: [
      { id: 'tipos-extras', label: 'Tipos de Extras', icon: Settings },
      { id: 'atividades-extras-config', label: 'Config. Atividades Extras', icon: Sun },
    ] },
  ].filter((s) => hasModuleAccess(s.modulo));

  const sistemaItems: ItemMenu[] = [
    { id: 'configuracoes-lembretes', label: 'Lembretes', icon: Bell, access: hasAccess('lembretes') },
    { id: 'configuracoes-som', label: 'Som', icon: Volume2, access: true },
    { id: 'diagnostico-notificacoes', label: 'Diagnóstico de Notificações', icon: Activity, access: true },
  ].filter((i) => i.access);

  const adminItems: ItemMenu[] = [
    { id: 'implantacao', label: 'Configuração inicial', icon: Rocket, access: hasAccess('usuarios') && hasAccess('cadastros') },
    { id: 'usuarios', label: 'Usuários', icon: Users, access: hasAccess('usuarios') },
    { id: 'empresa', label: 'Empresa', icon: Building, access: hasAccess('empresa') },
    { id: 'perfis', label: 'Perfis', icon: Users, access: hasAccess('perfis') },
    { id: 'acessos', label: 'Acessos', icon: Key, access: hasAccess('acessos') },
    { id: 'suites', label: 'Suítes', icon: Home, access: hasAccess('suites') },
    { id: 'configuracao-metas', label: 'Configuração de Metas', icon: TrendingUp, access: hasAccess('configuracao_metas') },
    { id: 'recalcular-performance', label: 'Recalcular Performance', icon: Activity, access: hasAccess('recalcular_performance') },
    { id: 'monitoramento-performance', label: 'Monitoramento', icon: Activity, access: hasAccess('monitoramento_performance') },
    { id: 'gerenciar-tokens-push', label: 'Dispositivos de notificação', icon: Bell, access: user?.profile === 'admin' },
    { id: 'monitoramento-push', label: 'Painel de notificações push', icon: Bell, access: user?.profile === 'admin' },
    { id: 'limpeza-historico', label: 'Limpeza de Histórico', icon: Trash2, access: ehGestao },
    { id: 'publicar-versao', label: 'Publicar Versão', icon: Package, access: user?.profile === 'admin' },
    { id: 'enviar-mensagem', label: 'Enviar Mensagem', icon: MessageSquare, access: user?.profile === 'gestor' },
    { id: 'teste-notificacoes', label: 'Teste de notificações push', icon: Bell, access: user?.profile === 'admin' },
    { id: 'blog-admin', label: 'Gerenciar Blog', icon: FileText, access: user?.profile === 'admin' },
    { id: 'grupos-hoteis', label: 'Grupos de hotéis', icon: Network, access: user?.profile === 'admin' && !user?.empresaId },
  ].filter((i) => i.access);

  // quem configura o hotel tem dois menus: Operação (dia a dia) e Configurações
  const temConfiguracoes = hasAccess('usuarios');
  const podeVerCadastros = hasAccess('cadastros');
  const setoresAgrupados = setoresItems.length > SETORES_SOLTOS_ATE;

  const contem = (itens: ItemMenu[]) => itens.some((i) => i.id === currentPage);
  const setorCadastroAtivo = cadastrosSetores.find((s) => contem(s.itens))?.id ?? null;
  const grupoDaPagina: Grupo | null =
    contem(setoresItems) && setoresAgrupados ? 'setores'
      : contem(relatoriosItems) || currentPage === 'relatorios' ? 'relatorios'
      : contem(sistemaItems) ? 'sistema'
      : setorCadastroAtivo ? 'cadastros'
      : contem(adminItems) || currentPage.startsWith('blog-admin') ? 'admin'
      : null;
  const paginaDeConfiguracao = grupoDaPagina === 'cadastros' || grupoDaPagina === 'admin'
    || (temConfiguracoes && grupoDaPagina === 'sistema');

  const [modo, setModo] = React.useState<'operacao' | 'config'>(paginaDeConfiguracao ? 'config' : 'operacao');
  // um grupo aberto por vez; sem página ativa em grupo, Setores começa aberto
  const [grupoAberto, setGrupoAberto] = React.useState<Grupo | null>(grupoDaPagina ?? 'setores');
  const [setorCadastroAberto, setSetorCadastroAberto] = React.useState<string | null>(setorCadastroAtivo);

  React.useEffect(() => {
    if (grupoDaPagina) setGrupoAberto(grupoDaPagina);
    if (setorCadastroAtivo) setSetorCadastroAberto(setorCadastroAtivo);
    if (temConfiguracoes) setModo(paginaDeConfiguracao ? 'config' : 'operacao');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const alternarGrupo = (g: Grupo) => setGrupoAberto((atual) => (atual === g ? null : g));

  const trocarModo = (novo: 'operacao' | 'config') => {
    setModo(novo);
    setGrupoAberto(grupoDaPagina ?? (novo === 'config' ? 'cadastros' : 'setores'));
  };

  const Dica = ({ texto }: { texto: string }) =>
    isCollapsed ? (
      <div className="hidden lg:block fixed left-20 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[9999]">
        {texto}
      </div>
    ) : null;

  // item de primeiro nível (também aparece com o menu recolhido)
  const renderItem = (item: ItemMenu, contador = 0) => {
    const Icon = item.icon;
    const isActive = currentPage === item.id;
    return (
      <button
        key={item.id}
        onClick={() => onPageChange(item.id)}
        className={`w-full flex items-center text-left text-sm transition-colors duration-200 relative group ${
          isActive ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' : 'text-gray-700 hover:bg-gray-50'
        } ${isCollapsed ? 'lg:justify-center lg:px-0 lg:py-2' : 'px-4 py-2'}`}
        title={isCollapsed ? item.label : ''}
      >
        <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-700' : 'text-gray-500'} ${isCollapsed ? 'lg:mr-0' : 'mr-3'}`} />
        <span className={`truncate ${isCollapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
        {contador > 0 && (
          <span className={`ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-semibold flex items-center justify-center ${isCollapsed ? 'lg:absolute lg:top-0 lg:right-3 lg:ml-0' : ''}`}>
            {contador}
          </span>
        )}
        <Dica texto={item.label} />
      </button>
    );
  };

  // item dentro de um grupo
  const renderSubItem = (item: ItemMenu, recuo = 'px-8') => {
    const Icon = item.icon;
    const isActive = currentPage === item.id;
    return (
      <button
        key={item.id}
        onClick={() => onPageChange(item.id)}
        className={`w-full flex items-center ${recuo} py-1.5 text-left text-sm transition-colors duration-200 ${
          isActive ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-700'
        }`}
      >
        <Icon className={`w-4 h-4 mr-3 flex-shrink-0 ${isActive ? 'text-blue-700' : 'text-gray-400'}`} />
        <span className="truncate text-xs">{item.label}</span>
      </button>
    );
  };

  const renderGrupo = (g: Grupo, titulo: string, Icon: any, ativo: boolean, conteudo: React.ReactNode) => {
    const aberto = grupoAberto === g;
    return (
      <div key={g}>
        <button
          onClick={() => alternarGrupo(g)}
          aria-expanded={aberto}
          className={`w-full flex items-center justify-between px-4 py-2 text-left text-sm transition-colors duration-200 ${
            ativo ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center min-w-0 flex-1">
            <Icon className={`w-5 h-5 mr-3 flex-shrink-0 ${ativo ? 'text-blue-700' : 'text-gray-500'}`} />
            <span className="truncate">{titulo}</span>
          </div>
          {aberto ? (
            <ChevronDown className={`w-3 h-3 flex-shrink-0 ml-2 ${ativo ? 'text-blue-700' : 'text-gray-500'}`} />
          ) : (
            <ChevronRight className={`w-3 h-3 flex-shrink-0 ml-2 ${ativo ? 'text-blue-700' : 'text-gray-500'}`} />
          )}
        </button>
        {aberto && <div className="bg-gray-50">{conteudo}</div>}
      </div>
    );
  };

  const renderCadastros = () =>
    cadastrosSetores.map((setor) => {
      const aberto = setorCadastroAberto === setor.id;
      const ativo = setorCadastroAtivo === setor.id;
      const Icon = setor.icon;
      return (
        <div key={setor.id}>
          <button
            onClick={() => setSetorCadastroAberto(aberto ? null : setor.id)}
            aria-expanded={aberto}
            className={`w-full flex items-center justify-between px-8 py-1.5 text-left text-sm transition-colors duration-200 ${
              ativo ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center min-w-0 flex-1">
              <Icon className={`w-4 h-4 mr-3 flex-shrink-0 ${ativo ? 'text-blue-700' : 'text-gray-400'}`} />
              <span className="truncate text-xs">{setor.titulo}</span>
            </div>
            {aberto ? (
              <ChevronDown className={`w-3 h-3 flex-shrink-0 ml-2 ${ativo ? 'text-blue-700' : 'text-gray-500'}`} />
            ) : (
              <ChevronRight className={`w-3 h-3 flex-shrink-0 ml-2 ${ativo ? 'text-blue-700' : 'text-gray-500'}`} />
            )}
          </button>
          {aberto && <div className="bg-gray-100">{setor.itens.map((i) => renderSubItem(i, 'px-12'))}</div>}
        </div>
      );
    });

  const mostrarConfig = temConfiguracoes && modo === 'config' && !isCollapsed;

  const menuOperacao = (
    <>
      {topoItems.filter((i) => i.access).map((i) => renderItem(i))}

      {/* Setores: agrupados para quem tem muitos; soltos para quem tem poucos (e no menu recolhido) */}
      {setoresAgrupados && !isCollapsed
        ? renderGrupo('setores', 'Setores', LayoutGrid, contem(setoresItems), setoresItems.map((i) => renderSubItem(i)))
        : setoresItems.map((i) => renderItem(i))}

      {premiosItem.access && renderItem(premiosItem)}
      {premiosGestaoItem.access && renderItem(premiosGestaoItem, pedidosPendentes)}
      {painelGrupoItem.access && renderItem(painelGrupoItem)}

      {verAcessos.access && renderItem(verAcessos)}

      {hasAccess('relatorios') && !isCollapsed &&
        renderGrupo('relatorios', 'Relatórios', FileText, grupoDaPagina === 'relatorios', relatoriosItems.map((i) => renderSubItem(i)))}

      {/* quem não configura o hotel vê Sistema aqui mesmo */}
      {!temConfiguracoes && !isCollapsed && sistemaItems.length > 0 &&
        renderGrupo('sistema', 'Sistema', Settings, grupoDaPagina === 'sistema', sistemaItems.map((i) => renderSubItem(i)))}

      {temConfiguracoes && (
        <button
          onClick={() => window.open('https://performaxis-ia.com.br/', '_blank')}
          className={`w-full flex items-center text-left text-sm transition-colors duration-200 relative group text-gray-700 hover:bg-gray-50 ${
            isCollapsed ? 'lg:justify-center lg:px-0 lg:py-2' : 'px-4 py-2'
          }`}
          title={isCollapsed ? 'Agente IA' : ''}
        >
          <Lightbulb className={`w-5 h-5 flex-shrink-0 text-gray-500 ${isCollapsed ? 'lg:mr-0' : 'mr-3'}`} />
          <span className={`truncate ${isCollapsed ? 'lg:hidden' : ''}`}>Agente IA</span>
          <Dica texto="Agente IA" />
        </button>
      )}
    </>
  );

  const menuConfiguracoes = (
    <>
      {podeVerCadastros && cadastrosSetores.length > 0 &&
        renderGrupo('cadastros', 'Cadastros', FolderOpen, grupoDaPagina === 'cadastros', renderCadastros())}
      {adminItems.length > 0 &&
        renderGrupo('admin', 'Administração', Settings, grupoDaPagina === 'admin', adminItems.map((i) => renderSubItem(i)))}
      {sistemaItems.length > 0 &&
        renderGrupo('sistema', 'Sistema', Bell, grupoDaPagina === 'sistema', sistemaItems.map((i) => renderSubItem(i)))}
    </>
  );

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
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:block p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
            >
              {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* User info fixo */}
        <div className={`px-4 py-3 border-b border-gray-200 flex-shrink-0 ${isCollapsed ? 'lg:px-0 lg:flex lg:justify-center' : ''}`}>
          <div className={`flex items-center ${isCollapsed ? 'lg:flex-col lg:space-x-0' : 'space-x-3'}`}>
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-white" />
            </div>
            <div className={`min-w-0 flex-1 ${isCollapsed ? 'lg:hidden' : ''}`}>
              <p className="font-medium text-gray-800 text-sm truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.profile}</p>
              {hoteis.length > 1 && (
                <label className="mt-1.5 flex items-center gap-1.5">
                  <Hotel className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <select
                    value={hoteis.find((h) => h.ativa)?.empresa_id || ''}
                    onChange={(e) => trocarHotel(e.target.value)}
                    aria-label="Hotel ativo"
                    className="w-full min-w-0 text-xs border border-gray-300 rounded-md px-1.5 py-1 bg-white text-gray-700"
                  >
                    {hoteis.map((h) => (
                      <option key={h.empresa_id} value={h.empresa_id}>{h.nome}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </div>

          {/* Operação × Configurações */}
          {temConfiguracoes && !isCollapsed && (
            <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1" role="tablist" aria-label="Menu">
              {([
                { id: 'operacao', rotulo: 'Operação', icon: LayoutGrid },
                { id: 'config', rotulo: 'Configurações', icon: SlidersHorizontal },
              ] as const).map((m) => {
                const ativo = modo === m.id;
                const Icone = m.icon;
                return (
                  <button
                    key={m.id}
                    role="tab"
                    aria-selected={ativo}
                    onClick={() => trocarModo(m.id)}
                    className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                      ativo ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <Icone className="w-3.5 h-3.5" />
                    {m.rotulo}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Menu navegável */}
        <div className="flex-1 overflow-y-auto">
          <nav className="py-1">{mostrarConfig ? menuConfiguracoes : menuOperacao}</nav>
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
            <Dica texto="Sair" />
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;

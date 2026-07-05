import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SidebarProvider } from '../contexts/SidebarContext';
import { Menu } from 'lucide-react';
import LoginForm from './Auth/LoginForm';
import RegisterForm from './Auth/RegisterForm';
import PasswordReset from './Auth/PasswordReset';
import LandingPage from './LandingPage';
import { InstallPWAPrompt } from './common/InstallPWAPrompt';
import NotificationPermissionModal from './common/NotificationPermissionModal';
import BatteryOptimizationModal from './common/BatteryOptimizationModal';
import PendingRecordsBadge from './common/PendingRecordsBadge';
import { getBatteryGuide } from '../constants/batteryOptimizationGuides';
import SobrePage from './Public/SobrePage';
import RecursosPage from './Public/RecursosPage';
import FAQPage from './Public/FAQPage';
import ContatoPage from './Public/ContatoPage';
import DemoPage from './Public/DemoPage';
import VideosPage from './Public/VideosPage';
import BlogListPage from './Public/BlogListPage';
import BlogPostPage from './Public/BlogPostPage';
import BlogAdmin from './Pages/BlogAdmin';
import BlogAdminEdit from './Pages/BlogAdminEdit';
import Sidebar from './Layout/Sidebar';
import { useReminderChecker } from '../hooks/useReminderChecker';
import { useRecordSync } from '../hooks/useRecordSync';
import { useMessageChecker } from '../hooks/useMessageChecker';
import { useMarkingInactivityChecker } from '../hooks/useMarkingInactivityChecker';
import InactivityAlertModal from './common/InactivityAlertModal';
import { browserCapabilitiesService } from '../services/browserCapabilitiesService';
import { indexedDBService } from '../services/indexedDBService';
import { activityMarkingService } from '../services/activityMarkingService';
import { notificationHealthCheckService } from '../services/notificationHealthCheckService';
import { getDataHoraAtual } from '../utils/dateUtils';
import { mapModuloToUrl, mapModuloToHistoricoUrl } from '../utils/moduleUrlMapper';
import Dashboard from './Pages/Dashboard';
import Empresa from './Pages/Empresa';
import Usuarios from './Pages/Usuarios';
import AtividadesRecepcao from './Pages/AtividadesRecepcao';
import AtividadesCamararia from './Pages/AtividadesCamararia';
import AtividadesRevisao from './Pages/AtividadesRevisao';
import AtividadesAreasComuns from './Pages/AtividadesAreasComuns';
import AtividadesGestao from './Pages/AtividadesGestao';
import AtividadesNoturnas from './Pages/AtividadesNoturnas';
import AtividadesDiurnas from './Pages/AtividadesDiurnas';
import TiposCozinha from './Pages/TiposCozinha';
import AtividadesCozinha from './Pages/AtividadesCozinha';
import Cozinha from './Pages/Cozinha';
import Suites from './Pages/Suites';
import AtividadesExtras from './Pages/AtividadesExtras';
import AtividadesDiarias from './Pages/AtividadesDiarias';
import Gestao from './Pages/Gestao';
import Recepcao from './Pages/Recepcao';
import Camararia from './Pages/Camararia';
import Revisao from './Pages/Revisao';
import AreasComuns from './Pages/AreasComuns';
import Manutencao from './Pages/Manutencao';
import Relatorios from './Pages/Relatorios';
import NovoRegistroManutencao from './Pages/NovoRegistroManutencao';
import ManutencoesPendentes from './Pages/ManutencoesPendentes';
import HistoricoManutencao from './Pages/HistoricoManutencao';
import Perfis from './Pages/Perfis';
import Acessos from './Pages/Acessos';
import VerAcessos from './Pages/VerAcessos';
import TiposRecepcao from './Pages/TiposRecepcao';
import ServicosCamararia from './Pages/ServicosCamararia';
import ItensCamararia from './Pages/ItensCamararia';
import FotosCamararia from './Pages/FotosCamararia';
import FotosCozinha from './Pages/FotosCozinha';
import TiposGestao from './Pages/TiposGestao';
import TiposAtividades from './Pages/TiposAtividades';
import DashboardRelatorios from './Pages/DashboardRelatorios';
import AnaliseOperacional from './Pages/AnaliseOperacional';
import AnaliseFuncionario from './Pages/AnaliseFuncionario';
import DadosGerais from './Pages/DadosGerais';
import EficienciaArea from './Pages/EficienciaArea';
import TiposExtras from './Pages/TiposExtras';
import TiposAreasComuns from './Pages/TiposAreasComuns';
import Vendas from './Pages/Vendas';
import TiposFuncoesComerciais from './Pages/TiposFuncoesComerciais';
import AtividadesComerciais from './Pages/AtividadesComerciais';
import DashboardAoVivo from './Pages/DashboardAoVivo';
import RecalcularPerformance from './Pages/RecalcularPerformance';
import MonitoramentoPerformance from './Pages/MonitoramentoPerformance';
import ConfiguracaoMetas from './Pages/ConfiguracaoMetas';
import RankingPorMeritocracia from './Pages/RankingPorMeritocracia';
import { PublicarVersao } from './Pages/PublicarVersao';
import { EnviarMensagem } from './Pages/EnviarMensagem';
import ConfiguracoesLembretes from './Pages/ConfiguracoesLembretes';
import ConfiguracoesSom from './Pages/ConfiguracoesSom';
import LimpezaHistorico from './Pages/LimpezaHistorico';
import TesteNotificacoesPush from './Pages/TesteNotificacoesPush';
import GerenciarTokensPush from './Pages/GerenciarTokensPush';
import MonitoramentoPush from './Pages/MonitoramentoPush';
import { DiagnosticoNotificacoes } from './Pages/DiagnosticoNotificacoes';

const MainAppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authView, setAuthView] = useState<'landing' | 'login' | 'register' | 'reset'>('landing');
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showBatteryGuideModal, setShowBatteryGuideModal] = useState(false);
  const { user, loading, login } = useAuth();

  const reminderChecker = useReminderChecker({
    userId: user?.id || null,
    empresaId: user?.empresaId || null,
    enabled: !!user,
  });

  const recordSync = useRecordSync({
    userId: user?.id || null,
    empresaId: user?.empresaId || null,
    enabled: !!user,
  });

  const messageChecker = useMessageChecker(user?.id || null, !!user);

  const markingInactivityChecker = useMarkingInactivityChecker({
    userId: user?.id || null,
    empresaId: user?.empresaId || null,
    enabled: !!user,
  });

  useEffect(() => {
    if (user) {
      browserCapabilitiesService.logCapabilities();

      // Run health check in background
      if (user.empresaId) {
        notificationHealthCheckService.checkAndLogHealth(user.id, user.empresaId)
          .catch(() => {});
      }
    }
  }, [user]);

  useEffect(() => {
    if (user && messageChecker.unreadMessages.length > 0) {
      const syncMessagesToIndexedDB = async () => {
        try {
          for (const message of messageChecker.unreadMessages) {
            await indexedDBService.saveUnreadMessage({
              ...message,
              usuario_id: user.id,
            });
          }

          await indexedDBService.saveMessageState({
            userId: user.id,
            lastCheckTime: getDataHoraAtual(),
            unreadCount: messageChecker.unreadMessages.length,
          });

          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'CHECK_MESSAGES_NOW',
            });
          }
        } catch (error) {
        }
      };

      syncMessagesToIndexedDB();
    }
  }, [user, messageChecker.unreadMessages]);

  // Detectar mudanças no hash da URL para navegação
  React.useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        setCurrentPage(hash);
      }
    };

    // Verificar hash inicial
    handleHashChange();

    // Escutar mudanças no hash
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Definir página padrão baseada no perfil do usuário
  React.useEffect(() => {
    if (user && !window.location.hash) {
      const defaultPage = (user.profile === 'admin' || user.profile === 'gestor')
        ? 'dados-gerais'
        : 'dashboard';
      setCurrentPage(defaultPage);
      window.location.hash = defaultPage;
    }
  }, [user]);

  // Escutar evento para fechar o sidebar (disparado pela modal)
  React.useEffect(() => {
    const handleCloseSidebar = () => {
      setSidebarOpen(false);
    };

    window.addEventListener('close-sidebar', handleCloseSidebar);

    return () => {
      window.removeEventListener('close-sidebar', handleCloseSidebar);
    };
  }, []);

  useEffect(() => {
    if (user && user.id && user.empresaId && !loading && reminderChecker.canRequestPermission) {
      const hasAskedBefore = localStorage.getItem('reminder-permission-asked');
      if (!hasAskedBefore) {
        setTimeout(() => {
          setShowNotificationModal(true);
        }, 2000);
      }
    }
  }, [user, loading, reminderChecker.canRequestPermission]);

  const handleAcceptNotifications = async () => {
    await reminderChecker.requestPermission();
    localStorage.setItem('reminder-permission-asked', 'true');
    setShowNotificationModal(false);

    if (user && browserCapabilitiesService.needsBatteryOptimizationGuide()) {
      const { supabase } = await import('../lib/supabase');
      const { data } = await supabase
        .from('usuarios')
        .select('battery_optimization_configured')
        .eq('id', user.id)
        .maybeSingle();

      if (!data?.battery_optimization_configured) {
        setTimeout(() => {
          setShowBatteryGuideModal(true);
        }, 500);
      }
    }
  };

  const handleDeclineNotifications = () => {
    localStorage.setItem('reminder-permission-asked', 'true');
    setShowNotificationModal(false);
  };

  const handleBatteryGuideConfirm = async (configured: boolean) => {
    if (configured && user) {
      try {
        const { supabase } = await import('../lib/supabase');
        await supabase
          .from('usuarios')
          .update({ battery_optimization_configured: true })
          .eq('id', user.id);
      } catch (error) {
      }
    }
    setShowBatteryGuideModal(false);
  };

  const handleBatteryGuideClose = () => {
    setShowBatteryGuideModal(false);
  };

  useEffect(() => {
    const registerTokenIfNeeded = async () => {
      if (!user?.id) return;

      if (Notification.permission === 'granted') {
        try {
          const { getUserPushTokens, retryGetToken } = await import('../services/firebasePushService');

          const existingTokens = await getUserPushTokens(user.id);

          if (existingTokens.length === 0) {
            console.log('[FCM] Usuário tem permissão mas sem tokens. Registrando automaticamente com retry...');
            await retryGetToken(user.id, 3);
          }
        } catch (error) {
          console.error('[FCM] Erro ao registrar token automaticamente:', error);
        }
      }
    };

    registerTokenIfNeeded();
  }, [user?.id]);

  // Função para navegar programaticamente
  const navigateToPage = (page: string) => {
    setCurrentPage(page);
    window.location.hash = page;
    // Fechar sidebar no mobile após navegação
    setSidebarOpen(false);
  };

  // Função para determinar a página de revisão baseada no perfil do usuário
  const getReviewPage = (): string => {
    if (!user) return 'dashboard';

    switch (user.profile) {
      case 'camararia':
        return 'camararia';
      case 'recepcao':
        return 'recepcao';
      case 'areas_comuns':
        return 'areas-comuns';
      case 'cozinha':
        return 'cozinha';
      case 'gestao':
        return 'gestao';
      case 'vendas':
        return 'vendas';
      case 'revisao':
        return 'revisao';
      case 'noturnas':
        return 'noturnas';
      default:
        return 'dashboard';
    }
  };

  // Funções para lidar com o modal de inatividade
  const handleReviewNow = async () => {
    await markingInactivityChecker.closeAlert();

    const activeModule = activityMarkingService.obterModuloAtual();

    if (activeModule) {
      const registroUrl = mapModuloToUrl(activeModule);
      navigateToPage(registroUrl);
    } else {
      const reviewPage = getReviewPage();
      navigateToPage(reviewPage);
    }
  };

  const handlePostponeAlert = async () => {
    await markingInactivityChecker.postponeAlert(10);
  };

  // Mostrar loading enquanto verifica sessão
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  const publicPages = ['sobre', 'recursos', 'faq', 'contato', 'demo', 'videos', 'blog'];
  const isPublicPage = publicPages.includes(currentPage) || currentPage.startsWith('blog-post/');

  if (!user) {
    if (isPublicPage) {
      const publicContent = renderPublicPage();
      if (publicContent) {
        return publicContent;
      }
    }

    const handleLogin = async (email: string, password: string) => {
      try {
        const success = await login(email, password);

        if (!success) {
          return false;
        }

        return true;
      } catch (error) {
        return false;
      }
    };

    if (authView === 'landing') {
      return (
        <LandingPage
          onLogin={handleLogin}
          onRegister={() => setAuthView('register')}
          onForgotPassword={() => setAuthView('reset')}
        />
      );
    }

    if (authView === 'register') {
      return <RegisterForm onBack={() => setAuthView('landing')} />;
    }

    if (authView === 'reset') {
      return <PasswordReset onBack={() => setAuthView('landing')} />;
    }

    return <LoginForm />;
  }

  if (isPublicPage) {
    const publicContent = renderPublicPage();
    if (publicContent) {
      return publicContent;
    }
  }

  const renderPublicPage = () => {
    if (currentPage.startsWith('blog-post/')) {
      const slug = currentPage.replace('blog-post/', '');
      return <BlogPostPage slug={slug} />;
    }

    switch (currentPage) {
      case 'sobre':
        return <SobrePage />;
      case 'recursos':
        return <RecursosPage />;
      case 'faq':
        return <FAQPage />;
      case 'contato':
        return <ContatoPage />;
      case 'demo':
        return <DemoPage />;
      case 'videos':
        return <VideosPage />;
      case 'blog':
        return <BlogListPage />;
      default:
        return null;
    }
  };

  const renderPage = () => {
    if (currentPage.startsWith('blog-admin-edit/')) {
      const postId = currentPage.replace('blog-admin-edit/', '');
      return <BlogAdminEdit postId={postId} />;
    }

    switch (currentPage) {
      case 'dashboard':
        if (user?.profile === 'admin' || user?.profile === 'gestor') {
          return <DadosGerais />;
        }
        return <Dashboard />;
      case 'dashboard-ao-vivo':
        return <DashboardAoVivo />;
      case 'blog-admin':
        return <BlogAdmin />;
      case 'empresa':
        return <Empresa />;
      case 'tipos-recepcao':
        return <TiposRecepcao />;
      case 'tipos-gestao':
        return <TiposGestao />;
      case 'tipos-atividades':
        return <TiposAtividades />;
      case 'servicos-camararia':
        return <ServicosCamararia />;
      case 'itens-camararia':
        return <ItensCamararia />;
      case 'fotos-camararia':
        return <FotosCamararia />;
      case 'usuarios':
        return <Usuarios />;
      case 'atividades-recepcao':
        return <AtividadesRecepcao />;
      case 'atividades-camararia':
        return <AtividadesCamararia />;
      case 'atividades-revisao':
        return <AtividadesRevisao />;
      case 'atividades-areas-comuns':
        return <AtividadesAreasComuns />;
      case 'atividades-gestao':
        return <AtividadesGestao />;
      case 'atividades-extras-config':
        return <AtividadesDiurnas />;
      case 'atividades-diarias-config':
        return <AtividadesNoturnas />;
      case 'atividades-extras':
        return <AtividadesExtras />;
      case 'atividades-diarias':
        return <AtividadesDiarias />;
      case 'suites':
        return <Suites />;
      case 'recepcao':
        return <Recepcao />;
      case 'camararia':
        return <Camararia />;
      case 'revisao':
        return <Revisao />;
      case 'areas-comuns':
        return <AreasComuns />;
      case 'gestao':
        return <Gestao />;
      case 'vendas':
        return <Vendas />;
      case 'tipos-funcoes-comerciais':
        return <TiposFuncoesComerciais />;
      case 'atividades-comerciais':
        return <AtividadesComerciais />;
      case 'manutencao':
        return <Manutencao />;
      case 'novo-registro-manutencao':
        return <NovoRegistroManutencao />;
      case 'manutencoes-pendentes':
        return <ManutencoesPendentes />;
      case 'historico-manutencao':
        return <HistoricoManutencao />;
      case 'relatorios':
        return <Relatorios />;
      case 'dashboard-relatorios':
        return <DashboardRelatorios />;
      case 'analise-operacional':
        return <AnaliseOperacional />;
      case 'analise-funcionario':
        return <AnaliseFuncionario />;
      case 'dados-gerais':
        return <DadosGerais />;
      case 'eficiencia-area':
        return <EficienciaArea />;
      case 'perfis':
        return <Perfis />;
      case 'acessos':
        return <Acessos />;
      case 'ver-acessos':
        return <VerAcessos />;
      case 'tipos-extras':
        return <TiposExtras />;
      case 'tipos-areas-comuns':
        return <TiposAreasComuns />;
      case 'tipos-cozinha':
        return <TiposCozinha />;
      case 'atividades-cozinha':
        return <AtividadesCozinha />;
      case 'fotos-cozinha':
        return <FotosCozinha />;
      case 'cozinha':
        return <Cozinha />;
      case 'recalcular-performance':
        return <RecalcularPerformance />;
      case 'monitoramento-performance':
        return <MonitoramentoPerformance />;
      case 'configuracao-metas':
        return <ConfiguracaoMetas />;
      case 'ranking-meritocracia':
        return <RankingPorMeritocracia />;
      case 'publicar-versao':
        return <PublicarVersao />;
      case 'enviar-mensagem':
        return <EnviarMensagem />;
      case 'configuracoes-lembretes':
        return <ConfiguracoesLembretes />;
      case 'configuracoes-som':
        return <ConfiguracoesSom />;
      case 'limpeza-historico':
        return <LimpezaHistorico />;
      case 'teste-notificacoes':
        return <TesteNotificacoesPush />;
      case 'gerenciar-tokens-push':
        return <GerenciarTokensPush />;
      case 'monitoramento-push':
        return <MonitoramentoPush />;
      case 'diagnostico-notificacoes':
        return <DiagnosticoNotificacoes />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <SidebarProvider>
      <div className="flex h-full bg-gray-100 relative overflow-x-hidden">
        <Sidebar
          currentPage={currentPage}
          onPageChange={navigateToPage}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 flex flex-col overflow-hidden overflow-x-hidden lg:ml-0">
          {/* Mobile Header */}
          <div className="lg:hidden fixed top-0 left-0 right-0 z-[60] bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center">
              <img
                src="/logo_performaxis_azul.png"
                alt="PERFORMAXIS Logo"
                className="h-7 w-auto object-contain"
              />
            </div>
            <PendingRecordsBadge userId={user?.id || null} />
          </div>

          <div className="flex-1 overflow-y-auto p-4 lg:p-6 pt-[60px] lg:pt-6">
            {renderPage()}
          </div>
        </main>

        <InstallPWAPrompt />

        <NotificationPermissionModal
          isOpen={showNotificationModal}
          onClose={handleDeclineNotifications}
          onAccept={handleAcceptNotifications}
          usuarioId={user?.id}
        />

        <BatteryOptimizationModal
          isOpen={showBatteryGuideModal}
          onClose={handleBatteryGuideClose}
          onConfirm={handleBatteryGuideConfirm}
          guide={getBatteryGuide(browserCapabilitiesService.detect().androidManufacturer)}
        />

        <InactivityAlertModal
          isOpen={markingInactivityChecker.showAlert}
          onReviewNow={handleReviewNow}
          onPostpone={handlePostponeAlert}
          minutesSinceLastMarking={markingInactivityChecker.minutesSinceLastMarking}
        />
      </div>
    </SidebarProvider>
  );
};

export default MainAppContent;
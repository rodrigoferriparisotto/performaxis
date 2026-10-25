import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SidebarProvider } from '../contexts/SidebarContext';
import { Menu } from 'lucide-react';
import LoginForm from './Auth/LoginForm';
import RegisterForm from './Auth/RegisterForm';
import PasswordReset from './Auth/PasswordReset';
import LandingPage from './LandingPage';
import BatteryOptimizationModal from './common/BatteryOptimizationModal';
import PendingRecordsBadge from './common/PendingRecordsBadge';
import { getBatteryGuide } from '../constants/batteryOptimizationGuides';
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
import { mapModuloToUrl } from '../utils/moduleUrlMapper';
import { LoadingState } from './ui/Estados';

// Se um deploy novo saiu com o app aberto, os pedaços antigos somem do
// servidor e o import falha. Nesse caso recarrega uma única vez para pegar
// a versão nova (a marca na sessão evita loop se o erro for de outra causa).
function lazyComRecarga<T extends React.ComponentType<any>>(carregar: () => Promise<{ default: T }>) {
  return lazy(() =>
    carregar()
      .then((m) => {
        sessionStorage.removeItem('performaxis_recarga_chunk');
        return m;
      })
      .catch((erro) => {
        if (!sessionStorage.getItem('performaxis_recarga_chunk')) {
          sessionStorage.setItem('performaxis_recarga_chunk', '1');
          window.location.reload();
          return new Promise<{ default: T }>(() => {});
        }
        throw erro;
      })
  );
}
// Telas carregadas sob demanda: cada uma vira um arquivo separado,
// baixado só quando é aberta (antes o app inteiro vinha num pacote de 2,5 MB).
const NotificationPermissionModal = lazyComRecarga(() => import('./common/NotificationPermissionModal'));
const SobrePage = lazyComRecarga(() => import('./Public/SobrePage'));
const RecursosPage = lazyComRecarga(() => import('./Public/RecursosPage'));
const FAQPage = lazyComRecarga(() => import('./Public/FAQPage'));
const ContatoPage = lazyComRecarga(() => import('./Public/ContatoPage'));
const DemoPage = lazyComRecarga(() => import('./Public/DemoPage'));
const VideosPage = lazyComRecarga(() => import('./Public/VideosPage'));
const BlogListPage = lazyComRecarga(() => import('./Public/BlogListPage'));
const BlogPostPage = lazyComRecarga(() => import('./Public/BlogPostPage'));
const BlogAdmin = lazyComRecarga(() => import('./Pages/BlogAdmin'));
const BlogAdminEdit = lazyComRecarga(() => import('./Pages/BlogAdminEdit'));
const Dashboard = lazyComRecarga(() => import('./Pages/Dashboard'));
const Empresa = lazyComRecarga(() => import('./Pages/Empresa'));
const Usuarios = lazyComRecarga(() => import('./Pages/Usuarios'));
const AtividadesRecepcao = lazyComRecarga(() => import('./Pages/AtividadesRecepcao'));
const AtividadesCamararia = lazyComRecarga(() => import('./Pages/AtividadesCamararia'));
const AtividadesRevisao = lazyComRecarga(() => import('./Pages/AtividadesRevisao'));
const AtividadesAreasComuns = lazyComRecarga(() => import('./Pages/AtividadesAreasComuns'));
const AtividadesGestao = lazyComRecarga(() => import('./Pages/AtividadesGestao'));
const AtividadesNoturnas = lazyComRecarga(() => import('./Pages/AtividadesNoturnas'));
const AtividadesDiurnas = lazyComRecarga(() => import('./Pages/AtividadesDiurnas'));
const TiposCozinha = lazyComRecarga(() => import('./Pages/TiposCozinha'));
const AtividadesCozinha = lazyComRecarga(() => import('./Pages/AtividadesCozinha'));
const Cozinha = lazyComRecarga(() => import('./Pages/Cozinha'));
const Suites = lazyComRecarga(() => import('./Pages/Suites'));
const AtividadesExtras = lazyComRecarga(() => import('./Pages/AtividadesExtras'));
const AtividadesDiarias = lazyComRecarga(() => import('./Pages/AtividadesDiarias'));
const Gestao = lazyComRecarga(() => import('./Pages/Gestao'));
const Recepcao = lazyComRecarga(() => import('./Pages/Recepcao'));
const Camararia = lazyComRecarga(() => import('./Pages/Camararia'));
const Revisao = lazyComRecarga(() => import('./Pages/Revisao'));
const AreasComuns = lazyComRecarga(() => import('./Pages/AreasComuns'));
const Manutencao = lazyComRecarga(() => import('./Pages/Manutencao'));
const Perfis = lazyComRecarga(() => import('./Pages/Perfis'));
const Acessos = lazyComRecarga(() => import('./Pages/Acessos'));
const VerAcessos = lazyComRecarga(() => import('./Pages/VerAcessos'));
const TiposRecepcao = lazyComRecarga(() => import('./Pages/TiposRecepcao'));
const ServicosCamararia = lazyComRecarga(() => import('./Pages/ServicosCamararia'));
const ItensCamararia = lazyComRecarga(() => import('./Pages/ItensCamararia'));
const FotosCamararia = lazyComRecarga(() => import('./Pages/FotosCamararia'));
const FotosCozinha = lazyComRecarga(() => import('./Pages/FotosCozinha'));
const TiposGestao = lazyComRecarga(() => import('./Pages/TiposGestao'));
const TiposAtividades = lazyComRecarga(() => import('./Pages/TiposAtividades'));
const DashboardRelatorios = lazyComRecarga(() => import('./Pages/DashboardRelatorios'));
const AnaliseOperacional = lazyComRecarga(() => import('./Pages/AnaliseOperacional'));
const AnaliseFuncionario = lazyComRecarga(() => import('./Pages/AnaliseFuncionario'));
const DadosGerais = lazyComRecarga(() => import('./Pages/DadosGerais'));
const EficienciaArea = lazyComRecarga(() => import('./Pages/EficienciaArea'));
const TempoRealEstimado = lazyComRecarga(() => import('./Pages/TempoRealEstimado'));
const TiposExtras = lazyComRecarga(() => import('./Pages/TiposExtras'));
const TiposAreasComuns = lazyComRecarga(() => import('./Pages/TiposAreasComuns'));
const Vendas = lazyComRecarga(() => import('./Pages/Vendas'));
const TiposFuncoesComerciais = lazyComRecarga(() => import('./Pages/TiposFuncoesComerciais'));
const AtividadesComerciais = lazyComRecarga(() => import('./Pages/AtividadesComerciais'));
const DashboardAoVivo = lazyComRecarga(() => import('./Pages/DashboardAoVivo'));
const RecalcularPerformance = lazyComRecarga(() => import('./Pages/RecalcularPerformance'));
const MonitoramentoPerformance = lazyComRecarga(() => import('./Pages/MonitoramentoPerformance'));
const ConfiguracaoMetas = lazyComRecarga(() => import('./Pages/ConfiguracaoMetas'));
const RankingPorMeritocracia = lazyComRecarga(() => import('./Pages/RankingPorMeritocracia'));
const PublicarVersao = lazyComRecarga(() => import('./Pages/PublicarVersao').then((m) => ({ default: m.PublicarVersao })));
const EnviarMensagem = lazyComRecarga(() => import('./Pages/EnviarMensagem').then((m) => ({ default: m.EnviarMensagem })));
const ConfiguracoesLembretes = lazyComRecarga(() => import('./Pages/ConfiguracoesLembretes'));
const ConfiguracoesSom = lazyComRecarga(() => import('./Pages/ConfiguracoesSom'));
const LimpezaHistorico = lazyComRecarga(() => import('./Pages/LimpezaHistorico'));
const TesteNotificacoesPush = lazyComRecarga(() => import('./Pages/TesteNotificacoesPush'));
const GerenciarTokensPush = lazyComRecarga(() => import('./Pages/GerenciarTokensPush'));
const MonitoramentoPush = lazyComRecarga(() => import('./Pages/MonitoramentoPush'));
const DiagnosticoNotificacoes = lazyComRecarga(() => import('./Pages/DiagnosticoNotificacoes').then((m) => ({ default: m.DiagnosticoNotificacoes })));

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

  // Pede para ativar os lembretes enquanto o aparelho não tiver permissão.
  // "Agora não" adia 3 dias (bloqueado no navegador: 7 dias, com o passo a passo).
  useEffect(() => {
    if (!user?.id || !user.empresaId || loading) return;
    const permissao = typeof Notification === 'undefined' ? 'indisponivel' : Notification.permission;
    if (permissao === 'granted') return;
    let adiadoAte = 0;
    try {
      adiadoAte = Number(localStorage.getItem('performaxis_lembretes_adiado_ate') || 0);
    } catch {
      // sem localStorage: pergunta normalmente
    }
    if (Date.now() < adiadoAte) return;
    const t = setTimeout(() => setShowNotificationModal(true), 2000);
    return () => clearTimeout(t);
  }, [user?.id, user?.empresaId, loading]);

  const adiarPedidoLembretes = () => {
    const bloqueado = typeof Notification !== 'undefined' && Notification.permission === 'denied';
    const dias = bloqueado ? 7 : 3;
    try {
      localStorage.setItem('performaxis_lembretes_adiado_ate', String(Date.now() + dias * 24 * 3600 * 1000));
    } catch {
      // sem localStorage: volta a perguntar no próximo acesso
    }
  };

  const handleAcceptNotifications = async () => {
    await reminderChecker.requestPermission();
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') adiarPedidoLembretes();
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
    adiarPedidoLembretes();
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

    // perfis reais de usuarios.profile → rota do módulo
    const paginaPorPerfil: Record<string, string> = {
      camararia: 'camararia',
      recepcao: 'recepcao',
      areas_comuns: 'areas-comuns',
      cozinha: 'cozinha',
      gestor: 'gestao',
      vendas: 'vendas',
      revisao: 'revisao',
      manutencao: 'manutencao',
      atividades_diarias: 'atividades-diarias',
      atividades_diurnas: 'atividades-diarias',
      atividades_noturnas: 'atividades-diarias',
      atividades_extras: 'atividades-extras',
    };
    return paginaPorPerfil[user.profile] || 'dashboard';
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
        return <Suspense fallback={<LoadingState />}>{publicContent}</Suspense>;
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
      return <Suspense fallback={<LoadingState />}>{publicContent}</Suspense>;
    }
  }

  // Declaração de função (hoisted): é usada acima deste ponto; como const,
  // abrir #sobre/#blog derrubava o app com ReferenceError.
  function renderPublicPage() {
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
        return <Manutencao key="m-novo" abaInicial="novo-registro" />;
      case 'manutencoes-pendentes':
        return <Manutencao key="m-pend" abaInicial="manutencoes" />;
      case 'historico-manutencao':
        return <Manutencao key="m-hist" abaInicial="historico" />;
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
      case 'tempo-real-estimado':
        return <TempoRealEstimado />;
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
            <Suspense fallback={<LoadingState />}>{renderPage()}</Suspense>
          </div>
        </main>

        {showNotificationModal && (
          <Suspense fallback={null}>
            <NotificationPermissionModal
              isOpen={showNotificationModal}
              onClose={handleDeclineNotifications}
              onAccept={handleAcceptNotifications}
              usuarioId={user?.id}
            />
          </Suspense>
        )}

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
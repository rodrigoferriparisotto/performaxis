import React, { useState, useEffect } from 'react';
import {
  Play,
  CheckCircle,
  Users,
  BarChart3,
  Target,
  Shield,
  Zap,
  Clock,
  TrendingUp,
  Award,
  Settings,
  Eye,
  EyeOff,
  MessageCircle,
  ArrowRight,
  Menu,
  X,
  AlertCircle,
  HelpCircle,
  ChevronDown
} from 'lucide-react';

interface LandingPageProps {
  onLogin: (email: string, password: string) => Promise<boolean>;
  onRegister: () => void;
  onForgotPassword: () => void;
}

export default function LandingPage({ onLogin, onRegister, onForgotPassword }: LandingPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const whatsappNumber = '5499955333';
  const whatsappMessage = encodeURIComponent('Estou no site do PERFORMAXIS e gostaria de maiores informações.');
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;
  const whatsappCTALink = `https://wa.me/${whatsappNumber}`;

  useEffect(() => {
    if (error) {
      setHasError(true);

      const errorTimer = setTimeout(() => {
        setError('');
        setHasError(false);
      }, 5000);

      return () => {
        clearTimeout(errorTimer);
      };
    }
  }, [error]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (hasError) {
      setError('');
      setHasError(false);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (hasError) {
      setError('');
      setHasError(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setHasError(false);

    try {
      const success = await onLogin(email, password);

      if (!success) {
        setError('Email ou senha incorretos. Verifique suas credenciais e tente novamente.');
        setHasError(true);
      }
    } catch (err) {
      console.error('LandingPage: Erro no login (catch):', err);
      setError('Erro ao fazer login. Tente novamente mais tarde.');
      setHasError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-900 via-blue-700 to-blue-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex flex-col items-start">
              <img
                src="/logo_performaxis.png"
                alt="PERFORMAXIS - Sistema de Gestão Inteligente para Hotéis, Pousadas, Hospitais e Salões de Beleza"
                className="h-10 md:h-12 w-auto object-contain mb-1"
              />
              <p className="text-xs text-blue-200">Gestão Inteligente, Resultados Reais</p>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden text-white p-2"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            <form onSubmit={handleSubmit} className="hidden lg:flex items-center space-x-3">
              <div className="relative">
                <input
                  type="email"
                  placeholder="E-mail"
                  value={email}
                  onChange={handleEmailChange}
                  className={`px-4 py-2 rounded-lg border-2 focus:outline-none focus:ring-2 transition-colors text-gray-900 ${
                    hasError
                      ? 'border-red-500 bg-red-50 focus:ring-red-500'
                      : 'border-blue-400 focus:ring-blue-300'
                  }`}
                  required
                />
                {hasError && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  </div>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Senha"
                  value={password}
                  onChange={handlePasswordChange}
                  className={`px-4 py-2 pr-20 rounded-lg border-2 focus:outline-none focus:ring-2 transition-colors text-gray-900 ${
                    hasError
                      ? 'border-red-500 bg-red-50 focus:ring-red-500'
                      : 'border-blue-400 focus:ring-blue-300'
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 hover:text-gray-800 transition-colors"
                  style={{ right: hasError ? '2rem' : '0' }}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
                {hasError && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-white text-blue-700 rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Entrando...' : 'Acessar'}
              </button>
              {/* <button
                type="button"
                onClick={onRegister}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-400 transition-colors shadow-md"
              >
                Registrar
              </button> */}
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-sm text-blue-200 hover:text-white transition-colors underline"
              >
                Esqueci minha senha
              </button>
            </form>
          </div>

          {mobileMenuOpen && (
            <div className="lg:hidden pb-4 border-t border-blue-500 mt-4 pt-4">
              <form onSubmit={handleSubmit} className="flex flex-col space-y-3">
                <div className="relative">
                  <input
                    type="email"
                    placeholder="E-mail"
                    value={email}
                    onChange={handleEmailChange}
                    className={`w-full px-4 py-2 rounded-lg border-2 focus:outline-none focus:ring-2 transition-colors text-gray-900 ${
                      hasError
                        ? 'border-red-500 bg-red-50 focus:ring-red-500'
                        : 'border-blue-400 focus:ring-blue-300'
                    }`}
                    required
                  />
                  {hasError && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    </div>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Senha"
                    value={password}
                    onChange={handlePasswordChange}
                    className={`w-full px-4 py-2 pr-20 rounded-lg border-2 focus:outline-none focus:ring-2 transition-colors text-gray-900 ${
                      hasError
                        ? 'border-red-500 bg-red-50 focus:ring-red-500'
                        : 'border-blue-400 focus:ring-blue-300'
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 hover:text-gray-800 transition-colors"
                    style={{ right: hasError ? '2rem' : '0' }}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                  {hasError && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    </div>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-white text-blue-700 rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Entrando...' : 'Acessar'}
                  </button>
                  {/* <button
                    type="button"
                    onClick={onRegister}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-400 transition-colors shadow-md"
                  >
                    Registrar
                  </button> */}
                </div>
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="text-sm text-blue-200 hover:text-white transition-colors underline"
                >
                  Esqueci minha senha
                </button>
              </form>
            </div>
          )}
        </div>
      </header>

      {error && (
        <div className="fixed top-20 left-0 right-0 z-40 px-4 py-3">
          <div className="max-w-7xl mx-auto">
            <div className="bg-red-50 border-2 border-red-400 text-red-800 px-4 py-4 rounded-lg flex items-start gap-3 shadow-lg animate-shake">
              <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5 text-red-600" />
              <div className="flex-1">
                <p className="font-bold text-base">Erro ao fazer login</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setHasError(false);
                }}
                className="flex-shrink-0 text-red-600 hover:text-red-800 transition-colors duration-200 hover:bg-red-100 rounded p-1"
                aria-label="Fechar alerta"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="pt-24">
        <section className="relative bg-gradient-to-br from-blue-900 via-blue-700 to-blue-600 text-white py-20 overflow-hidden">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="mb-8">
              <img
                src="/logo_performaxis.png"
                alt="PERFORMAXIS - Sistema Inteligente de Gestão Operacional para Pousadas, Hotéis, Hospitais e Salões de Beleza"
                className="h-24 md:h-32 lg:h-40 w-auto mx-auto object-contain"
                fetchpriority="high"
              />
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-white leading-tight">
              PERFORMAXIS Gestão de Equipes de Pousadas, Hotéis, Hospitais e Salões de Beleza
            </h1>
            <p className="text-xl md:text-2xl font-light mb-8 text-blue-100 max-w-5xl mx-auto leading-relaxed">
              Sistema inteligente de gestão operacional de pousadas, hotéis, hospitais e salões de beleza. Automatize processos, aumente produtividade e garanta excelência com menos recursos.
            </p>
            <p className="text-lg md:text-xl font-semibold text-blue-200">
              Gestão Inteligente, Resultados Reais.
            </p>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-gradient-to-br from-blue-50 to-white p-8 md:p-12 rounded-2xl shadow-xl">
              <div className="flex items-start space-x-4 mb-6">
                <div className="bg-blue-600 p-3 rounded-lg">
                  <Target className="text-white" size={32} />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-4">
                    Por Que Existe o PERFORMAXIS?
                  </h3>
                </div>
              </div>
              <p className="text-lg text-gray-700 leading-relaxed mb-4">
                O PERFORMAXIS nasceu para resolver um problema fundamental que foi negligenciado por anos no setor de hospedagem, saúde e beleza: <strong>pessoas não falham por falta de vontade, falham por falta de processos claros.</strong>
              </p>
              <p className="text-lg text-gray-700 leading-relaxed mb-4">
                Em ambientes complexos de pousadas, hotéis, hospitais e salões de beleza, o desempenho não depende apenas de talento ou boa intenção. Ele depende de rotinas bem desenhadas, padrões bem definidos e acompanhamento constante.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed">
                O PERFORMAXIS é um sistema inteligente que registra, executa e mensura cada tarefa de forma automatizada, para garantir excelência contínua, independentemente de quem esteja executando.
              </p>
            </div>
          </div>
        </section>

        <div className="bg-gradient-to-r from-blue-600 to-blue-700 py-8">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <p className="text-white text-xl md:text-2xl font-semibold mb-4">
              Transforme sua gestão operacional hoje mesmo
            </p>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 bg-white text-blue-700 px-8 py-4 rounded-full font-bold text-lg hover:bg-blue-50 transition-colors shadow-lg"
            >
              <MessageCircle size={24} />
              <span>Fale com um especialista: (54) 99995.5333</span>
            </a>
          </div>
        </div>

        <section className="py-16 bg-gradient-to-br from-white to-blue-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center bg-blue-600 p-4 rounded-full mb-6">
                <Play className="text-white" size={40} />
              </div>
              <h3 className="text-4xl font-bold text-gray-900 mb-4">
                A Lógica Central do Sistema
              </h3>
              <p className="text-xl text-gray-700 max-w-3xl mx-auto">
                O PERFORMAXIS transforma o trabalho diário em um fluxo guiado e mensurável.
              </p>
            </div>

            <div className="bg-white p-8 md:p-12 rounded-2xl shadow-xl mb-8">
              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                Quando o colaborador inicia seu turno, ele simplesmente dá play no sistema. A partir daí, todas as atividades que ele deve executar aparecem de forma organizada e lógica, passo a passo, para serem executadas e registradas.
              </p>

              <h4 className="text-2xl font-bold text-gray-900 mb-6">Como funciona:</h4>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex items-start space-x-4 p-4 bg-blue-50 rounded-lg">
                  <Eye className="text-blue-600 flex-shrink-0" size={28} />
                  <div>
                    <h5 className="font-bold text-lg text-gray-900 mb-2">Visualização</h5>
                    <p className="text-gray-700">O colaborador vê o que precisa ser feito.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-4 bg-blue-50 rounded-lg">
                  <Zap className="text-blue-600 flex-shrink-0" size={28} />
                  <div>
                    <h5 className="font-bold text-lg text-gray-900 mb-2">Execução</h5>
                    <p className="text-gray-700">Ele executa as atividades conforme o fluxo.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-4 bg-blue-50 rounded-lg">
                  <CheckCircle className="text-blue-600 flex-shrink-0" size={28} />
                  <div>
                    <h5 className="font-bold text-lg text-gray-900 mb-2">Conclusão</h5>
                    <p className="text-gray-700">Ao terminar, marca a atividade como concluída.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-4 bg-blue-50 rounded-lg">
                  <BarChart3 className="text-blue-600 flex-shrink-0" size={28} />
                  <div>
                    <h5 className="font-bold text-lg text-gray-900 mb-2">Registro</h5>
                    <p className="text-gray-700">Todo o progresso é registrado para análise de desempenho.</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 p-6 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl text-white text-center">
                <p className="text-xl font-semibold">
                  Nada é deixado para a memória. Nada é improvisado. Nada é esquecido.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="bg-gradient-to-r from-blue-700 to-blue-600 py-8">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <p className="text-white text-xl md:text-2xl font-semibold mb-4">
              Veja o sistema em ação com uma demonstração gratuita
            </p>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 bg-white text-blue-700 px-8 py-4 rounded-full font-bold text-lg hover:bg-blue-50 transition-colors shadow-lg"
            >
              <MessageCircle size={24} />
              <span>Agende sua demo: (54) 99995.5333</span>
            </a>
          </div>
        </div>

        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center bg-blue-600 p-4 rounded-full mb-6">
                <Settings className="text-white" size={40} />
              </div>
              <h3 className="text-4xl font-bold text-gray-900 mb-4">
                Estrutura por Departamentos
              </h3>
              <p className="text-xl text-gray-700 max-w-3xl mx-auto">
                O PERFORMAXIS organiza a operação de acordo com a estrutura dos departamentos essenciais de uma pousada, hotel, hospital ou salão de beleza.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {[
                'Recepção',
                'Atividades diurnas',
                'Atividades noturnas',
                'Camararia',
                'Revisão da camararia',
                'Atividades extras',
                'Vendas e Comercial',
                'Cozinha',
                'Gestão',
                'Manutenção',
                'Áreas comuns'
              ].map((dept, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-blue-100"
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-600 p-2 rounded-lg">
                      <CheckCircle className="text-white" size={20} />
                    </div>
                    <h4 className="font-bold text-gray-900">{dept}</h4>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-8 md:p-12 rounded-2xl shadow-xl text-white">
              <h4 className="text-2xl font-bold mb-6">Cada departamento possui:</h4>
              <ul className="space-y-3 text-lg">
                <li className="flex items-start space-x-3">
                  <ArrowRight className="flex-shrink-0 mt-1" size={20} />
                  <span>Sequência lógica de atividades</span>
                </li>
                <li className="flex items-start space-x-3">
                  <ArrowRight className="flex-shrink-0 mt-1" size={20} />
                  <span>Padrões claros de execução</span>
                </li>
                <li className="flex items-start space-x-3">
                  <ArrowRight className="flex-shrink-0 mt-1" size={20} />
                  <span>Critérios de qualidade</span>
                </li>
                <li className="flex items-start space-x-3">
                  <ArrowRight className="flex-shrink-0 mt-1" size={20} />
                  <span>Indicadores de performance</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <div className="bg-gradient-to-r from-blue-600 to-blue-700 py-8">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <p className="text-white text-xl md:text-2xl font-semibold mb-4">
              Quer conhecer como funciona na prática?
            </p>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 bg-white text-blue-700 px-8 py-4 rounded-full font-bold text-lg hover:bg-blue-50 transition-colors shadow-lg"
            >
              <MessageCircle size={24} />
              <span>Tire suas dúvidas: (54) 99995.5333</span>
            </a>
          </div>
        </div>

        <section className="py-16 bg-gradient-to-br from-white to-blue-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center bg-blue-600 p-4 rounded-full mb-6">
                <Shield className="text-white" size={40} />
              </div>
              <h3 className="text-4xl font-bold text-gray-900 mb-4">
                Gestão Visual e Padronização
              </h3>
              <p className="text-xl text-gray-700 max-w-3xl mx-auto">
                O grande diferencial do PERFORMAXIS é a gestão visual.
              </p>
            </div>

            <div className="bg-white p-8 md:p-12 rounded-2xl shadow-xl mb-8">
              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                O sistema não só indica o que fazer, mas também mostra como deve ser feito.
              </p>

              <h4 className="text-2xl font-bold text-gray-900 mb-6">Cada processo pode incluir:</h4>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-gray-700">✓ Fotos de padrões ideais de organização</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-gray-700">✓ Exemplos de ambientes corretos</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-gray-700">✓ Checklists visuais para montagem e conferência</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-gray-700">✓ Lista de itens e insumos necessários</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg md:col-span-2">
                  <p className="text-gray-700">✓ Orientações claras para evitar erros recorrentes</p>
                </div>
              </div>

              <h4 className="text-2xl font-bold text-gray-900 mb-6">Isso garante:</h4>

              <div className="space-y-3">
                {[
                  'Menos retrabalho',
                  'Menos desalinhamento entre turnos',
                  'Menos dependência de funcionários antigos',
                  'Menos perda de padrão ao trocar equipes'
                ].map((item, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg text-white">
                    <CheckCircle size={24} />
                    <span className="text-lg font-semibold">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="bg-gradient-to-r from-blue-700 to-blue-600 py-8">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <p className="text-white text-xl md:text-2xl font-semibold mb-4">
              Pronto para elevar o padrão da sua operação?
            </p>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 bg-white text-blue-700 px-8 py-4 rounded-full font-bold text-lg hover:bg-blue-50 transition-colors shadow-lg"
            >
              <MessageCircle size={24} />
              <span>Conheça o PERFORMAXIS: (54) 99995.5333</span>
            </a>
          </div>
        </div>

        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center bg-blue-600 p-4 rounded-full mb-6">
                <TrendingUp className="text-white" size={40} />
              </div>
              <h3 className="text-4xl font-bold text-gray-900 mb-4">
                Performance Medida na Prática
              </h3>
              <p className="text-xl text-gray-700 max-w-3xl mx-auto">
                O PERFORMAXIS não mede pessoas por achismo. Ele mede a execução real.
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-white p-8 md:p-12 rounded-2xl shadow-xl">
              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                Com o uso diário, a gestão passa a ter dados reais como:
              </p>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                {[
                  { icon: <BarChart3 size={24} />, text: 'Atividades realizadas vs. atividades previstas' },
                  { icon: <Clock size={24} />, text: 'Tempo médio de execução' },
                  { icon: <Target size={24} />, text: 'Frequência de falhas ou atrasos' },
                  { icon: <Users size={24} />, text: 'Consistência entre turnos' },
                  { icon: <Award size={24} />, text: 'Padrões mais respeitados ou negligenciados' }
                ].map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-4 p-4 bg-white rounded-lg shadow-md border border-blue-100"
                  >
                    <div className="bg-blue-600 p-2 rounded-lg text-white flex-shrink-0">
                      {item.icon}
                    </div>
                    <p className="text-gray-700">{item.text}</p>
                  </div>
                ))}
              </div>

              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-xl text-white text-center">
                <p className="text-xl font-semibold">
                  Com isso, a gestão é baseada em indicadores operacionais, não em opinião.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="bg-gradient-to-r from-blue-600 to-blue-700 py-8">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <p className="text-white text-xl md:text-2xl font-semibold mb-4">
              Descubra como aumentar a performance da sua equipe
            </p>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 bg-white text-blue-700 px-8 py-4 rounded-full font-bold text-lg hover:bg-blue-50 transition-colors shadow-lg"
            >
              <MessageCircle size={24} />
              <span>Solicite uma apresentação: (54) 99995.5333</span>
            </a>
          </div>
        </div>

        <section className="py-16 bg-gradient-to-br from-white to-blue-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center bg-blue-600 p-4 rounded-full mb-6">
                <Users className="text-white" size={40} />
              </div>
              <h3 className="text-4xl font-bold text-gray-900 mb-4">
                Uma Nova Abordagem de Gestão de Pessoas
              </h3>
              <p className="text-xl text-gray-700 max-w-3xl mx-auto">
                O PERFORMAXIS não é apenas um sistema operacional. Ele é uma nova forma de liderar.
              </p>
            </div>

            <div className="bg-white p-8 md:p-12 rounded-2xl shadow-xl mb-8">
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-white rounded-xl">
                  <div className="text-4xl font-bold text-blue-600 mb-2">O processo</div>
                  <div className="text-2xl font-semibold text-gray-900">educa</div>
                </div>
                <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-white rounded-xl">
                  <div className="text-4xl font-bold text-blue-600 mb-2">O padrão</div>
                  <div className="text-2xl font-semibold text-gray-900">orienta</div>
                </div>
                <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-white rounded-xl">
                  <div className="text-4xl font-bold text-blue-600 mb-2">O indicador</div>
                  <div className="text-2xl font-semibold text-gray-900">desenvolve</div>
                </div>
              </div>

              <p className="text-lg text-gray-700 leading-relaxed mb-6 text-center">
                Os gestores deixam de apagar incêndio e passam a gerir performance.
              </p>

              <h4 className="text-2xl font-bold text-gray-900 mb-6 text-center">Benefícios:</h4>

              <div className="space-y-4">
                {[
                  'O colaborador trabalha com mais segurança.',
                  'O gestor ganha mais previsibilidade.',
                  'A empresa ganha escala, qualidade e consistência.'
                ].map((benefit, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg text-white"
                  >
                    <CheckCircle size={28} className="flex-shrink-0" />
                    <span className="text-lg font-semibold">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="bg-gradient-to-r from-blue-700 to-blue-600 py-8">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <p className="text-white text-xl md:text-2xl font-semibold mb-4">
              Comece a transformação da sua gestão agora
            </p>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 bg-white text-blue-700 px-8 py-4 rounded-full font-bold text-lg hover:bg-blue-50 transition-colors shadow-lg"
            >
              <MessageCircle size={24} />
              <span>Entre em contato: (54) 99995.5333</span>
            </a>
          </div>
        </div>

        <section className="py-16 bg-gradient-to-b from-gray-900 to-gray-800 text-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h3 className="text-4xl md:text-5xl font-bold mb-6">
                A REALIDADE DO MERCADO
              </h3>
              <p className="text-2xl md:text-3xl font-light text-blue-300">
                Menos Pessoas. Mais Pressão.
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-900 to-blue-800 p-8 md:p-12 rounded-2xl shadow-2xl mb-8">
              <p className="text-lg leading-relaxed mb-6">
                O mercado mudou. A escassez de mão de obra qualificada deixou de ser exceção e virou regra.
              </p>
              <p className="text-lg leading-relaxed mb-6">
                Pousadas, hotéis, hospitais e salões de beleza operam hoje com:
              </p>
              <ul className="space-y-3 text-lg mb-6">
                <li className="flex items-start space-x-3">
                  <span className="text-blue-300">•</span>
                  <span>Equipes reduzidas</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-blue-300">•</span>
                  <span>Alta rotatividade</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-blue-300">•</span>
                  <span>Profissionais menos experientes</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-blue-300">•</span>
                  <span>Pressão constante por qualidade e padrão</span>
                </li>
              </ul>
              <div className="bg-white text-gray-900 p-6 rounded-xl text-center">
                <p className="text-xl font-bold">
                  Como manter a excelência com menos gente?
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div className="bg-gradient-to-br from-blue-800 to-blue-700 p-8 rounded-2xl shadow-xl">
                <h4 className="text-2xl font-bold mb-4">O PERFORMAXIS Foi Criado Para Esse Cenário</h4>
                <p className="text-lg leading-relaxed mb-4">
                  O PERFORMAXIS não depende de equipes grandes. Ele depende de processos claros.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start space-x-3">
                    <CheckCircle className="flex-shrink-0 mt-1" size={20} />
                    <span>O colaborador não precisa "saber tudo"</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <CheckCircle className="flex-shrink-0 mt-1" size={20} />
                    <span>Ele não depende da memória</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <CheckCircle className="flex-shrink-0 mt-1" size={20} />
                    <span>Ele não depende de alguém antigo para ensinar</span>
                  </li>
                </ul>
                <p className="text-xl font-bold mt-6 text-center">Ele segue o processo.</p>
              </div>

              <div className="bg-gradient-to-br from-blue-700 to-blue-600 p-8 rounded-2xl shadow-xl">
                <h4 className="text-2xl font-bold mb-4">Fazer Mais Com Menos, Sem Perder Padrão</h4>
                <p className="text-lg leading-relaxed mb-4">
                  Com o PERFORMAXIS, equipes menores conseguem entregar mais, porque:
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start space-x-3">
                    <ArrowRight className="flex-shrink-0 mt-1" size={20} />
                    <span>O trabalho é organizado em sequência lógica</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <ArrowRight className="flex-shrink-0 mt-1" size={20} />
                    <span>Não há retrabalho</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <ArrowRight className="flex-shrink-0 mt-1" size={20} />
                    <span>Não há tarefas esquecidas</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <ArrowRight className="flex-shrink-0 mt-1" size={20} />
                    <span>O tempo é melhor aproveitado</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <ArrowRight className="flex-shrink-0 mt-1" size={20} />
                    <span>O padrão se mantém, mesmo com menos pessoas</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-white text-gray-900 p-8 md:p-12 rounded-2xl shadow-2xl">
              <h4 className="text-3xl font-bold mb-6 text-center">Impacto Direto na Operação</h4>
              <p className="text-lg leading-relaxed mb-6 text-center">
                Empresas que operam com o PERFORMAXIS percebem rapidamente:
              </p>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  'Aumento de produtividade por colaborador',
                  'Redução da necessidade de reforço de equipe',
                  'Menor impacto da rotatividade',
                  'Menos gargalos operacionais',
                  'Mais previsibilidade no dia a dia',
                  'Sustentação de crescimento sem inflar a equipe'
                ].map((impact, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200"
                  >
                    <CheckCircle className="text-blue-600 flex-shrink-0 mt-1" size={20} />
                    <span className="text-gray-800">{impact}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="bg-gradient-to-r from-blue-600 to-blue-700 py-8">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <p className="text-white text-xl md:text-2xl font-semibold mb-4">
              Fale agora mesmo com nossa equipe pelo WhatsApp
            </p>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 bg-white text-blue-700 px-8 py-4 rounded-full font-bold text-lg hover:bg-blue-50 transition-colors shadow-lg"
            >
              <MessageCircle size={24} />
              <span>(54) 99995.5333</span>
            </a>
          </div>
        </div>

        <section className="py-20 bg-gradient-to-br from-blue-900 via-blue-700 to-blue-600 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center justify-center bg-white bg-opacity-20 p-6 rounded-2xl backdrop-blur-sm mb-8 animate-pulse">
              <BarChart3 className="text-white" size={64} />
            </div>
            <h3 className="text-4xl md:text-5xl font-bold mb-8">
              O Futuro da Gestão
            </h3>
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-xl md:text-2xl lg:text-3xl font-light mb-12">
              <p className="text-blue-100">Menos gente.</p>
              <span className="text-blue-300 text-2xl md:text-3xl">•</span>
              <p className="text-blue-100">Mais clareza.</p>
              <span className="text-blue-300 text-2xl md:text-3xl">•</span>
              <p className="text-blue-100">Mais performance.</p>
            </div>
            <div className="bg-white bg-opacity-10 backdrop-blur-sm p-8 rounded-2xl mb-12">
              <p className="text-xl leading-relaxed mb-4">
                O PERFORMAXIS é a nova geração de gestão de pessoas, com base em processos claros, execução guiada e indicadores reais de desempenho.
              </p>
              <div className="space-y-3 text-lg">
                <p>Não é controle. <span className="font-bold">É clareza.</span></p>
                <p>Não é vigilância. <span className="font-bold">É padrão.</span></p>
                <p>Não é cobrança. <span className="font-bold">É método.</span></p>
              </div>
            </div>
            <h4 className="text-3xl font-bold mb-6">
              Entre Para a Nova Era da Gestão de Pessoas
            </h4>
            <p className="text-xl mb-8">
              A gestão do futuro começa agora. O PERFORMAXIS vai transformar a forma como sua equipe executa processos, garante padrões de qualidade e gerencia o desempenho.
            </p>
            <div className="space-y-4">
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-white text-blue-700 px-10 py-4 rounded-full font-bold text-xl hover:bg-blue-50 transition-colors shadow-2xl"
              >
                Solicite uma Demonstração Grátis
              </a>
              <p className="text-lg">ou</p>
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-3 bg-green-500 text-white px-10 py-4 rounded-full font-bold text-xl hover:bg-green-600 transition-colors shadow-2xl"
              >
                <MessageCircle size={28} />
                <span>Entre em Contato: (54) 99995.5333</span>
              </a>
            </div>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center bg-blue-600 p-4 rounded-full mb-6">
                <HelpCircle className="text-white" size={40} />
              </div>
              <h3 className="text-4xl font-bold text-gray-900 mb-4">
                Perguntas Frequentes
              </h3>
              <p className="text-xl text-gray-700 max-w-2xl mx-auto">
                Tire suas dúvidas sobre o PERFORMAXIS
              </p>
            </div>

            <div className="space-y-4">
              {[
                {
                  question: "O que é o PERFORMAXIS?",
                  answer: "O PERFORMAXIS é um sistema inteligente de gestão operacional desenvolvido especificamente para pousadas, hotéis, hospitais e salões de beleza. Ele automatiza processos, otimiza a produtividade das equipes e garante excelência no atendimento através de dashboards em tempo real, controle de tarefas e sistema de meritocracia."
                },
                {
                  question: "Como o PERFORMAXIS ajuda hotéis e pousadas?",
                  answer: "O sistema oferece controle completo de camararia e housekeeping, gestão de recepção, gerenciamento de manutenções, controle de áreas comuns, dashboard em tempo real com métricas de performance, ranking por meritocracia, relatórios detalhados e muito mais. Tudo isso resulta em aumento de produtividade, redução de custos e melhoria na qualidade do serviço."
                },
                {
                  question: "Quais tipos de estabelecimentos podem usar o PERFORMAXIS?",
                  answer: "O PERFORMAXIS foi desenvolvido para atender pousadas, hotéis, hospitais e salões de beleza. O sistema é flexível e pode ser adaptado para diferentes portes e tipos de operação, desde pequenas pousadas até grandes redes hoteleiras."
                },
                {
                  question: "O sistema funciona em tempo real?",
                  answer: "Sim! O PERFORMAXIS oferece dashboards em tempo real que permitem acompanhar todas as operações instantaneamente. Você pode visualizar o status de quartos, tarefas da equipe, manutenções pendentes e métricas de performance de qualquer dispositivo conectado à internet."
                },
                {
                  question: "Como funciona a implementação do sistema?",
                  answer: "A implementação do PERFORMAXIS é simples e rápida. Entre em contato pelo WhatsApp (54) 99995-5333 para agendar uma demonstração gratuita. Nossa equipe apresentará o sistema, configurará de acordo com suas necessidades e oferecerá treinamento completo para sua equipe."
                },
                {
                  question: "O PERFORMAXIS possui aplicativo mobile?",
                  answer: "Sim, o PERFORMAXIS é uma aplicação web responsiva que funciona perfeitamente em computadores, tablets e smartphones. Sua equipe pode acessar o sistema de qualquer dispositivo com internet, sem necessidade de instalar aplicativos adicionais."
                }
              ].map((faq, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-br from-blue-50 to-white rounded-xl shadow-md overflow-hidden border border-blue-100 hover:shadow-lg transition-shadow"
                >
                  <button
                    onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-blue-50 transition-colors"
                  >
                    <h4 className="text-lg font-bold text-gray-900 pr-4">{faq.question}</h4>
                    <ChevronDown
                      className={`flex-shrink-0 text-blue-600 transition-transform ${
                        openFaqIndex === index ? 'transform rotate-180' : ''
                      }`}
                      size={24}
                    />
                  </button>
                  {openFaqIndex === index && (
                    <div className="px-6 pb-5 pt-2">
                      <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <p className="text-lg text-gray-700 mb-4">
                Ainda tem dúvidas? Fale conosco pelo WhatsApp!
              </p>
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 bg-green-500 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-green-600 transition-colors shadow-lg"
              >
                <MessageCircle size={24} />
                <span>Tire suas dúvidas: (54) 99995.5333</span>
              </a>
            </div>
          </div>
        </section>

        <footer className="bg-gray-900 text-white py-8">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <div className="inline-flex items-center justify-center bg-blue-600 bg-opacity-20 p-3 rounded-xl backdrop-blur-sm mb-4">
              <BarChart3 className="text-blue-400" size={48} />
            </div>
            <p className="text-gray-400">© {new Date().getFullYear()} PERFORMAXIS. Todos os direitos reservados.</p>
            <p className="text-gray-400 mt-2">Gestão Inteligente, Resultados Reais.</p>
          </div>
        </footer>
      </main>

      <a
        href={whatsappLink}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-2xl transition-all hover:scale-110 z-50 flex items-center justify-center"
        aria-label="Contato WhatsApp"
      >
        <MessageCircle className="w-8 h-8" />
      </a>
    </div>
  );
}

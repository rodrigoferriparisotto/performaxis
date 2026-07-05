import React from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';

interface PublicLayoutProps {
  children: React.ReactNode;
}

const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navigation = [
    { name: 'Início', href: '/' },
    { name: 'Sobre', href: '#sobre' },
    { name: 'Recursos', href: '#recursos' },
    { name: 'FAQ', href: '#faq' },
    { name: 'Blog', href: '#blog' },
    { name: 'Contato', href: '#contato' },
  ];

  const handleNavClick = (href: string) => {
    if (href === '/') {
      window.location.hash = '';
      window.location.reload();
    } else {
      window.location.hash = href.replace('#', '');
    }
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-50">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <img
                src="/logo_performaxis_azul.png"
                alt="PERFORMAXIS"
                className="h-8 w-auto"
              />
            </div>

            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {navigation.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => handleNavClick(item.href)}
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors"
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="hidden md:block">
              <button
                onClick={() => window.location.hash = ''}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Login
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-700 hover:text-gray-900 p-2"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200">
              <div className="px-2 pt-2 pb-3 space-y-1">
                {navigation.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => handleNavClick(item.href)}
                    className="text-gray-700 hover:text-blue-600 hover:bg-gray-50 block px-3 py-2 rounded-md text-base font-medium w-full text-left"
                  >
                    {item.name}
                  </button>
                ))}
                <button
                  onClick={() => {
                    window.location.hash = '';
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left bg-blue-600 text-white px-3 py-2 rounded-md text-base font-medium hover:bg-blue-700 transition-colors"
                >
                  Login
                </button>
              </div>
            </div>
          )}
        </nav>
      </header>

      <main className="pt-16">
        {children}
      </main>

      <footer className="bg-gray-900 text-gray-300">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <img
                src="/logo_performaxis.png"
                alt="PERFORMAXIS"
                className="h-8 w-auto mb-4"
              />
              <p className="text-sm text-gray-400 max-w-md">
                Sistema completo de gestão operacional para hotéis e pousadas.
                Controle total da performance da sua equipe em tempo real.
              </p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Links Rápidos</h3>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => handleNavClick('#sobre')}
                    className="text-sm hover:text-white transition-colors"
                  >
                    Sobre
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleNavClick('#recursos')}
                    className="text-sm hover:text-white transition-colors"
                  >
                    Recursos
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleNavClick('#faq')}
                    className="text-sm hover:text-white transition-colors"
                  >
                    FAQ
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleNavClick('#blog')}
                    className="text-sm hover:text-white transition-colors"
                  >
                    Blog
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Contato</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <button
                    onClick={() => handleNavClick('#contato')}
                    className="hover:text-white transition-colors"
                  >
                    Fale Conosco
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleNavClick('#demo')}
                    className="hover:text-white transition-colors"
                  >
                    Solicitar Demonstração
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-sm text-center text-gray-400">
            <p>© {new Date().getFullYear()} PERFORMAXIS. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;

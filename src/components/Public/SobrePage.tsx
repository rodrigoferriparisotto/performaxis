import React from 'react';
import PublicLayout from './PublicLayout';
import { Target, Users, TrendingUp, Shield } from 'lucide-react';

const SobrePage: React.FC = () => {
  return (
    <PublicLayout>
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Sobre o PERFORMAXIS
          </h1>
          <p className="text-xl text-blue-100 max-w-3xl">
            Transformando a gestão operacional hoteleira através de tecnologia e dados
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Nossa História
            </h2>
            <div className="space-y-4 text-gray-600">
              <p>
                O PERFORMAXIS nasceu da necessidade real de hotéis e pousadas terem
                um controle preciso sobre suas operações diárias. Percebemos que a
                gestão manual de tarefas e a falta de dados em tempo real impediam
                os gestores de tomar decisões estratégicas.
              </p>
              <p>
                Desenvolvemos uma plataforma completa que digitaliza e automatiza
                o controle operacional, oferecendo visibilidade total sobre a
                performance de cada setor e colaborador.
              </p>
              <p>
                Hoje, ajudamos dezenas de estabelecimentos a otimizar suas operações,
                reduzir custos e aumentar a satisfação dos hóspedes através de uma
                gestão mais eficiente e baseada em dados.
              </p>
            </div>
          </div>
          <div className="bg-blue-50 rounded-2xl p-8">
            <img
              src="/logo_oficial_performaxis.png"
              alt="PERFORMAXIS"
              className="w-full h-auto"
            />
          </div>
        </div>

        <div className="mb-20">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            Nossos Valores
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-600 rounded-full mb-4">
                <Target className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Foco no Cliente
              </h3>
              <p className="text-gray-600">
                Desenvolvemos soluções pensando nas necessidades reais dos gestores hoteleiros
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-600 rounded-full mb-4">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Trabalho em Equipe
              </h3>
              <p className="text-gray-600">
                Acreditamos na colaboração e no poder de equipes bem coordenadas
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-600 rounded-full mb-4">
                <TrendingUp className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Melhoria Contínua
              </h3>
              <p className="text-gray-600">
                Evoluímos constantemente nossa plataforma com base em feedback real
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-600 rounded-full mb-4">
                <Shield className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Confiabilidade
              </h3>
              <p className="text-gray-600">
                Garantimos segurança de dados e estabilidade do sistema 24/7
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">
            Pronto para Transformar sua Gestão?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Junte-se aos hotéis e pousadas que já confiam no PERFORMAXIS
          </p>
          <button
            onClick={() => window.location.hash = 'demo'}
            className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-3 rounded-lg hover:bg-blue-50 transition-colors text-lg font-semibold"
          >
            Solicitar Demonstração
          </button>
        </div>
      </div>
    </PublicLayout>
  );
};

export default SobrePage;

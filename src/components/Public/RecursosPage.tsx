import React from 'react';
import PublicLayout from './PublicLayout';
import {
  BarChart3,
  Users,
  ClipboardCheck,
  Utensils,
  DoorOpen,
  Wrench,
  Trophy,
  Clock,
  Bell,
  FileText,
  Shield,
  Smartphone,
} from 'lucide-react';

const RecursosPage: React.FC = () => {
  const recursos = [
    {
      icon: BarChart3,
      title: 'Dashboard em Tempo Real',
      description: 'Acompanhe a performance de todos os setores em tempo real com gráficos e indicadores dinâmicos.',
      color: 'blue',
    },
    {
      icon: Users,
      title: 'Gestão de Equipes',
      description: 'Controle completo de colaboradores, perfis de acesso e permissões por setor.',
      color: 'green',
    },
    {
      icon: ClipboardCheck,
      title: 'Registro de Atividades',
      description: 'Registre e monitore todas as atividades operacionais de cada departamento.',
      color: 'purple',
    },
    {
      icon: DoorOpen,
      title: 'Controle de Camararia',
      description: 'Gerencie limpeza de suítes, revisões, itens e fotos de qualidade.',
      color: 'orange',
    },
    {
      icon: Utensils,
      title: 'Gestão de Cozinha',
      description: 'Controle de atividades culinárias, tipos de serviço e qualidade dos pratos.',
      color: 'red',
    },
    {
      icon: Wrench,
      title: 'Manutenções',
      description: 'Sistema completo de solicitação, acompanhamento e histórico de manutenções.',
      color: 'yellow',
    },
    {
      icon: Trophy,
      title: 'Sistema de Meritocracia',
      description: 'Ranking automático baseado em performance, produtividade e qualidade.',
      color: 'cyan',
    },
    {
      icon: Clock,
      title: 'Histórico Completo',
      description: 'Acesse todo o histórico de atividades, registros e performance de qualquer período.',
      color: 'indigo',
    },
    {
      icon: Bell,
      title: 'Notificações em Tempo Real',
      description: 'Receba alertas instantâneos sobre eventos importantes e pendências.',
      color: 'pink',
    },
    {
      icon: FileText,
      title: 'Relatórios Avançados',
      description: 'Gere relatórios detalhados em PDF com análises operacionais e de performance.',
      color: 'teal',
    },
    {
      icon: Shield,
      title: 'Segurança de Dados',
      description: 'Seus dados protegidos com criptografia e backups automáticos diários.',
      color: 'gray',
    },
    {
      icon: Smartphone,
      title: 'Acesso Mobile',
      description: 'Interface responsiva que funciona perfeitamente em smartphones e tablets.',
      color: 'blue',
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
      green: { bg: 'bg-green-100', text: 'text-green-600' },
      purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
      orange: { bg: 'bg-orange-100', text: 'text-orange-600' },
      red: { bg: 'bg-red-100', text: 'text-red-600' },
      yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600' },
      cyan: { bg: 'bg-cyan-100', text: 'text-cyan-600' },
      indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600' },
      pink: { bg: 'bg-pink-100', text: 'text-pink-600' },
      teal: { bg: 'bg-teal-100', text: 'text-teal-600' },
      gray: { bg: 'bg-gray-100', text: 'text-gray-600' },
    };
    return colors[color] || colors.blue;
  };

  return (
    <PublicLayout>
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Recursos do Sistema
          </h1>
          <p className="text-xl text-blue-100 max-w-3xl">
            Uma plataforma completa com tudo que você precisa para gestão operacional hoteleira
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {recursos.map((recurso, index) => {
            const Icon = recurso.icon;
            const colors = getColorClasses(recurso.color);
            return (
              <div
                key={index}
                className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow"
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 ${colors.bg} ${colors.text} rounded-lg mb-4`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {recurso.title}
                </h3>
                <p className="text-gray-600">
                  {recurso.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="bg-gray-50 rounded-2xl p-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Módulos por Setor
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <DoorOpen className="w-6 h-6 text-blue-600" />
                Recepção
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Check-in e check-out</li>
                <li>• Atendimento ao hóspede</li>
                <li>• Registro de solicitações</li>
                <li>• Controle de reservas</li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <ClipboardCheck className="w-6 h-6 text-green-600" />
                Camararia
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Limpeza de suítes</li>
                <li>• Controle de enxoval</li>
                <li>• Revisão de qualidade</li>
                <li>• Fotos antes/depois</li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Utensils className="w-6 h-6 text-red-600" />
                Cozinha
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Controle de preparações</li>
                <li>• Registro de serviços</li>
                <li>• Gestão de qualidade</li>
                <li>• Fotos dos pratos</li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Wrench className="w-6 h-6 text-yellow-600" />
                Manutenção
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Solicitações de serviço</li>
                <li>• Controle de pendências</li>
                <li>• Histórico de manutenções</li>
                <li>• Priorização de tarefas</li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-6 h-6 text-purple-600" />
                Áreas Comuns
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Limpeza de espaços</li>
                <li>• Manutenção de jardins</li>
                <li>• Controle de piscinas</li>
                <li>• Organização geral</li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-orange-600" />
                Gestão
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Análise de performance</li>
                <li>• Relatórios gerenciais</li>
                <li>• Controle de metas</li>
                <li>• Dashboard executivo</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">
            Veja o Sistema em Ação
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Agende uma demonstração e descubra como podemos transformar sua gestão
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

export default RecursosPage;

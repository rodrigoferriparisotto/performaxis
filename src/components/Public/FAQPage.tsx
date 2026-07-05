import React, { useState } from 'react';
import PublicLayout from './PublicLayout';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

const FAQPage: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      category: 'Geral',
      questions: [
        {
          question: 'O que é o PERFORMAXIS?',
          answer: 'O PERFORMAXIS é um sistema completo de gestão operacional para hotéis e pousadas. Ele permite controlar todas as atividades diárias dos setores (recepção, camararia, cozinha, manutenção, etc.), monitorar performance em tempo real e gerar relatórios detalhados.',
        },
        {
          question: 'Quem pode usar o sistema?',
          answer: 'O sistema é ideal para hotéis, pousadas, resorts e estabelecimentos de hospedagem de todos os tamanhos. Desde pequenas pousadas até grandes redes hoteleiras podem se beneficiar da plataforma.',
        },
        {
          question: 'O sistema funciona em dispositivos móveis?',
          answer: 'Sim! O PERFORMAXIS possui interface responsiva que funciona perfeitamente em smartphones, tablets e computadores. Seus colaboradores podem registrar atividades de qualquer dispositivo.',
        },
      ],
    },
    {
      category: 'Funcionalidades',
      questions: [
        {
          question: 'Quais setores o sistema gerencia?',
          answer: 'O sistema gerencia Recepção, Camararia, Cozinha, Manutenção, Áreas Comuns, Gestão e Vendas. Cada setor possui módulos específicos com funcionalidades personalizadas.',
        },
        {
          question: 'Como funciona o sistema de ranking?',
          answer: 'O sistema calcula automaticamente a performance de cada colaborador baseado em produtividade, qualidade e pontualidade. Isso gera um ranking por meritocracia que pode ser usado para bonificações e avaliações.',
        },
        {
          question: 'Posso gerar relatórios personalizados?',
          answer: 'Sim! O sistema oferece diversos tipos de relatórios que podem ser filtrados por período, setor, colaborador e outras variáveis. Todos os relatórios podem ser exportados em PDF.',
        },
        {
          question: 'O sistema permite upload de fotos?',
          answer: 'Sim! Você pode fazer upload de fotos de suítes (antes e depois da limpeza), pratos da cozinha, áreas comuns e manutenções. Isso ajuda no controle de qualidade.',
        },
      ],
    },
    {
      category: 'Técnico',
      questions: [
        {
          question: 'Os dados são seguros?',
          answer: 'Absolutamente! Todos os dados são armazenados com criptografia em servidores seguros. Fazemos backups automáticos diários e seguimos as melhores práticas de segurança da informação.',
        },
        {
          question: 'Preciso instalar algum software?',
          answer: 'Não! O PERFORMAXIS é um sistema web (cloud), então você acessa direto pelo navegador. Não precisa instalar nada e pode acessar de qualquer lugar com internet.',
        },
        {
          question: 'E se eu perder a internet?',
          answer: 'O sistema funciona online, então é necessário conexão com internet. Porém, os dados são salvos instantaneamente, então você não perde informações mesmo que a conexão caia momentaneamente.',
        },
        {
          question: 'Há limite de usuários?',
          answer: 'Não! Você pode cadastrar quantos colaboradores precisar, sem limite de usuários. Cada plano permite múltiplos perfis de acesso.',
        },
      ],
    },
    {
      category: 'Comercial',
      questions: [
        {
          question: 'Como funciona a contratação?',
          answer: 'Entre em contato conosco através do formulário de demonstração ou contato. Nossa equipe apresentará o sistema, explicará os planos disponíveis e ajudará na implementação.',
        },
        {
          question: 'Existe período de teste?',
          answer: 'Sim! Oferecemos demonstração completa do sistema e período de teste para que você conheça todas as funcionalidades antes de contratar.',
        },
        {
          question: 'Há suporte técnico?',
          answer: 'Sim! Oferecemos suporte técnico completo por WhatsApp, e-mail e telefone. Nossa equipe está pronta para ajudar com qualquer dúvida ou problema.',
        },
        {
          question: 'Vocês oferecem treinamento?',
          answer: 'Sim! Fazemos treinamento completo para todos os usuários, explicando cada funcionalidade do sistema. O treinamento pode ser presencial ou online.',
        },
      ],
    },
    {
      category: 'Implantação',
      questions: [
        {
          question: 'Quanto tempo leva para começar a usar?',
          answer: 'A implantação é rápida! Em até 48 horas após a contratação, seu sistema está configurado e pronto para uso. Incluímos cadastro inicial e treinamento da equipe.',
        },
        {
          question: 'Preciso migrar dados de outro sistema?',
          answer: 'Se você já usa outro sistema, podemos ajudar na migração de dados. Nossa equipe analisa seu caso e faz a importação das informações necessárias.',
        },
        {
          question: 'O sistema é personalizável?',
          answer: 'Sim! Podemos adaptar certos aspectos do sistema às necessidades específicas do seu estabelecimento. Entre em contato para discutir suas necessidades.',
        },
      ],
    },
  ];

  const toggleQuestion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  let questionIndex = 0;

  return (
    <PublicLayout>
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-6">
            <HelpCircle className="w-12 h-12" />
            <h1 className="text-4xl md:text-5xl font-bold">
              Perguntas Frequentes
            </h1>
          </div>
          <p className="text-xl text-blue-100 max-w-3xl">
            Encontre respostas para as dúvidas mais comuns sobre o PERFORMAXIS
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
        {faqs.map((category, categoryIndex) => (
          <div key={categoryIndex} className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b-2 border-blue-600">
              {category.category}
            </h2>
            <div className="space-y-4">
              {category.questions.map((faq) => {
                const currentIndex = questionIndex++;
                const isOpen = openIndex === currentIndex;
                return (
                  <div
                    key={currentIndex}
                    className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <button
                      onClick={() => toggleQuestion(currentIndex)}
                      className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-semibold text-gray-900 pr-4">
                        {faq.question}
                      </span>
                      {isOpen ? (
                        <ChevronUp className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-4 text-gray-600">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="mt-16 bg-blue-50 rounded-2xl p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Não encontrou sua resposta?
          </h3>
          <p className="text-gray-600 mb-6">
            Entre em contato conosco e teremos prazer em ajudar
          </p>
          <button
            onClick={() => window.location.hash = 'contato'}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Fale Conosco
          </button>
        </div>
      </div>
    </PublicLayout>
  );
};

export default FAQPage;

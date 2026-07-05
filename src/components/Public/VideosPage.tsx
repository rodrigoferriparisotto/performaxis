import React, { useState } from 'react';
import PublicLayout from './PublicLayout';
import { Video, Bell, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const VideosPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: submitError } = await supabase
        .from('newsletter_inscritos')
        .insert([{ email, nome }]);

      if (submitError) {
        if (submitError.code === '23505') {
          setError('Este e-mail já está cadastrado.');
        } else {
          throw submitError;
        }
      } else {
        setSuccess(true);
        setEmail('');
        setNome('');
        setTimeout(() => setSuccess(false), 5000);
      }
    } catch (err) {
      console.error('Erro ao cadastrar newsletter:', err);
      setError('Erro ao cadastrar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-6">
            <Video className="w-12 h-12" />
            <h1 className="text-4xl md:text-5xl font-bold">
              Tutoriais em Vídeo
            </h1>
          </div>
          <p className="text-xl text-blue-100 max-w-3xl">
            Aprenda a usar o PERFORMAXIS com nossos vídeos tutoriais
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-blue-100 text-blue-600 rounded-full mb-6">
            <Video className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Em Breve!
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Estamos preparando uma biblioteca completa de vídeos tutoriais para
            ajudá-lo a aproveitar ao máximo o PERFORMAXIS.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-lg mb-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            O que você encontrará em breve:
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">
                  Guia de Início Rápido
                </h4>
                <p className="text-gray-600 text-sm">
                  Aprenda o básico em minutos
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">
                  Cadastros Básicos
                </h4>
                <p className="text-gray-600 text-sm">
                  Como cadastrar usuários e setores
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">
                  Registro de Atividades
                </h4>
                <p className="text-gray-600 text-sm">
                  Registre atividades de cada setor
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">
                  Dashboard e Relatórios
                </h4>
                <p className="text-gray-600 text-sm">
                  Interprete dados e gere relatórios
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">
                  Sistema de Performance
                </h4>
                <p className="text-gray-600 text-sm">
                  Entenda o ranking e meritocracia
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">
                  Dicas Avançadas
                </h4>
                <p className="text-gray-600 text-sm">
                  Truques para otimizar seu uso
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-8 text-white">
          <div className="text-center mb-8">
            <Bell className="w-12 h-12 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">
              Seja Avisado Quando os Vídeos Ficarem Prontos
            </h3>
            <p className="text-blue-100">
              Cadastre seu e-mail e receba uma notificação assim que os tutoriais
              estiverem disponíveis
            </p>
          </div>

          {success ? (
            <div className="text-center py-6">
              <CheckCircle className="w-16 h-16 mx-auto mb-4" />
              <p className="text-xl font-semibold">
                Cadastro realizado com sucesso!
              </p>
              <p className="text-blue-100 mt-2">
                Você será notificado quando os vídeos estiverem disponíveis.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-4">
              <div>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome (opcional)"
                  className="w-full px-4 py-3 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-300 focus:outline-none"
                />
              </div>
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Seu melhor e-mail"
                  className="w-full px-4 py-3 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-300 focus:outline-none"
                />
              </div>
              {error && (
                <div className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-blue-600 px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Cadastrando...' : 'Quero ser Avisado'}
              </button>
            </form>
          )}
        </div>
      </div>
    </PublicLayout>
  );
};

export default VideosPage;

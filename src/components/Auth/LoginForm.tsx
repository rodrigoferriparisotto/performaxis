import React, { useState, useEffect } from 'react';
import { LogIn, Eye, EyeOff, UserPlus, AlertCircle, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import PasswordReset from './PasswordReset';
import RegisterForm from './RegisterForm';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [shake, setShake] = useState(false);

  const { login } = useAuth();

  useEffect(() => {
    if (error) {
      setHasError(true);
      setShake(true);

      const shakeTimer = setTimeout(() => setShake(false), 500);
      const errorTimer = setTimeout(() => {
        setError('');
        setHasError(false);
      }, 5000);

      return () => {
        clearTimeout(shakeTimer);
        clearTimeout(errorTimer);
      };
    }
  }, [error]);

  // Limpar erro quando o usuário começar a digitar após um erro
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

  if (showPasswordReset) {
    return <PasswordReset onBack={() => setShowPasswordReset(false)} />;
  }

  if (showRegister) {
    return <RegisterForm onBack={() => setShowRegister(false)} />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setHasError(false);

    try {
      const success = await login(email, password);

      if (!success) {
        const errorMessage = 'Email ou senha incorretos. Verifique suas credenciais e tente novamente.';
        setError(errorMessage);
        setHasError(true);
      }
    } catch (err) {
      console.error('Erro no login (catch):', err);
      const errorMessage = 'Erro ao fazer login. Tente novamente mais tarde.';
      setError(errorMessage);
      setHasError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseError = () => {
    setError('');
    setHasError(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4 shadow-lg border border-gray-200">
              <img
                src="/r_t_b.png"
                alt="RFP Logo"
                className="w-12 h-12 object-contain"
              />
            </div>
            <p className="text-gray-600 mt-2">Gestão Inteligente, Resultados Reais.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={handleEmailChange}
                  className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 transition-smooth ${
                    hasError
                      ? 'border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-emerald-500 focus:border-emerald-500'
                  }`}
                  placeholder="seu@email.com"
                  required
                />
                {hasError && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Senha
                </label>
                <button
                  type="button"
                  onClick={() => setShowPasswordReset(true)}
                  className="text-sm text-emerald-600 hover:text-emerald-800 hover:underline transition-smooth"
                >
                  Esqueceu sua senha?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={handlePasswordChange}
                  className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 transition-smooth ${
                    hasError
                      ? 'border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-emerald-500 focus:border-emerald-500'
                  } pr-20`}
                  placeholder="••••••••"
                  required
                />
                {hasError && (
                  <div className="absolute inset-y-0 right-12 pr-3 flex items-center pointer-events-none">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 text-gray-400" />
                  ) : (
                    <Eye className="w-5 h-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div
                className={`bg-red-50 border-2 border-red-400 text-red-800 px-4 py-4 rounded-lg flex items-start gap-3 shadow-lg ${
                  shake ? 'animate-shake' : ''
                }`}
                style={{
                  animation: shake ? 'shake 0.5s ease-in-out' : undefined
                }}
              >
                <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5 text-red-600" />
                <div className="flex-1">
                  <p className="font-bold text-base">Erro ao fazer login</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseError}
                  className="flex-shrink-0 text-red-600 hover:text-red-800 transition-colors duration-200 hover:bg-red-100 rounded p-1"
                  aria-label="Fechar alerta"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 px-4 rounded-lg hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-smooth font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
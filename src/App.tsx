import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { VersionProvider } from './contexts/VersionContext';
import { BroadcastMessageProvider } from './contexts/BroadcastMessageContext';
import { UpdateModal } from './components/common/UpdateModal';
import { BroadcastMessageModal } from './components/common/BroadcastMessageModal';
import MainAppContent from './components/MainAppContent';

function App() {
  console.log('App component renderizando...');

  return (
    <AuthProvider>
      <VersionProvider>
        <BroadcastMessageProvider>
          <div className="min-h-screen">
            <ErrorBoundary>
              <MainAppContent />
            </ErrorBoundary>
            <UpdateModal />
            <BroadcastMessageModal />
          </div>
        </BroadcastMessageProvider>
      </VersionProvider>
    </AuthProvider>
  );
}

// Componente Error Boundary para capturar erros
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="text-center p-8">
            <h2 className="text-xl font-bold text-red-600 mb-4">Algo deu errado</h2>
            <p className="text-gray-600 mb-4">
              {this.state.error?.message || 'Erro inesperado na aplicação'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default App;
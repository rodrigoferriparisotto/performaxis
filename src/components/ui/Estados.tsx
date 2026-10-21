import React from 'react';

/** Carregamento padrão de página/bloco. */
export function LoadingState({ texto, compacto = false }: { texto?: string; compacto?: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center ${compacto ? 'py-8' : 'min-h-64 py-12'}`}>
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      {texto && <p className="mt-3 text-sm text-gray-500">{texto}</p>}
    </div>
  );
}

/** Estado vazio padrão ("nenhum registro..."). */
export function EmptyState({
  icon: Icone,
  titulo,
  descricao,
  acao,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
}) {
  return (
    <div className="text-center py-12 px-4">
      {Icone && <Icone className="w-16 h-16 text-gray-300 mx-auto mb-4" />}
      <h3 className="text-lg font-medium text-gray-800 mb-1">{titulo}</h3>
      {descricao && <p className="text-gray-500 mb-4">{descricao}</p>}
      {acao}
    </div>
  );
}

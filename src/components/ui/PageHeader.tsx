import React from 'react';

interface PageHeaderProps {
  titulo: string;
  subtitulo?: string;
  /** botões/ações à direita; quebram para baixo do título no celular */
  acoes?: React.ReactNode;
}

/** Cabeçalho padrão de página (título + subtítulo + ações). */
export function PageHeader({ titulo, subtitulo, acoes }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-800">{titulo}</h1>
        {subtitulo && <p className="text-gray-600">{subtitulo}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </div>
  );
}

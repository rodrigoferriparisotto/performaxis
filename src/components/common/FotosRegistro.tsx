interface FotosRegistroProps {
  fotos?: string[] | null;
  tamanho?: 'sm' | 'md';
}

/**
 * Faixa de miniaturas das fotos de um registro (manutenção etc.).
 * Clique abre a foto em tamanho real numa aba nova.
 */
export function FotosRegistro({ fotos, tamanho = 'md' }: FotosRegistroProps) {
  if (!fotos || fotos.length === 0) return null;

  const classeTamanho = tamanho === 'sm' ? 'w-12 h-12' : 'w-16 h-16';

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {fotos.map((url, i) => (
        <a
          key={url + i}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title={`Abrir foto ${i + 1}`}
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={url}
            alt={`Foto ${i + 1} da manutenção`}
            loading="lazy"
            className={`${classeTamanho} object-cover rounded-md border border-gray-200 hover:ring-2 hover:ring-orange-400 transition-shadow`}
          />
        </a>
      ))}
    </div>
  );
}

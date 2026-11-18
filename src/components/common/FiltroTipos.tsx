// Filtro por tipo nas telas de cadastro de atividades (ex.: Diurnas / Noturnas).
// valor: '' = todos, SEM_TIPO = atividades sem nenhum tipo, ou o id do tipo.

export const SEM_TIPO = '__sem_tipo__';

interface Tipo {
  id: string;
  nome: string;
}

/** A atividade passa no filtro de tipo? */
export function atividadeNoTipo(tiposDaAtividade: string[] | null | undefined, filtro: string): boolean {
  if (!filtro) return true;
  const lista = tiposDaAtividade || [];
  if (filtro === SEM_TIPO) return lista.length === 0;
  return lista.includes(filtro);
}

/** Nomes dos tipos da atividade, para a busca por texto também achar pelo tipo. */
export function nomesDosTipos(tiposDaAtividade: string[] | null | undefined, tipos: Tipo[]): string {
  return (tiposDaAtividade || [])
    .map((id) => tipos.find((t) => t.id === id)?.nome || '')
    .join(' ')
    .toLowerCase();
}

export function FiltroTipos({
  tipos,
  valor,
  onChange,
  contar,
}: {
  tipos: Tipo[];
  valor: string;
  onChange: (valor: string) => void;
  /** quantas atividades há em cada opção (sem o filtro de tipo) */
  contar: (filtro: string) => number;
}) {
  if (tipos.length === 0) return null;
  const opcoes = [
    { id: '', nome: 'Todos' },
    ...tipos.map((t) => ({ id: t.id, nome: t.nome })),
  ];
  const semTipo = contar(SEM_TIPO);
  if (semTipo > 0) opcoes.push({ id: SEM_TIPO, nome: 'Sem tipo' });

  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por tipo">
      {opcoes.map((o) => {
        const ativo = valor === o.id;
        return (
          <button
            key={o.id || 'todos'}
            type="button"
            onClick={() => onChange(o.id)}
            aria-pressed={ativo}
            className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
              ativo ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {o.nome}
            <span className={`ml-1.5 text-xs ${ativo ? 'text-slate-200' : 'text-gray-400'}`}>{contar(o.id)}</span>
          </button>
        );
      })}
    </div>
  );
}

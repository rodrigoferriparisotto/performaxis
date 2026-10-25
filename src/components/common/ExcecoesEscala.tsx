import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatarData, getDataAtual } from '../../utils/dateUtils';
import { notificar } from '../../lib/feedback';

interface Excecao {
  id: string;
  data: string;
  tipo: 'folga' | 'trabalho';
  inicio: string | null;
  observacao: string | null;
}

/** Folgas, trocas e coberturas num dia específico (sobrepõem a escala). */
export function ExcecoesEscala({ usuarioId, empresaId }: { usuarioId: string; empresaId: string }) {
  const [lista, setLista] = useState<Excecao[]>([]);
  const [data, setData] = useState(getDataAtual());
  const [tipo, setTipo] = useState<'folga' | 'trabalho'>('folga');
  const [inicio, setInicio] = useState('');
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    const { data: linhas } = await supabase
      .from('escala_excecoes')
      .select('id, data, tipo, inicio, observacao')
      .eq('usuario_id', usuarioId)
      .gte('data', getDataAtual())
      .order('data');
    setLista((linhas as Excecao[]) || []);
  };

  useEffect(() => {
    carregar();
  }, [usuarioId]);

  const adicionar = async () => {
    if (!data) return;
    setSalvando(true);
    const { error } = await supabase.from('escala_excecoes').upsert(
      {
        usuario_id: usuarioId,
        empresa_id: empresaId,
        data,
        tipo,
        inicio: tipo === 'trabalho' && inicio ? inicio : null,
        observacao: observacao.trim() || null,
      },
      { onConflict: 'usuario_id,data,tipo' }
    );
    setSalvando(false);
    if (error) return notificar('Não foi possível salvar a exceção.', 'erro');
    setObservacao('');
    setInicio('');
    carregar();
  };

  const remover = async (id: string) => {
    await supabase.from('escala_excecoes').delete().eq('id', id);
    carregar();
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">Folgas, trocas e coberturas</p>
      <div className="flex flex-wrap items-end gap-2">
        <input type="date" value={data} min={getDataAtual()} onChange={(e) => setData(e.target.value)}
          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
        <select value={tipo} onChange={(e) => setTipo(e.target.value as 'folga' | 'trabalho')}
          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
          <option value="folga">Folga / troca (não trabalha)</option>
          <option value="trabalho">Trabalha (cobertura / extra)</option>
        </select>
        {tipo === 'trabalho' && (
          <input type="time" value={inicio} onChange={(e) => setInicio(e.target.value)} title="Início (opcional)"
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
        )}
        <input value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Motivo (opcional)"
          className="flex-1 min-w-[140px] border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
        <button type="button" onClick={adicionar} disabled={salvando}
          className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:bg-gray-400">
          Adicionar
        </button>
      </div>
      {lista.length > 0 ? (
        <ul className="divide-y divide-gray-100 rounded-md border border-gray-200">
          {lista.map((x) => (
            <li key={x.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <span>
                <strong>{formatarData(x.data)}</strong> ·{' '}
                {x.tipo === 'folga' ? 'Folga / troca' : `Trabalha${x.inicio ? ` às ${x.inicio.slice(0, 5)}` : ''}`}
                {x.observacao ? <span className="text-gray-500"> — {x.observacao}</span> : null}
              </span>
              <button type="button" aria-label="Remover" onClick={() => remover(x.id)}
                className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-gray-500">Nenhuma folga ou cobertura marcada daqui para frente.</p>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { DoorOpen, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { notificar, confirmar } from '../../lib/feedback';
import { nomeSuite } from '../../utils/nomeSuite';
import { ResumoSuitesDia } from './ResumoSuitesDia';
import { useAuth } from '../../contexts/AuthContext';

// Recepção avisa a governança: "Quarto liberado" (o hóspede já saiu) em cada suíte do dia.

interface SuiteDoDia {
  registro_id: string;
  suite_nome: string;
  tipo_servico: string;
  status: string;
  quarto_liberado_em: string | null;
  quarto_liberado_por_nome: string | null;
  camareira_nome: string | null;
}

const TIPOS: Record<string, string> = {
  check_in: 'Check-in',
  check_out: 'Check-out',
  permanencia: 'Permanência',
  suite_livre: 'Suíte livre',
};

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });

export function QuartosLiberados() {
  const { user } = useAuth();
  // só recepção e gestão marcam; os demais só acompanham
  const podeMarcar = ['recepcao', 'gestor', 'admin'].includes(user?.profile || '');
  const [lista, setLista] = useState<SuiteDoDia[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [marcando, setMarcando] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);

  const carregar = async () => {
    const { data, error } = await supabase.rpc('suites_do_dia_governanca');
    if (!error) {
      setLista(
        ((data as SuiteDoDia[]) || []).sort((a, b) =>
          a.suite_nome.localeCompare(b.suite_nome, 'pt-BR', { numeric: true, sensitivity: 'base' })
        )
      );
    }
    setCarregando(false);
  };

  useEffect(() => {
    carregar();
    // a governança também mexe nas suítes: atualiza a cada minuto
    const t = setInterval(carregar, 60_000);
    return () => clearInterval(t);
  }, []);

  const alternar = async (s: SuiteDoDia) => {
    const liberar = !s.quarto_liberado_em;
    if (!liberar && !(await confirmar(`Desfazer "Quarto liberado" da ${nomeSuite(s.suite_nome)}?`))) return;
    setMarcando(s.registro_id);
    const { error } = await supabase.rpc('marcar_quarto_liberado', { p_registro: s.registro_id, p_liberado: liberar });
    setMarcando(null);
    if (error) {
      notificar('Não foi possível salvar. Verifique a conexão.', 'erro');
      return;
    }
    carregar();
    setVersao((v) => v + 1);
  };

  const situacao = (s: SuiteDoDia) =>
    s.status === 'concluido' ? 'Limpeza concluída'
      : s.status === 'em_andamento' ? `Em limpeza${s.camareira_nome ? ` · ${s.camareira_nome}` : ''}`
      : 'Aguardando a governança';

  const liberados = lista.filter((s) => s.quarto_liberado_em).length;

  return (
    <div className="space-y-4">
    <ResumoSuitesDia atualizar={versao} />
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      <div className="p-4 sm:p-6 border-b border-gray-200 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <DoorOpen className="w-5 h-5 text-emerald-600" /> Quartos liberados
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Toque em <strong>Quarto liberado</strong> quando o hóspede sair. A camareira vê na hora na suíte dela.
          </p>
        </div>
        <button onClick={carregar} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100" aria-label="Atualizar">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 sm:p-6">
        {carregando ? (
          <p className="text-sm text-gray-500">Carregando...</p>
        ) : lista.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma suíte programada para a governança hoje.</p>
        ) : (
          <>
            <p className="text-xs text-gray-500 mb-3">{liberados} de {lista.length} quartos liberados</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {lista.map((s) => {
                const ok = !!s.quarto_liberado_em;
                return (
                  <div key={s.registro_id} className={`rounded-lg border-2 p-3 ${ok ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-white'}`}>
                    <p className="font-semibold text-gray-800">{nomeSuite(s.suite_nome)}</p>
                    <p className="text-xs text-gray-600">{TIPOS[s.tipo_servico] || s.tipo_servico} · {situacao(s)}</p>
                    <button
                      onClick={() => alternar(s)}
                      disabled={!podeMarcar || marcando === s.registro_id}
                      className={`mt-3 w-full px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${podeMarcar ? 'disabled:opacity-50' : 'cursor-default'} ${
                        ok ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'border border-emerald-600 text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      <DoorOpen className="w-4 h-4" />
                      {ok ? `Liberado às ${hora(s.quarto_liberado_em!)}` : podeMarcar ? 'Quarto liberado' : 'Aguardando a recepção'}
                    </button>
                    {ok && s.quarto_liberado_por_nome && (
                      <p className="text-[11px] text-emerald-800 mt-1 text-center">por {s.quarto_liberado_por_nome}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
    </div>
  );
}

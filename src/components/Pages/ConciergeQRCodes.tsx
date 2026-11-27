import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Printer, RefreshCw, QrCode } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { notificar, confirmar } from '../../lib/feedback';
import { useAuth } from '../../contexts/AuthContext';
import { nomeSuite } from '../../utils/nomeSuite';
import { PageHeader } from '../ui/PageHeader';
import { LoadingState } from '../ui/Estados';

// Folha de QR Codes do Concierge: um por suíte, com o código impresso embaixo
// (o hóspede aponta a câmera ou digita o código em performaxis.com.br/c).

interface CodigoSuite {
  suite_id: string;
  suite_nome: string;
  andar: number | null;
  codigo: string;
}

const ENDERECO = 'performaxis.com.br/c';

export default function ConciergeQRCodes() {
  const { user, empresa } = useAuth();
  const [lista, setLista] = useState<(CodigoSuite & { qr: string })[]>([]);
  const [carregando, setCarregando] = useState(true);
  const pode = ['admin', 'gestor', 'recepcao'].includes(user?.profile || '') && !!user?.empresaId;

  const montar = async (linhas: CodigoSuite[]) => {
    const ordenadas = [...linhas].sort((a, b) => a.suite_nome.localeCompare(b.suite_nome, 'pt-BR', { numeric: true, sensitivity: 'base' }));
    const comQr = await Promise.all(
      ordenadas.map(async (l) => ({
        ...l,
        qr: await QRCode.toDataURL(`https://${ENDERECO}/${l.codigo}`, { margin: 1, width: 360, errorCorrectionLevel: 'M' }),
      }))
    );
    setLista(comQr);
  };

  const carregar = async (regerarSuite?: string) => {
    setCarregando(true);
    const { data, error } = await supabase.rpc('gerar_codigos_concierge', regerarSuite ? { p_suite: regerarSuite } : {});
    if (error) {
      notificar('Não foi possível carregar os códigos.', 'erro');
    } else {
      await montar((data as CodigoSuite[]) || []);
    }
    setCarregando(false);
  };

  useEffect(() => {
    if (pode) carregar();
  }, [pode]);

  const regerar = async (s: CodigoSuite) => {
    if (!(await confirmar(`Gerar um código novo para a ${nomeSuite(s.suite_nome)}? O código atual (${s.codigo}) para de funcionar e será preciso imprimir o QR de novo.`))) return;
    await carregar(s.suite_id);
    notificar('Código novo gerado. Imprima o QR desta suíte.', 'sucesso');
  };

  if (!pode) return <p className="p-6 text-sm text-gray-600">Acesso restrito à gestão e à recepção.</p>;

  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <PageHeader
          titulo="Concierge › QR Codes"
          subtitulo="Imprima e coloque um em cada suíte. O hóspede aponta a câmera ou digita o código."
          acoes={
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-white text-sm hover:bg-slate-900">
              <Printer className="w-4 h-4" /> Imprimir
            </button>
          }
        />
        <p className="mt-2 text-xs text-gray-500">
          Só aparecem para o hóspede as fichas marcadas “Mostrar também para o hóspede”. Se um código vazar, gere um novo para a suíte.
        </p>
      </div>

      {carregando ? (
        <LoadingState texto="Gerando os QR Codes..." />
      ) : lista.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhuma suíte cadastrada.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 print:grid-cols-3 print:gap-4">
          {lista.map((s) => (
            <div key={s.suite_id} className="bg-white border border-gray-300 rounded-xl p-3 text-center break-inside-avoid print:border-gray-400">
              <p className="text-xs text-gray-500 truncate">{empresa?.nome || ''}</p>
              <p className="font-bold text-gray-900">{nomeSuite(s.suite_nome)}</p>
              <img src={s.qr} alt={`QR Code da ${nomeSuite(s.suite_nome)}`} className="mx-auto my-2 w-36 h-36 print:w-40 print:h-40" />
              <p className="text-[11px] text-gray-600 flex items-center justify-center gap-1">
                <QrCode className="w-3 h-3" /> Concierge do hotel
              </p>
              <p className="text-[11px] text-gray-500">{ENDERECO}</p>
              <p className="mt-1 text-lg font-bold tracking-[0.25em] text-gray-900">{s.codigo}</p>
              <button onClick={() => regerar(s)} className="print:hidden mt-2 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800">
                <RefreshCw className="w-3 h-3" /> Gerar novo código
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

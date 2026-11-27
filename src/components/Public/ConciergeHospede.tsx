import { useEffect, useMemo, useRef, useState } from 'react';
import { ConciergeBell, Send, KeyRound, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { buscarFichas, CATEGORIAS_CONCIERGE, FichaConcierge } from '../../lib/conciergeBusca';

// Concierge do hóspede (sem login): abre por performaxis.com.br/c/CODIGO
// (QR Code no quarto) ou digitando o código impresso embaixo do QR.

const CHAVE_CODIGO = 'performaxis_concierge_codigo';

interface DadosHospede {
  hotel: string;
  suite: { nome: string; tipo: string | null; andar: number | null; como_chegar: string | null };
  fichas: Omit<FichaConcierge, 'visivel_hospede' | 'ativo'>[];
}

interface Mensagem {
  de: 'hospede' | 'concierge';
  texto?: string;
  fichas?: FichaConcierge[];
}

const lerCodigoDaUrl = () => {
  const m = window.location.pathname.match(/^\/c\/([A-Za-z0-9-]+)/);
  return m ? m[1] : '';
};

const limpar = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, '');

export default function ConciergeHospede() {
  const [codigo, setCodigo] = useState(() => {
    const daUrl = lerCodigoDaUrl();
    if (daUrl) return limpar(daUrl);
    try {
      return localStorage.getItem(CHAVE_CODIGO) || '';
    } catch {
      return '';
    }
  });
  const [digitado, setDigitado] = useState('');
  const [dados, setDados] = useState<DadosHospede | null>(null);
  const [carregando, setCarregando] = useState(!!codigo);
  const [erro, setErro] = useState('');
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [pergunta, setPergunta] = useState('');
  const [aberta, setAberta] = useState<string | null>(null);
  const [foto, setFoto] = useState<string | null>(null);
  const fim = useRef<HTMLDivElement>(null);

  const fichas = useMemo<FichaConcierge[]>(
    () => (dados?.fichas || []).map((f) => ({ ...f, perguntas: f.perguntas || [], fotos: f.fotos || [], visivel_hospede: true, ativo: true })),
    [dados]
  );

  useEffect(() => {
    document.title = dados ? `Concierge · ${dados.hotel}` : 'Concierge';
  }, [dados]);

  useEffect(() => {
    if (!codigo) return;
    setCarregando(true);
    setErro('');
    supabase.rpc('concierge_hospede', { p_codigo: codigo }).then(({ data, error }) => {
      setCarregando(false);
      if (error || !data) {
        setDados(null);
        setErro('Código não encontrado. Confira o código impresso embaixo do QR Code no seu quarto.');
        try {
          localStorage.removeItem(CHAVE_CODIGO);
        } catch {
          /* ignora */
        }
        return;
      }
      setDados(data as DadosHospede);
      try {
        localStorage.setItem(CHAVE_CODIGO, codigo);
      } catch {
        /* ignora */
      }
      // tira o código da barra de endereço (a página continua funcionando pelo navegador)
      if (window.location.pathname !== '/c') window.history.replaceState(null, '', '/c');
    });
  }, [codigo]);

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  const perguntar = (texto: string) => {
    const t = texto.trim();
    if (!t || !dados) return;
    const resultado = buscarFichas(t, fichas);
    const resposta: Mensagem = resultado.length
      ? { de: 'concierge', fichas: resultado.map((r) => r.ficha) }
      : { de: 'concierge', texto: 'Ainda não tenho essa resposta por aqui. Fale com a recepção, que ajudamos na hora.' };
    setMensagens((m) => [...m, { de: 'hospede', texto: t }, resposta]);
    setAberta(resultado[0]?.ficha.id || null);
    setPergunta('');
    supabase.rpc('concierge_hospede_registrar', {
      p_codigo: codigo,
      p_termo: t.slice(0, 300),
      p_encontrou: resultado.length > 0,
      p_ficha: resultado[0]?.ficha.id || null,
    });
  };

  const abrirFicha = (f: FichaConcierge) => {
    setMensagens((m) => [...m, { de: 'hospede', texto: f.titulo }, { de: 'concierge', fichas: [f] }]);
    setAberta(f.id);
  };

  // ---- entrada do código
  if (!dados) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg border border-slate-200 p-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center mb-3">
            <ConciergeBell className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Concierge</h1>
          <p className="text-sm text-slate-600 mt-1">Digite o código impresso embaixo do QR Code no seu quarto.</p>
          {carregando ? (
            <p className="text-sm text-slate-500 mt-6">Abrindo…</p>
          ) : (
            <form
              className="mt-5 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (limpar(digitado).length >= 6) setCodigo(limpar(digitado));
              }}
            >
              <label className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-slate-400">
                <KeyRound className="w-4 h-4 text-slate-400" />
                <input
                  value={digitado}
                  onChange={(e) => setDigitado(e.target.value.toUpperCase())}
                  placeholder="Ex.: K7P4QX"
                  autoCapitalize="characters"
                  autoComplete="off"
                  maxLength={10}
                  className="flex-1 text-center tracking-[0.3em] font-semibold text-lg outline-none"
                  aria-label="Código do quarto"
                />
              </label>
              {erro && <p className="text-sm text-red-600">{erro}</p>}
              <button className="w-full py-2.5 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800">Entrar</button>
            </form>
          )}
        </div>
      </div>
    );
  }

  const categorias = CATEGORIAS_CONCIERGE.filter((c) => fichas.some((f) => f.categoria === c.id));
  const suite = dados.suite;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-slate-900 text-white px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <ConciergeBell className="w-6 h-6" />
          <div className="min-w-0">
            <p className="font-semibold truncate">{dados.hotel}</p>
            <p className="text-xs text-slate-300 truncate">
              Você está na {/^\d/.test(suite.nome) ? `Suíte ${suite.nome}` : suite.nome}
              {suite.andar != null ? ` · ${suite.andar}º andar` : ''}
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-4 space-y-3 pb-28">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-sm text-slate-800">
            Olá! Sou o concierge do hotel. Pergunte do seu jeito, por exemplo <em>“que horas é o café?”</em> ou <em>“qual a senha do Wi-Fi?”</em>.
          </p>
          {categorias.length > 0 && (
            <div className="mt-3 space-y-2">
              {categorias.map((c) => (
                <div key={c.id}>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{c.nome}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {fichas
                      .filter((f) => f.categoria === c.id)
                      .map((f) => (
                        <button key={f.id} onClick={() => abrirFicha(f)} className="px-3 py-1.5 rounded-full border border-slate-300 bg-white text-sm text-slate-700 hover:bg-slate-100">
                          {f.titulo}
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {suite.como_chegar && (
            <p className="mt-3 text-xs text-slate-600 border-t border-slate-100 pt-2">
              <strong>Sua suíte:</strong> {suite.como_chegar}
            </p>
          )}
        </div>

        {mensagens.map((m, i) =>
          m.de === 'hospede' ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-slate-900 text-white px-4 py-2 text-sm">{m.texto}</p>
            </div>
          ) : (
            <div key={i} className="max-w-[92%] space-y-2">
              {m.texto && <p className="rounded-2xl rounded-bl-sm bg-white border border-slate-200 px-4 py-2 text-sm text-slate-800">{m.texto}</p>}
              {m.fichas?.map((f, j) =>
                aberta === f.id || (j === 0 && m.fichas!.length === 1) ? (
                  <div key={f.id} className="rounded-2xl rounded-bl-sm bg-white border border-slate-200 px-4 py-3">
                    <p className="font-semibold text-slate-900">{f.titulo}</p>
                    <p className="mt-1 text-sm text-slate-700 whitespace-pre-line">{f.conteudo}</p>
                    {f.fotos.length > 0 && (
                      <div className="flex gap-2 mt-2 overflow-x-auto">
                        {f.fotos.map((url) => (
                          <button key={url} onClick={() => setFoto(url)} className="flex-shrink-0">
                            <img src={url} alt={f.titulo} className="w-24 h-24 object-cover rounded-lg border border-slate-200" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <button key={f.id} onClick={() => setAberta(f.id)} className="block text-left text-sm text-slate-700 underline underline-offset-2">
                    Também pode ajudar: {f.titulo}
                  </button>
                )
              )}
            </div>
          )
        )}
        <div ref={fim} />
      </main>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          perguntar(pergunta);
        }}
        className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 px-4 py-3"
      >
        <div className="max-w-2xl mx-auto flex gap-2">
          <input
            value={pergunta}
            onChange={(e) => setPergunta(e.target.value)}
            placeholder="Escreva sua pergunta…"
            maxLength={300}
            className="flex-1 border border-slate-300 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
            aria-label="Sua pergunta"
          />
          <button aria-label="Enviar" className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>

      {foto && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4" onClick={() => setFoto(null)}>
          <button className="absolute top-4 right-4 text-white" aria-label="Fechar"><X className="w-6 h-6" /></button>
          <img src={foto} alt="" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}
    </div>
  );
}

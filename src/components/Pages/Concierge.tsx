import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight, ConciergeBell, DoorOpen, HelpCircle, Send, Settings, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { notificar } from '../../lib/feedback';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../ui/PageHeader';
import { EmptyState, LoadingState } from '../ui/Estados';
import { TextoFormatado } from '../common/TextoFormatado';
import {
  CATEGORIAS_CONCIERGE,
  buscarFichas,
  buscarSuite,
  type CategoriaConcierge,
  type FichaConcierge,
  type SuiteConcierge,
} from '../../lib/conciergeBusca';

// Concierge interno da equipe: conversa no formato de chat, sem IA.
// As respostas saem das fichas cadastradas pela gestão (busca local em
// lib/conciergeBusca) e do cadastro de suítes ("onde fica a suíte 12?").
// A conversa vive só na memória da tela; cada pergunta digitada é
// registrada em concierge_buscas para a gestão ver o que falta cadastrar.

type Mensagem =
  | { id: number; autor: 'usuario'; texto: string }
  | { id: number; autor: 'bot'; tipo: 'resposta'; suite: SuiteConcierge | null; fichas: FichaConcierge[] }
  | { id: number; autor: 'bot'; tipo: 'categoria'; categoria: CategoriaConcierge; fichas: FichaConcierge[] };

type NovaMensagem = Mensagem extends infer M ? (M extends Mensagem ? Omit<M, 'id'> : never) : never;

const CORES_CATEGORIA: Record<CategoriaConcierge, string> = {
  hotel: 'bg-blue-100 text-blue-700',
  alimentacao: 'bg-orange-100 text-orange-700',
  suites: 'bg-purple-100 text-purple-700',
  como_usar: 'bg-teal-100 text-teal-700',
  servicos: 'bg-pink-100 text-pink-700',
  contatos: 'bg-green-100 text-green-700',
  regiao: 'bg-amber-100 text-amber-800',
  outros: 'bg-gray-100 text-gray-700',
};

const nomeCategoria = (c: CategoriaConcierge) => CATEGORIAS_CONCIERGE.find((x) => x.id === c)?.nome || 'Outros';

function ChipCategoria({ categoria }: { categoria: CategoriaConcierge }) {
  return (
    <span className={`inline-block shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${CORES_CATEGORIA[categoria] || CORES_CATEGORIA.outros}`}>
      {nomeCategoria(categoria)}
    </span>
  );
}

function Fotos({ fotos, onAbrir }: { fotos: string[]; onAbrir: (url: string) => void }) {
  if (!fotos?.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {fotos.map((url) => (
        <button
          key={url}
          type="button"
          onClick={() => onAbrir(url)}
          className="h-20 w-20 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Ampliar foto"
        >
          <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
        </button>
      ))}
    </div>
  );
}

function ConteudoFicha({ ficha, onAbrirFoto }: { ficha: FichaConcierge; onAbrirFoto: (url: string) => void }) {
  return (
    <>
      {ficha.conteudo?.trim() ? (
        <TextoFormatado texto={ficha.conteudo} className="mt-2 text-sm leading-relaxed text-gray-700" />
      ) : (
        <p className="mt-2 text-sm italic text-gray-400">Esta ficha ainda está sem conteúdo.</p>
      )}
      <Fotos fotos={ficha.fotos} onAbrir={onAbrirFoto} />
    </>
  );
}

function CartaoFicha({ ficha, onAbrirFoto }: { ficha: FichaConcierge; onAbrirFoto: (url: string) => void }) {
  return (
    <div className="rounded-2xl rounded-tl-sm border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="min-w-0 break-words font-semibold text-gray-800">{ficha.titulo}</h3>
        <ChipCategoria categoria={ficha.categoria} />
      </div>
      <ConteudoFicha ficha={ficha} onAbrirFoto={onAbrirFoto} />
    </div>
  );
}

function FichaCompacta({ ficha, onAbrirFoto }: { ficha: FichaConcierge; onAbrirFoto: (url: string) => void }) {
  const [aberta, setAberta] = useState(false);
  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setAberta((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
        aria-expanded={aberta}
      >
        {aberta ? <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" /> : <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />}
        <span className="min-w-0 flex-1 break-words text-sm font-medium text-gray-800">{ficha.titulo}</span>
        <ChipCategoria categoria={ficha.categoria} />
      </button>
      {aberta && (
        <div className="border-t border-gray-100 px-3 pb-3">
          <ConteudoFicha ficha={ficha} onAbrirFoto={onAbrirFoto} />
        </div>
      )}
    </div>
  );
}

function CartaoSuite({ suite }: { suite: SuiteConcierge }) {
  const partes = [`Suíte ${suite.name}`];
  if (suite.type) partes.push(suite.type);
  if (suite.floor !== null && suite.floor !== undefined) partes.push(suite.floor === 0 ? 'térreo' : `${suite.floor}º andar`);
  const comoChegar = suite.como_chegar?.trim();
  return (
    <div className="rounded-2xl rounded-tl-sm border border-purple-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-2">
        <DoorOpen className="mt-0.5 h-5 w-5 shrink-0 text-purple-600" />
        <h3 className="min-w-0 break-words font-semibold text-gray-800">{partes.join(' · ')}</h3>
      </div>
      {comoChegar ? (
        <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-gray-700">{comoChegar}</p>
      ) : (
        <p className="mt-2 text-sm italic text-gray-500">Ainda não cadastraram como chegar nesta suíte.</p>
      )}
    </div>
  );
}

function BalaoBot({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
        <ConciergeBell className="h-4 w-4" />
      </div>
      <div className="min-w-0 max-w-[88%] flex-1 space-y-2 sm:max-w-[75%]">{children}</div>
    </div>
  );
}

export default function Concierge() {
  const { user } = useAuth();
  const empresaId = user?.empresaId || null;
  const podeGerenciar = user?.profile === 'gestor' || user?.profile === 'admin';

  const [carregando, setCarregando] = useState(true);
  const [fichas, setFichas] = useState<FichaConcierge[]>([]);
  const [suites, setSuites] = useState<SuiteConcierge[]>([]);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState('');
  const [fotoAberta, setFotoAberta] = useState<string | null>(null);

  const proximoId = useRef(1);
  const fimRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      if (!empresaId) {
        setCarregando(false);
        return;
      }
      setCarregando(true);
      const [resFichas, resSuites] = await Promise.all([
        supabase
          .from('concierge_fichas')
          .select('id, categoria, titulo, conteudo, perguntas, fotos, visivel_hospede, ativo, ordem')
          .eq('empresa_id', empresaId)
          .eq('ativo', true)
          .order('categoria')
          .order('ordem')
          .order('titulo'),
        supabase.from('suites').select('id, name, type, floor, como_chegar').eq('empresa_id', empresaId),
      ]);
      if (cancelado) return;
      if (resFichas.error) {
        notificar('Erro ao carregar as fichas do concierge. Verifique a conexão e tente novamente.', 'erro');
      }
      setFichas(
        ((resFichas.data as any[]) || []).map((f) => ({
          ...f,
          conteudo: f.conteudo || '',
          perguntas: f.perguntas || [],
          fotos: f.fotos || [],
          ordem: f.ordem ?? 0,
        })) as FichaConcierge[]
      );
      // sem como_chegar (coluna ausente) ainda dá para responder a suíte
      setSuites(((resSuites.data as any[]) || []) as SuiteConcierge[]);
      setCarregando(false);
    }
    carregar();
    return () => {
      cancelado = true;
    };
  }, [empresaId]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [mensagens]);

  useEffect(() => {
    if (!fotoAberta) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFotoAberta(null);
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [fotoAberta]);

  const categoriasComFichas = useMemo(
    () =>
      CATEGORIAS_CONCIERGE.map((c) => ({ ...c, fichas: fichas.filter((f) => f.categoria === c.id) })).filter(
        (c) => c.fichas.length > 0
      ),
    [fichas]
  );

  const frequentes = useMemo(
    () => [...fichas].sort((a, b) => a.ordem - b.ordem || a.titulo.localeCompare(b.titulo, 'pt-BR')).slice(0, 6),
    [fichas]
  );

  const adicionar = (...novas: NovaMensagem[]) => {
    setMensagens((atual) => [...atual, ...novas.map((m) => ({ ...m, id: proximoId.current++ }) as Mensagem)]);
  };

  const registrarBusca = (termo: string, encontrou: boolean, fichaId: string | null) => {
    if (!empresaId) return;
    supabase
      .from('concierge_buscas')
      .insert({ empresa_id: empresaId, origem: 'equipe', termo: termo.slice(0, 300), encontrou, ficha_id: fichaId })
      .then(
        () => undefined,
        () => undefined
      );
  };

  const perguntar = (pergunta: string) => {
    const termo = pergunta.trim();
    if (!termo) return;
    const suite = buscarSuite(termo, suites);
    const resultados = buscarFichas(termo, fichas, 3).map((r) => r.ficha);
    adicionar({ autor: 'usuario', texto: termo }, { autor: 'bot', tipo: 'resposta', suite, fichas: resultados });
    registrarBusca(termo, !!suite || resultados.length > 0, resultados[0]?.id || null);
  };

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!texto.trim()) return;
    perguntar(texto);
    setTexto('');
    inputRef.current?.focus();
  };

  const abrirFicha = (ficha: FichaConcierge) => {
    adicionar({ autor: 'usuario', texto: ficha.titulo }, { autor: 'bot', tipo: 'resposta', suite: null, fichas: [ficha] });
  };

  const abrirCategoria = (categoria: CategoriaConcierge) => {
    adicionar(
      { autor: 'usuario', texto: nomeCategoria(categoria) },
      { autor: 'bot', tipo: 'categoria', categoria, fichas: fichas.filter((f) => f.categoria === categoria) }
    );
  };

  const cabecalho = <PageHeader titulo="Concierge" subtitulo="Tudo sobre o hotel: pergunte como falaria com um colega" />;

  if (carregando) {
    return (
      <div className="space-y-6">
        {cabecalho}
        <LoadingState texto="Carregando as fichas do hotel..." />
      </div>
    );
  }

  if (fichas.length === 0) {
    return (
      <div className="space-y-6">
        {cabecalho}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <EmptyState
            icon={BookOpen}
            titulo="O concierge ainda está sem fichas"
            descricao={
              podeGerenciar
                ? 'As respostas saem das fichas que a gestão cadastra em Concierge › Gerenciar (wi-fi, horários, como usar a TV, contatos, passeios...). Cadastre as primeiras para a equipe começar a perguntar.'
                : 'As respostas saem das fichas que a gestão cadastra em Concierge › Gerenciar. Peça ao seu gestor para cadastrar as informações do hotel.'
            }
            acao={
              podeGerenciar ? (
                <button
                  type="button"
                  onClick={() => {
                    window.location.hash = 'concierge-gestao';
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
                >
                  <Settings className="h-4 w-4" />
                  Cadastrar fichas
                </button>
              ) : undefined
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {cabecalho}

      <div className="space-y-4 pb-2">
        {/* boas-vindas + atalhos */}
        <BalaoBot>
          <div className="rounded-2xl rounded-tl-sm border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-700">
              Olá{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! Pergunte o que precisar sobre o hotel — por exemplo
              <span className="font-medium"> "senha do wi-fi"</span>, <span className="font-medium">"que horas é o café?"</span> ou
              <span className="font-medium"> "onde fica a suíte 12?"</span>.
            </p>

            {categoriasComFichas.length > 0 && (
              <>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Temas</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {categoriasComFichas.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => abrirCategoria(c.id)}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition hover:opacity-80 ${CORES_CATEGORIA[c.id]}`}
                    >
                      {c.nome} <span className="opacity-70">({c.fichas.length})</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {frequentes.length > 0 && (
              <>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Mais procuradas</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {frequentes.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => abrirFicha(f)}
                      className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 transition hover:border-blue-400 hover:text-blue-700"
                    >
                      {f.titulo}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </BalaoBot>

        {mensagens.map((m) => {
          if (m.autor === 'usuario') {
            return (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[85%] break-words rounded-2xl rounded-tr-sm bg-blue-600 px-4 py-2 text-sm text-white shadow-sm sm:max-w-[70%]">
                  {m.texto}
                </div>
              </div>
            );
          }

          if (m.tipo === 'categoria') {
            return (
              <BalaoBot key={m.id}>
                <div className="rounded-2xl rounded-tl-sm border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <ChipCategoria categoria={m.categoria} />
                    <span className="text-sm text-gray-500">
                      {m.fichas.length} {m.fichas.length === 1 ? 'ficha' : 'fichas'}
                    </span>
                  </div>
                  <ul className="mt-3 divide-y divide-gray-100">
                    {m.fichas.map((f) => (
                      <li key={f.id}>
                        <button
                          type="button"
                          onClick={() => abrirFicha(f)}
                          className="flex w-full items-center justify-between gap-2 py-2.5 text-left text-sm text-gray-800 hover:text-blue-700"
                        >
                          <span className="min-w-0 break-words">{f.titulo}</span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </BalaoBot>
            );
          }

          const [principal, ...outras] = m.fichas;
          const semResposta = !m.suite && !principal;
          return (
            <BalaoBot key={m.id}>
              {m.suite && <CartaoSuite suite={m.suite} />}
              {principal && <CartaoFicha ficha={principal} onAbrirFoto={setFotoAberta} />}
              {outras.length > 0 && (
                <div className="space-y-2">
                  <p className="px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Também pode ajudar:</p>
                  {outras.map((f) => (
                    <FichaCompacta key={f.id} ficha={f} onAbrirFoto={setFotoAberta} />
                  ))}
                </div>
              )}
              {semResposta && (
                <div className="flex items-start gap-2 rounded-2xl rounded-tl-sm border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <HelpCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Ainda não tenho essa resposta. Avisei a gestão para cadastrar.</span>
                </div>
              )}
            </BalaoBot>
          );
        })}
        <div ref={fimRef} />
      </div>

      {/* campo de pergunta fixo no rodapé (no celular o conteúdo tem p-4: -bottom-4/-mx-4 colam a barra na borda) */}
      <form
        onSubmit={enviar}
        className="sticky -bottom-4 z-10 -mx-4 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:mx-0 lg:rounded-xl lg:border lg:shadow-sm"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Digite sua pergunta..."
            enterKeyHint="send"
            autoComplete="off"
            maxLength={300}
            className="min-w-0 flex-1 rounded-full border border-gray-300 px-4 py-2.5 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 sm:text-sm"
            aria-label="Pergunta para o concierge"
          />
          <button
            type="submit"
            disabled={!texto.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Enviar pergunta"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>

      {/* foto ampliada */}
      {fotoAberta && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setFotoAberta(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setFotoAberta(null)}
            className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white hover:bg-white/25"
            aria-label="Fechar foto"
          >
            <X className="h-6 w-6" />
          </button>
          <img src={fotoAberta} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}

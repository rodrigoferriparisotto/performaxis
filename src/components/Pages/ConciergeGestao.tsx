import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  HelpCircle,
  Image as ImageIcon,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { notificar, confirmar } from '../../lib/feedback';
import { todasPaginas } from '../../lib/paginacao';
import { fotoUploadService } from '../../services/fotoUploadService';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../ui/PageHeader';
import { ModuleTabs, AbaModulo } from '../ui/ModuleTabs';
import { LoadingState, EmptyState } from '../ui/Estados';
import {
  CATEGORIAS_CONCIERGE,
  CategoriaConcierge,
  FichaConcierge,
  FICHAS_MODELO,
  SuiteConcierge,
  buscarFichas,
  normalizar,
} from '../../lib/conciergeBusca';

// Concierge › Gerenciar: a gestão escreve as fichas que a equipe (e depois o
// hóspede) consulta na busca local do Concierge, vê o que foi perguntado e
// não teve resposta e diz como chegar em cada suíte.

type Aba = 'fichas' | 'perguntas' | 'suites';

const ABAS: AbaModulo[] = [
  { id: 'fichas', label: 'Fichas', icon: BookOpen },
  { id: 'perguntas', label: 'Perguntas sem resposta', icon: HelpCircle },
  { id: 'suites', label: 'Suítes — como chegar', icon: MapPin },
];

const MAX_TITULO = 120;
const MAX_CONTEUDO = 5000;
const MAX_COMO_CHEGAR = 500;
const ID_RASCUNHO = '__rascunho__';


const dataBR = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' });

const primeiraLinha = (texto: string) => texto.split('\n').map((l) => l.trim()).find(Boolean) || '';

/** Ficha modelo ainda sem o conteúdo completo (vazia ou com os "__" para preencher). */
const aCompletar = (f: FichaConcierge) =>
  !f.conteudo.trim() || f.conteudo.includes('__') || /: $/m.test(f.conteudo) || /^\d+\. $/m.test(f.conteudo);

const linhaParaFicha = (l: Record<string, unknown>): FichaConcierge => ({
  id: String(l.id),
  categoria: (l.categoria as CategoriaConcierge) || 'outros',
  titulo: String(l.titulo ?? ''),
  conteudo: String(l.conteudo ?? ''),
  perguntas: Array.isArray(l.perguntas) ? (l.perguntas as string[]) : [],
  fotos: Array.isArray(l.fotos) ? (l.fotos as string[]) : [],
  visivel_hospede: Boolean(l.visivel_hospede),
  ativo: l.ativo !== false,
  ordem: Number(l.ordem) || 0,
});

const ordenarFichas = (a: FichaConcierge, b: FichaConcierge) =>
  a.ordem - b.ordem || a.titulo.localeCompare(b.titulo, 'pt-BR', { sensitivity: 'base' });

export default function ConciergeGestao() {
  const { user } = useAuth();
  if (!user || (user.profile !== 'gestor' && user.profile !== 'admin')) {
    return (
      <div className="space-y-6">
        <PageHeader titulo="Concierge › Gerenciar" />
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <EmptyState icon={EyeOff} titulo="Acesso restrito à gestão" descricao="Só gestores e administradores mantêm as fichas do Concierge." />
        </div>
      </div>
    );
  }
  if (!user.empresaId) {
    return (
      <div className="space-y-6">
        <PageHeader titulo="Concierge › Gerenciar" />
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <EmptyState icon={BookOpen} titulo="Nenhum hotel selecionado" descricao="Escolha um hotel para gerenciar as fichas do Concierge." />
        </div>
      </div>
    );
  }
  return <ConteudoConcierge empresaId={user.empresaId} usuarioId={user.id} />;
}

/* -------------------------------------------------------------------------- */

interface Rascunho {
  id: string | null;
  categoria: CategoriaConcierge;
  titulo: string;
  conteudo: string;
  perguntas: string[];
  fotos: string[];
  visivel_hospede: boolean;
  ativo: boolean;
  ordem: number;
}

function ConteudoConcierge({ empresaId, usuarioId }: { empresaId: string; usuarioId: string }) {
  const [aba, setAba] = useState<Aba>('fichas');
  const [fichas, setFichas] = useState<FichaConcierge[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);

  const carregarFichas = async () => {
    setCarregando(true);
    try {
      const linhas = await todasPaginas<Record<string, unknown>>((de, ate) =>
        supabase
          .from('concierge_fichas')
          .select('id, categoria, titulo, conteudo, perguntas, fotos, visivel_hospede, ativo, ordem')
          .eq('empresa_id', empresaId)
          .order('ordem')
          .order('id')
          .range(de, ate)
      );
      setFichas(linhas.map(linhaParaFicha).sort(ordenarFichas));
    } catch {
      notificar('Não foi possível carregar as fichas do Concierge. Verifique a conexão.', 'erro');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarFichas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  const proximaOrdem = () => (fichas.length ? Math.max(...fichas.map((f) => f.ordem)) + 1 : 0);

  const novaFicha = (inicial?: Partial<Rascunho>) =>
    setRascunho({
      id: null,
      categoria: 'outros',
      titulo: '',
      conteudo: '',
      perguntas: [],
      fotos: [],
      visivel_hospede: false,
      ativo: true,
      ordem: proximaOrdem(),
      ...inicial,
    });

  const editarFicha = (f: FichaConcierge) => setRascunho({ ...f, perguntas: [...f.perguntas], fotos: [...f.fotos] });

  const criarPelaPergunta = (termo: string) => {
    const t = termo.trim();
    const titulo = (t.charAt(0).toUpperCase() + t.slice(1)).replace(/\?+$/, '').slice(0, MAX_TITULO);
    novaFicha({ titulo, perguntas: [t] });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Concierge › Gerenciar"
        subtitulo="As fichas são o que a equipe encontra ao perguntar no Concierge (wi-fi, horários, como usar a TV, passeios). A busca roda no aparelho, sem IA: quanto melhor o título e os jeitos de perguntar, mais fácil achar."
        acoes={
          aba === 'fichas' && fichas.length > 0 ? (
            <button
              onClick={() => novaFicha()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700"
            >
              <Plus className="w-4 h-4" /> Nova ficha
            </button>
          ) : undefined
        }
      />

      <ModuleTabs modulo="gestao" abas={ABAS} ativa={aba} onChange={(id) => setAba(id as Aba)} />

      {aba === 'fichas' && (
        <AbaFichas
          empresaId={empresaId}
          usuarioId={usuarioId}
          fichas={fichas}
          carregando={carregando}
          recarregar={carregarFichas}
          onNova={() => novaFicha()}
          onEditar={editarFicha}
        />
      )}
      {aba === 'perguntas' && <AbaPerguntas empresaId={empresaId} fichas={fichas} onCriar={criarPelaPergunta} />}
      {aba === 'suites' && <AbaSuites empresaId={empresaId} />}

      {rascunho && (
        <FormFicha
          inicial={rascunho}
          empresaId={empresaId}
          usuarioId={usuarioId}
          outrasFichas={fichas.filter((f) => f.id !== rascunho.id)}
          onFechar={() => setRascunho(null)}
          onSalvo={() => {
            setRascunho(null);
            carregarFichas();
          }}
        />
      )}
    </div>
  );
}

/* --------------------------------- Fichas --------------------------------- */

function AbaFichas({
  empresaId,
  usuarioId,
  fichas,
  carregando,
  recarregar,
  onNova,
  onEditar,
}: {
  empresaId: string;
  usuarioId: string;
  fichas: FichaConcierge[];
  carregando: boolean;
  recarregar: () => void;
  onNova: () => void;
  onEditar: (f: FichaConcierge) => void;
}) {
  const [fechadas, setFechadas] = useState<Set<string>>(new Set());
  const [criandoModelo, setCriandoModelo] = useState(false);
  const [ocupada, setOcupada] = useState<string | null>(null);

  const grupos = useMemo(
    () =>
      CATEGORIAS_CONCIERGE.map((c) => ({ ...c, itens: fichas.filter((f) => f.categoria === c.id) })).filter(
        (g) => g.itens.length > 0
      ),
    [fichas]
  );

  const alternarGrupo = (id: string) =>
    setFechadas((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const criarModelos = async () => {
    setCriandoModelo(true);
    const agora = new Date().toISOString();
    const linhas = FICHAS_MODELO.map((f, i) => ({
      ...f,
      empresa_id: empresaId,
      ativo: true,
      ordem: i,
      atualizado_em: agora,
      atualizado_por: usuarioId,
    }));
    const { error } = await supabase.from('concierge_fichas').insert(linhas);
    setCriandoModelo(false);
    if (error) {
      notificar('Não foi possível criar as fichas modelo. Tente novamente.', 'erro');
      return;
    }
    notificar('Fichas modelo criadas. Agora complete o conteúdo de cada uma (os espaços com __).', 'sucesso');
    recarregar();
  };

  const alternarAtivo = async (f: FichaConcierge) => {
    setOcupada(f.id);
    const { error } = await supabase
      .from('concierge_fichas')
      .update({ ativo: !f.ativo, atualizado_em: new Date().toISOString(), atualizado_por: usuarioId })
      .eq('id', f.id);
    setOcupada(null);
    if (error) {
      notificar('Não foi possível alterar a ficha. Tente novamente.', 'erro');
      return;
    }
    notificar(f.ativo ? 'Ficha desativada: não aparece mais na busca.' : 'Ficha ativada: já aparece na busca.', 'sucesso');
    recarregar();
  };

  const excluir = async (f: FichaConcierge) => {
    if (!(await confirmar(`Excluir a ficha "${f.titulo}"? Não dá para desfazer. Se quiser só tirar da busca, use Desativar.`))) return;
    setOcupada(f.id);
    const { error } = await supabase.from('concierge_fichas').delete().eq('id', f.id);
    setOcupada(null);
    if (error) {
      notificar('Não foi possível excluir a ficha. Tente novamente.', 'erro');
      return;
    }
    notificar('Ficha excluída.', 'sucesso');
    recarregar();
  };

  if (carregando) return <LoadingState texto="Carregando fichas..." />;

  if (fichas.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <EmptyState
          icon={BookOpen}
          titulo="Nenhuma ficha cadastrada"
          descricao="Comece pelas fichas modelo com os assuntos que os hóspedes mais perguntam (wi-fi, check-in, café, TV...). Depois é só abrir cada uma e completar o conteúdo: os espaços marcados com __ são para preencher."
          acao={
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={criarModelos}
                disabled={criandoModelo}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" /> {criandoModelo ? 'Criando...' : 'Criar fichas modelo'}
              </button>
              <button
                onClick={onNova}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-50"
              >
                <Plus className="w-4 h-4" /> Nova ficha em branco
              </button>
            </div>
          }
        />
      </div>
    );
  }

  const pendentes = fichas.filter((f) => f.ativo && aCompletar(f)).length;

  return (
    <div className="space-y-3">
      {pendentes > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {pendentes === 1 ? '1 ficha ainda está' : `${pendentes} fichas ainda estão`} sem o conteúdo completo (marcadas como
          "A completar"). Abra e preencha os espaços com __.
        </div>
      )}
      {grupos.map((g) => {
        const aberto = !fechadas.has(g.id);
        return (
          <section key={g.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
            <button
              onClick={() => alternarGrupo(g.id)}
              className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-gray-50"
              aria-expanded={aberto}
            >
              <span className="flex items-center gap-2 font-semibold text-gray-800">
                {aberto ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                {g.nome}
              </span>
              <span className="text-xs text-gray-500">
                {g.itens.length} {g.itens.length === 1 ? 'ficha' : 'fichas'}
              </span>
            </button>
            {aberto && (
              <ul className="divide-y divide-gray-100 border-t border-gray-100">
                {g.itens.map((f) => (
                  <li key={f.id} className={`px-4 py-3 ${f.ativo ? '' : 'bg-gray-50'}`}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <button onClick={() => onEditar(f)} className="min-w-0 text-left flex-1">
                        <p className={`font-medium break-words ${f.ativo ? 'text-gray-800' : 'text-gray-500'}`}>{f.titulo}</p>
                        <p className="text-sm text-gray-500 truncate">{primeiraLinha(f.conteudo) || 'Sem conteúdo'}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {!f.ativo && <span className="px-2 py-0.5 rounded-full text-xs bg-gray-200 text-gray-700">Inativa</span>}
                          {f.visivel_hospede && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">Para hóspede</span>
                          )}
                          {aCompletar(f) && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800">A completar</span>
                          )}
                          {f.fotos.length > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-800">
                              <ImageIcon className="w-3 h-3" /> {f.fotos.length} {f.fotos.length === 1 ? 'foto' : 'fotos'}
                            </span>
                          )}
                        </div>
                      </button>
                      <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                        <button
                          onClick={() => onEditar(f)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 text-xs hover:bg-gray-50"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Editar
                        </button>
                        <button
                          onClick={() => alternarAtivo(f)}
                          disabled={ocupada === f.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 disabled:opacity-50"
                        >
                          {f.ativo ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          {f.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                        <button
                          onClick={() => excluir(f)}
                          disabled={ocupada === f.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-red-200 text-red-700 text-xs hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Excluir
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

/* ------------------------------ Formulário -------------------------------- */

interface FotoNova {
  file: File;
  preview: string;
}

function FormFicha({
  inicial,
  empresaId,
  usuarioId,
  outrasFichas,
  onFechar,
  onSalvo,
}: {
  inicial: Rascunho;
  empresaId: string;
  usuarioId: string;
  outrasFichas: FichaConcierge[];
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const [r, setR] = useState<Rascunho>(inicial);
  const [novaPergunta, setNovaPergunta] = useState('');
  const [fotosNovas, setFotosNovas] = useState<FotoNova[]>([]);
  const [teste, setTeste] = useState('');
  const [salvando, setSalvando] = useState(false);

  // libera as prévias ao fechar
  const fotosRef = useRef<FotoNova[]>([]);
  fotosRef.current = fotosNovas;
  useEffect(() => () => fotosRef.current.forEach((f) => URL.revokeObjectURL(f.preview)), []);

  const mudar = <K extends keyof Rascunho>(campo: K, valor: Rascunho[K]) => setR((x) => ({ ...x, [campo]: valor }));

  const adicionarPergunta = (texto: string) => {
    const t = texto.trim().slice(0, 200);
    if (!t) return;
    if (r.perguntas.some((p) => normalizar(p) === normalizar(t))) {
      setNovaPergunta('');
      return;
    }
    mudar('perguntas', [...r.perguntas, t]);
    setNovaPergunta('');
  };

  const escolherFotos = (files: FileList | null) => {
    if (!files?.length) return;
    const novas = Array.from(files).map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setFotosNovas((x) => [...x, ...novas]);
  };

  const removerFotoNova = (i: number) =>
    setFotosNovas((x) => {
      URL.revokeObjectURL(x[i].preview);
      return x.filter((_, j) => j !== i);
    });

  // a ficha como ficaria se salvasse agora (inclui o "jeito de perguntar" ainda digitado)
  const perguntasFinais = useMemo(() => {
    const pend = novaPergunta.trim();
    return pend && !r.perguntas.some((p) => normalizar(p) === normalizar(pend)) ? [...r.perguntas, pend.slice(0, 200)] : r.perguntas;
  }, [r.perguntas, novaPergunta]);

  const resultadoTeste = useMemo(() => {
    if (!teste.trim()) return null;
    const esta: FichaConcierge = {
      id: r.id || ID_RASCUNHO,
      categoria: r.categoria,
      titulo: r.titulo,
      conteudo: r.conteudo,
      perguntas: perguntasFinais,
      fotos: r.fotos,
      visivel_hospede: r.visivel_hospede,
      ativo: true, // testa como se estivesse ativa; o aviso abaixo lembra quando não está
      ordem: r.ordem,
    };
    const res = buscarFichas(teste, [esta, ...outrasFichas]);
    const posicao = res.findIndex((x) => x.ficha.id === esta.id);
    return { res, posicao, idEsta: esta.id };
  }, [teste, r, perguntasFinais, outrasFichas]);

  const salvar = async () => {
    const titulo = r.titulo.trim();
    if (titulo.length < 2) {
      notificar('Informe um título com pelo menos 2 letras.', 'aviso');
      return;
    }
    if (titulo.length > MAX_TITULO) {
      notificar(`O título pode ter no máximo ${MAX_TITULO} caracteres.`, 'aviso');
      return;
    }
    if (r.conteudo.length > MAX_CONTEUDO) {
      notificar(`O conteúdo pode ter no máximo ${MAX_CONTEUDO} caracteres.`, 'aviso');
      return;
    }
    setSalvando(true);
    try {
      let fotos = [...r.fotos];
      if (fotosNovas.length) {
        const urls: string[] = [];
        const falharam: FotoNova[] = [];
        for (const f of fotosNovas) {
          const url = await fotoUploadService.uploadFoto(f.file, 'concierge');
          if (url) {
            urls.push(url);
            URL.revokeObjectURL(f.preview);
          } else {
            falharam.push(f);
          }
        }
        if (falharam.length > 0) {
          notificar(
            `Não foi possível enviar ${falharam.length === 1 ? '1 foto' : `${falharam.length} fotos`}. Tente de novo ou remova a foto para salvar.`,
            'erro'
          );
          // as que subiram já ficam na ficha (não reenviar); só as que falharam continuam pendentes
          setR((x) => ({ ...x, fotos: [...x.fotos, ...urls] }));
          setFotosNovas(falharam);
          setSalvando(false);
          return;
        }
        fotos = [...fotos, ...urls];
      }

      const dados = {
        categoria: r.categoria,
        titulo,
        conteudo: r.conteudo.replace(/\s+$/, ''),
        perguntas: perguntasFinais.map((p) => p.trim()).filter(Boolean),
        fotos,
        visivel_hospede: r.visivel_hospede,
        ativo: r.ativo,
        ordem: Number.isFinite(r.ordem) ? Math.round(r.ordem) : 0,
        atualizado_em: new Date().toISOString(),
        atualizado_por: usuarioId,
      };
      const { error } = r.id
        ? await supabase.from('concierge_fichas').update(dados).eq('id', r.id)
        : await supabase.from('concierge_fichas').insert({ ...dados, empresa_id: empresaId });
      if (error) throw error;
      notificar(r.id ? 'Ficha atualizada.' : 'Ficha criada.', 'sucesso');
      onSalvo();
    } catch {
      notificar('Não foi possível salvar a ficha. Verifique a conexão e tente novamente.', 'erro');
      setSalvando(false);
    }
  };

  const fechar = async () => {
    if (salvando) return;
    const mudou =
      JSON.stringify({ ...r, perguntas: perguntasFinais }) !== JSON.stringify(inicial) || fotosNovas.length > 0;
    if (mudou && !(await confirmar('Fechar sem salvar? As alterações desta ficha serão perdidas.', { perigoso: true, textoConfirmar: 'Fechar sem salvar' }))) return;
    onFechar();
  };

  const campo =
    'mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500';

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-lg shadow-2xl max-h-[94vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">{r.id ? 'Editar ficha' : 'Nova ficha'}</h2>
          <button onClick={fechar} className="p-1 rounded-lg text-gray-500 hover:bg-gray-100" aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block sm:col-span-1">
              <span className="text-sm font-medium text-gray-700">Categoria</span>
              <select
                value={r.categoria}
                onChange={(e) => mudar('categoria', e.target.value as CategoriaConcierge)}
                className={campo}
              >
                {CATEGORIAS_CONCIERGE.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-gray-700">Título *</span>
              <input
                value={r.titulo}
                onChange={(e) => mudar('titulo', e.target.value.slice(0, MAX_TITULO))}
                placeholder="Ex.: Café da manhã"
                className={campo}
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Conteúdo</span>
            <textarea
              value={r.conteudo}
              onChange={(e) => mudar('conteudo', e.target.value.slice(0, MAX_CONTEUDO))}
              rows={7}
              placeholder={'Ex.:\nServido das 7h às 10h30, no restaurante do térreo.\nAos domingos, até as 11h.'}
              className={campo}
            />
            <span className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Use uma linha por item. Troque os __ pela informação do hotel.</span>
              <span className="tabular-nums">
                {r.conteudo.length}/{MAX_CONTEUDO}
              </span>
            </span>
          </label>

          <div>
            <span className="text-sm font-medium text-gray-700">Jeitos de perguntar</span>
            <p className="text-xs text-gray-500">
              Escreva como a equipe ou o hóspede perguntaria: "que horas é o café?". Digite e aperte Enter para adicionar.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5 p-2 border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-purple-500">
              {r.perguntas.map((p, i) => (
                <span key={`${p}-${i}`} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-purple-100 text-purple-800 text-xs">
                  {p}
                  <button
                    type="button"
                    onClick={() => mudar('perguntas', r.perguntas.filter((_, j) => j !== i))}
                    className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-purple-200"
                    aria-label={`Remover "${p}"`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <input
                value={novaPergunta}
                onChange={(e) => setNovaPergunta(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    adicionarPergunta(novaPergunta);
                  } else if (e.key === 'Backspace' && !novaPergunta && r.perguntas.length) {
                    mudar('perguntas', r.perguntas.slice(0, -1));
                  }
                }}
                onBlur={() => adicionarPergunta(novaPergunta)}
                enterKeyHint="enter"
                placeholder={r.perguntas.length ? 'Outro jeito...' : 'Ex.: que horas é o café?'}
                className="flex-1 min-w-[10rem] px-1 py-1 text-sm outline-none"
              />
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Fotos</p>
            {/* câmera e galeria separadas: com capture o Android abre só a câmera */}
            <input
              id="concierge-foto-camera"
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                escolherFotos(e.target.files);
                e.target.value = '';
              }}
            />
            <input
              id="concierge-foto-galeria"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                escolherFotos(e.target.files);
                e.target.value = '';
              }}
            />
            {(r.fotos.length > 0 || fotosNovas.length > 0) && (
              <div className="flex flex-wrap gap-3 mb-3">
                {r.fotos.map((url, i) => (
                  <div key={url} className="relative">
                    <img src={url} alt={`Foto ${i + 1}`} className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
                    <button
                      type="button"
                      onClick={() => mudar('fotos', r.fotos.filter((_, j) => j !== i))}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center"
                      aria-label="Remover foto"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {fotosNovas.map((f, i) => (
                  <div key={f.preview} className="relative">
                    <img src={f.preview} alt="Foto nova" className="w-20 h-20 object-cover rounded-lg border-2 border-dashed border-purple-300" />
                    <button
                      type="button"
                      onClick={() => removerFotoNova(i)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center"
                      aria-label="Remover foto"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <label
                htmlFor="concierge-foto-camera"
                className="inline-flex items-center gap-2 px-4 py-2 border border-purple-300 text-purple-800 bg-purple-50 rounded-md cursor-pointer hover:bg-purple-100 text-sm"
              >
                <Camera className="w-4 h-4" /> Tirar foto
              </label>
              <label
                htmlFor="concierge-foto-galeria"
                className="inline-flex items-center gap-2 px-4 py-2 border border-purple-300 text-purple-800 bg-white rounded-md cursor-pointer hover:bg-purple-50 text-sm"
              >
                <ImageIcon className="w-4 h-4" /> Galeria
              </label>
            </div>
            {fotosNovas.length > 0 && <p className="text-xs text-gray-500 mt-1">As fotos novas são enviadas ao salvar.</p>}
          </div>

          <div className="space-y-2">
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={r.visivel_hospede}
                onChange={(e) => mudar('visivel_hospede', e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              Mostrar também para o hóspede (QR Code no quarto)
            </label>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={r.ativo}
                  onChange={(e) => mudar('ativo', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                Ativa (aparece na busca)
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                Ordem
                <input
                  type="number"
                  inputMode="numeric"
                  value={Number.isFinite(r.ordem) ? r.ordem : ''}
                  onChange={(e) => mudar('ordem', e.target.value === '' ? 0 : Number(e.target.value))}
                  className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </label>
            </div>
          </div>

          <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
            <p className="text-sm font-medium text-purple-900 flex items-center gap-2">
              <Search className="w-4 h-4" /> Teste a busca
            </p>
            <p className="text-xs text-purple-800 mb-2">Escreva uma pergunta e veja se esta ficha seria encontrada (com o que está no formulário agora, mesmo sem salvar).</p>
            <input
              value={teste}
              onChange={(e) => setTeste(e.target.value)}
              placeholder="Ex.: até que horas tem café?"
              className="w-full px-3 py-2 border border-purple-200 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {resultadoTeste && (
              <div className="mt-2 text-sm">
                {resultadoTeste.posicao === 0 ? (
                  <p className="text-green-700 font-medium flex items-center gap-1">
                    <Check className="w-4 h-4" /> Encontrada: esta ficha é a primeira resposta.
                  </p>
                ) : resultadoTeste.posicao > 0 ? (
                  <p className="text-amber-700 font-medium">
                    Encontrada, mas em {resultadoTeste.posicao + 1}º lugar. Acrescente esse jeito de perguntar para ela subir.
                  </p>
                ) : (
                  <p className="text-red-700 font-medium">
                    Esta ficha não seria encontrada. Acrescente essa pergunta (ou palavras dela) nos jeitos de perguntar ou no título.
                  </p>
                )}
                {!r.ativo && <p className="text-xs text-gray-600 mt-1">Atenção: a ficha está inativa e só aparece na busca depois de ativada.</p>}
                {resultadoTeste.res.length > 0 && (
                  <ol className="mt-1 list-decimal list-inside text-xs text-gray-700 space-y-0.5">
                    {resultadoTeste.res.map((x) => (
                      <li key={x.ficha.id} className={x.ficha.id === resultadoTeste.idEsta ? 'font-semibold text-purple-900' : ''}>
                        {x.ficha.titulo || '(sem título)'}
                        {x.ficha.id === resultadoTeste.idEsta ? ' — esta ficha' : ''}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 justify-end px-5 py-4 border-t border-gray-200">
          <button
            onClick={fechar}
            disabled={salvando}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={salvando}
            className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
          >
            {salvando ? (fotosNovas.length ? 'Enviando fotos...' : 'Salvando...') : 'Salvar ficha'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- Perguntas sem resposta ------------------------ */

interface Busca {
  id: string;
  termo: string;
  encontrou: boolean;
  ficha_id: string | null;
  criado_em: string;
}

interface GrupoBusca {
  chave: string;
  termo: string;
  total: number;
  ultima: string;
  fichaId: string | null;
}

function agrupar(buscas: Busca[]): GrupoBusca[] {
  const mapa = new Map<string, GrupoBusca>();
  // buscas vêm da mais recente para a mais antiga: o primeiro termo visto é o mais recente
  for (const b of buscas) {
    const chave = normalizar(b.termo);
    if (!chave) continue;
    const g = mapa.get(chave);
    if (g) {
      g.total++;
      if (b.criado_em > g.ultima) g.ultima = b.criado_em;
    } else {
      mapa.set(chave, { chave, termo: b.termo.trim(), total: 1, ultima: b.criado_em, fichaId: b.ficha_id });
    }
  }
  return [...mapa.values()].sort((a, b) => b.total - a.total || b.ultima.localeCompare(a.ultima));
}

function AbaPerguntas({
  empresaId,
  fichas,
  onCriar,
}: {
  empresaId: string;
  fichas: FichaConcierge[];
  onCriar: (termo: string) => void;
}) {
  const [buscas, setBuscas] = useState<Busca[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = async () => {
    setCarregando(true);
    try {
      const desde = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const linhas = await todasPaginas<Busca>((de, ate) =>
        supabase
          .from('concierge_buscas')
          .select('id, termo, encontrou, ficha_id, criado_em')
          .eq('empresa_id', empresaId)
          .gte('criado_em', desde)
          .order('criado_em', { ascending: false })
          .order('id')
          .range(de, ate)
      );
      setBuscas(linhas);
    } catch {
      notificar('Não foi possível carregar as perguntas feitas no Concierge. Verifique a conexão.', 'erro');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  const semResposta = useMemo(() => agrupar(buscas.filter((b) => !b.encontrou)), [buscas]);
  const maisBuscadas = useMemo(() => agrupar(buscas.filter((b) => b.encontrou)).slice(0, 10), [buscas]);
  const tituloFicha = useMemo(() => new Map(fichas.map((f) => [f.id, f.titulo])), [fichas]);
  // pergunta que já seria respondida pelas fichas de hoje (ficha criada depois da busca)
  const jaRespondida = (termo: string) => buscarFichas(termo, fichas, 1)[0]?.ficha.titulo;

  if (carregando) return <LoadingState texto="Carregando perguntas..." />;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-800">Perguntas sem resposta</h3>
            <p className="text-sm text-gray-500">Últimos 30 dias. Crie uma ficha para o que mais se repete.</p>
          </div>
          <button
            onClick={carregar}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
            aria-label="Atualizar"
            title="Atualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        {semResposta.length === 0 ? (
          <EmptyState
            icon={HelpCircle}
            titulo="Nenhuma pergunta sem resposta"
            descricao="Nos últimos 30 dias todas as perguntas feitas no Concierge encontraram uma ficha."
          />
        ) : (
          <ul className="divide-y divide-gray-100">
            {semResposta.map((g) => {
              const agora = jaRespondida(g.termo);
              return (
                <li key={g.chave} className="px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 break-words">"{g.termo}"</p>
                    <p className="text-xs text-gray-500">
                      {g.total} {g.total === 1 ? 'vez' : 'vezes'} · última em {dataBR(g.ultima)}
                    </p>
                    {agora && <p className="text-xs text-green-700 mt-0.5">Hoje já seria respondida por "{agora}".</p>}
                  </div>
                  <button
                    onClick={() => onCriar(g.termo)}
                    className="self-start sm:self-center inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" /> Criar ficha
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Mais buscadas</h3>
          <p className="text-sm text-gray-500">As 10 perguntas mais feitas que encontraram resposta (últimos 30 dias).</p>
        </div>
        {maisBuscadas.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-500 text-center">Ainda não há buscas com resposta neste período.</p>
        ) : (
          <ol className="divide-y divide-gray-100">
            {maisBuscadas.map((g, i) => (
              <li key={g.chave} className="px-4 py-2.5 flex items-center gap-3">
                <span className="w-6 text-right text-sm font-semibold text-gray-400 tabular-nums">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-800 break-words">"{g.termo}"</p>
                  {g.fichaId && tituloFicha.get(g.fichaId) && (
                    <p className="text-xs text-gray-500">Respondida por "{tituloFicha.get(g.fichaId)}"</p>
                  )}
                </div>
                <span className="text-sm font-medium text-gray-700 tabular-nums whitespace-nowrap">
                  {g.total} {g.total === 1 ? 'vez' : 'vezes'}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

/* ---------------------------- Suítes: como chegar --------------------------- */

function AbaSuites({ empresaId }: { empresaId: string }) {
  const [suites, setSuites] = useState<SuiteConcierge[]>([]);
  const [textos, setTextos] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState<string | null>(null);
  const [salvas, setSalvas] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const carregar = async () => {
      setCarregando(true);
      try {
        const linhas = await todasPaginas<SuiteConcierge>((de, ate) =>
          supabase
            .from('suites')
            .select('id, name, type, floor, como_chegar')
            .eq('empresa_id', empresaId)
            .order('id')
            .range(de, ate)
        );
        const ordenadas = [...linhas].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { numeric: true, sensitivity: 'base' }));
        setSuites(ordenadas);
        setTextos(Object.fromEntries(ordenadas.map((s) => [s.id, s.como_chegar || ''])));
      } catch {
        notificar('Não foi possível carregar as suítes. Verifique a conexão.', 'erro');
      } finally {
        setCarregando(false);
      }
    };
    carregar();
  }, [empresaId]);

  const salvar = async (s: SuiteConcierge) => {
    const texto = (textos[s.id] ?? '').trim();
    if (texto === (s.como_chegar || '').trim()) return;
    setSalvando(s.id);
    const { error } = await supabase
      .from('suites')
      .update({ como_chegar: texto || null })
      .eq('id', s.id);
    setSalvando(null);
    if (error) {
      notificar(`Não foi possível salvar o caminho da ${s.name}. Tente novamente.`, 'erro');
      return;
    }
    setSuites((lista) => lista.map((x) => (x.id === s.id ? { ...x, como_chegar: texto || null } : x)));
    setTextos((t) => ({ ...t, [s.id]: texto }));
    setSalvas((x) => new Set(x).add(s.id));
    setTimeout(
      () =>
        setSalvas((x) => {
          const n = new Set(x);
          n.delete(s.id);
          return n;
        }),
      2500
    );
  };

  if (carregando) return <LoadingState texto="Carregando suítes..." />;

  if (suites.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <EmptyState icon={MapPin} titulo="Nenhuma suíte cadastrada" descricao="Cadastre as suítes do hotel para descrever como chegar em cada uma." />
      </div>
    );
  }

  const preenchidas = suites.filter((s) => (s.como_chegar || '').trim()).length;

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
        Quando alguém pergunta "onde fica a suíte 12?", o Concierge responde com o texto abaixo. {preenchidas} de {suites.length}{' '}
        {suites.length === 1 ? 'suíte preenchida' : 'suítes preenchidas'}. Salva ao sair do campo.
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {suites.map((s) => {
          const texto = textos[s.id] ?? '';
          const alterado = texto.trim() !== (s.como_chegar || '').trim();
          return (
            <div key={s.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
              <div className="flex items-baseline justify-between gap-2 mb-1.5">
                <p className="font-semibold text-gray-800">{s.name}</p>
                <p className="text-xs text-gray-500 text-right">
                  {[s.type, s.floor != null ? `${s.floor}º andar` : ''].filter(Boolean).join(' · ')}
                </p>
              </div>
              <textarea
                value={texto}
                onChange={(e) => setTextos((t) => ({ ...t, [s.id]: e.target.value.slice(0, MAX_COMO_CHEGAR) }))}
                onBlur={() => salvar(s)}
                rows={2}
                placeholder="Ex.: 2º andar, saindo do elevador à esquerda, terceira porta"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <div className="flex items-center justify-between mt-1 min-h-[1.75rem]">
                <span className="text-xs text-gray-400 tabular-nums">
                  {texto.length}/{MAX_COMO_CHEGAR}
                </span>
                {salvando === s.id ? (
                  <span className="text-xs text-gray-500">Salvando...</span>
                ) : salvas.has(s.id) && !alterado ? (
                  <span className="inline-flex items-center gap-1 text-xs text-green-700">
                    <Check className="w-3.5 h-3.5" /> Salvo
                  </span>
                ) : alterado ? (
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => salvar(s)}
                    className="px-3 py-1 rounded-md bg-purple-600 text-white text-xs font-medium hover:bg-purple-700"
                  >
                    Salvar
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, Layers, Plus, Trash2, UserCog, X, AlertTriangle, ShieldAlert } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { notificar, confirmar } from '../../lib/feedback';
import { todasPaginas, emLotes } from '../../lib/paginacao';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../ui/PageHeader';
import { LoadingState, EmptyState } from '../ui/Estados';

// Grupos de hotéis (só o administrador do sistema).
// Um cliente com vários hotéis: cada hotel é uma linha em `empresas`; o grupo
// junta os hotéis (empresas.grupo_id) e os gestores corporativos
// (usuarios_grupos) trocam de hotel pelo menu e veem o Painel do grupo.

interface Grupo {
  id: string;
  nome: string;
  criado_em: string;
}

interface Hotel {
  id: string;
  nome: string;
  ativo: boolean;
  grupo_id: string | null;
}

interface Membro {
  usuario_id: string;
  grupo_id: string;
}

interface Pessoa {
  id: string;
  name: string;
  login: string | null;
  profile: string;
  active: boolean;
  empresa_id: string | null;
}

const NOME_MIN = 2;
const NOME_MAX = 80;

function porNome<T extends { nome: string }>(a: T, b: T) {
  return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
}

function mensagemErro(acao: string, erro: unknown): string {
  const e = erro as { code?: string; message?: string } | null;
  if (e?.code === '23514') return `Erro ao ${acao}: o nome deve ter de ${NOME_MIN} a ${NOME_MAX} caracteres.`;
  if (e?.code === '23505') return `Erro ao ${acao}: esse registro já existe.`;
  if (e?.code === '42501') return `Erro ao ${acao}: sem permissão.`;
  return `Erro ao ${acao}. Tente novamente.`;
}

function nomeValido(nome: string): string | null {
  const n = nome.trim();
  if (n.length < NOME_MIN) return `Informe um nome com pelo menos ${NOME_MIN} caracteres.`;
  if (n.length > NOME_MAX) return `O nome pode ter no máximo ${NOME_MAX} caracteres.`;
  return null;
}

const GruposHoteis: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.profile === 'admin' && !user?.empresaId;

  if (!isSuperAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader titulo="Grupos de hotéis" />
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <EmptyState icon={ShieldAlert} titulo="Acesso restrito ao administrador do sistema" />
        </div>
      </div>
    );
  }

  return <GruposHoteisAdmin />;
};

const GruposHoteisAdmin: React.FC = () => {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [hoteis, setHoteis] = useState<Hotel[]>([]);
  const [membros, setMembros] = useState<Membro[]>([]);
  const [pessoas, setPessoas] = useState<Record<string, Pessoa>>({});
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [novoNome, setNovoNome] = useState('');

  const carregar = useCallback(async (mostrarCarregando = true) => {
    if (mostrarCarregando) setCarregando(true);
    try {
      const [gs, hs, ms] = await Promise.all([
        todasPaginas<Grupo>((de, ate) =>
          supabase.from('grupos_empresas').select('id, nome, criado_em').order('id').range(de, ate)
        ),
        todasPaginas<Hotel>((de, ate) =>
          supabase.from('empresas').select('id, nome, ativo, grupo_id').order('id').range(de, ate)
        ),
        todasPaginas<Membro>((de, ate) =>
          supabase.from('usuarios_grupos').select('usuario_id, grupo_id').order('usuario_id').order('grupo_id').range(de, ate)
        ),
      ]);

      // pessoas que podem ser corporativas: gestores/admins ativos dos hotéis agrupados
      const idsHoteisAgrupados = hs.filter((h) => h.grupo_id).map((h) => h.id);
      const candidatos = idsHoteisAgrupados.length
        ? await emLotes<Pessoa>(idsHoteisAgrupados, (lote) =>
            supabase
              .from('usuarios')
              .select('id, name, login, profile, active, empresa_id')
              .in('profile', ['gestor', 'admin'])
              .eq('active', true)
              .in('empresa_id', lote)
          )
        : [];
      const mapa: Record<string, Pessoa> = {};
      candidatos.forEach((p) => { mapa[p.id] = p; });

      // membros atuais (podem estar inativos ou em outro hotel)
      const faltando = Array.from(new Set(ms.map((m) => m.usuario_id))).filter((id) => !mapa[id]);
      if (faltando.length) {
        const extras = await emLotes<Pessoa>(faltando, (lote) =>
          supabase.from('usuarios').select('id, name, login, profile, active, empresa_id').in('id', lote)
        );
        extras.forEach((p) => { mapa[p.id] = p; });
      }

      setGrupos([...gs].sort(porNome));
      setHoteis([...hs].sort(porNome));
      setMembros(ms);
      setPessoas(mapa);
      setErroCarga(false);
    } catch (erro) {
      console.error('Erro ao carregar grupos de hotéis:', erro);
      setErroCarga(true);
      notificar('Erro ao carregar os grupos de hotéis.', 'erro');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const nomeGrupo = useMemo(() => {
    const m: Record<string, string> = {};
    grupos.forEach((g) => { m[g.id] = g.nome; });
    return m;
  }, [grupos]);

  const nomeHotel = useMemo(() => {
    const m: Record<string, string> = {};
    hoteis.forEach((h) => { m[h.id] = h.nome; });
    return m;
  }, [hoteis]);

  const executar = async (chave: string, acao: () => Promise<boolean | void>) => {
    if (ocupado) return;
    setOcupado(chave);
    try {
      const recarregar = await acao();
      if (recarregar !== false) await carregar(false);
    } finally {
      setOcupado(null);
    }
  };

  const criarGrupo = (e: React.FormEvent) => {
    e.preventDefault();
    const problema = nomeValido(novoNome);
    if (problema) {
      notificar(problema, 'aviso');
      return;
    }
    executar('novo', async () => {
      const { error } = await supabase.from('grupos_empresas').insert({ nome: novoNome.trim() });
      if (error) {
        console.error(error);
        notificar(mensagemErro('criar o grupo', error), 'erro');
        return false;
      }
      setNovoNome('');
      notificar('Grupo criado com sucesso.', 'sucesso');
    });
  };

  const renomearGrupo = (grupo: Grupo, nome: string) =>
    executar(`nome-${grupo.id}`, async () => {
      const { error } = await supabase.from('grupos_empresas').update({ nome: nome.trim() }).eq('id', grupo.id);
      if (error) {
        console.error(error);
        notificar(mensagemErro('renomear o grupo', error), 'erro');
        return;
      }
      notificar('Nome do grupo atualizado.', 'sucesso');
    });

  const excluirGrupo = async (grupo: Grupo) => {
    const ok = await confirmar(
      `Excluir o grupo "${grupo.nome}"?\n\nOs hotéis continuam funcionando normalmente — só o agrupamento é desfeito. ` +
        'Os gestores corporativos deixam de trocar entre esses hotéis e o Painel do grupo some.',
      { perigoso: true, textoConfirmar: 'Excluir grupo' }
    );
    if (!ok) return;
    executar(`excluir-${grupo.id}`, async () => {
      const { error } = await supabase.from('grupos_empresas').delete().eq('id', grupo.id);
      if (error) {
        console.error(error);
        notificar(mensagemErro('excluir o grupo', error), 'erro');
        return;
      }
      notificar('Grupo excluído. Os hotéis continuam ativos.', 'sucesso');
    });
  };

  const adicionarHotel = (grupo: Grupo, hotelId: string) =>
    executar(`hotel-${grupo.id}`, async () => {
      // só entra se ainda não estiver em nenhum grupo (evita hotel em dois grupos)
      const { data, error } = await supabase
        .from('empresas')
        .update({ grupo_id: grupo.id })
        .eq('id', hotelId)
        .is('grupo_id', null)
        .select('id');
      if (error) {
        console.error(error);
        notificar(mensagemErro('adicionar o hotel', error), 'erro');
        return;
      }
      if (!data || data.length === 0) {
        notificar('Não foi possível adicionar: esse hotel já está em outro grupo.', 'aviso');
        return;
      }
      notificar(`Hotel "${nomeHotel[hotelId] ?? ''}" adicionado ao grupo.`, 'sucesso');
    });

  const removerHotel = async (grupo: Grupo, hotel: Hotel) => {
    const ok = await confirmar(
      `Remover o hotel "${hotel.nome}" do grupo "${grupo.nome}"?\n\nO hotel continua funcionando normalmente; ` +
        'os gestores corporativos do grupo só deixam de acessá-lo pela troca de hotel.',
      { perigoso: true, textoConfirmar: 'Remover hotel' }
    );
    if (!ok) return;
    executar(`hotel-${grupo.id}`, async () => {
      const { error } = await supabase
        .from('empresas')
        .update({ grupo_id: null })
        .eq('id', hotel.id)
        .eq('grupo_id', grupo.id);
      if (error) {
        console.error(error);
        notificar(mensagemErro('remover o hotel', error), 'erro');
        return;
      }
      notificar('Hotel removido do grupo.', 'sucesso');
    });
  };

  const adicionarMembro = (grupo: Grupo, usuarioId: string) =>
    executar(`membro-${grupo.id}`, async () => {
      const { error } = await supabase.from('usuarios_grupos').insert({ usuario_id: usuarioId, grupo_id: grupo.id });
      if (error) {
        console.error(error);
        notificar(
          error.code === '23505'
            ? 'Essa pessoa já é gestora corporativa deste grupo.'
            : mensagemErro('adicionar o gestor corporativo', error),
          error.code === '23505' ? 'aviso' : 'erro'
        );
        return;
      }
      notificar(`${pessoas[usuarioId]?.name ?? 'Gestor'} adicionado como gestor corporativo.`, 'sucesso');
    });

  const removerMembro = async (grupo: Grupo, usuarioId: string) => {
    const p = pessoas[usuarioId];
    const hotelAtual = p?.empresa_id ? nomeHotel[p.empresa_id] : null;
    const ok = await confirmar(
      `Remover ${p?.name ?? 'esta pessoa'} dos gestores corporativos de "${grupo.nome}"?` +
        (hotelAtual ? `\n\nEla continua no hotel em que está agora (${hotelAtual}), sem trocar para os outros.` : ''),
      { perigoso: true, textoConfirmar: 'Remover gestor' }
    );
    if (!ok) return;
    executar(`membro-${grupo.id}`, async () => {
      const { error } = await supabase
        .from('usuarios_grupos')
        .delete()
        .eq('usuario_id', usuarioId)
        .eq('grupo_id', grupo.id);
      if (error) {
        console.error(error);
        notificar(mensagemErro('remover o gestor corporativo', error), 'erro');
        return;
      }
      notificar('Gestor corporativo removido.', 'sucesso');
    });
  };

  const totalHoteisAgrupados = hoteis.filter((h) => h.grupo_id).length;

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Grupos de hotéis"
        subtitulo="Agrupe os hotéis do mesmo cliente. Os gestores corporativos trocam de hotel pelo menu e veem o Painel do grupo, com os números de todos os hotéis juntos."
      />

      {/* Novo grupo */}
      <form
        onSubmit={criarGrupo}
        className="bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-6 flex flex-col sm:flex-row gap-3 sm:items-end"
      >
        <div className="flex-1 min-w-0">
          <label htmlFor="novo-grupo" className="block text-sm font-medium text-gray-700 mb-1">
            Novo grupo
          </label>
          <input
            id="novo-grupo"
            type="text"
            value={novoNome}
            maxLength={NOME_MAX}
            onChange={(e) => setNovoNome(e.target.value)}
            placeholder="Ex.: Rede Serra Gaúcha"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          disabled={!!ocupado || carregando}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors duration-200 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>{ocupado === 'novo' ? 'Criando...' : 'Criar grupo'}</span>
        </button>
      </form>

      {carregando ? (
        <LoadingState texto="Carregando grupos..." />
      ) : erroCarga ? (
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <EmptyState
            icon={AlertTriangle}
            titulo="Não foi possível carregar os grupos"
            descricao="Verifique a conexão e tente novamente."
            acao={
              <button
                onClick={() => carregar()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                Tentar novamente
              </button>
            }
          />
        </div>
      ) : grupos.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <EmptyState
            icon={Layers}
            titulo="Nenhum grupo cadastrado"
            descricao="Crie um grupo acima e adicione os hotéis do mesmo cliente."
          />
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-600">
            {grupos.length} {grupos.length === 1 ? 'grupo' : 'grupos'} · {totalHoteisAgrupados}{' '}
            {totalHoteisAgrupados === 1 ? 'hotel agrupado' : 'hotéis agrupados'}
          </p>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
            {grupos.map((grupo) => {
              const hoteisDoGrupo = hoteis.filter((h) => h.grupo_id === grupo.id);
              const idsDoGrupo = new Set(hoteisDoGrupo.map((h) => h.id));
              const membrosDoGrupo = membros
                .filter((m) => m.grupo_id === grupo.id)
                .map((m) => m.usuario_id)
                .sort((a, b) => (pessoas[a]?.name ?? '').localeCompare(pessoas[b]?.name ?? '', 'pt-BR'));
              const idsMembros = new Set(membrosDoGrupo);
              const elegiveis = Object.values(pessoas)
                .filter(
                  (p) =>
                    p.active &&
                    (p.profile === 'gestor' || p.profile === 'admin') &&
                    p.empresa_id &&
                    idsDoGrupo.has(p.empresa_id) &&
                    !idsMembros.has(p.id)
                )
                .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
              const hoteisParaAdicionar = hoteis.filter((h) => h.ativo && h.grupo_id !== grupo.id);
              return (
                <CartaoGrupo
                  key={grupo.id}
                  grupo={grupo}
                  hoteisDoGrupo={hoteisDoGrupo}
                  hoteisParaAdicionar={hoteisParaAdicionar}
                  membrosDoGrupo={membrosDoGrupo}
                  elegiveis={elegiveis}
                  pessoas={pessoas}
                  nomeGrupo={nomeGrupo}
                  nomeHotel={nomeHotel}
                  ocupado={ocupado}
                  onRenomear={(nome) => renomearGrupo(grupo, nome)}
                  onExcluir={() => excluirGrupo(grupo)}
                  onAdicionarHotel={(id) => adicionarHotel(grupo, id)}
                  onRemoverHotel={(h) => removerHotel(grupo, h)}
                  onAdicionarMembro={(id) => adicionarMembro(grupo, id)}
                  onRemoverMembro={(id) => removerMembro(grupo, id)}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

interface CartaoGrupoProps {
  grupo: Grupo;
  hoteisDoGrupo: Hotel[];
  hoteisParaAdicionar: Hotel[];
  membrosDoGrupo: string[];
  elegiveis: Pessoa[];
  pessoas: Record<string, Pessoa>;
  nomeGrupo: Record<string, string>;
  nomeHotel: Record<string, string>;
  ocupado: string | null;
  onRenomear: (nome: string) => void;
  onExcluir: () => void;
  onAdicionarHotel: (id: string) => void;
  onRemoverHotel: (h: Hotel) => void;
  onAdicionarMembro: (id: string) => void;
  onRemoverMembro: (id: string) => void;
}

const PERFIL: Record<string, string> = { gestor: 'Gestor', admin: 'Admin' };

const CartaoGrupo: React.FC<CartaoGrupoProps> = ({
  grupo,
  hoteisDoGrupo,
  hoteisParaAdicionar,
  membrosDoGrupo,
  elegiveis,
  pessoas,
  nomeGrupo,
  nomeHotel,
  ocupado,
  onRenomear,
  onExcluir,
  onAdicionarHotel,
  onRemoverHotel,
  onAdicionarMembro,
  onRemoverMembro,
}) => {
  const [nome, setNome] = useState(grupo.nome);
  useEffect(() => setNome(grupo.nome), [grupo.nome]);
  const travado = !!ocupado;

  const salvarNome = () => {
    const limpo = nome.trim();
    if (limpo === grupo.nome) {
      setNome(grupo.nome);
      return;
    }
    const problema = nomeValido(limpo);
    if (problema) {
      notificar(problema, 'aviso');
      setNome(grupo.nome);
      return;
    }
    onRenomear(limpo);
  };

  const chip = 'inline-flex items-center gap-1 max-w-full rounded-full border pl-3 pr-1 py-1 text-sm';
  const botaoX =
    'p-1 rounded-full hover:bg-black/10 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0';
  const select =
    'w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50';

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-6 space-y-5">
      {/* Nome + excluir */}
      <div className="flex items-start gap-3">
        <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
          <Layers className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <label htmlFor={`nome-${grupo.id}`} className="sr-only">
            Nome do grupo
          </label>
          <input
            id={`nome-${grupo.id}`}
            type="text"
            value={nome}
            maxLength={NOME_MAX}
            disabled={travado}
            onChange={(e) => setNome(e.target.value)}
            onBlur={salvarNome}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') {
                setNome(grupo.nome);
                setTimeout(() => (e.target as HTMLInputElement).blur());
              }
            }}
            title="Clique para renomear"
            className="w-full text-lg font-bold text-gray-800 bg-transparent border border-transparent rounded-lg px-2 py-1 -ml-2 hover:border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500">
            {hoteisDoGrupo.length} {hoteisDoGrupo.length === 1 ? 'hotel' : 'hotéis'} · {membrosDoGrupo.length}{' '}
            {membrosDoGrupo.length === 1 ? 'gestor corporativo' : 'gestores corporativos'}
          </p>
        </div>
        <button
          onClick={onExcluir}
          disabled={travado}
          title="Excluir grupo"
          aria-label={`Excluir o grupo ${grupo.nome}`}
          className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-40 flex-shrink-0"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Hotéis */}
      <section className="space-y-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Building2 className="w-4 h-4" /> Hotéis do grupo
        </h4>
        {hoteisDoGrupo.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum hotel neste grupo ainda.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {hoteisDoGrupo.map((h) => (
              <span
                key={h.id}
                className={`${chip} ${h.ativo ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-gray-100 border-gray-200 text-gray-500'}`}
              >
                <span className="truncate">{h.nome}</span>
                {!h.ativo && <span className="text-xs">(inativo)</span>}
                <button
                  onClick={() => onRemoverHotel(h)}
                  disabled={travado}
                  className={botaoX}
                  aria-label={`Remover ${h.nome} do grupo`}
                  title="Remover do grupo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
        <select
          value=""
          disabled={travado}
          onChange={(e) => e.target.value && onAdicionarHotel(e.target.value)}
          className={select}
          aria-label="Adicionar hotel"
        >
          <option value="">
            {ocupado === `hotel-${grupo.id}` ? 'Salvando...' : '+ Adicionar hotel'}
          </option>
          {hoteisParaAdicionar.map((h) => (
            <option key={h.id} value={h.id} disabled={!!h.grupo_id}>
              {h.grupo_id ? `${h.nome} — já está em "${nomeGrupo[h.grupo_id] ?? 'outro grupo'}"` : h.nome}
            </option>
          ))}
        </select>
        {hoteisParaAdicionar.length > 0 && hoteisParaAdicionar.every((h) => h.grupo_id) && (
          <p className="text-xs text-gray-500">Todos os hotéis ativos já estão em algum grupo.</p>
        )}
      </section>

      {/* Gestores corporativos */}
      <section className="space-y-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <UserCog className="w-4 h-4" /> Gestores corporativos
        </h4>
        {membrosDoGrupo.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum gestor corporativo ainda.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {membrosDoGrupo.map((id) => {
              const p = pessoas[id];
              const hotel = p?.empresa_id ? nomeHotel[p.empresa_id] : null;
              return (
                <span
                  key={id}
                  className={`${chip} ${p?.active === false ? 'bg-gray-100 border-gray-200 text-gray-500' : 'bg-green-50 border-green-200 text-green-800'}`}
                  title={[p?.login, hotel ? `Hotel ativo: ${hotel}` : null].filter(Boolean).join(' · ')}
                >
                  <span className="truncate">{p?.name ?? 'Usuário removido'}</span>
                  {p?.active === false && <span className="text-xs">(inativo)</span>}
                  <button
                    onClick={() => onRemoverMembro(id)}
                    disabled={travado}
                    className={botaoX}
                    aria-label={`Remover ${p?.name ?? 'usuário'} dos gestores corporativos`}
                    title="Remover dos gestores corporativos"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              );
            })}
          </div>
        )}
        <select
          value=""
          disabled={travado || elegiveis.length === 0}
          onChange={(e) => e.target.value && onAdicionarMembro(e.target.value)}
          className={select}
          aria-label="Adicionar gestor corporativo"
        >
          <option value="">
            {ocupado === `membro-${grupo.id}`
              ? 'Salvando...'
              : elegiveis.length === 0
              ? hoteisDoGrupo.length === 0
                ? 'Adicione um hotel para escolher gestores'
                : 'Nenhum gestor disponível nos hotéis do grupo'
              : '+ Adicionar gestor corporativo'}
          </option>
          {elegiveis.map((p) => (
            <option key={p.id} value={p.id}>
              {`${p.name} — ${PERFIL[p.profile] ?? p.profile}${
                p.empresa_id && nomeHotel[p.empresa_id] ? ` · ${nomeHotel[p.empresa_id]}` : ''
              }`}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500">
          Só aparecem gestores e admins ativos dos hotéis deste grupo.
        </p>
      </section>
    </div>
  );
};

export default GruposHoteis;

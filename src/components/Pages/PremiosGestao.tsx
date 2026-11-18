import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  Coins,
  FileText,
  Gift,
  Package,
  Pencil,
  Plus,
  Save,
  Settings,
  SlidersHorizontal,
  Trash2,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { confirmar, notificar } from '../../lib/feedback';
import { PageHeader } from '../ui/PageHeader';
import { EmptyState, LoadingState } from '../ui/Estados';
import { ModuleTabs, AbaModulo } from '../ui/ModuleTabs';

// Prêmios e moeda de recompensa (padrão "Lhamas") — tela da gestão.
// A equipe ganha a moeda todo mês pela faixa da meritocracia e troca por
// prêmios do catálogo. Internamente X unidades = R$ 1 (fator_real); o valor
// em reais aparece SÓ aqui, para a gestão.

// ---------------------------------------------------------------- tipos

interface PremiosConfig {
  nome_moeda: string;
  credito_ouro: number;
  credito_prata: number;
  credito_bronze: number;
  credito_selo: number;
  validade_meses: number;
  perda_mensal_pct: number;
  prazo_entrega_dias: number;
  gestores_participam: boolean;
  fator_real: number;
}

interface Premio {
  id: string;
  empresa_id: string;
  nome: string;
  descricao: string | null;
  foto_url: string | null;
  custo: number;
  ativo: boolean;
  ordem: number;
  criado_em: string;
}

type StatusResgate = 'solicitado' | 'entregue' | 'cancelado';

interface Resgate {
  id: string;
  empresa_id: string;
  usuario_id: string;
  premio_id: string | null;
  premio_nome: string;
  custo: number;
  status: StatusResgate;
  solicitado_em: string;
  solicitado_por: string | null;
  prazo_entrega: string | null;
  entregue_em: string | null;
  resolvido_por: string | null;
  motivo_cancelamento: string | null;
}

interface SaldoPessoa {
  usuario_id: string;
  nome: string;
  perfil: string;
  ativo: boolean;
  saldo: number;
  recebido: number;
  trocado: number;
  perdido: number;
  valor_reais: number;
}

interface Movimento {
  id?: string;
  usuario_id: string;
  tipo: 'credito' | 'troca' | 'estorno' | 'perda_validade' | 'perda_desligamento' | 'ajuste';
  quantidade: number;
  descricao: string | null;
  criado_em: string;
}

type Aba = 'pedidos' | 'catalogo' | 'equipe' | 'configuracao';

const CONFIG_PADRAO: PremiosConfig = {
  nome_moeda: 'Lhamas',
  credito_ouro: 0,
  credito_prata: 0,
  credito_bronze: 0,
  credito_selo: 0,
  validade_meses: 12,
  perda_mensal_pct: 0,
  prazo_entrega_dias: 7,
  gestores_participam: false,
  fator_real: 5,
};

/** Escada padrão de valores de prêmio (R$). */
const ESCADA_REAIS = [50, 80, 240, 480, 960];

const ROTULO_PERFIL: Record<string, string> = {
  admin: 'Administração',
  gestor: 'Gestão',
  recepcao: 'Recepção',
  camararia: 'Governança',
  revisao: 'Revisão',
  areas_comuns: 'Áreas Comuns',
  manutencao: 'Manutenção',
  cozinha: 'Cozinha',
  vendas: 'Vendas',
  atividades_diarias: 'Atividades Diárias',
  atividades_extras: 'Atividades Extras',
};

const ROTULO_MOVIMENTO: Record<Movimento['tipo'], string> = {
  credito: 'Crédito do mês',
  troca: 'Troca por prêmio',
  estorno: 'Estorno (troca cancelada)',
  perda_validade: 'Perda por validade',
  perda_desligamento: 'Zerado no desligamento',
  ajuste: 'Ajuste da gestão',
};

const CLASSE_CAMPO =
  'mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500';
const CLASSE_BOTAO_PRIMARIO =
  'flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-50';
const CLASSE_BOTAO_SECUNDARIO =
  'flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50';

// ---------------------------------------------------------------- utilidades

function num(v: unknown, padrao = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : padrao;
}

function normalizarConfig(dados: any): PremiosConfig {
  const d = dados && typeof dados === 'object' ? dados : {};
  const fator = num(d.fator_real, CONFIG_PADRAO.fator_real);
  return {
    nome_moeda: String(d.nome_moeda ?? '').trim() || CONFIG_PADRAO.nome_moeda,
    credito_ouro: num(d.credito_ouro),
    credito_prata: num(d.credito_prata),
    credito_bronze: num(d.credito_bronze),
    credito_selo: num(d.credito_selo),
    validade_meses: num(d.validade_meses, CONFIG_PADRAO.validade_meses),
    perda_mensal_pct: num(d.perda_mensal_pct, CONFIG_PADRAO.perda_mensal_pct),
    prazo_entrega_dias: num(d.prazo_entrega_dias, CONFIG_PADRAO.prazo_entrega_dias),
    gestores_participam: !!d.gestores_participam,
    fator_real: fator > 0 ? fator : CONFIG_PADRAO.fator_real,
  };
}

/** R$ 1.234,50 */
function brl(valor: number): string {
  return num(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** 1.234 */
function inteiro(valor: number): string {
  return Math.round(num(valor)).toLocaleString('pt-BR');
}

/** número para campo de texto: 48 → "48,00"; 1,5 → "1,50" */
function decimalCampo(valor: number): string {
  if (!Number.isFinite(valor)) return '';
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });
}

/**
 * Lê número digitado em pt-BR ("1.234,50", "50,5", "50.5", "R$ 80").
 * Devolve NaN se vazio ou inválido.
 */
function lerNumero(texto: string): number {
  let t = String(texto ?? '').replace(/[R$\s]/g, '');
  if (t === '') return NaN;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

const FUSO = 'America/Sao_Paulo';

/** hoje em São Paulo, AAAA-MM-DD */
function hojeISO(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO }).format(new Date());
}

/** "2026-11-18" → "18/11/2026" (sem passar por fuso) */
function dataSimples(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return a && m && d ? `${d}/${m}/${a}` : iso;
}

/** timestamp → "18/11/2026" em São Paulo */
function dataDe(iso: string | null | undefined): string {
  if (!iso) return '—';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('pt-BR', { timeZone: FUSO });
}

/** timestamp → "18/11/2026 14:05" em São Paulo */
function dataHoraDe(iso: string | null | undefined): string {
  if (!iso) return '—';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '—';
  return `${dt.toLocaleDateString('pt-BR', { timeZone: FUSO })} ${dt.toLocaleTimeString('pt-BR', {
    timeZone: FUSO,
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function mensagemErro(error: any): string {
  return error?.message || 'tente novamente.';
}

// ---------------------------------------------------------------- peças visuais

function Modal({
  titulo,
  icone: Icone,
  onFechar,
  children,
  rodape,
  largo = false,
}: {
  titulo: string;
  icone: React.ComponentType<{ className?: string }>;
  onFechar: () => void;
  children: React.ReactNode;
  rodape?: React.ReactNode;
  largo?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <div
        className={`bg-white w-full ${largo ? 'sm:max-w-2xl' : 'sm:max-w-lg'} rounded-t-2xl sm:rounded-lg shadow-2xl max-h-[92vh] overflow-y-auto`}
      >
        <div className="sticky top-0 z-10 bg-white flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 min-w-0">
            <Icone className="w-5 h-5 text-purple-600 flex-shrink-0" />
            <span className="truncate">{titulo}</span>
          </h2>
          <button onClick={onFechar} className="p-1 rounded-lg text-gray-500 hover:bg-gray-100" aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {rodape && (
          <div className="sticky bottom-0 bg-white flex gap-2 justify-end px-5 py-4 border-t border-gray-200">{rodape}</div>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />;
}

/** "120 Lhamas · R$ 24,00" */
function Custo({ quantidade, config, forte = false }: { quantidade: number; config: PremiosConfig; forte?: boolean }) {
  return (
    <span className="whitespace-nowrap">
      <span className={forte ? 'font-semibold text-gray-900' : 'text-gray-800'}>
        {inteiro(quantidade)} {config.nome_moeda}
      </span>
      <span className="text-gray-500"> · {brl(quantidade / config.fator_real)}</span>
    </span>
  );
}

// ---------------------------------------------------------------- aba Pedidos

function AbaPedidos({
  config,
  pendentes,
  historico,
  nomes,
  carregando,
  onAtualizar,
}: {
  config: PremiosConfig;
  pendentes: Resgate[];
  historico: Resgate[];
  nomes: Record<string, string>;
  carregando: boolean;
  onAtualizar: () => void;
}) {
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState<Resgate | null>(null);
  const [motivo, setMotivo] = useState('');
  const hoje = hojeISO();
  const nome = (id: string | null) => (id ? nomes[id] || 'Usuário removido' : '—');

  const entregar = async (r: Resgate) => {
    const ok = await confirmar(`Marcar como entregue "${r.premio_nome}" para ${nome(r.usuario_id)}?`, {
      perigoso: false,
      textoConfirmar: 'Marcar como entregue',
    });
    if (!ok) return;
    setOcupado(r.id);
    try {
      const { error } = await supabase.rpc('entregar_troca', { p_resgate: r.id });
      if (error) throw error;
      notificar('Troca marcada como entregue.', 'sucesso');
      onAtualizar();
    } catch (error: any) {
      console.error('Erro ao marcar troca como entregue:', error);
      notificar(`Erro ao marcar como entregue: ${mensagemErro(error)}`, 'erro');
    } finally {
      setOcupado(null);
    }
  };

  const confirmarCancelamento = async () => {
    if (!cancelando) return;
    const texto = motivo.trim();
    if (texto.length < 3) {
      notificar('Informe o motivo do cancelamento (mínimo 3 caracteres).', 'aviso');
      return;
    }
    setOcupado(cancelando.id);
    try {
      const { error } = await supabase.rpc('cancelar_troca', { p_resgate: cancelando.id, p_motivo: texto });
      if (error) throw error;
      notificar(`Troca cancelada. As ${config.nome_moeda} voltaram para o saldo de ${nome(cancelando.usuario_id)}.`, 'sucesso');
      setCancelando(null);
      setMotivo('');
      onAtualizar();
    } catch (error: any) {
      console.error('Erro ao cancelar troca:', error);
      notificar(`Erro ao cancelar a troca: ${mensagemErro(error)}`, 'erro');
    } finally {
      setOcupado(null);
    }
  };

  if (carregando && pendentes.length === 0 && historico.length === 0) {
    return <LoadingState texto="Carregando pedidos..." compacto />;
  }

  return (
    <div className="space-y-6">
      <section className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            Aguardando entrega
          </h3>
          <span className="text-sm text-gray-500">{pendentes.length}</span>
        </div>
        {pendentes.length === 0 ? (
          <EmptyState icon={CheckCircle2} titulo="Nenhum pedido pendente" descricao="Quando alguém trocar por um prêmio, o pedido aparece aqui." />
        ) : (
          <ul className="divide-y divide-gray-100">
            {pendentes.map((r) => {
              const atrasado = !!r.prazo_entrega && r.prazo_entrega.slice(0, 10) < hoje;
              const registradoPorOutro = r.solicitado_por && r.solicitado_por !== r.usuario_id;
              return (
                <li key={r.id} className="px-4 sm:px-5 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-0.5">
                    <p className="font-medium text-gray-900 break-words">{nome(r.usuario_id)}</p>
                    <p className="text-sm text-gray-800 break-words">
                      <Gift className="inline w-4 h-4 text-pink-600 mr-1 -mt-0.5" />
                      {r.premio_nome}
                    </p>
                    <p className="text-sm">
                      <Custo quantidade={r.custo} config={config} />
                    </p>
                    <p className="text-xs text-gray-500 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span>Pedido em {dataDe(r.solicitado_em)}</span>
                      {registradoPorOutro && <span>· registrado por {nome(r.solicitado_por)}</span>}
                      {r.prazo_entrega && (
                        <span className={atrasado ? 'text-red-700 font-medium' : ''}>
                          · entregar até {dataSimples(r.prazo_entrega)}
                        </span>
                      )}
                      {atrasado && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-800 border border-red-200 px-2 py-0.5 text-xs font-semibold">
                          <AlertTriangle className="w-3 h-3" />
                          atrasado
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => entregar(r)}
                      disabled={ocupado === r.id}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Marcar como entregue
                    </button>
                    <button
                      onClick={() => {
                        setMotivo('');
                        setCancelando(r);
                      }}
                      disabled={ocupado === r.id}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-red-300 text-sm font-medium text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Cancelar
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-4 sm:px-5 py-3 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-800">Histórico</h3>
          <p className="text-xs text-gray-500">Últimas 50 trocas entregues ou canceladas</p>
        </div>
        {historico.length === 0 ? (
          <p className="px-4 sm:px-5 py-6 text-sm text-gray-500">Nenhuma troca entregue ou cancelada ainda.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {historico.map((r) => (
              <li key={r.id} className="px-4 sm:px-5 py-3 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-gray-900 break-words">
                    <span className="font-medium">{nome(r.usuario_id)}</span> · {r.premio_nome}
                  </p>
                  <p className="text-xs text-gray-500">
                    Pedido em {dataDe(r.solicitado_em)}
                    {r.status === 'entregue' && <> · entregue em {dataDe(r.entregue_em)}</>}
                    {r.resolvido_por && <> · por {nome(r.resolvido_por)}</>}
                  </p>
                  {r.status === 'cancelado' && r.motivo_cancelamento && (
                    <p className="text-xs text-red-700 break-words">Motivo: {r.motivo_cancelamento}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm flex-shrink-0">
                  <Custo quantidade={r.custo} config={config} />
                  {r.status === 'entregue' ? (
                    <span className="rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-xs font-semibold">entregue</span>
                  ) : (
                    <span className="rounded-full bg-gray-100 text-gray-700 px-2 py-0.5 text-xs font-semibold">cancelado</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {cancelando && (
        <Modal
          titulo="Cancelar troca"
          icone={XCircle}
          onFechar={() => setCancelando(null)}
          rodape={
            <>
              <button onClick={() => setCancelando(null)} disabled={!!ocupado} className={CLASSE_BOTAO_SECUNDARIO}>
                Voltar
              </button>
              <button
                onClick={confirmarCancelamento}
                disabled={!!ocupado}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {ocupado ? <Spinner /> : <XCircle className="w-4 h-4" />}
                Cancelar troca
              </button>
            </>
          }
        >
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              <strong>{nome(cancelando.usuario_id)}</strong> · {cancelando.premio_nome} ·{' '}
              <Custo quantidade={cancelando.custo} config={config} />
            </p>
            <p className="text-sm text-gray-600">
              As {config.nome_moeda} voltam para o saldo da pessoa. Informe o motivo.
            </p>
            <label className="block">
              <span className="text-xs font-medium text-gray-600">Motivo do cancelamento</span>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value.slice(0, 300))}
                rows={3}
                maxLength={300}
                placeholder="Ex.: prêmio indisponível no momento"
                className={CLASSE_CAMPO}
              />
            </label>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- aba Catálogo

interface FormPremio {
  id?: string;
  nome: string;
  descricao: string;
  foto_url: string;
  reais: string;
  custo: string;
  ativo: boolean;
  ordem: string;
}

function FormularioPremio({
  inicial,
  config,
  empresaId,
  proximaOrdem,
  onFechar,
  onSalvo,
}: {
  inicial: Premio | null;
  config: PremiosConfig;
  empresaId: string;
  proximaOrdem: number;
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const fator = config.fator_real;
  const [form, setForm] = useState<FormPremio>(() =>
    inicial
      ? {
          id: inicial.id,
          nome: inicial.nome,
          descricao: inicial.descricao || '',
          foto_url: inicial.foto_url || '',
          reais: decimalCampo(inicial.custo / fator),
          custo: String(inicial.custo),
          ativo: inicial.ativo,
          ordem: String(inicial.ordem ?? 0),
        }
      : { nome: '', descricao: '', foto_url: '', reais: '', custo: '', ativo: true, ordem: String(proximaOrdem), }
  );
  const [salvando, setSalvando] = useState(false);

  const mudarReais = (texto: string) => {
    const v = lerNumero(texto);
    setForm((f) => ({ ...f, reais: texto, custo: Number.isNaN(v) ? '' : String(Math.round(v * fator)) }));
  };
  const mudarCusto = (texto: string) => {
    const limpo = texto.replace(/\D/g, '');
    const v = Number(limpo);
    setForm((f) => ({ ...f, custo: limpo, reais: limpo === '' ? '' : decimalCampo(v / fator) }));
  };

  const salvar = async () => {
    const nome = form.nome.trim();
    const descricao = form.descricao.trim();
    const foto = form.foto_url.trim();
    const custo = Number(form.custo);
    const ordem = Number(form.ordem.trim() || '0');
    if (nome.length < 2 || nome.length > 80) {
      notificar('Informe o nome do prêmio (de 2 a 80 caracteres).', 'aviso');
      return;
    }
    if (descricao.length > 300) {
      notificar('A descrição pode ter no máximo 300 caracteres.', 'aviso');
      return;
    }
    if (!Number.isInteger(custo) || custo <= 0) {
      notificar(`Informe o valor do prêmio (custo em ${config.nome_moeda} maior que zero).`, 'aviso');
      return;
    }
    if (!Number.isInteger(ordem)) {
      notificar('A ordem deve ser um número inteiro.', 'aviso');
      return;
    }
    if (foto && !/^https?:\/\//i.test(foto)) {
      notificar('O endereço da foto deve começar com http:// ou https://', 'aviso');
      return;
    }

    const registro = {
      nome,
      descricao: descricao || null,
      foto_url: foto || null,
      custo,
      ativo: form.ativo,
      ordem,
    };
    setSalvando(true);
    try {
      const { error } = form.id
        ? await supabase.from('premios').update(registro).eq('id', form.id)
        : await supabase.from('premios').insert({ ...registro, empresa_id: empresaId });
      if (error) throw error;
      notificar(form.id ? 'Prêmio atualizado com sucesso.' : 'Prêmio cadastrado com sucesso.', 'sucesso');
      onSalvo();
      onFechar();
    } catch (error: any) {
      console.error('Erro ao salvar prêmio:', error);
      notificar(`Erro ao salvar o prêmio: ${mensagemErro(error)}`, 'erro');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      titulo={form.id ? 'Editar prêmio' : 'Novo prêmio'}
      icone={Gift}
      onFechar={onFechar}
      rodape={
        <>
          <button onClick={onFechar} disabled={salvando} className={CLASSE_BOTAO_SECUNDARIO}>
            Cancelar
          </button>
          <button onClick={salvar} disabled={salvando} className={CLASSE_BOTAO_PRIMARIO}>
            {salvando ? <Spinner /> : <Save className="w-4 h-4" />}
            Salvar
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="text-xs font-medium text-gray-600">Nome do prêmio</span>
          <input
            type="text"
            value={form.nome}
            maxLength={80}
            placeholder="Ex.: Vale-lanche"
            onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value.slice(0, 80) }))}
            className={CLASSE_CAMPO}
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-gray-600">Descrição (opcional)</span>
          <textarea
            value={form.descricao}
            maxLength={300}
            rows={3}
            placeholder="Detalhes, onde retirar, validade..."
            onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value.slice(0, 300) }))}
            className={CLASSE_CAMPO}
          />
          <span className="text-xs text-gray-400">{form.descricao.length}/300</span>
        </label>

        <div>
          <span className="text-xs font-medium text-gray-600">Valor do prêmio</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {ESCADA_REAIS.map((v) => {
              const selecionado = Number(form.custo) === Math.round(v * fator);
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => mudarReais(decimalCampo(v))}
                  className={`px-3 py-1.5 rounded-full border text-sm font-medium ${
                    selecionado
                      ? 'bg-purple-600 border-purple-600 text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {brl(v)}
                </button>
              );
            })}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-gray-600">Valor em R$</span>
              <input
                type="text"
                inputMode="decimal"
                value={form.reais}
                placeholder="0,00"
                onChange={(e) => mudarReais(e.target.value)}
                className={CLASSE_CAMPO}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-600">Custo em {config.nome_moeda}</span>
              <input
                type="text"
                inputMode="numeric"
                value={form.custo}
                placeholder="0"
                onChange={(e) => mudarCusto(e.target.value)}
                className={CLASSE_CAMPO}
              />
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {inteiro(fator)} {config.nome_moeda} = R$ 1,00. A equipe vê só o custo em {config.nome_moeda}.
          </p>
        </div>

        <label className="block">
          <span className="text-xs font-medium text-gray-600">Foto (endereço da imagem, opcional)</span>
          <input
            type="url"
            inputMode="url"
            value={form.foto_url}
            placeholder="https://..."
            onChange={(e) => setForm((f) => ({ ...f, foto_url: e.target.value }))}
            className={CLASSE_CAMPO}
          />
        </label>
        {/^https?:\/\//i.test(form.foto_url.trim()) && (
          <img
            src={form.foto_url.trim()}
            alt="Pré-visualização do prêmio"
            className="h-24 w-24 rounded-lg object-cover border border-gray-200"
            onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
            onLoad={(e) => ((e.target as HTMLImageElement).style.display = '')}
          />
        )}

        <div className="grid grid-cols-2 gap-3 items-end">
          <label className="block">
            <span className="text-xs font-medium text-gray-600">Ordem no catálogo</span>
            <input
              type="text"
              inputMode="numeric"
              value={form.ordem}
              onChange={(e) => setForm((f) => ({ ...f, ordem: e.target.value.replace(/[^\d-]/g, '') }))}
              className={CLASSE_CAMPO}
            />
          </label>
          <label className="flex items-center gap-2 py-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-sm text-gray-800">Ativo (aparece para a equipe)</span>
          </label>
        </div>
      </div>
    </Modal>
  );
}

function AbaCatalogo({
  config,
  empresaId,
  premios,
  carregando,
  onAtualizar,
}: {
  config: PremiosConfig;
  empresaId: string;
  premios: Premio[];
  carregando: boolean;
  onAtualizar: () => void;
}) {
  const [editando, setEditando] = useState<Premio | null | 'novo'>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const proximaOrdem = premios.reduce((m, p) => Math.max(m, num(p.ordem)), 0) + 1;

  const alternarAtivo = async (p: Premio) => {
    setOcupado(p.id);
    try {
      const { error } = await supabase.from('premios').update({ ativo: !p.ativo }).eq('id', p.id);
      if (error) throw error;
      notificar(p.ativo ? 'Prêmio desativado com sucesso.' : 'Prêmio ativado com sucesso.', 'sucesso');
      onAtualizar();
    } catch (error: any) {
      console.error('Erro ao alterar prêmio:', error);
      notificar(`Erro ao alterar o prêmio: ${mensagemErro(error)}`, 'erro');
    } finally {
      setOcupado(null);
    }
  };

  const excluir = async (p: Premio) => {
    const ok = await confirmar(
      `Excluir o prêmio "${p.nome}" de vez? Prefira desativar: some do catálogo e pode ser reativado. As trocas já feitas continuam no histórico.`,
      { perigoso: true, textoConfirmar: 'Excluir' }
    );
    if (!ok) return;
    setOcupado(p.id);
    try {
      const { error } = await supabase.from('premios').delete().eq('id', p.id);
      if (error) throw error;
      notificar('Prêmio excluído com sucesso.', 'sucesso');
      onAtualizar();
    } catch (error: any) {
      console.error('Erro ao excluir prêmio:', error);
      notificar(`Não foi possível excluir o prêmio (${mensagemErro(error)}). Desative-o em vez de excluir.`, 'erro');
    } finally {
      setOcupado(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-600">
          Prêmios que a equipe pode trocar por {config.nome_moeda}. Desativado não aparece para a equipe.
        </p>
        <button onClick={() => setEditando('novo')} className={CLASSE_BOTAO_PRIMARIO}>
          <Plus className="w-4 h-4" />
          Novo prêmio
        </button>
      </div>

      {carregando && premios.length === 0 ? (
        <LoadingState texto="Carregando catálogo..." compacto />
      ) : premios.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <EmptyState
            icon={Package}
            titulo="Catálogo vazio"
            descricao="Cadastre o primeiro prêmio. Sugestão de escada: R$ 50, 80, 240, 480 e 960."
          />
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {premios.map((p) => (
            <li
              key={p.id}
              className={`bg-white border rounded-lg shadow-sm p-3 sm:p-4 flex gap-3 ${p.ativo ? 'border-gray-200' : 'border-dashed border-gray-300 opacity-75'}`}
            >
              {p.foto_url ? (
                <img
                  src={p.foto_url}
                  alt={p.nome}
                  className="h-16 w-16 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                  loading="lazy"
                />
              ) : (
                <div className="h-16 w-16 rounded-lg bg-pink-50 flex items-center justify-center flex-shrink-0">
                  <Gift className="w-7 h-7 text-pink-500" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-gray-900 break-words">{p.nome}</p>
                  {!p.ativo && (
                    <span className="rounded-full bg-gray-100 text-gray-700 px-2 py-0.5 text-xs font-semibold whitespace-nowrap">
                      inativo
                    </span>
                  )}
                </div>
                {p.descricao && <p className="text-xs text-gray-600 break-words mt-0.5">{p.descricao}</p>}
                <p className="text-sm mt-1">
                  <Custo quantidade={p.custo} config={config} forte />
                </p>
                <p className="text-xs text-gray-400">Ordem {p.ordem}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button onClick={() => setEditando(p)} disabled={ocupado === p.id} className={CLASSE_BOTAO_SECUNDARIO}>
                    <Pencil className="w-4 h-4" />
                    Editar
                  </button>
                  <button onClick={() => alternarAtivo(p)} disabled={ocupado === p.id} className={CLASSE_BOTAO_SECUNDARIO}>
                    {p.ativo ? 'Desativar' : 'Ativar'}
                  </button>
                  <button
                    onClick={() => excluir(p)}
                    disabled={ocupado === p.id}
                    className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-red-200 text-sm font-medium text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
                    aria-label={`Excluir ${p.nome}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editando && (
        <FormularioPremio
          inicial={editando === 'novo' ? null : editando}
          config={config}
          empresaId={empresaId}
          proximaOrdem={proximaOrdem}
          onFechar={() => setEditando(null)}
          onSalvo={onAtualizar}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- aba Equipe

function ModalExtrato({ pessoa, config, onFechar }: { pessoa: SaldoPessoa; config: PremiosConfig; onFechar: () => void }) {
  const [movimentos, setMovimentos] = useState<Movimento[] | null>(null);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const { data, error } = await supabase
        .from('lhamas_movimentos')
        .select('*')
        .eq('usuario_id', pessoa.usuario_id)
        .order('criado_em', { ascending: false })
        .limit(500);
      if (!ativo) return;
      if (error) {
        console.error('Erro ao carregar extrato:', error);
        notificar(`Erro ao carregar o extrato: ${mensagemErro(error)}`, 'erro');
        setMovimentos([]);
        return;
      }
      setMovimentos((data as Movimento[]) || []);
    })();
    return () => {
      ativo = false;
    };
  }, [pessoa.usuario_id]);

  return (
    <Modal titulo={`Extrato · ${pessoa.nome}`} icone={FileText} onFechar={onFechar} largo>
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
          <Resumo rotulo="Saldo" valor={pessoa.saldo} config={config} destaque />
          <Resumo rotulo="Recebido" valor={pessoa.recebido} config={config} />
          <Resumo rotulo="Trocado" valor={pessoa.trocado} config={config} />
          <Resumo rotulo="Perdido" valor={pessoa.perdido} config={config} />
        </div>
        {movimentos === null ? (
          <LoadingState texto="Carregando extrato..." compacto />
        ) : movimentos.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">Nenhum movimento ainda.</p>
        ) : (
          <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
            {movimentos.map((m, i) => {
              const positivo = num(m.quantidade) > 0;
              return (
                <li key={m.id || `${m.criado_em}-${i}`} className="px-3 py-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800">{ROTULO_MOVIMENTO[m.tipo] || m.tipo}</p>
                    {m.descricao && <p className="text-xs text-gray-600 break-words">{m.descricao}</p>}
                    <p className="text-xs text-gray-400">{dataHoraDe(m.criado_em)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-semibold tabular-nums ${positivo ? 'text-green-700' : 'text-red-700'}`}>
                      {positivo ? '+' : '−'}
                      {inteiro(Math.abs(num(m.quantidade)))}
                    </p>
                    <p className="text-xs text-gray-500 tabular-nums">{brl(Math.abs(num(m.quantidade)) / config.fator_real)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {movimentos && movimentos.length >= 500 && (
          <p className="text-xs text-gray-500">Mostrando os 500 movimentos mais recentes.</p>
        )}
      </div>
    </Modal>
  );
}

function Resumo({ rotulo, valor, config, destaque = false }: { rotulo: string; valor: number; config: PremiosConfig; destaque?: boolean }) {
  return (
    <div className={`rounded-lg border p-2 ${destaque ? 'border-purple-200 bg-purple-50' : 'border-gray-100 bg-gray-50'}`}>
      <p className="text-xs text-gray-500">{rotulo}</p>
      <p className={`tabular-nums ${destaque ? 'font-bold text-purple-900' : 'font-semibold text-gray-800'}`}>{inteiro(valor)}</p>
      <p className="text-xs text-gray-500 tabular-nums">{brl(valor / config.fator_real)}</p>
    </div>
  );
}

function ModalAjuste({
  pessoa,
  config,
  onFechar,
  onFeito,
}: {
  pessoa: SaldoPessoa;
  config: PremiosConfig;
  onFechar: () => void;
  onFeito: () => void;
}) {
  const [sentido, setSentido] = useState<'adicionar' | 'retirar'>('adicionar');
  const [quantidade, setQuantidade] = useState('');
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const qtd = Number(quantidade);
  const assinado = sentido === 'adicionar' ? qtd : -qtd;
  const novoSaldo = num(pessoa.saldo) + (Number.isInteger(qtd) ? assinado : 0);

  const salvar = async () => {
    if (!Number.isInteger(qtd) || qtd <= 0) {
      notificar(`Informe a quantidade de ${config.nome_moeda} (número inteiro maior que zero).`, 'aviso');
      return;
    }
    if (motivo.trim().length < 3) {
      notificar('Informe o motivo do ajuste (mínimo 3 caracteres).', 'aviso');
      return;
    }
    if (novoSaldo < 0) {
      const ok = await confirmar(`O saldo de ${pessoa.nome} ficará negativo (${inteiro(novoSaldo)}). Continuar?`, {
        perigoso: true,
        textoConfirmar: 'Continuar',
      });
      if (!ok) return;
    }
    setSalvando(true);
    try {
      const { data, error } = await supabase.rpc('ajustar_lhamas', {
        p_usuario: pessoa.usuario_id,
        p_quantidade: assinado,
        p_motivo: motivo.trim(),
      });
      if (error) throw error;
      const saldo = data != null && Number.isFinite(Number(data)) ? Number(data) : novoSaldo;
      notificar(`Ajuste salvo com sucesso. Novo saldo de ${pessoa.nome}: ${inteiro(saldo)} ${config.nome_moeda}.`, 'sucesso');
      onFeito();
      onFechar();
    } catch (error: any) {
      console.error('Erro ao ajustar saldo:', error);
      notificar(`Erro ao ajustar o saldo: ${mensagemErro(error)}`, 'erro');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      titulo={`Ajustar · ${pessoa.nome}`}
      icone={SlidersHorizontal}
      onFechar={onFechar}
      rodape={
        <>
          <button onClick={onFechar} disabled={salvando} className={CLASSE_BOTAO_SECUNDARIO}>
            Cancelar
          </button>
          <button onClick={salvar} disabled={salvando} className={CLASSE_BOTAO_PRIMARIO}>
            {salvando ? <Spinner /> : <Save className="w-4 h-4" />}
            Salvar ajuste
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-700">
          Saldo atual: <Custo quantidade={pessoa.saldo} config={config} forte />
        </p>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de ajuste">
          {(['adicionar', 'retirar'] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={sentido === s}
              onClick={() => setSentido(s)}
              className={`px-3 py-2 rounded-lg border text-sm font-medium ${
                sentido === s
                  ? s === 'adicionar'
                    ? 'bg-green-600 border-green-600 text-white'
                    : 'bg-red-600 border-red-600 text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {s === 'adicionar' ? 'Adicionar' : 'Retirar'}
            </button>
          ))}
        </div>
        <label className="block">
          <span className="text-xs font-medium text-gray-600">Quantidade de {config.nome_moeda}</span>
          <input
            type="text"
            inputMode="numeric"
            value={quantidade}
            placeholder="0"
            onChange={(e) => setQuantidade(e.target.value.replace(/\D/g, ''))}
            className={CLASSE_CAMPO}
          />
          {qtd > 0 && (
            <span className="text-xs text-gray-500">
              {sentido === 'adicionar' ? '+' : '−'}
              {inteiro(qtd)} {config.nome_moeda} ({brl(qtd / config.fator_real)}) · novo saldo: {inteiro(novoSaldo)}
            </span>
          )}
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-600">Motivo (obrigatório; aparece no extrato)</span>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value.slice(0, 300))}
            rows={3}
            maxLength={300}
            placeholder="Ex.: correção do crédito de outubro"
            className={CLASSE_CAMPO}
          />
        </label>
      </div>
    </Modal>
  );
}

function ModalRegistrarTroca({
  pessoa,
  config,
  premios,
  onFechar,
  onFeito,
}: {
  pessoa: SaldoPessoa;
  config: PremiosConfig;
  premios: Premio[];
  onFechar: () => void;
  onFeito: () => void;
}) {
  const possiveis = premios.filter((p) => p.ativo && num(p.custo) <= num(pessoa.saldo));
  const [escolhido, setEscolhido] = useState<string>(possiveis[0]?.id || '');
  const [salvando, setSalvando] = useState(false);
  const premio = possiveis.find((p) => p.id === escolhido);

  const salvar = async () => {
    if (!premio) {
      notificar('Selecione um prêmio.', 'aviso');
      return;
    }
    setSalvando(true);
    try {
      const { error } = await supabase.rpc('solicitar_troca_para', { p_usuario: pessoa.usuario_id, p_premio: premio.id });
      if (error) throw error;
      notificar(`Troca registrada com sucesso: ${premio.nome} para ${pessoa.nome}. Ela aparece em Pedidos.`, 'sucesso');
      onFeito();
      onFechar();
    } catch (error: any) {
      console.error('Erro ao registrar troca:', error);
      notificar(`Erro ao registrar a troca: ${mensagemErro(error)}`, 'erro');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      titulo={`Registrar troca · ${pessoa.nome}`}
      icone={ArrowLeftRight}
      onFechar={onFechar}
      rodape={
        <>
          <button onClick={onFechar} disabled={salvando} className={CLASSE_BOTAO_SECUNDARIO}>
            Cancelar
          </button>
          <button onClick={salvar} disabled={salvando || !premio} className={CLASSE_BOTAO_PRIMARIO}>
            {salvando ? <Spinner /> : <ArrowLeftRight className="w-4 h-4" />}
            Registrar troca
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-700">
          Saldo: <Custo quantidade={pessoa.saldo} config={config} forte />
          {!pessoa.ativo && <span className="ml-2 rounded-full bg-gray-200 text-gray-700 px-2 py-0.5 text-xs font-semibold">desligado</span>}
        </p>
        {possiveis.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum prêmio ativo cabe no saldo desta pessoa.</p>
        ) : (
          <ul className="space-y-2" role="radiogroup" aria-label="Prêmio">
            {possiveis.map((p) => (
              <li key={p.id}>
                <label
                  className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer ${
                    escolhido === p.id ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="premio-troca"
                    checked={escolhido === p.id}
                    onChange={() => setEscolhido(p.id)}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-gray-900 break-words">{p.nome}</span>
                    <span className="block text-xs">
                      <Custo quantidade={p.custo} config={config} />
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
        {premio && (
          <p className="text-xs text-gray-500">
            Saldo depois da troca: {inteiro(num(pessoa.saldo) - num(premio.custo))} {config.nome_moeda}. O pedido entra em
            Pedidos para marcar a entrega.
          </p>
        )}
      </div>
    </Modal>
  );
}

function AbaEquipe({
  config,
  saldos,
  premios,
  carregando,
  onAtualizar,
}: {
  config: PremiosConfig;
  saldos: SaldoPessoa[];
  premios: Premio[];
  carregando: boolean;
  onAtualizar: () => void;
}) {
  const [extrato, setExtrato] = useState<SaldoPessoa | null>(null);
  const [ajuste, setAjuste] = useState<SaldoPessoa | null>(null);
  const [troca, setTroca] = useState<SaldoPessoa | null>(null);
  const [mostrarDesligadosSemSaldo, setMostrarDesligadosSemSaldo] = useState(false);

  const visiveis = saldos.filter((s) => s.ativo || num(s.saldo) !== 0 || mostrarDesligadosSemSaldo);
  const ocultos = saldos.length - saldos.filter((s) => s.ativo || num(s.saldo) !== 0).length;
  const total = saldos.reduce((acc, s) => acc + num(s.saldo), 0);
  const menorPremio = premios.filter((p) => p.ativo).reduce((m, p) => Math.min(m, num(p.custo)), Infinity);

  if (carregando && saldos.length === 0) return <LoadingState texto="Carregando saldos..." compacto />;

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4 flex items-center gap-3">
        <Coins className="w-6 h-6 text-purple-600 flex-shrink-0" />
        <p className="text-sm sm:text-base text-purple-900">
          Saldo total da equipe:{' '}
          <strong>
            {inteiro(total)} {config.nome_moeda}
          </strong>{' '}
          ({brl(total / config.fator_real)})
        </p>
      </div>

      {saldos.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <EmptyState icon={Users} titulo="Ninguém na equipe ainda" descricao="Os saldos aparecem aqui depois do primeiro crédito." />
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="hidden xl:grid grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_360px] gap-3 px-5 py-2 border-b border-gray-100 text-xs font-medium text-gray-500 uppercase">
            <span>Pessoa</span>
            <span className="text-right">Saldo</span>
            <span className="text-right">Recebido</span>
            <span className="text-right">Trocado</span>
            <span className="text-right">Perdido</span>
            <span />
          </div>
          <ul className="divide-y divide-gray-100">
            {visiveis.map((s) => {
              const podeTrocar = num(s.saldo) >= menorPremio;
              return (
                <li
                  key={s.usuario_id}
                  className="px-4 xl:px-5 py-3 flex flex-col gap-2 xl:grid xl:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_360px] xl:gap-3 xl:items-center"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 break-words">
                      {s.nome}
                      {!s.ativo && (
                        <span className="ml-2 align-middle rounded-full bg-gray-200 text-gray-700 px-2 py-0.5 text-xs font-semibold">
                          desligado
                        </span>
                      )}
                    </p>
                    {s.perfil && <p className="text-xs text-gray-500">{ROTULO_PERFIL[s.perfil] || s.perfil}</p>}
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs xl:contents xl:text-sm">
                    <Numero rotulo="Saldo" valor={s.saldo} reais={num(s.valor_reais, num(s.saldo) / config.fator_real)} forte />
                    <Numero rotulo="Recebido" valor={s.recebido} />
                    <Numero rotulo="Trocado" valor={s.trocado} />
                    <Numero rotulo="Perdido" valor={s.perdido} />
                  </div>
                  <div className="flex flex-wrap gap-2 xl:justify-end xl:w-[360px] xl:flex-nowrap">
                    <button onClick={() => setExtrato(s)} className={CLASSE_BOTAO_SECUNDARIO}>
                      <FileText className="w-4 h-4" />
                      Extrato
                    </button>
                    <button onClick={() => setAjuste(s)} className={CLASSE_BOTAO_SECUNDARIO}>
                      <SlidersHorizontal className="w-4 h-4" />
                      Ajustar
                    </button>
                    <button
                      onClick={() => setTroca(s)}
                      disabled={!podeTrocar}
                      title={podeTrocar ? undefined : 'O saldo não cobre nenhum prêmio ativo'}
                      className={CLASSE_BOTAO_SECUNDARIO}
                    >
                      <ArrowLeftRight className="w-4 h-4" />
                      Registrar troca
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {ocultos > 0 && (
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={mostrarDesligadosSemSaldo}
            onChange={(e) => setMostrarDesligadosSemSaldo(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          />
          Mostrar desligados sem saldo ({ocultos})
        </label>
      )}

      {extrato && <ModalExtrato pessoa={extrato} config={config} onFechar={() => setExtrato(null)} />}
      {ajuste && <ModalAjuste pessoa={ajuste} config={config} onFechar={() => setAjuste(null)} onFeito={onAtualizar} />}
      {troca && (
        <ModalRegistrarTroca pessoa={troca} config={config} premios={premios} onFechar={() => setTroca(null)} onFeito={onAtualizar} />
      )}
    </div>
  );
}

function Numero({ rotulo, valor, reais, forte = false }: { rotulo: string; valor: number; reais?: number; forte?: boolean }) {
  return (
    <div className="min-w-0 xl:text-right">
      <p className="text-gray-500 xl:hidden">{rotulo}</p>
      <p className={`tabular-nums ${forte ? 'font-bold text-gray-900' : 'text-gray-800'}`}>{inteiro(valor)}</p>
      {reais !== undefined && <p className="text-xs text-gray-500 tabular-nums">{brl(reais)}</p>}
    </div>
  );
}

// ---------------------------------------------------------------- aba Configuração

function AbaConfiguracao({
  config,
  empresaId,
  onSalvo,
}: {
  config: PremiosConfig;
  empresaId: string;
  onSalvo: (c: PremiosConfig) => void;
}) {
  const montar = (c: PremiosConfig) => ({
    nome_moeda: c.nome_moeda,
    fator_real: decimalCampo(c.fator_real).replace(/,00$/, ''),
    ouro: decimalCampo(c.credito_ouro / c.fator_real),
    prata: decimalCampo(c.credito_prata / c.fator_real),
    bronze: decimalCampo(c.credito_bronze / c.fator_real),
    selo: decimalCampo(c.credito_selo / c.fator_real),
    validade_meses: String(c.validade_meses),
    perda_mensal_pct: decimalCampo(c.perda_mensal_pct).replace(/,00$/, ''),
    prazo_entrega_dias: String(c.prazo_entrega_dias),
    gestores_participam: c.gestores_participam,
  });
  const [form, setForm] = useState(() => montar(config));
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setForm(montar(config));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  const moeda = form.nome_moeda.trim() || 'Lhamas';
  const fator = lerNumero(form.fator_real);
  const fatorValido = Number.isFinite(fator) && fator > 0;
  const emMoeda = (texto: string) => {
    const r = lerNumero(texto);
    return fatorValido && Number.isFinite(r) ? Math.round(r * fator) : null;
  };

  const faixas: { chave: 'ouro' | 'prata' | 'bronze' | 'selo'; rotulo: string }[] = [
    { chave: 'ouro', rotulo: 'Faixa Ouro' },
    { chave: 'prata', rotulo: 'Faixa Prata' },
    { chave: 'bronze', rotulo: 'Faixa Bronze' },
    { chave: 'selo', rotulo: 'Bônus Selo 100% Performaxis' },
  ];

  const salvar = async () => {
    const nome = form.nome_moeda.trim();
    if (nome.length < 2 || nome.length > 30) {
      notificar('Informe o nome da moeda (de 2 a 30 caracteres).', 'aviso');
      return;
    }
    if (!fatorValido) {
      notificar('Informe quantas unidades da moeda valem R$ 1 (número maior que zero).', 'aviso');
      return;
    }
    const creditos: Record<string, number> = {};
    for (const f of faixas) {
      const r = lerNumero(form[f.chave]);
      if (form[f.chave].trim() === '') {
        creditos[f.chave] = 0;
        continue;
      }
      if (!Number.isFinite(r) || r < 0) {
        notificar(`Valor inválido em ${f.rotulo}: informe um valor em R$ (0 ou mais).`, 'aviso');
        return;
      }
      creditos[f.chave] = Math.round(r * fator);
    }
    const validade = Number(form.validade_meses.trim());
    if (!Number.isInteger(validade) || validade < 0 || validade > 120) {
      notificar('Validade inválida: informe um número inteiro de meses (0 a 120).', 'aviso');
      return;
    }
    const perda = lerNumero(form.perda_mensal_pct);
    if (!Number.isFinite(perda) || perda < 0 || perda > 100) {
      notificar('Perda mensal inválida: informe um percentual de 0 a 100.', 'aviso');
      return;
    }
    const prazo = Number(form.prazo_entrega_dias.trim());
    if (!Number.isInteger(prazo) || prazo < 0 || prazo > 365) {
      notificar('Prazo de entrega inválido: informe um número inteiro de dias (0 a 365).', 'aviso');
      return;
    }

    setSalvando(true);
    try {
      const { data, error } = await supabase.rpc('salvar_premios_config', {
        p_config: {
          nome_moeda: nome,
          credito_ouro: creditos.ouro,
          credito_prata: creditos.prata,
          credito_bronze: creditos.bronze,
          credito_selo: creditos.selo,
          validade_meses: validade,
          perda_mensal_pct: perda,
          prazo_entrega_dias: prazo,
          gestores_participam: form.gestores_participam,
          fator_real: fator,
        },
        // só vale para o admin do sistema; gestor grava na própria empresa
        p_empresa: empresaId,
      });
      if (error) throw error;
      onSalvo(normalizarConfig(data));
      notificar('Configuração dos prêmios salva com sucesso.', 'sucesso');
    } catch (error: any) {
      console.error('Erro ao salvar configuração dos prêmios:', error);
      notificar(`Erro ao salvar configuração: ${mensagemErro(error)}`, 'erro');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4 sm:p-5 flex items-start gap-3">
        <Coins className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-purple-900">
          <strong>Como funciona:</strong> no dia 1º de cada mês cada pessoa recebe {config.nome_moeda} automaticamente pela faixa que
          fez no mês anterior (mais o bônus de quem ganhou o Selo 100%). Depois de {config.validade_meses}{' '}
          {config.validade_meses === 1 ? 'mês' : 'meses'}, o saldo passa a perder {decimalCampo(config.perda_mensal_pct).replace(/,00$/, '')}% por mês.
          Quando alguém é desligado e o saldo não compra nenhum prêmio ativo, ele é zerado. Cada troca deve ser entregue em até{' '}
          {config.prazo_entrega_dias} dias.
        </p>
      </div>

      <section className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 sm:p-5 space-y-4">
        <h3 className="text-base font-semibold text-gray-800">Moeda</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs font-medium text-gray-600">Nome da moeda</span>
            <input
              type="text"
              value={form.nome_moeda}
              maxLength={30}
              placeholder="Lhamas"
              onChange={(e) => setForm((f) => ({ ...f, nome_moeda: e.target.value.slice(0, 30) }))}
              className={CLASSE_CAMPO}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-600">Quantas {moeda} valem R$ 1 (só a gestão vê)</span>
            <input
              type="text"
              inputMode="decimal"
              value={form.fator_real}
              onChange={(e) => setForm((f) => ({ ...f, fator_real: e.target.value }))}
              className={CLASSE_CAMPO}
            />
          </label>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 sm:p-5 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-gray-800">Crédito mensal por faixa</h3>
          <p className="text-xs text-gray-500">Digite em R$; o sistema guarda em {moeda} pelo fator acima.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {faixas.map((f) => {
            const m = emMoeda(form[f.chave]);
            return (
              <label key={f.chave} className="block">
                <span className="text-xs font-medium text-gray-600">{f.rotulo} (R$)</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form[f.chave]}
                  placeholder="0,00"
                  onChange={(e) => setForm((s) => ({ ...s, [f.chave]: e.target.value }))}
                  className={CLASSE_CAMPO}
                />
                <span className="text-xs text-gray-500">
                  {m === null ? '—' : `= ${inteiro(m)} ${moeda}`}
                </span>
              </label>
            );
          })}
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 sm:p-5 space-y-4">
        <h3 className="text-base font-semibold text-gray-800">Regras</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="block">
            <span className="text-xs font-medium text-gray-600">Validade do saldo (meses)</span>
            <input
              type="text"
              inputMode="numeric"
              value={form.validade_meses}
              onChange={(e) => setForm((f) => ({ ...f, validade_meses: e.target.value.replace(/\D/g, '') }))}
              className={CLASSE_CAMPO}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-600">Perda por mês após a validade (%)</span>
            <input
              type="text"
              inputMode="decimal"
              value={form.perda_mensal_pct}
              onChange={(e) => setForm((f) => ({ ...f, perda_mensal_pct: e.target.value }))}
              className={CLASSE_CAMPO}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-600">Prazo de entrega (dias)</span>
            <input
              type="text"
              inputMode="numeric"
              value={form.prazo_entrega_dias}
              onChange={(e) => setForm((f) => ({ ...f, prazo_entrega_dias: e.target.value.replace(/\D/g, '') }))}
              className={CLASSE_CAMPO}
            />
          </label>
        </div>
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.gestores_participam}
            onChange={(e) => setForm((f) => ({ ...f, gestores_participam: e.target.checked }))}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          />
          <span className="text-sm text-gray-800">Gestores e administradores também ganham {moeda}</span>
        </label>
      </section>

      <div className="flex justify-end">
        <button onClick={salvar} disabled={salvando} className={`${CLASSE_BOTAO_PRIMARIO} w-full sm:w-auto`}>
          {salvando ? <Spinner /> : <Save className="w-4 h-4" />}
          Salvar configuração
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- página

const PremiosGestao: React.FC = () => {
  const { empresa, user } = useAuth();
  const podeGerir = user?.profile === 'admin' || user?.profile === 'gestor';

  // admin do sistema não tem empresa: escolhe qual ver
  const semEmpresa = !!user && !user.empresaId;
  const [empresas, setEmpresas] = useState<{ id: string; nome: string }[]>([]);
  const [empresaEscolhida, setEmpresaEscolhida] = useState('');
  const empresaId: string | undefined = empresa?.id || user?.empresaId || empresaEscolhida || undefined;

  const [aba, setAba] = useState<Aba>('pedidos');
  const [config, setConfig] = useState<PremiosConfig>(CONFIG_PADRAO);
  const [premios, setPremios] = useState<Premio[]>([]);
  const [pendentes, setPendentes] = useState<Resgate[]>([]);
  const [historico, setHistorico] = useState<Resgate[]>([]);
  const [nomes, setNomes] = useState<Record<string, string>>({});
  const [saldos, setSaldos] = useState<SaldoPessoa[]>([]);
  const [carregando, setCarregando] = useState({ config: true, premios: true, pedidos: true, saldos: true });

  useEffect(() => {
    if (!semEmpresa || !podeGerir) return;
    supabase
      .from('empresas')
      .select('id, nome')
      .eq('ativo', true)
      .order('nome')
      .then(({ data, error }) => {
        if (error) {
          console.error('Erro ao carregar empresas:', error);
          notificar(`Erro ao carregar empresas: ${mensagemErro(error)}`, 'erro');
          return;
        }
        const lista = (data as { id: string; nome: string }[]) || [];
        setEmpresas(lista);
        setEmpresaEscolhida((atual) => atual || lista[0]?.id || '');
      });
  }, [semEmpresa, podeGerir]);

  const carregarConfig = useCallback(async (id: string) => {
    setCarregando((c) => ({ ...c, config: true }));
    const { data, error } = await supabase.rpc('premios_config', { p_empresa: id });
    if (error) {
      console.error('Erro ao carregar configuração dos prêmios:', error);
      notificar(`Erro ao carregar a configuração dos prêmios: ${mensagemErro(error)}`, 'erro');
    } else {
      setConfig(normalizarConfig(data));
    }
    setCarregando((c) => ({ ...c, config: false }));
  }, []);

  const carregarPremios = useCallback(async (id: string) => {
    setCarregando((c) => ({ ...c, premios: true }));
    const { data, error } = await supabase
      .from('premios')
      .select('*')
      .eq('empresa_id', id)
      .order('ordem', { ascending: true })
      .order('custo', { ascending: true });
    if (error) {
      console.error('Erro ao carregar prêmios:', error);
      notificar(`Erro ao carregar o catálogo: ${mensagemErro(error)}`, 'erro');
    } else {
      setPremios((data as Premio[]) || []);
    }
    setCarregando((c) => ({ ...c, premios: false }));
  }, []);

  const carregarPedidos = useCallback(async (id: string) => {
    setCarregando((c) => ({ ...c, pedidos: true }));
    const [pend, hist] = await Promise.all([
      supabase
        .from('resgates')
        .select('*')
        .eq('empresa_id', id)
        .eq('status', 'solicitado')
        .order('solicitado_em', { ascending: true }),
      supabase
        .from('resgates')
        .select('*')
        .eq('empresa_id', id)
        .in('status', ['entregue', 'cancelado'])
        .order('solicitado_em', { ascending: false })
        .limit(50),
    ]);
    const erro = pend.error || hist.error;
    if (erro) {
      console.error('Erro ao carregar pedidos:', erro);
      notificar(`Erro ao carregar os pedidos: ${mensagemErro(erro)}`, 'erro');
      setCarregando((c) => ({ ...c, pedidos: false }));
      return;
    }
    const listaPend = (pend.data as Resgate[]) || [];
    const listaHist = (hist.data as Resgate[]) || [];
    const ids = new Set<string>();
    [...listaPend, ...listaHist].forEach((r) => {
      [r.usuario_id, r.solicitado_por, r.resolvido_por].forEach((u) => u && ids.add(u));
    });
    if (ids.size > 0) {
      const { data: us, error: errUs } = await supabase.from('usuarios').select('id, name').in('id', Array.from(ids));
      if (errUs) console.error('Erro ao carregar nomes:', errUs);
      const mapa: Record<string, string> = {};
      ((us as { id: string; name: string }[]) || []).forEach((u) => (mapa[u.id] = u.name));
      setNomes(mapa);
    }
    setPendentes(listaPend);
    setHistorico(listaHist);
    setCarregando((c) => ({ ...c, pedidos: false }));
  }, []);

  const carregarSaldos = useCallback(async (id: string) => {
    setCarregando((c) => ({ ...c, saldos: true }));
    const { data, error } = await supabase.rpc('lhamas_saldos_equipe', { p_empresa: id });
    if (error) {
      console.error('Erro ao carregar saldos:', error);
      notificar(`Erro ao carregar os saldos da equipe: ${mensagemErro(error)}`, 'erro');
    } else {
      const lista = ((data as SaldoPessoa[]) || []).slice();
      lista.sort((a, b) => Number(b.ativo) - Number(a.ativo) || String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
      setSaldos(lista);
    }
    setCarregando((c) => ({ ...c, saldos: false }));
  }, []);

  useEffect(() => {
    if (!empresaId || !podeGerir) return;
    setPremios([]);
    setPendentes([]);
    setHistorico([]);
    setSaldos([]);
    carregarConfig(empresaId);
    carregarPremios(empresaId);
    carregarPedidos(empresaId);
    carregarSaldos(empresaId);
  }, [empresaId, podeGerir, carregarConfig, carregarPremios, carregarPedidos, carregarSaldos]);

  const abas: AbaModulo[] = useMemo(
    () => [
      { id: 'pedidos', label: pendentes.length > 0 ? `Pedidos (${pendentes.length})` : 'Pedidos', icon: Clock },
      { id: 'catalogo', label: 'Catálogo', icon: Gift },
      { id: 'equipe', label: 'Equipe', icon: Users },
      { id: 'configuracao', label: 'Configuração', icon: Settings },
    ],
    [pendentes.length]
  );

  if (!user) return <LoadingState texto="Carregando..." />;

  if (!podeGerir) {
    return (
      <EmptyState
        icon={Gift}
        titulo="Acesso restrito"
        descricao="Somente a gestão pode administrar prêmios e saldos."
      />
    );
  }

  if (!empresaId) {
    if (semEmpresa && empresas.length === 0) return <LoadingState texto="Carregando empresas..." />;
    return <LoadingState texto="Carregando dados da empresa..." />;
  }

  const atualizarPedidosESaldos = () => {
    carregarPedidos(empresaId);
    carregarSaldos(empresaId);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        titulo={`Prêmios e ${config.nome_moeda}`}
        subtitulo={`Moeda de recompensa da equipe · ${inteiro(config.fator_real)} ${config.nome_moeda} = R$ 1,00 (só a gestão vê)`}
        acoes={
          semEmpresa ? (
            <select
              value={empresaEscolhida}
              onChange={(e) => setEmpresaEscolhida(e.target.value)}
              aria-label="Empresa"
              className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
          ) : undefined
        }
      />

      <ModuleTabs modulo="gestao" abas={abas} ativa={aba} onChange={(id) => setAba(id as Aba)} />

      {carregando.config ? (
        <LoadingState texto="Carregando configuração..." compacto />
      ) : (
        <>
          {aba === 'pedidos' && (
            <AbaPedidos
              config={config}
              pendentes={pendentes}
              historico={historico}
              nomes={nomes}
              carregando={carregando.pedidos}
              onAtualizar={atualizarPedidosESaldos}
            />
          )}
          {aba === 'catalogo' && (
            <AbaCatalogo
              config={config}
              empresaId={empresaId}
              premios={premios}
              carregando={carregando.premios}
              onAtualizar={() => carregarPremios(empresaId)}
            />
          )}
          {aba === 'equipe' && (
            <AbaEquipe
              config={config}
              saldos={saldos}
              premios={premios}
              carregando={carregando.saldos}
              onAtualizar={atualizarPedidosESaldos}
            />
          )}
          {aba === 'configuracao' && <AbaConfiguracao config={config} empresaId={empresaId} onSalvo={setConfig} />}
        </>
      )}
    </div>
  );
};

export default PremiosGestao;

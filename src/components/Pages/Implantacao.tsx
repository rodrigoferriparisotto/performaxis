import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Circle, Rocket, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { obterContextoUsuario } from '../../services/supabaseService';
import { notificar } from '../../lib/feedback';
import { PageHeader } from '../ui/PageHeader';
import { LoadingState } from '../ui/Estados';
import { salvarTempoEstimado } from '../../lib/tempoEstimado';

// ---------------------------------------------------------------------------
// Modelos genéricos (escritos para servir a qualquer hotel; cada um ajusta
// depois em Cadastros). tipo_servico: check_in | check_out | permanencia | suite_livre
// ---------------------------------------------------------------------------
const SERVICOS_PADRAO = [
  { nome: 'Check-out', tipo: 'check_out', limpeza: 40, revisao: 10 },
  { nome: 'Check-in', tipo: 'check_in', limpeza: 20, revisao: 10 },
  { nome: 'Permanência', tipo: 'permanencia', limpeza: 20, revisao: 5 },
  { nome: 'Suíte livre', tipo: 'suite_livre', limpeza: 10, revisao: 5 },
];

const TODOS = ['check_out', 'check_in', 'permanencia'];
const CHECKLIST_GOVERNANCA: { nome: string; servicos: string[] }[] = [
  { nome: 'Retirar o lixo e repor os sacos das lixeiras', servicos: [...TODOS] },
  { nome: 'Retirar roupa de cama e toalhas usadas', servicos: ['check_out'] },
  { nome: 'Arrumar a cama (montar com enxoval limpo no check-out)', servicos: [...TODOS] },
  { nome: 'Limpar o banheiro: box, vaso, pia, espelho e piso', servicos: [...TODOS] },
  { nome: 'Repor papel higiênico e amenities', servicos: [...TODOS] },
  { nome: 'Repor toalhas limpas', servicos: ['check_out', 'check_in'] },
  { nome: 'Tirar o pó dos móveis, de cima para baixo', servicos: [...TODOS] },
  { nome: 'Limpar vidros e espelhos do quarto', servicos: ['check_out', 'check_in'] },
  { nome: 'Aspirar ou varrer e passar pano no piso', servicos: [...TODOS] },
  { nome: 'Conferir e repor o frigobar', servicos: ['check_out', 'check_in'] },
  { nome: 'Testar luzes, TV e ar-condicionado', servicos: ['check_out', 'check_in'] },
  { nome: 'Fechar janelas e ajustar cortinas e iluminação', servicos: [...TODOS] },
  { nome: 'Arejar o quarto e conferir a organização geral', servicos: ['suite_livre'] },
  { nome: 'Tirar o pó superficial', servicos: ['suite_livre'] },
];

const CHECKLIST_REVISAO = [
  'Cama bem arrumada, sem manchas nem fios de cabelo',
  'Banheiro limpo e seco (box, vaso, pia, espelho)',
  'Papel higiênico e amenities repostos',
  'Toalhas no padrão e na quantidade certa',
  'Piso sem sujeira nem cabelos',
  'Móveis sem pó',
  'Frigobar conferido e completo',
  'Lixeiras vazias e com saco novo',
  'Luzes, TV e ar-condicionado funcionando',
  'Ambiente arejado e com cheiro agradável',
];

interface Contagens {
  suites: number;
  servicos: number;
  checklistGov: number;
  checklistRev: number;
  equipe: number;
  comNotificacao: number | null;
}

function SuitesEmLote({ onFechar, onSalvo, empresaId }: { onFechar: () => void; onSalvo: () => void; empresaId: string }) {
  const [prefixo, setPrefixo] = useState('');
  const [de, setDe] = useState('101');
  const [ate, setAte] = useState('110');
  const [tipo, setTipo] = useState('Standard');
  const [salvando, setSalvando] = useState(false);

  const inicio = parseInt(de, 10);
  const fim = parseInt(ate, 10);
  const valido = Number.isFinite(inicio) && Number.isFinite(fim) && fim >= inicio && fim - inicio < 300;
  const exemplo = valido ? [inicio, fim].map((n) => `${prefixo ? prefixo.trim() + ' ' : ''}${n}`).join(' até ') : '';

  const salvar = async () => {
    if (!valido || !tipo.trim()) return;
    setSalvando(true);
    const linhas = [];
    for (let n = inicio; n <= fim; n++) {
      linhas.push({
        name: `${prefixo ? prefixo.trim() + ' ' : ''}${n}`,
        type: tipo.trim(),
        floor: n >= 100 ? Math.floor(n / 100) : 1,
        empresa_id: empresaId,
      });
    }
    const { error } = await supabase.from('suites').insert(linhas);
    setSalvando(false);
    if (error) {
      notificar('Não foi possível cadastrar as suítes. Nada foi gravado.', 'erro');
      return;
    }
    notificar(`${linhas.length} suítes cadastradas!`, 'sucesso');
    onSalvo();
    onFechar();
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Cadastrar suítes em lote</h3>
          <button onClick={onFechar} aria-label="Fechar" className="p-2 -m-2 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <label className="block text-sm text-gray-700">
          Nome antes do número (opcional)
          <input value={prefixo} onChange={(e) => setPrefixo(e.target.value)} placeholder='ex.: "Suíte" ou "Apto"'
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-gray-700">
            Do número
            <input type="number" inputMode="numeric" value={de} onChange={(e) => setDe(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
          </label>
          <label className="text-sm text-gray-700">
            Até o número
            <input type="number" inputMode="numeric" value={ate} onChange={(e) => setAte(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
          </label>
        </div>
        <label className="block text-sm text-gray-700">
          Categoria
          <input value={tipo} onChange={(e) => setTipo(e.target.value)} placeholder="ex.: Standard, Luxo"
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
        </label>
        <p className="text-sm text-gray-600">
          {valido ? <>Vai criar <strong>{fim - inicio + 1}</strong> suítes: {exemplo}. O andar sai do número (ex.: 205 → 2º andar).</> : 'Confira os números (no máximo 300 de uma vez).'}
        </p>
        <button onClick={salvar} disabled={!valido || salvando}
          className="w-full px-4 py-2.5 rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400">
          {salvando ? 'Cadastrando...' : 'Cadastrar suítes'}
        </button>
      </div>
    </div>
  );
}

export default function Implantacao() {
  const [contagens, setContagens] = useState<Contagens | null>(null);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [mostrarSuites, setMostrarSuites] = useState(false);

  const carregar = useCallback(async () => {
    const { userData } = await obterContextoUsuario();
    const emp = userData?.empresa_id;
    if (!emp) return;
    setEmpresaId(emp);
    const contar = (tabela: string, filtros: Record<string, string | boolean> = {}) => {
      let q = supabase.from(tabela).select('id', { count: 'exact', head: true }).eq('empresa_id', emp);
      for (const [k, v] of Object.entries(filtros)) q = q.eq(k, v);
      return q.then((r) => r.count ?? 0);
    };
    const [suites, servicos, checklistGov, checklistRev, equipe, notif] = await Promise.all([
      contar('suites'),
      contar('servicos_camararia', { ativo: true }),
      contar('atividades', { type: 'camararia', active: true }),
      contar('atividades', { type: 'revisao', active: true }),
      contar('usuarios', { active: true }),
      supabase.rpc('situacao_notificacoes_equipe'),
    ]);
    const comNotificacao = notif.error
      ? null
      : ((notif.data as { aparelhos: number }[]) || []).filter((l) => l.aparelhos > 0).length;
    setContagens({ suites, servicos, checklistGov, checklistRev, equipe, comNotificacao });
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const criarServicos = async () => {
    if (!empresaId) return;
    setOcupado('servicos');
    const { data: criados, error } = await supabase
      .from('servicos_camararia')
      .insert(SERVICOS_PADRAO.map((s) => ({ nome: s.nome, ativo: true, empresa_id: empresaId })))
      .select('id, nome');
    if (!error && criados) {
      // tempos estimados iniciais (tabela só do admin; para gestor a gravação é ignorada pelo banco)
      await Promise.all(
        criados.map((c) => {
          const p = SERVICOS_PADRAO.find((s) => s.nome === c.nome);
          return p ? salvarTempoEstimado('servico_camararia', c.id, p.limpeza, p.revisao) : null;
        })
      );
    }
    setOcupado(null);
    if (error) return notificar('Não foi possível criar os serviços.', 'erro');
    notificar('Serviços criados: check-out, check-in, permanência e suíte livre.', 'sucesso');
    carregar();
  };

  const criarChecklistGovernanca = async () => {
    if (!empresaId) return;
    setOcupado('gov');
    const { data: servicos, error: e1 } = await supabase
      .from('servicos_camararia').select('id, nome').eq('empresa_id', empresaId).eq('ativo', true);
    if (e1 || !servicos?.length) {
      setOcupado(null);
      return notificar('Crie os serviços de governança primeiro (passo 2).', 'aviso');
    }
    const idsPorTipo: Record<string, string[]> = {};
    for (const s of servicos) {
      const tipo = SERVICOS_PADRAO.find((p) => p.nome.toLowerCase() === String(s.nome).toLowerCase())?.tipo;
      if (tipo) idsPorTipo[tipo] = [...(idsPorTipo[tipo] || []), s.id];
    }
    const { error } = await supabase.from('atividades').insert(
      CHECKLIST_GOVERNANCA.map((item, i) => ({
        name: item.nome,
        description: '',
        type: 'camararia',
        active: true,
        order_position: i + 1,
        empresa_id: empresaId,
        servicos_camararia: item.servicos.flatMap((t) => idsPorTipo[t] || []),
      }))
    );
    setOcupado(null);
    if (error) return notificar('Não foi possível criar o checklist.', 'erro');
    notificar(`${CHECKLIST_GOVERNANCA.length} itens criados no checklist da governança.`, 'sucesso');
    carregar();
  };

  const criarChecklistRevisao = async () => {
    if (!empresaId) return;
    setOcupado('rev');
    const { error } = await supabase.from('atividades').insert(
      CHECKLIST_REVISAO.map((nome, i) => ({
        name: nome, description: '', type: 'revisao', active: true, order_position: i + 1, empresa_id: empresaId,
      }))
    );
    setOcupado(null);
    if (error) return notificar('Não foi possível criar o checklist da revisão.', 'erro');
    notificar(`${CHECKLIST_REVISAO.length} itens criados no checklist da revisão.`, 'sucesso');
    carregar();
  };

  if (!contagens) return <LoadingState />;

  const passos = [
    {
      titulo: 'Suítes', feito: contagens.suites > 0,
      detalhe: contagens.suites > 0 ? `${contagens.suites} cadastradas` : 'Cadastre as suítes/quartos do hotel',
      acao: { texto: 'Cadastrar em lote', onClick: () => setMostrarSuites(true) },
      link: { texto: 'Ver suítes', pagina: 'suites' },
    },
    {
      titulo: 'Serviços de governança', feito: contagens.servicos > 0,
      detalhe: contagens.servicos > 0 ? `${contagens.servicos} serviços ativos` : 'Check-in, check-out, permanência e suíte livre (com tempos estimados)',
      acao: contagens.servicos === 0 ? { texto: 'Criar serviços padrão', onClick: criarServicos, chave: 'servicos' } : undefined,
      link: { texto: 'Ajustar serviços', pagina: 'servicos-camararia' },
    },
    {
      titulo: 'Checklist da governança', feito: contagens.checklistGov > 0,
      detalhe: contagens.checklistGov > 0 ? `${contagens.checklistGov} itens` : 'O que a camareira confere em cada serviço',
      acao: contagens.checklistGov === 0 ? { texto: 'Usar checklist modelo', onClick: criarChecklistGovernanca, chave: 'gov' } : undefined,
      link: { texto: 'Editar checklist', pagina: 'atividades-camararia' },
    },
    {
      titulo: 'Checklist da revisão', feito: contagens.checklistRev > 0,
      detalhe: contagens.checklistRev > 0 ? `${contagens.checklistRev} itens` : 'O que a supervisora confere antes de liberar a suíte',
      acao: contagens.checklistRev === 0 ? { texto: 'Usar checklist modelo', onClick: criarChecklistRevisao, chave: 'rev' } : undefined,
      link: { texto: 'Editar checklist', pagina: 'atividades-revisao' },
    },
    {
      titulo: 'Equipe', feito: contagens.equipe > 1,
      detalhe: contagens.equipe > 1 ? `${contagens.equipe} pessoas ativas` : 'Cadastre quem vai usar o sistema',
      link: { texto: 'Cadastrar usuários', pagina: 'usuarios' },
    },
    {
      titulo: 'Notificações no celular', feito: (contagens.comNotificacao ?? 0) > 0 && contagens.comNotificacao === contagens.equipe,
      detalhe:
        contagens.comNotificacao === null
          ? 'Cada pessoa ativa os lembretes no próprio celular'
          : `${contagens.comNotificacao} de ${contagens.equipe} recebem notificações — cada pessoa abre o app e toca em "Ativar Lembretes"`,
      link: { texto: 'Ver quem falta', pagina: 'usuarios' },
    },
  ];
  const feitos = passos.filter((p) => p.feito).length;

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader titulo="Configuração inicial" subtitulo="Os passos para o hotel começar a usar o PERFORMAXIS" />

      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="flex items-center gap-2 font-medium text-gray-800"><Rocket className="w-4 h-4 text-blue-600" /> {feitos} de {passos.length} passos concluídos</span>
          <span className="text-gray-500">{Math.round((100 * feitos) / passos.length)}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${(100 * feitos) / passos.length}%` }} />
        </div>
      </div>

      <ol className="space-y-3">
        {passos.map((p, i) => (
          <li key={p.titulo} className="bg-white rounded-lg shadow-md border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-start gap-3 flex-1">
              {p.feito ? <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" /> : <Circle className="w-6 h-6 text-gray-300 flex-shrink-0" />}
              <div>
                <p className="font-semibold text-gray-800">{i + 1}. {p.titulo}</p>
                <p className="text-sm text-gray-600">{p.detalhe}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              {p.acao && (
                <button onClick={p.acao.onClick} disabled={!!ocupado}
                  className="px-3 py-2 rounded-md text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400">
                  {ocupado && 'chave' in p.acao && ocupado === p.acao.chave ? 'Criando...' : p.acao.texto}
                </button>
              )}
              <button onClick={() => { window.location.hash = p.link.pagina; }}
                className="px-3 py-2 rounded-md text-sm border border-gray-300 text-gray-700 hover:bg-gray-50">
                {p.link.texto}
              </button>
            </div>
          </li>
        ))}
      </ol>

      {mostrarSuites && empresaId && (
        <SuitesEmLote empresaId={empresaId} onFechar={() => setMostrarSuites(false)} onSalvo={carregar} />
      )}
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Filter, Gauge, Gift, Settings, X, Save, BadgeCheck, Award } from 'lucide-react';
import PerformanceDiaria from '../Dashboard/PerformanceDiaria';
import PerformanceMensal from '../Dashboard/PerformanceMensal';
import { PageHeader } from '../ui/PageHeader';
import { LoadingState } from '../ui/Estados';
import { supabase } from '../../lib/supabase';
import { notificar } from '../../lib/feedback';
import { CONFIG_PADRAO, ESTILO_FAIXA, MeritocraciaConfig, normalizarConfig } from '../Dashboard/meritocracia';

const LIMITE_PREMIO = 200;

/** Modal do gestor: pesos do índice e prêmios do mês. */
function ModalConfigMeritocracia({
  config,
  onFechar,
  onSalvo,
}: {
  config: MeritocraciaConfig;
  onFechar: () => void;
  onSalvo: (c: MeritocraciaConfig) => void;
}) {
  const [pesos, setPesos] = useState({
    peso_uso: String(config.peso_uso),
    peso_qualidade: String(config.peso_qualidade),
    peso_ritmo: String(config.peso_ritmo),
  });
  const [premios, setPremios] = useState({
    premio_selo: config.premio_selo,
    premio_ouro: config.premio_ouro,
    premio_prata: config.premio_prata,
    premio_bronze: config.premio_bronze,
  });
  const [salvando, setSalvando] = useState(false);

  const camposPeso: { chave: keyof typeof pesos; rotulo: string }[] = [
    { chave: 'peso_uso', rotulo: 'Uso' },
    { chave: 'peso_qualidade', rotulo: 'Qualidade' },
    { chave: 'peso_ritmo', rotulo: 'Ritmo' },
  ];
  const camposPremio: { chave: keyof typeof premios; rotulo: string; exemplo: string }[] = [
    { chave: 'premio_selo', rotulo: 'Selo 100% Performaxis', exemplo: 'Ex.: Folga extra' },
    { chave: 'premio_ouro', rotulo: 'Faixa Ouro', exemplo: 'Ex.: Rancho (cesta básica)' },
    { chave: 'premio_prata', rotulo: 'Faixa Prata', exemplo: 'Ex.: Vale-lanche' },
    { chave: 'premio_bronze', rotulo: 'Faixa Bronze', exemplo: 'Ex.: Reconhecimento no mural' },
  ];

  const soma = camposPeso.reduce((acc, c) => acc + (Number(pesos[c.chave]) || 0), 0);

  const salvar = async () => {
    const valores: Record<string, number> = {};
    for (const c of camposPeso) {
      const texto = pesos[c.chave].trim();
      const n = Number(texto);
      if (texto === '' || !Number.isInteger(n) || n < 0 || n > 100) {
        notificar(`Peso de ${c.rotulo} inválido: informe um número inteiro de 0 a 100.`, 'aviso');
        return;
      }
      valores[c.chave] = n;
    }
    if (soma <= 0) {
      notificar('Informe ao menos um peso maior que zero.', 'aviso');
      return;
    }

    setSalvando(true);
    try {
      const { data, error } = await supabase.rpc('salvar_config_meritocracia', {
        p_config: {
          ...valores,
          premio_selo: premios.premio_selo.trim(),
          premio_ouro: premios.premio_ouro.trim(),
          premio_prata: premios.premio_prata.trim(),
          premio_bronze: premios.premio_bronze.trim(),
        },
      });
      if (error) throw error;
      onSalvo(normalizarConfig(data));
      notificar('Configuração da meritocracia salva com sucesso.', 'sucesso');
      onFechar();
    } catch (error: any) {
      console.error('Erro ao salvar configuração da meritocracia:', error);
      notificar(`Erro ao salvar configuração: ${error?.message || 'tente novamente.'}`, 'erro');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-lg shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-600" />
            Configurar meritocracia
          </h2>
          <button onClick={onFechar} className="p-1 rounded-lg text-gray-500 hover:bg-gray-100" aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-6">
          <section>
            <h3 className="text-sm font-semibold text-gray-800 mb-1">Pesos do índice</h3>
            <p className="text-xs text-gray-500 mb-3">
              Quanto cada bloco vale no índice diário (0 a 100). Bloco sem dados no dia fica de fora e o peso dele é redistribuído.
            </p>
            <div className="grid grid-cols-3 gap-3">
              {camposPeso.map((c) => (
                <label key={c.chave} className="block">
                  <span className="text-xs font-medium text-gray-600">{c.rotulo}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100}
                    step={1}
                    value={pesos[c.chave]}
                    onChange={(e) => setPesos((p) => ({ ...p, [c.chave]: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </label>
              ))}
            </div>
            <p className={`text-xs mt-2 ${soma === 100 ? 'text-gray-500' : 'text-amber-700'}`}>
              Soma dos pesos: {soma}{soma !== 100 ? ' (recomendado: 100)' : ''}
            </p>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-800 mb-1">Prêmios do mês</h3>
            <p className="text-xs text-gray-500 mb-3">Deixe em branco o que não tiver prêmio. Aparece para toda a equipe.</p>
            <div className="space-y-3">
              {camposPremio.map((c) => (
                <label key={c.chave} className="block">
                  <span className="text-xs font-medium text-gray-600">{c.rotulo}</span>
                  <input
                    type="text"
                    maxLength={LIMITE_PREMIO}
                    value={premios[c.chave]}
                    placeholder={c.exemplo}
                    onChange={(e) => setPremios((p) => ({ ...p, [c.chave]: e.target.value.slice(0, LIMITE_PREMIO) }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </label>
              ))}
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 bg-white flex gap-2 justify-end px-5 py-4 border-t border-gray-200">
          <button
            onClick={onFechar}
            disabled={salvando}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={salvando}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
          >
            {salvando ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

const RankingPorMeritocracia: React.FC = () => {
  const { empresa, user } = useAuth();
  const [selectedPerfilFilter, setSelectedPerfilFilter] = useState<string | undefined>(undefined);
  const [config, setConfig] = useState<MeritocraciaConfig>(CONFIG_PADRAO);
  const [configAberta, setConfigAberta] = useState(false);

  const podeConfigurar = user?.profile === 'admin' || user?.profile === 'gestor';

  useEffect(() => {
    if (!empresa?.id) return;
    let ativo = true;
    (async () => {
      const { data, error } = await supabase.rpc('meritocracia_config', { p_empresa: empresa.id });
      if (!ativo) return;
      if (error) {
        console.error('Erro ao carregar configuração da meritocracia:', error);
        return;
      }
      setConfig(normalizarConfig(data));
    })();
    return () => {
      ativo = false;
    };
  }, [empresa?.id]);

  const perfis = [
    { value: undefined, label: 'Todos os Perfis' },
    { value: 'camararia', label: 'Governança' },
    { value: 'recepcao', label: 'Recepção' },
    { value: 'revisao', label: 'Revisão' },
    { value: 'areas_comuns', label: 'Áreas Comuns' },
    { value: 'manutencao', label: 'Manutenção' },
    { value: 'gestor', label: 'Gestão' },
    { value: 'cozinha', label: 'Cozinha' },
    { value: 'vendas', label: 'Vendas' },
    { value: 'atividades_diarias', label: 'Atividades Diárias' },
    { value: 'atividades_extras', label: 'Atividades Extras' }
  ];

  const premios = [
    { chave: 'selo', rotulo: 'Selo 100% Performaxis', texto: config.premio_selo, badge: 'bg-emerald-50 text-emerald-800 border-emerald-300', icone: BadgeCheck },
    { chave: 'ouro', rotulo: 'Ouro', texto: config.premio_ouro, badge: ESTILO_FAIXA.ouro.badge, icone: Award },
    { chave: 'prata', rotulo: 'Prata', texto: config.premio_prata, badge: ESTILO_FAIXA.prata.badge, icone: Award },
    { chave: 'bronze', rotulo: 'Bronze', texto: config.premio_bronze, badge: ESTILO_FAIXA.bronze.badge, icone: Award },
  ].filter((p) => p.texto.trim() !== '');

  if (!empresa?.id) {
    return <LoadingState texto="Carregando dados da empresa..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Ranking por Meritocracia"
        subtitulo="Índice diário de 0 a 100, faixas e Selo 100% Performaxis"
        acoes={
          <>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-5 h-5 text-gray-600 flex-shrink-0" />
              <select
                value={selectedPerfilFilter || ''}
                onChange={(e) => setSelectedPerfilFilter(e.target.value || undefined)}
                className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {perfis.map((perfil) => (
                  <option key={perfil.value || 'all'} value={perfil.value || ''}>
                    {perfil.label}
                  </option>
                ))}
              </select>
            </div>
            {podeConfigurar && (
              <button
                onClick={() => setConfigAberta(true)}
                className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700"
              >
                <Settings className="w-4 h-4" />
                Configurar
              </button>
            )}
          </>
        }
      />

      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <Gauge className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-purple-900 mb-2">Como funciona o índice</h3>
            <p className="text-sm text-purple-800 mb-3">
              Cada pessoa recebe por dia um <strong>índice de 0 a 100</strong>, a média ponderada de três blocos
              (pesos desta empresa: Uso {config.peso_uso} · Qualidade {config.peso_qualidade} · Ritmo {config.peso_ritmo}).
              Bloco sem dados no dia fica de fora e o peso dele vai para os outros.
            </p>
            <ul className="text-sm text-purple-800 space-y-1.5 list-disc pl-5">
              <li>
                <strong>Uso:</strong> fechou tudo o que abriu e começou até 30 min depois do início do turno da escala.
              </li>
              <li>
                <strong>Qualidade:</strong> itens realizados ÷ itens aplicáveis (“Não se aplica” fica de fora).
                95% ou mais vale nota cheia; de 70% a 95%, proporcional; abaixo de 70%, zero.
              </li>
              <li>
                <strong>Ritmo:</strong> tempo real comparado ao tempo estimado pelo gestor (só conta quando há tempo estimado).
              </li>
              <li>
                Dia de escala <strong>sem nenhum uso</strong> do sistema vale índice 0.
              </li>
            </ul>
            <p className="text-sm text-purple-800 mt-3">
              <strong>Faixas:</strong> Ouro ≥ 90 · Prata ≥ 80 · Bronze ≥ 70. O <strong>Selo 100% Performaxis</strong> vai
              para quem, em todos os dias de escala do mês, começou no horário, fechou tudo e fez índice ≥ 70.
              Os prêmios são pela faixa e pelo selo, não só pela posição. Horas trabalhadas são apenas informativas.
            </p>
          </div>
        </div>
      </div>

      {(premios.length > 0 || podeConfigurar) && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Gift className="w-5 h-5 text-pink-600" />
              Prêmios do mês
            </h3>
          </div>
          {premios.length === 0 ? (
            <p className="text-sm text-gray-500">
              Nenhum prêmio cadastrado. Use <strong>Configurar</strong> para definir os prêmios por faixa e do selo.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {premios.map((p) => {
                const Icone = p.icone;
                return (
                  <div key={p.chave} className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${p.badge}`}>
                      <Icone className="w-3.5 h-3.5" />
                      {p.rotulo}
                    </span>
                    <p className="text-sm text-gray-800 break-words min-w-0">{p.texto}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="space-y-6">
        <PerformanceDiaria
          empresaId={empresa.id}
          perfil={selectedPerfilFilter}
        />

        <PerformanceMensal
          empresaId={empresa.id}
          perfil={selectedPerfilFilter}
        />
      </div>

      {configAberta && (
        <ModalConfigMeritocracia
          config={config}
          onFechar={() => setConfigAberta(false)}
          onSalvo={setConfig}
        />
      )}
    </div>
  );
};

export default RankingPorMeritocracia;

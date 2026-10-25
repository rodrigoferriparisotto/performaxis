// Aviso de tarefa atrasada: roda a cada 5 min (pg_cron, com X-Internal-Secret).
// Busca itens pendentes cujo horário previsto passou (RPC
// tarefas_atrasadas_para_avisar), manda um push por pessoa com o horário de
// cada tarefa e registra o aviso para não repetir.
import { createClient } from 'npm:@supabase/supabase-js@2.52.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const ROTA_MODULO: Record<string, string> = {
  recepcao: 'recepcao',
  areas_comuns: 'areas-comuns',
  gestao: 'gestao',
  cozinha: 'cozinha',
  vendas: 'vendas',
  atividades_diarias: 'atividades-diarias',
  atividades_extras: 'atividades-extras',
};

interface Atrasada {
  registro_id: string;
  atividade_id: string;
  usuario_id: string;
  empresa_id: string;
  modulo: string;
  nome: string;
  horario_previsto: string; // 'HH:MM:SS'
}

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } });

// '16:30:00' → '16h30'; '09:00:00' → '9h'
function horarioCurto(h: string): string {
  const [hh, mm] = h.split(':').map(Number);
  return mm ? `${hh}h${String(mm).padStart(2, '0')}` : `${hh}h`;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ erro: 'método não permitido' }, 405);
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const segredo = req.headers.get('X-Internal-Secret');
  if (!segredo) return json({ erro: 'não autorizado' }, 401);
  const { data: cfg } = await admin
    .from('app_config_interna')
    .select('valor')
    .eq('chave', 'internal_secret')
    .maybeSingle();
  if (!cfg || cfg.valor !== segredo) return json({ erro: 'não autorizado' }, 401);

  const manutencao = await avisarManutencoesVencidas(admin);
  const inicioTurno = await avisarInicioTurno(admin);

  const { data: atrasadas, error } = await admin.rpc('tarefas_atrasadas_para_avisar', { p_tolerancia_min: 10 });
  if (error) return json({ erro: error.message, manutencao, inicioTurno }, 500);
  const lista = (atrasadas || []) as Atrasada[];
  if (lista.length === 0) return json({ avisos: 0, manutencao, inicioTurno });

  // agrupa por pessoa
  const porUsuario = new Map<string, Atrasada[]>();
  for (const t of lista) porUsuario.set(t.usuario_id, [...(porUsuario.get(t.usuario_id) || []), t]);

  const { data: tokens } = await admin
    .from('push_tokens')
    .select('usuario_id, token')
    .in('usuario_id', [...porUsuario.keys()])
    .eq('is_active', true);
  const tokensPorUsuario = new Map<string, string[]>();
  for (const t of tokens || []) tokensPorUsuario.set(t.usuario_id, [...(tokensPorUsuario.get(t.usuario_id) || []), t.token]);

  let enviados = 0;
  for (const [usuarioId, tarefas] of porUsuario) {
    tarefas.sort((a, b) => a.horario_previsto.localeCompare(b.horario_previsto));
    const titulo =
      tarefas.length === 1
        ? `⏰ Tarefa atrasada (prevista para ${horarioCurto(tarefas[0].horario_previsto)})`
        : `⏰ ${tarefas.length} tarefas atrasadas`;
    const corpo =
      tarefas.length === 1
        ? `${tarefas[0].nome} ainda não foi marcada.`
        : tarefas.map((t) => `${horarioCurto(t.horario_previsto)} ${t.nome}`).join(' · ');

    const destino = tokensPorUsuario.get(usuarioId) || [];
    if (destino.length > 0) {
      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
          body: JSON.stringify({
            tokens: destino,
            title: titulo,
            body: corpo,
            tipo: 'reminder',
            priority: 'high',
            data: { url: `/#${ROTA_MODULO[tarefas[0].modulo] || 'dashboard'}`, type: 'tarefa_atrasada' },
          }),
        });
        if (resp.ok) enviados++;
      } catch (_e) {
        // segue: o aviso fica registrado mesmo assim, para não repetir a cada 5 min
      }
    }

    await admin.from('avisos_tarefa_atrasada').upsert(
      tarefas.map((t) => ({
        registro_id: t.registro_id,
        atividade_id: t.atividade_id,
        usuario_id: t.usuario_id,
        empresa_id: t.empresa_id,
        modulo: t.modulo,
        horario_previsto: t.horario_previsto,
      })),
      { onConflict: 'registro_id,atividade_id', ignoreDuplicates: true }
    );
  }

  return json({ tarefas: lista.length, pessoas: porUsuario.size, pushes: enviados, manutencao, inicioTurno });
});

interface Vencida {
  manutencao_id: string;
  empresa_id: string;
  local: string | null;
  descricao: string | null;
  prioridade: string;
  horas_abertas: number;
  horas_atraso: number;
}

const tempoAberto = (h: number) => (h >= 48 ? `${Math.floor(h / 24)} dias` : `${h}h`);

async function enviarPush(tokens: string[], titulo: string, corpo: string, url: string, tipo: string) {
  if (tokens.length === 0) return false;
  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
      body: JSON.stringify({ tokens, title: titulo, body: corpo, tipo: 'reminder', priority: 'high', data: { url, type: tipo } }),
    });
    return resp.ok;
  } catch (_e) {
    return false;
  }
}

// chamados de manutenção que passaram do prazo: um push por empresa para gestão/admin
async function avisarManutencoesVencidas(admin: ReturnType<typeof createClient>) {
  const { data, error } = await admin.rpc('manutencoes_vencidas_para_avisar');
  if (error) return { erro: error.message };
  const vencidas = (data || []) as Vencida[];
  if (vencidas.length === 0) return { chamados: 0 };

  const porEmpresa = new Map<string, Vencida[]>();
  for (const v of vencidas) porEmpresa.set(v.empresa_id, [...(porEmpresa.get(v.empresa_id) || []), v]);

  let pushes = 0;
  for (const [empresaId, chamados] of porEmpresa) {
    chamados.sort((a, b) => b.horas_atraso - a.horas_atraso);
    const { data: gestores } = await admin
      .from('usuarios')
      .select('id')
      .eq('empresa_id', empresaId)
      .eq('active', true)
      .in('profile', ['admin', 'gestor']);
    const ids = (gestores || []).map((g: { id: string }) => g.id);
    let tokens: string[] = [];
    if (ids.length > 0) {
      const { data: t } = await admin.from('push_tokens').select('token').in('usuario_id', ids).eq('is_active', true);
      tokens = (t || []).map((x: { token: string }) => x.token);
    }

    const nome = (c: Vencida) => c.local || c.descricao || 'Manutenção';
    const titulo =
      chamados.length === 1
        ? `🔧 Manutenção fora do prazo: ${nome(chamados[0])}`
        : `🔧 ${chamados.length} manutenções fora do prazo`;
    const corpo =
      chamados.length === 1
        ? `Prioridade ${chamados[0].prioridade}, aberta há ${tempoAberto(chamados[0].horas_abertas)}.`
        : chamados.slice(0, 3).map((c) => `${nome(c)} (${c.prioridade}, ${tempoAberto(c.horas_abertas)})`).join(' · ') +
          (chamados.length > 3 ? ` e mais ${chamados.length - 3}` : '');

    if (await enviarPush(tokens, titulo, corpo, '/#manutencoes-pendentes', 'manutencao_vencida')) pushes++;

    await admin.from('avisos_manutencao_vencida').upsert(
      chamados.map((c) => ({ manutencao_id: c.manutencao_id, empresa_id: c.empresa_id })),
      { onConflict: 'manutencao_id', ignoreDuplicates: true }
    );
  }
  return { chamados: vencidas.length, pushes };
}

// 30 min depois do início do turno (dias e horário do cadastro), quem ainda não
// iniciou nenhum registro no dia recebe um lembrete — uma vez por dia
async function avisarInicioTurno(admin: ReturnType<typeof createClient>) {
  const { data, error } = await admin.rpc('usuarios_para_aviso_inicio_turno', { p_atraso_min: 30, p_janela_min: 240 });
  if (error) return { erro: error.message };
  const pessoas = (data || []) as { usuario_id: string }[];
  if (pessoas.length === 0) return { pessoas: 0 };

  const ids = pessoas.map((p) => p.usuario_id);
  const { data: t } = await admin.from('push_tokens').select('usuario_id, token').in('usuario_id', ids).eq('is_active', true);
  const tokensPorUsuario = new Map<string, string[]>();
  for (const x of t || []) tokensPorUsuario.set(x.usuario_id, [...(tokensPorUsuario.get(x.usuario_id) || []), x.token]);

  let pushes = 0;
  for (const id of ids) {
    if (
      await enviarPush(
        tokensPorUsuario.get(id) || [],
        '⏰ Hora de começar',
        'Por favor, inicie o Performaxis e tenha um excelente dia de trabalho.',
        '/#dashboard',
        'inicio_turno'
      )
    )
      pushes++;
  }
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  await admin
    .from('avisos_inicio_turno')
    .upsert(ids.map((id) => ({ usuario_id: id, data: hoje })), { onConflict: 'usuario_id,data', ignoreDuplicates: true });
  return { pessoas: ids.length, pushes };
}

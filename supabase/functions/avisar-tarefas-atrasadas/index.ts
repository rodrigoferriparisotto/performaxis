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

  const { data: atrasadas, error } = await admin.rpc('tarefas_atrasadas_para_avisar', { p_tolerancia_min: 10 });
  if (error) return json({ erro: error.message }, 500);
  const lista = (atrasadas || []) as Atrasada[];
  if (lista.length === 0) return json({ avisos: 0 });

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

  return json({ tarefas: lista.length, pessoas: porUsuario.size, pushes: enviados });
});

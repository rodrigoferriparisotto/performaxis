// O cálculo da meritocracia agora vive no banco (calcular_performance_dia),
// disparado pelo pg_cron e pela tela "Recalcular Performance" (RPC
// recalcular_performance). Esta função ficou só como ponte para chamadas
// internas — a versão antiga creditava quem criou o registro, não quem executou.
import { createClient } from 'npm:@supabase/supabase-js@2.52.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } });

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

  const corpo = await req.json().catch(() => ({}));
  const data = typeof corpo?.data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(corpo.data)
    ? corpo.data
    : new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

  const { data: resultado, error } = await admin.rpc('calcular_performance_dia', {
    p_data: data,
    p_empresa: corpo?.empresa_id ?? null,
  });
  if (error) return json({ sucesso: false, erro: error.message }, 500);

  return json({ sucesso: true, ...resultado });
});

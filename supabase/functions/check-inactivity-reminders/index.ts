import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.52.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Internal-Secret",
};

const SUPABASE_URL_ENV = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY_ENV = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Autorização do chamador: segredo interno (agendador pg_cron do banco) ou
// usuário real com perfil admin/gestor (botão "forçar verificação" do Diagnóstico).
// A chave de serviço NÃO é aceita: um agendador externo antigo (cron-job.org)
// usava essa chave e duplicava as varreduras.
async function chamadorAutorizado(req: Request): Promise<boolean> {
  try {
    const admin = createClient(SUPABASE_URL_ENV, SERVICE_ROLE_KEY_ENV);

    const secret = req.headers.get("X-Internal-Secret");
    if (secret) {
      const { data } = await admin
        .from("app_config_interna")
        .select("valor")
        .eq("chave", "internal_secret")
        .maybeSingle();
      return !!data && data.valor === secret;
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return false;
    const token = authHeader.replace("Bearer ", "");

    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return false;

    const { data: u } = await admin
      .from("usuarios")
      .select("profile, active")
      .eq("id", user.id)
      .maybeSingle();
    return !!u && u.active === true && ["admin", "gestor"].includes(String(u.profile));
  } catch (_e) {
    return false;
  }
}

interface InactivityMarker {
  minutes: number;
  level: 'aviso' | 'urgente';
}

const INACTIVITY_MARKERS: InactivityMarker[] = [
  { minutes: 20, level: 'aviso' },
  { minutes: 40, level: 'aviso' },
  { minutes: 80, level: 'urgente' },
  { minutes: 120, level: 'urgente' }
];

interface CicloControle {
  usuario_id: string;
  empresa_id: string;
  ciclo_iniciado_em: string;
  ultima_marcacao_em: string;
  marcadores_enviados: number[];
  proximo_marcador: number | null;
  ciclo_completo: boolean;
  ultima_verificacao_em: string;
}

Deno.serve(async (req: Request) => {
  const startTime = Date.now();

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (!(await chamadorAutorizado(req))) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const stats = {
      usuariosVerificados: 0,
      notificacoesEnviadas: 0,
      ciclosResetados: 0,
      ciclosCompletos: 0,
      marcacoesOrfas: 0,
      erros: [] as any[],
    };

    console.log('[CheckInactivity] Iniciando verificação de inatividade...');

    // 2. Buscar usuários com última marcação registrada
    const { data: usuariosComMarcacao, error: marcacaoError } = await supabase
      .from('ultima_marcacao_usuario')
      .select('usuario_id, empresa_id, ultima_marcacao_em');

    if (marcacaoError) {
      throw new Error(`Erro ao buscar marcações: ${marcacaoError.message}`);
    }

    console.log(`[CheckInactivity] Encontrados ${usuariosComMarcacao?.length || 0} usuários com marcação`);

    // Dados de todos os usuários com marcação em lote (antes eram consultas
    // por usuário: 9 tabelas de registros + usuário + ciclo + configurações)
    const ids = (usuariosComMarcacao || []).map((m: any) => m.usuario_id);
    const [abertosRes, usuariosRes, ciclosRes, configsRes] = ids.length > 0
      ? await Promise.all([
          supabase.rpc('registros_abertos_por_usuario'),
          supabase.from('usuarios').select('id, name, empresa_id, active').in('id', ids),
          supabase.from('controle_ciclo_inatividade').select('*').in('usuario_id', ids),
          supabase.from('configuracoes_lembretes_usuario')
            .select('usuario_id, ativo, ativar_lembretes_inatividade, horario_inicio_nao_perturbe, horario_fim_nao_perturbe')
            .in('usuario_id', ids),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }] as any[];

    if (abertosRes.error) {
      throw new Error(`Erro ao buscar registros abertos: ${abertosRes.error.message}`);
    }

    const abertosPorUsuario = new Map<string, string[]>(
      (abertosRes.data || []).map((r: any) => [r.usuario_id, r.modulos || []])
    );
    const usuariosPorId = new Map<string, any>((usuariosRes.data || []).map((u: any) => [u.id, u]));
    const cicloPorUsuario = new Map<string, any>((ciclosRes.data || []).map((c: any) => [c.usuario_id, c]));
    const configPorUsuario = new Map<string, any>((configsRes.data || []).map((c: any) => [c.usuario_id, c]));

    for (const marcacao of usuariosComMarcacao || []) {
      try {
        stats.usuariosVerificados++;

        // Calcular minutos de inatividade
        const ultimaMarcacao = new Date(marcacao.ultima_marcacao_em);
        const agora = new Date();
        const minutosInativo = Math.floor((agora.getTime() - ultimaMarcacao.getTime()) / (1000 * 60));

        console.log(`[CheckInactivity] Usuário ${marcacao.usuario_id}: ${minutosInativo} minutos inativo`);

        // Verificar se ainda está inativo o suficiente para primeira notificação
        if (minutosInativo < 20) {
          console.log(`[CheckInactivity] Usuário ainda não atingiu 20 minutos de inatividade`);
          continue;
        }

        // Dados do usuário (já carregados em lote)
        const usuario = usuariosPorId.get(marcacao.usuario_id);

        if (!usuario || !usuario.active) {
          console.log(`[CheckInactivity] Usuário não encontrado ou inativo`);
          continue;
        }

        // Verificar se usuário tem registros abertos
        const modulosAbertos = abertosPorUsuario.get(marcacao.usuario_id) || [];
        const registrosAbertos = { temRegistrosAbertos: modulosAbertos.length > 0, modulos: modulosAbertos };

        if (!registrosAbertos.temRegistrosAbertos) {
          console.log(`[CheckInactivity] Usuário não tem registros abertos - removendo marcação órfã`);

          await supabase
            .from('ultima_marcacao_usuario')
            .delete()
            .eq('usuario_id', marcacao.usuario_id);

          await supabase
            .from('controle_ciclo_inatividade')
            .delete()
            .eq('usuario_id', marcacao.usuario_id);

          stats.marcacoesOrfas++;
          continue;
        }

        console.log(`[CheckInactivity] Usuário tem registros abertos em: ${registrosAbertos.modulos.join(', ')}`);

        // Buscar ou criar controle de ciclo
        let cicloControle = cicloPorUsuario.get(marcacao.usuario_id) || null;

        // Detectar novo ciclo: se usuário marcou atividade depois do início do ciclo anterior
        const novoCicloDetectado = cicloControle &&
          new Date(marcacao.ultima_marcacao_em) > new Date(cicloControle.ultima_marcacao_em);

        if (novoCicloDetectado) {
          console.log(`[CheckInactivity] Novo ciclo detectado - usuário voltou à atividade`);

          await supabase
            .from('controle_ciclo_inatividade')
            .delete()
            .eq('usuario_id', marcacao.usuario_id);

          cicloControle = null;
          stats.ciclosResetados++;
        }

        // Criar controle de ciclo se não existir
        if (!cicloControle) {
          console.log(`[CheckInactivity] Criando novo controle de ciclo`);

          const { data: novoCiclo, error: insertError } = await supabase
            .from('controle_ciclo_inatividade')
            .insert({
              usuario_id: marcacao.usuario_id,
              empresa_id: marcacao.empresa_id,
              ciclo_iniciado_em: marcacao.ultima_marcacao_em,
              ultima_marcacao_em: marcacao.ultima_marcacao_em,
              marcadores_enviados: [],
              proximo_marcador: 20,
              ciclo_completo: false,
              ultima_verificacao_em: agora.toISOString(),
            })
            .select()
            .single();

          if (insertError) {
            console.error(`[CheckInactivity] Erro ao criar controle de ciclo:`, insertError);
            continue;
          }

          cicloControle = novoCiclo;
        }

        // Se ciclo está completo, não enviar mais notificações
        if (cicloControle.ciclo_completo || cicloControle.proximo_marcador === null) {
          console.log(`[CheckInactivity] Ciclo completo - não enviar mais notificações`);
          stats.ciclosCompletos++;

          // Atualizar última verificação
          await supabase
            .from('controle_ciclo_inatividade')
            .update({ ultima_verificacao_em: agora.toISOString() })
            .eq('usuario_id', marcacao.usuario_id);

          continue;
        }

        // Verificar se usuário atingiu o próximo marcador
        const proximoMarcador = cicloControle.proximo_marcador;
        if (minutosInativo < proximoMarcador) {
          console.log(`[CheckInactivity] Usuário ainda não atingiu próximo marcador (${proximoMarcador} min)`);

          // Atualizar última verificação
          await supabase
            .from('controle_ciclo_inatividade')
            .update({ ultima_verificacao_em: agora.toISOString() })
            .eq('usuario_id', marcacao.usuario_id);

          continue;
        }

        console.log(`[CheckInactivity] Usuário atingiu marcador de ${proximoMarcador} minutos`);

        // Buscar configurações de notificação do usuário
        const settings = configPorUsuario.get(marcacao.usuario_id);

        if (!settings || !settings.ativo || !settings.ativar_lembretes_inatividade) {
          console.log(`[CheckInactivity] Notificações desativadas para usuário`);
          continue;
        }

        if (isDoNotDisturbActive(settings)) {
          console.log(`[CheckInactivity] Modo não perturbe ativo`);
          continue;
        }

        // Buscar tokens FCM ativos do usuário
        const { data: tokens, error: tokensError } = await supabase
          .from('push_tokens')
          .select('token')
          .eq('usuario_id', marcacao.usuario_id)
          .eq('is_active', true);

        if (tokensError || !tokens || tokens.length === 0) {
          console.log(`[CheckInactivity] Nenhum token FCM ativo encontrado`);
          stats.erros.push({
            usuario_id: marcacao.usuario_id,
            erro: 'Nenhum token FCM ativo'
          });
          continue;
        }

        console.log(`[CheckInactivity] Encontrados ${tokens.length} tokens FCM ativos`);

        // Preparar mensagem de notificação
        const { title, body } = getInactivityNotificationText(proximoMarcador, registrosAbertos.modulos);

        // Enviar notificação via Edge Function send-push-notification
        const tokensList = tokens.map(t => t.token);

        const pushResponse = await fetch(
          `${supabaseUrl}/functions/v1/send-push-notification`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              tokens: tokensList,
              title,
              body,
              tipo: 'inactivity',
              priority: 'high',
              data: {
                url: registrosAbertos.modulos.length > 0
                  ? `/#${mapModuloToUrl(registrosAbertos.modulos[0])}`
                  : '/',
                type: 'inactivity',
                minutesInactive: minutosInativo,
                marker: proximoMarcador,
                modulos: registrosAbertos.modulos,
              },
            }),
          }
        );

        const pushResult = await pushResponse.json();

        if (pushResult.success || pushResult.successCount > 0) {
          console.log(`[CheckInactivity] Notificação enviada com sucesso`);
          stats.notificacoesEnviadas++;

          // Atualizar marcadores enviados
          const marcadoresEnviados = [...(cicloControle.marcadores_enviados || []), proximoMarcador];

          // Determinar próximo marcador
          let proximoProximoMarcador: number | null = null;
          if (proximoMarcador === 20) proximoProximoMarcador = 40;
          else if (proximoMarcador === 40) proximoProximoMarcador = 80;
          else if (proximoMarcador === 80) proximoProximoMarcador = 120;
          else if (proximoMarcador === 120) proximoProximoMarcador = null; // Fim do ciclo

          const cicloCompleto = proximoProximoMarcador === null;

          // Atualizar controle de ciclo
          await supabase
            .from('controle_ciclo_inatividade')
            .update({
              marcadores_enviados: marcadoresEnviados,
              proximo_marcador: proximoProximoMarcador,
              ciclo_completo: cicloCompleto,
              ultima_verificacao_em: agora.toISOString(),
            })
            .eq('usuario_id', marcacao.usuario_id);

          // Registrar envio na tabela de lembretes
          await supabase.from('lembretes_inatividade_enviados').insert({
            usuario_id: marcacao.usuario_id,
            empresa_id: marcacao.empresa_id,
            minutos_inatividade: proximoMarcador,
            enviado_em: agora.toISOString(),
          });

          // Registrar log de push notification
          await supabase.from('push_notifications_log').insert({
            usuario_id: marcacao.usuario_id,
            empresa_id: marcacao.empresa_id,
            tipo: 'inactivity',
            titulo: title,
            corpo: body,
            tokens_alvo: tokensList,
            sucesso_count: pushResult.successCount || 0,
            falha_count: pushResult.failureCount || 0,
            tentativas: 1,
            dados: pushResult,
            enviado_em: agora.toISOString(),
          });

          console.log(`[CheckInactivity] Próximo marcador: ${proximoProximoMarcador || 'nenhum (ciclo completo)'}`);
        } else {
          console.error(`[CheckInactivity] Falha ao enviar notificação:`, pushResult);
          stats.erros.push({
            usuario_id: marcacao.usuario_id,
            erro: pushResult.error || 'Falha ao enviar notificação',
            detalhes: pushResult
          });
        }

      } catch (error: any) {
        console.error(`[CheckInactivity] Erro ao processar usuário ${marcacao.usuario_id}:`, error);
        stats.erros.push({
          usuario_id: marcacao.usuario_id,
          erro: error.message
        });
      }
    }

    const executionTime = Date.now() - startTime;

    // Registrar log de execução
    await supabase.from('logs_verificacao_inatividade').insert({
      executado_em: new Date().toISOString(),
      usuarios_verificados: stats.usuariosVerificados,
      notificacoes_enviadas: stats.notificacoesEnviadas,
      erros: stats.erros,
      detalhes: {
        usuarios_com_marcacao: usuariosComMarcacao?.length || 0,
        ciclos_resetados: stats.ciclosResetados,
        ciclos_completos: stats.ciclosCompletos,
        marcacoes_orfas: stats.marcacoesOrfas,
      },
      tempo_execucao_ms: executionTime,
    });

    console.log('[CheckInactivity] Verificação concluída:', {
      usuariosVerificados: stats.usuariosVerificados,
      notificacoesEnviadas: stats.notificacoesEnviadas,
      ciclosResetados: stats.ciclosResetados,
      ciclosCompletos: stats.ciclosCompletos,
      marcacoesOrfas: stats.marcacoesOrfas,
      erros: stats.erros.length,
      tempoExecucao: `${executionTime}ms`
    });

    return new Response(
      JSON.stringify({
        success: true,
        ...stats,
        tempoExecucaoMs: executionTime,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("[CheckInactivity] Erro fatal:", error);

    const executionTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
        message: error.message,
        tempoExecucaoMs: executionTime,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function isDoNotDisturbActive(settings: any): boolean {
  if (!settings.horario_inicio_nao_perturbe || !settings.horario_fim_nao_perturbe) {
    return false;
  }

  const partes = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Sao_Paulo',
  }).format(new Date()).split(':').map(Number);
  const currentTime = (partes[0] % 24) * 60 + partes[1];

  const [startHour, startMinute] = settings.horario_inicio_nao_perturbe.split(':').map(Number);
  const startTime = startHour * 60 + startMinute;

  const [endHour, endMinute] = settings.horario_fim_nao_perturbe.split(':').map(Number);
  const endTime = endHour * 60 + endMinute;

  if (startTime <= endTime) {
    return currentTime >= startTime && currentTime <= endTime;
  } else {
    return currentTime >= startTime || currentTime <= endTime;
  }
}

function mapModuloToUrl(modulo: string): string {
  const map: Record<string, string> = {
    'Governança': 'camararia',
    'Áreas Comuns': 'areas-comuns',
    'Cozinha': 'cozinha',
    'Gestão': 'gestao',
    'Recepção': 'recepcao',
    'Vendas': 'vendas',
    'Revisão': 'revisao',
    'Atividades Diárias': 'atividades-diarias',
    'Atividades Extras': 'atividades-extras',
  };
  return map[modulo] || '/';
}

function getInactivityNotificationText(marcador: number, modulos: string[]): { title: string; body: string } {
  const modulosTexto = modulos.length > 0 ? ` (${modulos.join(', ')})` : '';

  if (marcador === 120) {
    return {
      title: '⚠️ Registro em aberto há 2 horas!',
      body: `Você está com registro(s) em aberto há 2 horas${modulosTexto}. Finalize suas atividades o quanto antes!`
    };
  } else if (marcador === 80) {
    return {
      title: '⚠️ Registro em aberto há 1h20!',
      body: `Você está com registro(s) em aberto há 1 hora e 20 minutos${modulosTexto}. Por favor, finalize suas atividades!`
    };
  } else if (marcador === 40) {
    return {
      title: '⏰ Registro em aberto há 40 minutos',
      body: `Você está com registro(s) em aberto há 40 minutos${modulosTexto}. Não esqueça de finalizar suas atividades!`
    };
  } else {
    return {
      title: '⏰ Registro em aberto há 20 minutos',
      body: `Você está com registro(s) em aberto há 20 minutos${modulosTexto}. Lembre-se de marcar suas atividades!`
    };
  }
}

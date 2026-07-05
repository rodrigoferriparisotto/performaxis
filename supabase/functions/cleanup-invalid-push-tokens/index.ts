import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Autorização necessária' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let totalDeleted = 0;
    const deletionResults = [];

    const { data: unregisteredTokens } = await supabaseAdmin
      .from('push_tokens')
      .select('id, token, usuario_id, fcm_error_code, error_count, is_active')
      .eq('usuario_id', user.id)
      .eq('fcm_error_code', 'UNREGISTERED');

    if (unregisteredTokens && unregisteredTokens.length > 0) {
      const tokenIds = unregisteredTokens.map(t => t.id);
      const { error: deleteError } = await supabaseAdmin
        .from('push_tokens')
        .delete()
        .in('id', tokenIds);

      if (!deleteError) {
        console.log(`✓ Deleted ${unregisteredTokens.length} UNREGISTERED tokens`);
        totalDeleted += unregisteredTokens.length;
        deletionResults.push({
          criterion: 'UNREGISTERED tokens',
          count: unregisteredTokens.length,
        });
      } else {
        console.error(`✗ Error deleting UNREGISTERED tokens:`, deleteError);
        deletionResults.push({
          criterion: 'UNREGISTERED tokens',
          count: 0,
          error: deleteError.message,
        });
      }
    } else {
      console.log(`⊘ No UNREGISTERED tokens to delete`);
      deletionResults.push({
        criterion: 'UNREGISTERED tokens',
        count: 0,
      });
    }

    const { data: inactiveTokens } = await supabaseAdmin
      .from('push_tokens')
      .select('id, token, usuario_id, fcm_error_code, error_count, is_active')
      .eq('usuario_id', user.id)
      .eq('is_active', false)
      .lt('updated_at', sevenDaysAgo.toISOString());

    if (inactiveTokens && inactiveTokens.length > 0) {
      const tokenIds = inactiveTokens.map(t => t.id);
      const { error: deleteError } = await supabaseAdmin
        .from('push_tokens')
        .delete()
        .in('id', tokenIds);

      if (!deleteError) {
        console.log(`✓ Deleted ${inactiveTokens.length} inactive tokens (7+ days)`);
        totalDeleted += inactiveTokens.length;
        deletionResults.push({
          criterion: 'Inactive tokens (7+ days)',
          count: inactiveTokens.length,
        });
      } else {
        console.error(`✗ Error deleting inactive tokens:`, deleteError);
        deletionResults.push({
          criterion: 'Inactive tokens (7+ days)',
          count: 0,
          error: deleteError.message,
        });
      }
    } else {
      console.log(`⊘ No inactive tokens to delete`);
      deletionResults.push({
        criterion: 'Inactive tokens (7+ days)',
        count: 0,
      });
    }

    const { data: highErrorTokens } = await supabaseAdmin
      .from('push_tokens')
      .select('id, token, usuario_id, fcm_error_code, error_count, is_active')
      .eq('usuario_id', user.id)
      .gte('error_count', 3);

    if (highErrorTokens && highErrorTokens.length > 0) {
      const tokenIds = highErrorTokens.map(t => t.id);
      const { error: deleteError } = await supabaseAdmin
        .from('push_tokens')
        .delete()
        .in('id', tokenIds);

      if (!deleteError) {
        console.log(`✓ Deleted ${highErrorTokens.length} high error count tokens (3+)`);
        totalDeleted += highErrorTokens.length;
        deletionResults.push({
          criterion: 'High error count (3+)',
          count: highErrorTokens.length,
        });
      } else {
        console.error(`✗ Error deleting high error tokens:`, deleteError);
        deletionResults.push({
          criterion: 'High error count (3+)',
          count: 0,
          error: deleteError.message,
        });
      }
    } else {
      console.log(`⊘ No high error count tokens to delete`);
      deletionResults.push({
        criterion: 'High error count (3+)',
        count: 0,
      });
    }

    const { data: oldSuccessTokens } = await supabaseAdmin
      .from('push_tokens')
      .select('id, token, usuario_id, fcm_error_code, error_count, is_active')
      .eq('usuario_id', user.id)
      .not('last_success_at', 'is', null)
      .lt('last_success_at', thirtyDaysAgo.toISOString());

    if (oldSuccessTokens && oldSuccessTokens.length > 0) {
      const tokenIds = oldSuccessTokens.map(t => t.id);
      const { error: deleteError } = await supabaseAdmin
        .from('push_tokens')
        .delete()
        .in('id', tokenIds);

      if (!deleteError) {
        console.log(`✓ Deleted ${oldSuccessTokens.length} tokens with no success in 30+ days`);
        totalDeleted += oldSuccessTokens.length;
        deletionResults.push({
          criterion: 'No success in 30+ days',
          count: oldSuccessTokens.length,
        });
      } else {
        console.error(`✗ Error deleting old success tokens:`, deleteError);
        deletionResults.push({
          criterion: 'No success in 30+ days',
          count: 0,
          error: deleteError.message,
        });
      }
    } else {
      console.log(`⊘ No tokens with old success dates to delete`);
      deletionResults.push({
        criterion: 'No success in 30+ days',
        count: 0,
      });
    }

    console.log(`\n🧹 Cleanup Summary: ${totalDeleted} tokens deleted`);

    return new Response(
      JSON.stringify({
        success: true,
        totalDeleted,
        results: deletionResults,
        timestamp: now.toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in cleanup-invalid-push-tokens function:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

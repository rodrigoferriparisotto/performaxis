import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  telefone?: string;
  profile: string;
  dataContratacao?: string;
  active: boolean;
  empresaId?: string | null;
}

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

    const { data: adminUser, error: adminError } = await supabaseClient
      .from('usuarios')
      .select('profile, empresa_id')
      .eq('id', user.id)
      .single();

    if (adminError || !adminUser || (adminUser.profile !== 'admin' && adminUser.profile !== 'gestor')) {
      return new Response(
        JSON.stringify({ error: 'Apenas administradores e gestores podem criar usuários' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const userData: CreateUserRequest = await req.json();

    const isAdmin = adminUser.profile === 'admin' && adminUser.empresa_id === null;
    const isCreatingManagerOrAdmin = userData.profile === 'gestor' || userData.profile === 'admin';

    // SEGURANÇA CRÍTICA: Apenas super-admins (admin sem empresa) podem criar administradores
    if (userData.profile === 'admin' && !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Apenas super-administradores podem criar usuários com perfil de administrador' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Auto-fill empresa_id for non-admin users if not provided
    let finalEmpresaId = userData.empresaId;
    if (!finalEmpresaId && !isAdmin && adminUser.empresa_id) {
      finalEmpresaId = adminUser.empresa_id;
    }

    // Validations
    if (!finalEmpresaId && !isCreatingManagerOrAdmin) {
      return new Response(
        JSON.stringify({ error: 'Empresa é obrigatória para este tipo de usuário' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!finalEmpresaId && !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem criar usuários sem empresa' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!isAdmin && finalEmpresaId && finalEmpresaId !== adminUser.empresa_id) {
      return new Response(
        JSON.stringify({ error: 'Você só pode criar usuários na sua empresa' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
    });

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: 'Falha ao criar usuário no sistema de autenticação' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Attempting to insert user into database:', {
      id: authData.user.id,
      name: userData.name,
      telefone: userData.telefone || null,
      profile: userData.profile,
      empresa_id: finalEmpresaId,
    });

    const { error: dbError } = await supabaseAdmin
      .from('usuarios')
      .insert({
        id: authData.user.id,
        name: userData.name,
        telefone: userData.telefone || null,
        profile: userData.profile,
        data_contratacao: userData.dataContratacao || null,
        login: userData.email,
        active: userData.active,
        empresa_id: finalEmpresaId,
      });

    if (dbError) {
      console.error('Database insert error:', {
        message: dbError.message,
        details: dbError.details,
        hint: dbError.hint,
        code: dbError.code,
      });

      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        console.log('Cleaned up auth user after database error');
      } catch (cleanupError) {
        console.error('Failed to cleanup auth user:', cleanupError);
      }

      return new Response(
        JSON.stringify({
          error: 'Erro ao salvar dados do usuário na base de dados',
          details: dbError.message,
          hint: dbError.hint,
          code: dbError.code,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('User created successfully:', authData.user.id);

    return new Response(
      JSON.stringify({ success: true, userId: authData.user.id }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in create-user function:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
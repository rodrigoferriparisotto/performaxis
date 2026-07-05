import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DeleteUserRequest {
  userId: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client with user's token to verify permissions
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get user profile to check permissions
    const { data: currentUserData, error: userError } = await supabaseClient
      .from("usuarios")
      .select("profile, empresa_id")
      .eq("id", user.id)
      .single();

    if (userError || !currentUserData) {
      return new Response(
        JSON.stringify({ error: "Erro ao verificar permissões do usuário" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Only admin and gestor can delete users
    if (currentUserData.profile !== "admin" && currentUserData.profile !== "gestor") {
      return new Response(
        JSON.stringify({ error: "Sem permissão para excluir usuários" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const { userId }: DeleteUserRequest = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "ID do usuário é obrigatório" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get user to be deleted to verify permissions
    const { data: userToDelete, error: fetchError } = await supabaseClient
      .from("usuarios")
      .select("empresa_id, profile, name")
      .eq("id", userId)
      .single();

    if (fetchError || !userToDelete) {
      return new Response(
        JSON.stringify({ error: "Usuário não encontrado" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Security check: gestores can only delete users from their company
    // admins (with empresa_id = null) can delete anyone
    const isSystemAdmin = currentUserData.profile === "admin" && currentUserData.empresa_id === null;
    const isGestorOfSameCompany =
      currentUserData.profile === "gestor" &&
      currentUserData.empresa_id === userToDelete.empresa_id;

    if (!isSystemAdmin && !isGestorOfSameCompany) {
      return new Response(
        JSON.stringify({ error: "Sem permissão para excluir este usuário" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create admin client with service role key
    const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Delete user from auth.users (this will cascade to usuarios table if properly configured)
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      console.error("Erro ao excluir usuário do Auth:", deleteAuthError);
      return new Response(
        JSON.stringify({
          error: `Erro ao excluir usuário do sistema de autenticação: ${deleteAuthError.message}`
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Also delete from usuarios table (redundant if cascade is set, but ensures deletion)
    const { error: deleteTableError } = await supabaseAdmin
      .from("usuarios")
      .delete()
      .eq("id", userId);

    if (deleteTableError) {
      console.error("Erro ao excluir usuário da tabela:", deleteTableError);
      // Don't fail the request as auth deletion already succeeded
      console.log("Usuário removido do Auth, mas houve erro ao remover da tabela usuarios");
    }

    console.log(`Usuário ${userToDelete.name} (${userId}) excluído com sucesso por ${user.email}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Usuário excluído com sucesso do sistema de autenticação e banco de dados"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Erro ao excluir usuário:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno do servidor" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

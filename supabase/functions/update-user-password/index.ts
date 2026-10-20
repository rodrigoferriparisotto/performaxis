import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.52.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface UpdatePasswordRequest {
  userId: string;
  newPassword: string;
}

function erro(status: number, mensagem: string): Response {
  return new Response(JSON.stringify({ error: mensagem }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const PERFIS_PRIVILEGIADOS = ["admin", "gestor", "super_admin"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return erro(401, "Unauthorized: No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return erro(401, "Unauthorized: Invalid token");

    const { data: requestingUser, error: userError } = await supabaseAdmin
      .from("usuarios")
      .select("profile, empresa_id, active")
      .eq("id", user.id)
      .maybeSingle();

    if (userError || !requestingUser) return erro(404, "User not found in system");
    if (!requestingUser.active) return erro(403, "Forbidden: inactive user");

    const perfilChamador = String(requestingUser.profile);
    if (perfilChamador !== "admin" && perfilChamador !== "gestor") {
      return erro(403, "Forbidden: Only admin or gestor can update passwords");
    }

    const { userId, newPassword }: UpdatePasswordRequest = await req.json();
    if (!userId || !newPassword) return erro(400, "Missing userId or newPassword");
    if (newPassword.length < 8) return erro(400, "A senha deve ter pelo menos 8 caracteres");

    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from("usuarios")
      .select("id, profile, empresa_id")
      .eq("id", userId)
      .maybeSingle();

    if (targetError || !targetUser) return erro(404, "Target user not found");

    const perfilAlvo = String(targetUser.profile);
    const ehAdminDeSistema = perfilChamador === "admin" && requestingUser.empresa_id === null;

    // Fora o admin de sistema, só se altera senha de usuário da PRÓPRIA empresa
    if (!ehAdminDeSistema) {
      if (!requestingUser.empresa_id || requestingUser.empresa_id !== targetUser.empresa_id) {
        return erro(403, "Forbidden: usuário de outra empresa");
      }
    }

    // Ninguém redefine a senha do super admin por aqui
    if (perfilAlvo === "super_admin") {
      return erro(403, "Forbidden: alvo não permitido");
    }

    // Gestor não redefine senha de admin nem de outro gestor (exceto a própria)
    if (
      perfilChamador === "gestor" &&
      PERFIS_PRIVILEGIADOS.includes(perfilAlvo) &&
      targetUser.id !== user.id
    ) {
      return erro(403, "Forbidden: gestor não altera senha de admin/gestor");
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      console.error("Error updating password:", error);
      return erro(500, error.message);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Password updated successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return erro(500, "Internal server error");
  }
});

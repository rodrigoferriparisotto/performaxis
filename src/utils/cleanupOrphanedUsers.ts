import { supabase } from '../lib/supabase';

export async function cleanupOrphanedUsers() {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return { success: false, error: 'Sessão não encontrada' };
    }

    const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cleanup-orphaned-users`;

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'Erro ao limpar usuários órfãos' };
    }

    return {
      success: true,
      deletedCount: result.deletedCount,
      deletedUsers: result.deletedUsers,
      errors: result.errors
    };
  } catch (error: any) {
    return { success: false, error: 'Erro interno do servidor: ' + error.message };
  }
}

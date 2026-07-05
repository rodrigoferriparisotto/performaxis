/**
 * Helpers para testar Push Notifications via console do navegador
 *
 * Cole este código no console do navegador para executar testes rápidos:
 *
 * // Teste rápido
 * await window.testPushNotifications.quick()
 *
 * // Teste completo (com envio de notificação)
 * await window.testPushNotifications.full()
 *
 * // Verificar configuração
 * window.testPushNotifications.checkConfig()
 *
 * // Ver tokens salvos
 * await window.testPushNotifications.showTokens()
 */

import { PushNotificationTester, quickTest, fullTest } from './testPushNotifications';
import { getUserPushTokens } from '../services/firebasePushService';
import { isFirebaseConfigured } from '../services/firebaseConfig';
import { supabase } from '../lib/supabase';

declare global {
  interface Window {
    testPushNotifications: {
      quick: () => Promise<void>;
      full: () => Promise<void>;
      checkConfig: () => void;
      showTokens: () => Promise<void>;
      showEnvVars: () => void;
      help: () => void;
    };
  }
}

const getCurrentUserId = async (): Promise<string | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || null;
};

export const setupConsoleHelpers = () => {
  window.testPushNotifications = {
    /**
     * Teste rápido - sem solicitar permissões
     */
    quick: async () => {
      console.log('%c========================================', 'color: blue; font-weight: bold');
      console.log('%c🚀 TESTE RÁPIDO DE PUSH NOTIFICATIONS', 'color: blue; font-weight: bold');
      console.log('%c========================================', 'color: blue; font-weight: bold');

      const userId = await getCurrentUserId();
      if (!userId) {
        console.error('%c❌ Erro: Você precisa estar logado', 'color: red; font-weight: bold');
        return;
      }

      await quickTest(userId);
    },

    /**
     * Teste completo - solicita permissões e envia notificação
     */
    full: async () => {
      console.log('%c========================================', 'color: green; font-weight: bold');
      console.log('%c🔔 TESTE COMPLETO DE PUSH NOTIFICATIONS', 'color: green; font-weight: bold');
      console.log('%c========================================', 'color: green; font-weight: bold');

      const userId = await getCurrentUserId();
      if (!userId) {
        console.error('%c❌ Erro: Você precisa estar logado', 'color: red; font-weight: bold');
        return;
      }

      await fullTest(userId);
    },

    /**
     * Verificar configuração do Firebase
     */
    checkConfig: () => {
      console.log('%c📋 Verificando Configuração do Firebase', 'color: purple; font-weight: bold');
      console.log('');

      const isConfigured = isFirebaseConfigured();

      if (isConfigured) {
        console.log('%c✓ Firebase está configurado', 'color: green');
      } else {
        console.log('%c✗ Firebase NÃO está configurado', 'color: red');
        console.log('Verifique as variáveis de ambiente no arquivo .env');
      }

      console.log('');
      console.log('Valores atuais:');
      console.log('- API Key:', import.meta.env.VITE_FIREBASE_API_KEY ? '✓ Configurado' : '✗ Faltando');
      console.log('- Auth Domain:', import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ? '✓ Configurado' : '✗ Faltando');
      console.log('- Project ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID ? '✓ Configurado' : '✗ Faltando');
      console.log('- Storage Bucket:', import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ? '✓ Configurado' : '✗ Faltando');
      console.log('- Messaging Sender ID:', import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ? '✓ Configurado' : '✗ Faltando');
      console.log('- App ID:', import.meta.env.VITE_FIREBASE_APP_ID ? '✓ Configurado' : '✗ Faltando');
      console.log('- VAPID Key:', import.meta.env.VITE_FIREBASE_VAPID_KEY ? '✓ Configurado' : '✗ Faltando');
    },

    /**
     * Mostrar tokens salvos no banco de dados
     */
    showTokens: async () => {
      console.log('%c🔑 Tokens Salvos no Banco de Dados', 'color: orange; font-weight: bold');
      console.log('');

      const userId = await getCurrentUserId();
      if (!userId) {
        console.error('%c❌ Erro: Você precisa estar logado', 'color: red; font-weight: bold');
        return;
      }

      try {
        const tokens = await getUserPushTokens(userId);

        if (tokens.length === 0) {
          console.log('%c⚠️  Nenhum token encontrado para este usuário', 'color: yellow');
          return;
        }

        console.log(`%c✓ ${tokens.length} token(s) encontrado(s)`, 'color: green');
        console.log('');

        tokens.forEach((token, index) => {
          console.log(`%cToken ${index + 1}:`, 'color: blue; font-weight: bold');
          console.log('  ID:', token.id);
          console.log('  Token:', token.token.substring(0, 50) + '...');
          console.log('  Ativo:', token.is_active ? '✓ Sim' : '✗ Não');
          console.log('  Último uso:', new Date(token.last_used_at).toLocaleString('pt-BR'));
          console.log('  Device:', token.device_info);
          console.log('');
        });
      } catch (error) {
        console.error('%c❌ Erro ao buscar tokens:', 'color: red; font-weight: bold', error);
      }
    },

    /**
     * Mostrar variáveis de ambiente
     */
    showEnvVars: () => {
      console.log('%c🔧 Variáveis de Ambiente', 'color: teal; font-weight: bold');
      console.log('');

      const vars = {
        'VITE_SUPABASE_URL': import.meta.env.VITE_SUPABASE_URL,
        'VITE_SUPABASE_ANON_KEY': import.meta.env.VITE_SUPABASE_ANON_KEY ? '[OCULTO]' : undefined,
        'VITE_FIREBASE_API_KEY': import.meta.env.VITE_FIREBASE_API_KEY,
        'VITE_FIREBASE_AUTH_DOMAIN': import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        'VITE_FIREBASE_PROJECT_ID': import.meta.env.VITE_FIREBASE_PROJECT_ID,
        'VITE_FIREBASE_STORAGE_BUCKET': import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        'VITE_FIREBASE_MESSAGING_SENDER_ID': import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        'VITE_FIREBASE_APP_ID': import.meta.env.VITE_FIREBASE_APP_ID,
        'VITE_FIREBASE_VAPID_KEY': import.meta.env.VITE_FIREBASE_VAPID_KEY ? '[OCULTO]' : undefined,
      };

      Object.entries(vars).forEach(([key, value]) => {
        if (value) {
          console.log(`%c✓ ${key}`, 'color: green', value);
        } else {
          console.log(`%c✗ ${key}`, 'color: red', 'NÃO CONFIGURADO');
        }
      });
    },

    /**
     * Mostrar ajuda
     */
    help: () => {
      console.log('%c========================================', 'color: blue; font-weight: bold');
      console.log('%c📚 AJUDA - TEST PUSH NOTIFICATIONS', 'color: blue; font-weight: bold');
      console.log('%c========================================', 'color: blue; font-weight: bold');
      console.log('');
      console.log('%cComandos Disponíveis:', 'color: cyan; font-weight: bold');
      console.log('');
      console.log('%cawait testPushNotifications.quick()', 'color: yellow');
      console.log('  → Executa teste rápido (sem solicitar permissões)');
      console.log('');
      console.log('%cawait testPushNotifications.full()', 'color: yellow');
      console.log('  → Executa teste completo (solicita permissões e envia notificação)');
      console.log('');
      console.log('%ctestPushNotifications.checkConfig()', 'color: yellow');
      console.log('  → Verifica se o Firebase está configurado corretamente');
      console.log('');
      console.log('%cawait testPushNotifications.showTokens()', 'color: yellow');
      console.log('  → Mostra todos os tokens salvos no banco de dados');
      console.log('');
      console.log('%ctestPushNotifications.showEnvVars()', 'color: yellow');
      console.log('  → Mostra as variáveis de ambiente configuradas');
      console.log('');
      console.log('%ctestPushNotifications.help()', 'color: yellow');
      console.log('  → Mostra esta ajuda');
      console.log('');
      console.log('%c========================================', 'color: blue; font-weight: bold');
    },
  };

  console.log('%c🔔 Push Notification Test Helpers carregados!', 'color: green; font-weight: bold');
  console.log('%cDigite testPushNotifications.help() para ver os comandos disponíveis', 'color: cyan');
};

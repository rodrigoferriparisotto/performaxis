/**
 * Script de teste para Push Notifications
 *
 * Este arquivo contém funções para testar o sistema de notificações push
 * do Firebase integrado com Supabase.
 */

import { requestPushNotificationPermission, sendTestNotification, getUserPushTokens } from '../services/firebasePushService';
import { isFirebaseConfigured } from '../services/firebaseConfig';
import { supabase } from '../lib/supabase';

interface TestResult {
  step: string;
  success: boolean;
  message: string;
  data?: any;
}

export class PushNotificationTester {
  private results: TestResult[] = [];
  private userId: string = '';

  constructor(userId: string) {
    this.userId = userId;
  }

  private addResult(step: string, success: boolean, message: string, data?: any) {
    this.results.push({ step, success, message, data });
    console.log(`[${success ? '✓' : '✗'}] ${step}: ${message}`, data || '');
  }

  /**
   * Teste 1: Verificar configuração do Firebase
   */
  async testFirebaseConfiguration(): Promise<boolean> {
    try {
      const isConfigured = isFirebaseConfigured();

      if (isConfigured) {
        this.addResult(
          'Firebase Configuration',
          true,
          'Firebase está configurado corretamente'
        );
        return true;
      } else {
        this.addResult(
          'Firebase Configuration',
          false,
          'Firebase NÃO está configurado. Verifique as variáveis de ambiente no arquivo .env'
        );
        return false;
      }
    } catch (error) {
      this.addResult(
        'Firebase Configuration',
        false,
        `Erro ao verificar configuração: ${error}`
      );
      return false;
    }
  }

  /**
   * Teste 2: Verificar variáveis de ambiente
   */
  testEnvironmentVariables(): boolean {
    const requiredVars = [
      'VITE_FIREBASE_API_KEY',
      'VITE_FIREBASE_AUTH_DOMAIN',
      'VITE_FIREBASE_PROJECT_ID',
      'VITE_FIREBASE_STORAGE_BUCKET',
      'VITE_FIREBASE_MESSAGING_SENDER_ID',
      'VITE_FIREBASE_APP_ID',
      'VITE_FIREBASE_VAPID_KEY',
    ];

    const missingVars: string[] = [];
    const presentVars: string[] = [];

    requiredVars.forEach(varName => {
      const value = import.meta.env[varName];
      if (!value || value === 'undefined' || value === '') {
        missingVars.push(varName);
      } else {
        presentVars.push(varName);
      }
    });

    if (missingVars.length === 0) {
      this.addResult(
        'Environment Variables',
        true,
        `Todas as ${requiredVars.length} variáveis estão configuradas`,
        { presentVars }
      );
      return true;
    } else {
      this.addResult(
        'Environment Variables',
        false,
        `${missingVars.length} variável(is) faltando`,
        { missingVars, presentVars }
      );
      return false;
    }
  }

  /**
   * Teste 3: Verificar permissões do navegador
   */
  async testBrowserPermissions(): Promise<boolean> {
    try {
      if (!('Notification' in window)) {
        this.addResult(
          'Browser Permissions',
          false,
          'Este navegador não suporta notificações'
        );
        return false;
      }

      const permission = Notification.permission;

      if (permission === 'granted') {
        this.addResult(
          'Browser Permissions',
          true,
          'Permissão de notificação já concedida',
          { permission }
        );
        return true;
      } else if (permission === 'denied') {
        this.addResult(
          'Browser Permissions',
          false,
          'Permissão de notificação foi NEGADA. Você precisa habilitar manualmente nas configurações do navegador',
          { permission }
        );
        return false;
      } else {
        this.addResult(
          'Browser Permissions',
          false,
          'Permissão ainda não solicitada. Use o teste de solicitação de permissão',
          { permission }
        );
        return false;
      }
    } catch (error) {
      this.addResult(
        'Browser Permissions',
        false,
        `Erro ao verificar permissões: ${error}`
      );
      return false;
    }
  }

  /**
   * Teste 4: Solicitar permissão e obter token
   */
  async testRequestPermissionAndToken(): Promise<string | null> {
    try {
      const token = await requestPushNotificationPermission(this.userId);

      if (token) {
        this.addResult(
          'Request Permission & Token',
          true,
          'Token FCM obtido com sucesso',
          { token: token.substring(0, 50) + '...' }
        );
        return token;
      } else {
        this.addResult(
          'Request Permission & Token',
          false,
          'Não foi possível obter o token FCM'
        );
        return null;
      }
    } catch (error) {
      this.addResult(
        'Request Permission & Token',
        false,
        `Erro ao solicitar permissão: ${error}`
      );
      return null;
    }
  }

  /**
   * Teste 5: Verificar tokens no Supabase
   */
  async testTokensInDatabase(): Promise<boolean> {
    try {
      const tokens = await getUserPushTokens(this.userId);

      if (tokens.length > 0) {
        this.addResult(
          'Tokens in Database',
          true,
          `${tokens.length} token(s) encontrado(s) no banco de dados`,
          {
            tokens: tokens.map(t => ({
              id: t.id,
              token: t.token.substring(0, 30) + '...',
              isActive: t.is_active,
              lastUsed: t.last_used_at,
              deviceInfo: t.device_info
            }))
          }
        );
        return true;
      } else {
        this.addResult(
          'Tokens in Database',
          false,
          'Nenhum token encontrado no banco de dados para este usuário'
        );
        return false;
      }
    } catch (error) {
      this.addResult(
        'Tokens in Database',
        false,
        `Erro ao buscar tokens: ${error}`
      );
      return false;
    }
  }

  /**
   * Teste 6: Verificar Edge Function
   */
  async testEdgeFunction(): Promise<boolean> {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push-notification`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tokens: ['test-token'],
            title: 'Teste de Conexão',
            body: 'Verificando se a Edge Function está ativa',
          }),
        }
      );

      if (response.ok || response.status === 400) {
        this.addResult(
          'Edge Function',
          true,
          'Edge Function está ativa e respondendo',
          { status: response.status }
        );
        return true;
      } else {
        const errorText = await response.text();
        this.addResult(
          'Edge Function',
          false,
          `Edge Function retornou erro: ${response.status}`,
          { status: response.status, error: errorText }
        );
        return false;
      }
    } catch (error) {
      this.addResult(
        'Edge Function',
        false,
        `Erro ao testar Edge Function: ${error}`
      );
      return false;
    }
  }

  /**
   * Teste 7: Enviar notificação de teste real
   */
  async testSendRealNotification(): Promise<boolean> {
    try {
      await sendTestNotification(
        this.userId,
        '🔔 Teste de Notificação',
        'Se você recebeu esta notificação, tudo está funcionando perfeitamente!'
      );

      this.addResult(
        'Send Real Notification',
        true,
        'Notificação de teste enviada com sucesso! Verifique se você recebeu.'
      );
      return true;
    } catch (error) {
      this.addResult(
        'Send Real Notification',
        false,
        `Erro ao enviar notificação: ${error}`
      );
      return false;
    }
  }

  /**
   * Teste 8: Verificar Service Worker
   */
  async testServiceWorker(): Promise<boolean> {
    try {
      if (!('serviceWorker' in navigator)) {
        this.addResult(
          'Service Worker',
          false,
          'Service Worker não é suportado neste navegador'
        );
        return false;
      }

      const registration = await navigator.serviceWorker.getRegistration();

      if (registration) {
        this.addResult(
          'Service Worker',
          true,
          'Service Worker está registrado',
          {
            scope: registration.scope,
            active: !!registration.active,
            installing: !!registration.installing,
            waiting: !!registration.waiting,
          }
        );
        return true;
      } else {
        this.addResult(
          'Service Worker',
          false,
          'Service Worker não está registrado'
        );
        return false;
      }
    } catch (error) {
      this.addResult(
        'Service Worker',
        false,
        `Erro ao verificar Service Worker: ${error}`
      );
      return false;
    }
  }

  /**
   * Executar todos os testes
   */
  async runAllTests(): Promise<void> {
    console.log('========================================');
    console.log('🚀 INICIANDO TESTES DE PUSH NOTIFICATIONS');
    console.log('========================================\n');

    this.results = [];

    console.log('Teste 1: Verificando configuração do Firebase...');
    await this.testFirebaseConfiguration();

    console.log('\nTeste 2: Verificando variáveis de ambiente...');
    this.testEnvironmentVariables();

    console.log('\nTeste 3: Verificando permissões do navegador...');
    await this.testBrowserPermissions();

    console.log('\nTeste 4: Verificando Service Worker...');
    await this.testServiceWorker();

    console.log('\nTeste 5: Verificando tokens no banco de dados...');
    await this.testTokensInDatabase();

    console.log('\nTeste 6: Testando Edge Function...');
    await this.testEdgeFunction();

    console.log('\n========================================');
    console.log('📊 RESUMO DOS TESTES');
    console.log('========================================\n');

    this.printResults();
  }

  /**
   * Executar teste completo (com solicitação de permissão e envio)
   */
  async runFullTest(): Promise<void> {
    await this.runAllTests();

    console.log('\n========================================');
    console.log('🔔 TESTE FINAL - ENVIO DE NOTIFICAÇÃO');
    console.log('========================================\n');

    console.log('Teste 7: Solicitando permissão e obtendo token...');
    const token = await this.testRequestPermissionAndToken();

    if (token) {
      console.log('\nTeste 8: Enviando notificação de teste real...');
      await this.testSendRealNotification();
    }

    console.log('\n========================================');
    console.log('📊 RESUMO FINAL');
    console.log('========================================\n');

    this.printResults();
  }

  /**
   * Imprimir resultados
   */
  printResults(): void {
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;

    this.results.forEach(result => {
      const icon = result.success ? '✓' : '✗';
      const color = result.success ? '\x1b[32m' : '\x1b[31m';
      console.log(`${color}${icon}\x1b[0m ${result.step}: ${result.message}`);
      if (result.data) {
        console.log('  Dados:', result.data);
      }
    });

    console.log('\n----------------------------------------');
    console.log(`Total: ${this.results.length} testes`);
    console.log(`\x1b[32m✓ Passou: ${passed}\x1b[0m`);
    console.log(`\x1b[31m✗ Falhou: ${failed}\x1b[0m`);
    console.log('----------------------------------------\n');

    if (failed === 0) {
      console.log('\x1b[32m🎉 TODOS OS TESTES PASSARAM!\x1b[0m\n');
    } else {
      console.log('\x1b[33m⚠️  ALGUNS TESTES FALHARAM. Verifique os detalhes acima.\x1b[0m\n');
    }
  }

  /**
   * Obter resultados
   */
  getResults(): TestResult[] {
    return this.results;
  }
}

/**
 * Função auxiliar para executar testes rápidos
 */
export const quickTest = async (userId: string) => {
  const tester = new PushNotificationTester(userId);
  await tester.runAllTests();
  return tester.getResults();
};

/**
 * Função auxiliar para executar teste completo
 */
export const fullTest = async (userId: string) => {
  const tester = new PushNotificationTester(userId);
  await tester.runFullTest();
  return tester.getResults();
};

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();

precacheAndRoute(self.__WB_MANIFEST);

let heartbeatInterval: number | null = null;

function startHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  heartbeatInterval = setInterval(() => {
    console.log('[SW] Heartbeat - Service Worker is active');
  }, 30000) as unknown as number;
}

self.addEventListener('activate', (event) => {
  console.log('[SW] Activated - starting heartbeat');
  startHeartbeat();
  event.waitUntil(self.clients.claim());
});

/**
 * Verifica se o app está em foreground (janela aberta, visível e focada)
 * Implementação mais robusta para detectar corretamente o estado do app
 */
async function isAppInForeground(): Promise<boolean> {
  try {
    const clientList = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });

    if (clientList.length === 0) {
      return false;
    }

    for (const client of clientList) {
      const clientAny = client as any;

      if (clientAny.visibilityState === 'visible' && clientAny.focused) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('[SW] Error checking app state:', error);
    return false;
  }
}

/**
 * Verifica se o app tem alguma janela aberta (mesmo que não esteja focada)
 */
async function hasOpenWindow(): Promise<boolean> {
  try {
    const clientList = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });

    return clientList.length > 0;
  } catch (error) {
    console.error('[SW] Error checking open windows:', error);
    return false;
  }
}

/**
 * Envia mensagem para o app se estiver em foreground
 * Agora só envia para janelas que estão realmente visíveis e focadas
 */
async function sendMessageToApp(message: any): Promise<boolean> {
  try {
    const clientList = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });

    let sent = false;
    for (const client of clientList) {
      const clientAny = client as any;

      if (clientAny.visibilityState === 'visible' && clientAny.focused) {
        client.postMessage(message);
        sent = true;
      }
    }

    return sent;
  } catch (error) {
    console.error('[SW] Error sending message to app:', error);
    return false;
  }
}

registerRoute(
  ({ url }) => url.origin === 'https://supabase.co' || url.hostname.includes('supabase'),
  new NetworkFirst({
    cacheName: 'supabase-cache',
  })
);

async function checkRemindersInBackground() {
  try {
    const db = await openDatabase();
    const reminderState = await getReminderState(db);

    if (!reminderState || !reminderState.userId) {
      return;
    }

    const activeRecords = await getActiveRecordsFromDB(db, reminderState.userId);

    if (activeRecords.length === 0) {
      return;
    }

    const recordsWithTime = activeRecords.map(record => {
      const startTime = new Date(record.hora_inicio);
      const now = new Date();
      const diffMs = now.getTime() - startTime.getTime();
      const horasDecorridas = diffMs / (1000 * 60 * 60);
      return { ...record, horasDecorridas };
    });

    const pendingRecords = recordsWithTime.filter(r => r.horasDecorridas >= 6);

    if (pendingRecords.length > 0) {
      await notifyPendingRecords(pendingRecords);
    }
  } catch (error) {
    console.error('Error checking reminders in background:', error);
  }
}

async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('performaxis-db', 3);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getReminderState(db: IDBDatabase): Promise<any> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['reminder_state'], 'readonly');
    const store = transaction.objectStore('reminder_state');
    const request = store.getAll();

    request.onsuccess = () => {
      const states = request.result;
      resolve(states.length > 0 ? states[0] : null);
    };
    request.onerror = () => reject(request.error);
  });
}

async function getActiveRecordsFromDB(db: IDBDatabase, userId: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['active_records'], 'readonly');
    const store = transaction.objectStore('active_records');
    const index = store.index('usuario_id');
    const request = index.getAll(userId);

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function notifyPendingRecords(records: any[]) {
  const maxRecords = records.slice(0, 3);
  const baseUrl = self.location.origin;

  for (const record of maxRecords) {
    const hours = Math.floor(record.horasDecorridas);
    let level: 'info' | 'warning' | 'urgent' | 'critical' = 'info';
    let title = '';
    let body = '';

    if (hours >= 11) {
      level = 'critical';
      title = `URGENTE: ${hours}h decorridas!`;
      body = 'Finalize IMEDIATAMENTE esta atividade!';
    } else if (hours >= 10) {
      level = 'urgent';
      title = `ATENÇÃO: ${hours}h decorridas!`;
      body = 'Finalize urgentemente esta atividade';
    } else if (hours >= 8) {
      level = 'warning';
      title = `${hours}h decorridas`;
      body = 'Por favor, finalize esta atividade';
    } else {
      level = 'info';
      title = `${hours}h decorridas`;
      body = 'Você já concluiu esta atividade?';
    }

    const vibrationPatterns: Record<string, number[]> = {
      info: [500],
      warning: [300, 100, 400],
      urgent: [500, 200, 700, 200, 500],
      critical: [800, 200, 800, 200, 800, 200, 800],
    };

    await self.registration.showNotification(title, {
      body,
      icon: '/logo_performaxis_azul.png',
      badge: '/logo_performaxis_azul.png',
      vibrate: vibrationPatterns[level],
      silent: false,
      requireInteraction: level === 'critical' || level === 'urgent',
      tag: `bg-reminder-${record.id}`,
      renotify: true,
      timestamp: Date.now(),
      data: {
        url: baseUrl + '/',
        recordId: record.id,
      },
    });
  }
}



async function checkMarkingInactivityInBackground() {
  try {
    const db = await openDatabase();

    const lastMarkingData = await getLastMarkingFromStorage();
    if (!lastMarkingData) {
      return;
    }

    const { timestamp, modulo, userId } = lastMarkingData;
    const lastMarkingTime = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - lastMarkingTime.getTime()) / (1000 * 60));
    const diffHours = diffMinutes / 60;

    if (diffHours > 24) {
      return;
    }

    if (diffMinutes >= 30) {
      const activeRecords = await getActiveRecordsFromDB(db, userId);

      if (activeRecords.length === 0) {
        return;
      }

      const moduleUrl = mapModuloToHistoricoUrlInSW(modulo);
      const baseUrl = self.location.origin;

      await self.registration.showNotification('Alerta de Inatividade', {
        body: 'Você já está muito tempo sem atualizar suas atividades. Revise agora!',
        icon: '/logo_performaxis_azul.png',
        badge: '/logo_performaxis_azul.png',
        vibrate: [300, 100, 400],
        silent: false,
        requireInteraction: true,
        tag: 'marking-inactivity-alert',
        renotify: true,
        timestamp: Date.now(),
        data: {
          url: `${baseUrl}/#${moduleUrl}`,
          type: 'marking-inactivity',
        },
      });
    }
  } catch (error) {
    console.error('Error checking marking inactivity in background:', error);
  }
}

async function getCurrentModuleFromDB(db: IDBDatabase): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      if (!db.objectStoreNames.contains('current_module')) {
        resolve(null);
        return;
      }

      const transaction = db.transaction(['current_module'], 'readonly');
      const store = transaction.objectStore('current_module');
      const request = store.getAll();

      request.onsuccess = () => {
        const modules = request.result;
        resolve(modules.length > 0 ? modules[0] : null);
      };
      request.onerror = () => resolve(null);
    } catch (error) {
      resolve(null);
    }
  });
}

async function getLastMarkingFromStorage(): Promise<{ timestamp: string; modulo: string; userId: string } | null> {
  try {
    const db = await openDatabase();
    const moduleData = await getCurrentModuleFromDB(db);

    if (!moduleData) {
      return null;
    }

    return {
      timestamp: moduleData.timestamp,
      modulo: moduleData.modulo,
      userId: moduleData.userId,
    };
  } catch (error) {
    console.error('Error getting last marking:', error);
    return null;
  }
}

function mapModuloToUrlInSW(modulo: string | null): string {
  if (!modulo) return 'dashboard';

  const moduleMap: Record<string, string> = {
    'recepcao': 'recepcao',
    'gestao': 'gestao',
    'cozinha': 'cozinha',
    'areas_comuns': 'areas-comuns',
    'camararia': 'camararia',
    'revisao': 'revisao',
    'vendas': 'vendas',
    'noturnas': 'noturnas',
    'atividades_extras': 'atividades-extras',
    'atividades_diarias': 'atividades-diarias',
    'manutencao': 'manutencao'
  };

  return moduleMap[modulo.toLowerCase()] || 'dashboard';
}

function mapModuloToHistoricoUrlInSW(modulo: string | null): string {
  if (!modulo) return 'dashboard';

  const historicoMap: Record<string, string> = {
    'recepcao': 'historico-recepcao',
    'gestao': 'historico-gestao',
    'cozinha': 'historico-cozinha',
    'areas_comuns': 'historico-areas-comuns',
    'camararia': 'historico-camararia',
    'revisao': 'historico-revisao',
    'vendas': 'historico-vendas',
    'noturnas': 'historico-noturnas',
    'atividades_extras': 'historico-atividades-extras',
    'atividades_diarias': 'historico-atividades-diarias',
    'manutencao': 'historico-manutencao'
  };

  return historicoMap[modulo.toLowerCase()] || 'dashboard';
}

async function checkMessagesInBackground() {
  try {
    const db = await openDatabase();
    const messageState = await getMessageState(db);

    if (!messageState || !messageState.userId) {
      return;
    }

    const unreadMessages = await getUnreadMessagesFromDB(db, messageState.userId);

    if (unreadMessages.length === 0) {
      return;
    }

    const blockingMessages = unreadMessages.filter(msg => msg.bloqueia_sistema);
    const regularMessages = unreadMessages.filter(msg => !msg.bloqueia_sistema);

    for (const message of blockingMessages) {
      await notifyMessage(message);
    }

    if (regularMessages.length === 1) {
      await notifyMessage(regularMessages[0]);
    } else if (regularMessages.length > 1) {
      const baseUrl = self.location.origin;

      await self.registration.showNotification(
        `Você tem ${regularMessages.length} mensagens não lidas`,
        {
          body: 'Clique para visualizar todas as mensagens',
          icon: '/logo_performaxis_azul.png',
          badge: '/logo_performaxis_azul.png',
          vibrate: [100],
          silent: false,
          requireInteraction: false,
          tag: 'multiple-messages',
          renotify: true,
          timestamp: Date.now(),
          data: {
            url: baseUrl + '/',
            type: 'multiple',
          },
        }
      );
    }
  } catch (error) {
    console.error('Error checking messages in background:', error);
  }
}

async function getMessageState(db: IDBDatabase): Promise<any> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['message_state'], 'readonly');
    const store = transaction.objectStore('message_state');
    const request = store.getAll();

    request.onsuccess = () => {
      const states = request.result;
      resolve(states.length > 0 ? states[0] : null);
    };
    request.onerror = () => reject(request.error);
  });
}

async function getUnreadMessagesFromDB(db: IDBDatabase, userId: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['unread_messages'], 'readonly');
    const store = transaction.objectStore('unread_messages');
    const index = store.index('usuario_id');
    const request = index.getAll(userId);

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function notifyMessage(message: any) {
  const vibrationPatterns: Record<string, number[]> = {
    informacao: [100],
    aviso: [100, 50, 100],
    urgente: [200, 100, 200, 100, 200],
  };

  const truncatedBody = message.conteudo.substring(0, 100) + (message.conteudo.length > 100 ? '...' : '');
  const baseUrl = self.location.origin;

  await self.registration.showNotification(message.titulo, {
    body: truncatedBody,
    icon: '/logo_performaxis_azul.png',
    badge: '/logo_performaxis_azul.png',
    vibrate: vibrationPatterns[message.tipo] || [100],
    silent: false,
    requireInteraction: message.bloqueia_sistema,
    tag: `message-${message.mensagem_id}`,
    renotify: true,
    timestamp: Date.now(),
    data: {
      url: baseUrl + '/',
      messageId: message.mensagem_id,
      type: message.tipo,
    },
  });
}

self.addEventListener('periodicsync', (event: any) => {
  if (event.tag === 'periodic-reminder-check') {
    event.waitUntil(checkRemindersInBackground());
  }
  if (event.tag === 'check-messages') {
    event.waitUntil(checkMessagesInBackground());
  }
  if (event.tag === 'marking-inactivity-check') {
    event.waitUntil(checkMarkingInactivityInBackground());
  }
});

self.addEventListener('sync', (event: any) => {
  if (event.tag === 'reminder-check-sync') {
    event.waitUntil(checkRemindersInBackground());
  }
  if (event.tag === 'message-check-sync') {
    event.waitUntil(checkMessagesInBackground());
  }
  if (event.tag === 'marking-inactivity-check-sync') {
    event.waitUntil(checkMarkingInactivityInBackground());
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  let urlToOpen = event.notification.data?.url || '/';

  if (!urlToOpen.startsWith('http://') && !urlToOpen.startsWith('https://')) {
    urlToOpen = self.location.origin + (urlToOpen.startsWith('/') ? urlToOpen : '/' + urlToOpen);
  }

  const promiseChain = self.clients
    .matchAll({
      type: 'window',
      includeUncontrolled: true,
    })
    .then((windowClients) => {
      let matchingClient = null;

      for (let i = 0; i < windowClients.length; i++) {
        const windowClient = windowClients[i];
        if (windowClient.url.includes(self.location.origin)) {
          matchingClient = windowClient;
          break;
        }
      }

      if (matchingClient) {
        return matchingClient.focus().then((client) => {
          return client.navigate(urlToOpen);
        });
      } else {
        return self.clients.openWindow(urlToOpen);
      }
    })
    .catch((error) => {
      console.error('Error handling notification click:', error);
      return self.clients.openWindow(self.location.origin);
    });

  event.waitUntil(promiseChain);
});

function getVibrationPattern(tipo: string): number[] {
  const patterns: Record<string, number[]> = {
    'urgente': [200, 100, 200, 100, 200],
    'aviso': [100, 50, 100],
    'update': [300, 100, 300],
    'reminder': [100, 50, 100],
    'inactivity': [300, 100, 400],
    'broadcast': [200, 100, 200],
    'info': [100],
  };
  return patterns[tipo] || [200, 100, 200];
}

self.addEventListener('push', (event) => {
  console.log('[SW] Push event received:', event);

  const handlePush = async () => {
    try {
      const payload = event.data?.json() ?? {};
      console.log('[SW] Push payload:', payload);

    const messageData = payload.data || payload;

    let title = messageData.title || payload.notification?.title || '';
    let body = messageData.body || payload.notification?.body || '';
    const tipo = messageData.tipo || messageData.type || 'info';

    if (!title || title === 'PERFORMAXIS') {
      if (tipo === 'inactivity') {
        const minutesInactive = parseInt(messageData.minutesInactive || '30', 10);
        title = minutesInactive >= 120 ? 'CRÍTICO: Inatividade prolongada!' :
                minutesInactive >= 75 ? 'URGENTE: Você está inativo!' :
                'ATENÇÃO: Você está inativo';
        body = body || `Você está há ${minutesInactive} minutos sem registrar atividades`;
      } else if (tipo === 'reminder') {
        title = 'Lembrete de Atividade Pendente';
        body = body || 'Você tem atividades pendentes para finalizar';
      } else {
        title = 'PERFORMAXIS';
        body = body || 'Nova notificação';
      }
    }

    console.log('[SW] Normalized notification:', { title, body, tipo });

    let url = messageData.url || '/';
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = self.location.origin + (url.startsWith('/') ? url : '/' + url);
    }

    // Verifica se o app está em foreground
    const inForeground = await isAppInForeground();
    console.log('[SW] App in foreground:', inForeground);

    if (inForeground) {
      // App está aberto e visível - envia mensagem para o app exibir modal
      const sent = await sendMessageToApp({
        type: 'PUSH_NOTIFICATION',
        title,
        body,
        tipo,
        url,
        timestamp: Date.now(),
        ...messageData
      });

      console.log('[SW] Message sent to foreground app:', sent);

      // Se conseguiu enviar para o app, não mostra notificação do sistema
      if (sent) {
        return;
      }
    }

    // App está em background ou fechado - mostra notificação do sistema
    const options = {
      body: body,
      icon: messageData.icon || '/logo_performaxis_azul.png',
      badge: messageData.badge || '/logo_performaxis_azul.png',
      data: {
        url: url,
        tipo: tipo,
        timestamp: messageData.timestamp,
        priority: messageData.priority,
        ...messageData
      },
      vibrate: getVibrationPattern(tipo),
      silent: false,
      requireInteraction: tipo === 'urgente' || tipo === 'update' || tipo === 'inactivity',
      tag: `notification-${tipo}-${Date.now()}`,
      renotify: true,
      timestamp: Date.now(),
    };

      console.log('[SW] Showing system notification:', { title, options });
      await self.registration.showNotification(title, options);
    } catch (error) {
      console.error('[SW] Error handling push:', error);
      await self.registration.showNotification('PERFORMAXIS', {
        body: 'Nova notificação disponível',
        icon: '/logo_performaxis_azul.png',
        badge: '/logo_performaxis_azul.png',
      });
    }
  };

  event.waitUntil(handlePush());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHECK_REMINDERS_NOW') {
    event.waitUntil(checkRemindersInBackground());
  }
  if (event.data && event.data.type === 'CHECK_MESSAGES_NOW') {
    event.waitUntil(checkMessagesInBackground());
  }
  if (event.data && event.data.type === 'CHECK_MARKING_INACTIVITY') {
    event.waitUntil(checkMarkingInactivityInBackground());
  }
});

const DB_NAME = 'performaxis-db';
const DB_VERSION = 3;
const STORE_ACTIVE_RECORDS = 'active_records';
const STORE_REMINDER_STATE = 'reminder_state';
const STORE_UNREAD_MESSAGES = 'unread_messages';
const STORE_MESSAGE_STATE = 'message_state';
const STORE_CURRENT_MODULE = 'current_module';

interface ActiveRecord {
  id: string;
  tipo_registro: string;
  hora_inicio: string;
  usuario_id: string;
  empresa_id: string;
  info_adicional: {
    suite?: string;
    servico?: string;
    tipo?: string;
    status: string;
  };
}

interface ReminderState {
  userId: string;
  lastCheckTime: string;
  pendingCount: number;
  lastNotificationSent?: string;
}

interface UnreadMessage {
  mensagem_id: string;
  titulo: string;
  conteudo: string;
  tipo: 'informacao' | 'aviso' | 'urgente';
  bloqueia_sistema: boolean;
  criada_em: string;
  tentativas_entrega: number;
}

interface MessageState {
  userId: string;
  lastCheckTime: string;
  unreadCount: number;
  lastNotificationSent?: string;
}

interface CurrentModule {
  userId: string;
  modulo: string;
  timestamp: string;
}

class IndexedDBService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Error opening IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORE_ACTIVE_RECORDS)) {
          const recordStore = db.createObjectStore(STORE_ACTIVE_RECORDS, { keyPath: 'id' });
          recordStore.createIndex('usuario_id', 'usuario_id', { unique: false });
          recordStore.createIndex('tipo_registro', 'tipo_registro', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORE_REMINDER_STATE)) {
          db.createObjectStore(STORE_REMINDER_STATE, { keyPath: 'userId' });
        }

        if (!db.objectStoreNames.contains(STORE_UNREAD_MESSAGES)) {
          const messageStore = db.createObjectStore(STORE_UNREAD_MESSAGES, { keyPath: 'mensagem_id' });
          messageStore.createIndex('usuario_id', 'usuario_id', { unique: false });
          messageStore.createIndex('tipo', 'tipo', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORE_MESSAGE_STATE)) {
          db.createObjectStore(STORE_MESSAGE_STATE, { keyPath: 'userId' });
        }

        if (!db.objectStoreNames.contains(STORE_CURRENT_MODULE)) {
          db.createObjectStore(STORE_CURRENT_MODULE, { keyPath: 'userId' });
        }
      };
    });

    return this.initPromise;
  }

  async saveActiveRecord(record: ActiveRecord): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_ACTIVE_RECORDS], 'readwrite');
      const store = transaction.objectStore(STORE_ACTIVE_RECORDS);
      const request = store.put(record);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getActiveRecords(userId: string): Promise<ActiveRecord[]> {
    await this.init();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_ACTIVE_RECORDS], 'readonly');
      const store = transaction.objectStore(STORE_ACTIVE_RECORDS);
      const index = store.index('usuario_id');
      const request = index.getAll(userId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => {
        console.error('Error getting active records:', request.error);
        resolve([]);
      };
    });
  }

  async removeActiveRecord(recordId: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    const record = await new Promise<ActiveRecord | null>((resolve) => {
      const transaction = this.db!.transaction([STORE_ACTIVE_RECORDS], 'readonly');
      const store = transaction.objectStore(STORE_ACTIVE_RECORDS);
      const request = store.get(recordId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });

    await new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_ACTIVE_RECORDS], 'readwrite');
      const store = transaction.objectStore(STORE_ACTIVE_RECORDS);
      const request = store.delete(recordId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    if (record && record.usuario_id) {
      const remainingRecords = await this.getActiveRecords(record.usuario_id);

      if (remainingRecords.length === 0) {
        await this.clearCurrentModule(record.usuario_id);

        try {
          const { activityMarkingService } = await import('./activityMarkingService');
          activityMarkingService.limparMarcacao();
        } catch (error) {
        }
      }
    }
  }

  async clearActiveRecords(userId: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    const records = await this.getActiveRecords(userId);
    const promises = records.map((record) => this.removeActiveRecord(record.id));
    await Promise.all(promises);
  }

  async saveReminderState(state: ReminderState): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_REMINDER_STATE], 'readwrite');
      const store = transaction.objectStore(STORE_REMINDER_STATE);
      const request = store.put(state);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getReminderState(userId: string): Promise<ReminderState | null> {
    await this.init();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_REMINDER_STATE], 'readonly');
      const store = transaction.objectStore(STORE_REMINDER_STATE);
      const request = store.get(userId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => {
        console.error('Error getting reminder state:', request.error);
        resolve(null);
      };
    });
  }

  async calculateElapsedHours(record: ActiveRecord): Promise<number> {
    const startTime = new Date(record.hora_inicio);
    const now = new Date();
    const diffMs = now.getTime() - startTime.getTime();
    return diffMs / (1000 * 60 * 60);
  }

  async getPendingRecordsWithTime(userId: string, minHours: number = 6): Promise<Array<ActiveRecord & { horas_decorridas: number }>> {
    const records = await this.getActiveRecords(userId);
    const recordsWithTime = await Promise.all(
      records.map(async (record) => ({
        ...record,
        horas_decorridas: await this.calculateElapsedHours(record),
      }))
    );

    return recordsWithTime.filter((record) => record.horas_decorridas >= minHours);
  }

  async saveUnreadMessage(message: UnreadMessage & { usuario_id: string }): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_UNREAD_MESSAGES], 'readwrite');
      const store = transaction.objectStore(STORE_UNREAD_MESSAGES);
      const request = store.put(message);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getUnreadMessages(userId: string): Promise<UnreadMessage[]> {
    await this.init();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_UNREAD_MESSAGES], 'readonly');
      const store = transaction.objectStore(STORE_UNREAD_MESSAGES);
      const index = store.index('usuario_id');
      const request = index.getAll(userId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => {
        console.error('Error getting unread messages:', request.error);
        resolve([]);
      };
    });
  }

  async removeUnreadMessage(messageId: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_UNREAD_MESSAGES], 'readwrite');
      const store = transaction.objectStore(STORE_UNREAD_MESSAGES);
      const request = store.delete(messageId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearUnreadMessages(userId: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    const messages = await this.getUnreadMessages(userId);
    const promises = messages.map((message) => this.removeUnreadMessage(message.mensagem_id));
    await Promise.all(promises);
  }

  async saveMessageState(state: MessageState): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_MESSAGE_STATE], 'readwrite');
      const store = transaction.objectStore(STORE_MESSAGE_STATE);
      const request = store.put(state);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getMessageState(userId: string): Promise<MessageState | null> {
    await this.init();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_MESSAGE_STATE], 'readonly');
      const store = transaction.objectStore(STORE_MESSAGE_STATE);
      const request = store.get(userId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => {
        console.error('Error getting message state:', request.error);
        resolve(null);
      };
    });
  }

  async saveCurrentModule(userId: string, modulo: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const currentModule: CurrentModule = {
      userId,
      modulo,
      timestamp: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_CURRENT_MODULE], 'readwrite');
      const store = transaction.objectStore(STORE_CURRENT_MODULE);
      const request = store.put(currentModule);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCurrentModule(userId: string): Promise<string | null> {
    await this.init();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_CURRENT_MODULE], 'readonly');
      const store = transaction.objectStore(STORE_CURRENT_MODULE);
      const request = store.get(userId);

      request.onsuccess = () => {
        const result = request.result as CurrentModule | undefined;
        resolve(result?.modulo || null);
      };
      request.onerror = () => {
        console.error('Error getting current module:', request.error);
        resolve(null);
      };
    });
  }

  async clearCurrentModule(userId: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_CURRENT_MODULE], 'readwrite');
      const store = transaction.objectStore(STORE_CURRENT_MODULE);
      const request = store.delete(userId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  isSupported(): boolean {
    return 'indexedDB' in window;
  }
}

export const indexedDBService = new IndexedDBService();
export type { ActiveRecord, ReminderState, UnreadMessage, MessageState, CurrentModule };

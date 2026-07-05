type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogConfig {
  enabled: boolean;
  level: LogLevel;
  modules: Record<string, boolean>;
}

class LoggerService {
  private config: LogConfig;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = import.meta.env.DEV;
    this.config = {
      enabled: this.isDevelopment,
      level: (import.meta.env.VITE_LOG_LEVEL as LogLevel) || (this.isDevelopment ? 'warn' : 'error'),
      modules: this.parseModuleConfig()
    };
  }

  private parseModuleConfig(): Record<string, boolean> {
    const moduleConfig = import.meta.env.VITE_DEBUG_MODULES;
    if (!moduleConfig) return {};

    try {
      return moduleConfig.split(',').reduce((acc: Record<string, boolean>, module: string) => {
        acc[module.trim()] = true;
        return acc;
      }, {});
    } catch {
      return {};
    }
  }

  private shouldLog(level: LogLevel, module?: string): boolean {
    if (!this.isDevelopment && level !== 'error') {
      return false;
    }

    if (!this.config.enabled && level !== 'error') {
      return false;
    }

    if (module && Object.keys(this.config.modules).length > 0) {
      return this.config.modules[module] === true;
    }

    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const messageLevelIndex = levels.indexOf(level);

    return messageLevelIndex >= currentLevelIndex;
  }

  debug(message: string, data?: unknown, module?: string): void {
    if (this.shouldLog('debug', module)) {
      const prefix = module ? `[${module}]` : '';
      console.log(`${prefix} ${message}`, data !== undefined ? data : '');
    }
  }

  info(message: string, data?: unknown, module?: string): void {
    if (this.shouldLog('info', module)) {
      const prefix = module ? `[${module}]` : '';
      console.log(`${prefix} ${message}`, data !== undefined ? data : '');
    }
  }

  warn(message: string, data?: unknown, module?: string): void {
    if (this.shouldLog('warn', module)) {
      const prefix = module ? `[${module}]` : '';
      console.warn(`${prefix} ${message}`, data !== undefined ? data : '');
    }
  }

  error(message: string, error?: unknown, module?: string): void {
    if (this.shouldLog('error', module)) {
      const prefix = module ? `[${module}]` : '';
      console.error(`${prefix} ${message}`, error !== undefined ? error : '');
    }
  }
}

export const logger = new LoggerService();

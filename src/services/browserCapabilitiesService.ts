interface BrowserCapabilities {
  hasNotifications: boolean;
  hasServiceWorker: boolean;
  hasPeriodicBackgroundSync: boolean;
  hasPushNotifications: boolean;
  hasVibration: boolean;
  hasIndexedDB: boolean;
  hasPageVisibility: boolean;
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
  browser: 'chrome' | 'firefox' | 'safari' | 'edge' | 'opera' | 'unknown';
  isStandalone: boolean;
  canBackgroundSync: boolean;
  androidManufacturer?: string;
}

type AndroidManufacturer =
  | 'samsung'
  | 'xiaomi'
  | 'huawei'
  | 'oneplus'
  | 'motorola'
  | 'oppo'
  | 'realme'
  | 'vivo'
  | 'lg'
  | 'pixel'
  | 'generic'
  | 'unknown';

class BrowserCapabilitiesService {
  private capabilities: BrowserCapabilities | null = null;

  detect(): BrowserCapabilities {
    if (this.capabilities) {
      return this.capabilities;
    }

    const platform = this.detectPlatform();
    const browser = this.detectBrowser();
    const isStandalone = this.detectStandalone();
    const androidManufacturer = platform === 'android' ? this.detectAndroidManufacturer() : undefined;

    this.capabilities = {
      hasNotifications: 'Notification' in window,
      hasServiceWorker: 'serviceWorker' in navigator,
      hasPeriodicBackgroundSync: 'periodicSync' in ServiceWorkerRegistration.prototype,
      hasPushNotifications: 'PushManager' in window,
      hasVibration: 'vibrate' in navigator,
      hasIndexedDB: 'indexedDB' in window,
      hasPageVisibility: 'hidden' in document,
      platform,
      browser,
      isStandalone,
      canBackgroundSync: this.canUseBackgroundSync(platform, browser, isStandalone),
      androidManufacturer,
    };

    return this.capabilities;
  }

  private detectPlatform(): 'ios' | 'android' | 'desktop' | 'unknown' {
    const userAgent = navigator.userAgent.toLowerCase();

    if (/iphone|ipad|ipod/.test(userAgent)) {
      return 'ios';
    }

    if (/android/.test(userAgent)) {
      return 'android';
    }

    if (/windows|mac|linux/.test(userAgent)) {
      return 'desktop';
    }

    return 'unknown';
  }

  private detectBrowser(): 'chrome' | 'firefox' | 'safari' | 'edge' | 'opera' | 'unknown' {
    const userAgent = navigator.userAgent.toLowerCase();

    if (/edg/.test(userAgent)) {
      return 'edge';
    }

    if (/chrome|crios/.test(userAgent) && !/edg/.test(userAgent)) {
      return 'chrome';
    }

    if (/safari/.test(userAgent) && !/chrome|crios/.test(userAgent)) {
      return 'safari';
    }

    if (/firefox|fxios/.test(userAgent)) {
      return 'firefox';
    }

    if (/opr|opera/.test(userAgent)) {
      return 'opera';
    }

    return 'unknown';
  }

  private detectStandalone(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    );
  }

  private detectAndroidManufacturer(): AndroidManufacturer {
    const userAgent = navigator.userAgent.toLowerCase();

    if (userAgent.includes('samsung') || userAgent.includes('sm-')) {
      return 'samsung';
    }

    if (userAgent.includes('xiaomi') || userAgent.includes('mi ') || userAgent.includes('redmi')) {
      return 'xiaomi';
    }

    if (userAgent.includes('huawei') || userAgent.includes('honor')) {
      return 'huawei';
    }

    if (userAgent.includes('oneplus')) {
      return 'oneplus';
    }

    if (userAgent.includes('motorola') || userAgent.includes('moto')) {
      return 'motorola';
    }

    if (userAgent.includes('oppo')) {
      return 'oppo';
    }

    if (userAgent.includes('realme')) {
      return 'realme';
    }

    if (userAgent.includes('vivo')) {
      return 'vivo';
    }

    if (userAgent.includes('lg-') || userAgent.includes('lge')) {
      return 'lg';
    }

    if (userAgent.includes('pixel')) {
      return 'pixel';
    }

    if (userAgent.includes('android')) {
      return 'generic';
    }

    return 'unknown';
  }

  getAndroidManufacturerName(): string {
    const caps = this.detect();

    if (caps.platform !== 'android' || !caps.androidManufacturer) {
      return 'Android';
    }

    const names: Record<AndroidManufacturer, string> = {
      samsung: 'Samsung',
      xiaomi: 'Xiaomi',
      huawei: 'Huawei',
      oneplus: 'OnePlus',
      motorola: 'Motorola',
      oppo: 'Oppo',
      realme: 'Realme',
      vivo: 'Vivo',
      lg: 'LG',
      pixel: 'Google Pixel',
      generic: 'Android',
      unknown: 'Android',
    };

    return names[caps.androidManufacturer as AndroidManufacturer] || 'Android';
  }

  needsBatteryOptimizationGuide(): boolean {
    const caps = this.detect();
    return caps.platform === 'android';
  }

  private canUseBackgroundSync(
    platform: string,
    browser: string,
    isStandalone: boolean
  ): boolean {
    if (platform === 'ios') {
      return false;
    }

    if (platform === 'android') {
      return (browser === 'chrome' || browser === 'edge') && isStandalone;
    }

    if (platform === 'desktop') {
      return browser === 'chrome' || browser === 'edge' || browser === 'opera';
    }

    return false;
  }

  canVibrate(): boolean {
    const caps = this.detect();
    if (caps.platform === 'ios') {
      return false;
    }
    return 'vibrate' in navigator;
  }

  canPlayNotificationSound(): boolean {
    const caps = this.detect();
    return caps.hasNotifications && Notification.permission === 'granted';
  }

  getSoundLimitations(): string {
    const caps = this.detect();

    if (caps.platform === 'ios') {
      return 'iOS: Som de notificações depende das configurações do sistema. Verifique Ajustes > Notificações > Safari/Chrome.';
    }

    if (caps.platform === 'android') {
      return 'Android: Som funciona bem quando PWA está instalado. Verifique se as notificações não estão silenciadas no sistema.';
    }

    return 'Som de notificações funciona normalmente. Verifique se as notificações não estão silenciadas no sistema.';
  }

  getVibrationLimitations(): string {
    const caps = this.detect();

    if (caps.platform === 'ios') {
      return 'iOS: Vibração não é suportada pelo Safari. Esta funcionalidade não está disponível em dispositivos Apple.';
    }

    if (caps.platform === 'android') {
      return 'Android: Vibração funciona normalmente. Verifique se o modo silencioso não está ativado.';
    }

    return 'Vibração está disponível neste dispositivo.';
  }

  getDiagnosticInfo(): {
    platform: string;
    browser: string;
    canVibrate: boolean;
    canPlaySound: boolean;
    soundLimitations: string;
    vibrationLimitations: string;
    isStandalone: boolean;
    notificationPermission: NotificationPermission;
  } {
    const caps = this.detect();

    return {
      platform: caps.platform,
      browser: caps.browser,
      canVibrate: this.canVibrate(),
      canPlaySound: this.canPlayNotificationSound(),
      soundLimitations: this.getSoundLimitations(),
      vibrationLimitations: this.getVibrationLimitations(),
      isStandalone: caps.isStandalone,
      notificationPermission: Notification.permission,
    };
  }

  getRecommendedCheckInterval(): number {
    const caps = this.detect();

    if (caps.canBackgroundSync) {
      return 2 * 60 * 1000;
    }

    if (caps.platform === 'android') {
      return 3 * 60 * 1000;
    }

    if (caps.platform === 'ios') {
      return 1 * 60 * 1000;
    }

    return 5 * 60 * 1000;
  }

  getBackgroundSyncTag(): string {
    return 'reminder-check-sync';
  }

  getPeriodicSyncTag(): string {
    return 'periodic-reminder-check';
  }

  getMinimumPeriodicSyncInterval(): number {
    return 12 * 60 * 60 * 1000;
  }

  getLimitationsMessage(): string {
    const caps = this.detect();

    if (caps.platform === 'ios') {
      return 'iOS tem limitações para notificações em segundo plano. As notificações funcionam melhor quando o app está aberto ou em segundo plano recente.';
    }

    if (caps.platform === 'android' && !caps.isStandalone) {
      return 'Para melhor funcionamento das notificações em segundo plano no Android, instale o app na tela inicial.';
    }

    if (!caps.canBackgroundSync) {
      return 'Este navegador tem suporte limitado para notificações em segundo plano. Mantenha o app aberto para receber todas as notificações.';
    }

    return 'Notificações em segundo plano estão totalmente suportadas neste dispositivo e navegador.';
  }

  canUseWakeLock(): boolean {
    return 'wakeLock' in navigator;
  }

  canUseBackgroundFetch(): boolean {
    return 'BackgroundFetchManager' in window;
  }

  logCapabilities(): void {
    const caps = this.detect();
    console.log('🔍 Browser Capabilities:', {
      ...caps,
      recommendedInterval: `${this.getRecommendedCheckInterval() / 1000}s`,
      limitations: this.getLimitationsMessage(),
    });
  }
}

export const browserCapabilitiesService = new BrowserCapabilitiesService();
export type { BrowserCapabilities, AndroidManufacturer };

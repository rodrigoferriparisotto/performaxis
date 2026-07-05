export interface ParsedDeviceInfo {
  browser: string;
  os: string;
  platform: string;
  device: string;
}

export function parseDeviceInfo(deviceInfo: any): ParsedDeviceInfo {
  if (!deviceInfo) {
    return {
      browser: 'Desconhecido',
      os: 'Desconhecido',
      platform: 'Desconhecido',
      device: 'Desconhecido'
    };
  }

  const userAgent = deviceInfo.userAgent || '';
  const platform = deviceInfo.platform || 'Desconhecido';
  const vendor = deviceInfo.vendor || '';

  const browser = detectBrowser(userAgent, vendor);
  const os = detectOS(userAgent, platform);
  const device = detectDevice(userAgent);

  return {
    browser,
    os,
    platform,
    device
  };
}

function detectBrowser(userAgent: string, vendor: string): string {
  if (userAgent.includes('Edg/')) return 'Edge';
  if (userAgent.includes('Chrome/') && vendor.includes('Google')) return 'Chrome';
  if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) return 'Safari';
  if (userAgent.includes('Firefox/')) return 'Firefox';
  if (userAgent.includes('Opera/') || userAgent.includes('OPR/')) return 'Opera';
  if (userAgent.includes('MSIE') || userAgent.includes('Trident/')) return 'Internet Explorer';
  if (userAgent.includes('SamsungBrowser/')) return 'Samsung Internet';
  return 'Outro';
}

function detectOS(userAgent: string, platform: string): string {
  if (userAgent.includes('Windows NT 10.0')) return 'Windows 10/11';
  if (userAgent.includes('Windows NT 6.3')) return 'Windows 8.1';
  if (userAgent.includes('Windows NT 6.2')) return 'Windows 8';
  if (userAgent.includes('Windows NT 6.1')) return 'Windows 7';
  if (userAgent.includes('Windows')) return 'Windows';

  if (userAgent.includes('Mac OS X')) {
    const match = userAgent.match(/Mac OS X ([\d_]+)/);
    if (match) {
      const version = match[1].replace(/_/g, '.');
      return `macOS ${version}`;
    }
    return 'macOS';
  }

  if (userAgent.includes('Android')) {
    const match = userAgent.match(/Android ([\d.]+)/);
    if (match) return `Android ${match[1]}`;
    return 'Android';
  }

  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    const match = userAgent.match(/OS ([\d_]+)/);
    if (match) {
      const version = match[1].replace(/_/g, '.');
      return `iOS ${version}`;
    }
    return 'iOS';
  }

  if (userAgent.includes('Linux')) return 'Linux';
  if (platform.includes('Linux')) return 'Linux';
  if (platform.includes('Win')) return 'Windows';
  if (platform.includes('Mac')) return 'macOS';

  return platform || 'Desconhecido';
}

function detectDevice(userAgent: string): string {
  if (userAgent.includes('Mobile') || userAgent.includes('Android')) {
    if (userAgent.includes('Tablet')) return 'Tablet';
    return 'Mobile';
  }

  if (userAgent.includes('iPad')) return 'Tablet';
  if (userAgent.includes('iPhone')) return 'Mobile';

  return 'Desktop';
}

export function formatDeviceInfo(deviceInfo: any): string {
  const parsed = parseDeviceInfo(deviceInfo);
  return `${parsed.browser} em ${parsed.os} (${parsed.device})`;
}

import type { AndroidManufacturer } from '../services/browserCapabilitiesService';

export interface BatteryGuide {
  manufacturer: AndroidManufacturer;
  displayName: string;
  steps: string[];
  dontKillMyAppLink: string;
}

export const BATTERY_OPTIMIZATION_GUIDES: Record<AndroidManufacturer, BatteryGuide> = {
  samsung: {
    manufacturer: 'samsung',
    displayName: 'Samsung',
    steps: [
      'Abra as Configurações do seu dispositivo',
      'Toque em "Aplicativos"',
      'Toque no menu (três pontos) e selecione "Acesso especial"',
      'Selecione "Otimizar uso de bateria"',
      'Toque em "Todos" no topo da tela',
      'Encontre "PerformAxis" na lista',
      'Toque no app e selecione "Não otimizar"',
    ],
    dontKillMyAppLink: 'https://dontkillmyapp.com/samsung',
  },
  xiaomi: {
    manufacturer: 'xiaomi',
    displayName: 'Xiaomi / Redmi',
    steps: [
      'Abra as Configurações do seu dispositivo',
      'Vá em "Bateria e desempenho"',
      'Toque em "Gerenciar uso de bateria do app"',
      'Encontre "PerformAxis" na lista',
      'Selecione "Sem restrições"',
      'Volte e vá em "Inicialização automática"',
      'Ative a opção para "PerformAxis"',
    ],
    dontKillMyAppLink: 'https://dontkillmyapp.com/xiaomi',
  },
  huawei: {
    manufacturer: 'huawei',
    displayName: 'Huawei / Honor',
    steps: [
      'Abra as Configurações do seu dispositivo',
      'Vá em "Bateria"',
      'Toque em "Inicialização de apps"',
      'Encontre "PerformAxis" na lista',
      'Toque no app e selecione "Gerenciar manualmente"',
      'Ative todas as opções (Inicialização automática, Atividades secundárias, Executar em segundo plano)',
    ],
    dontKillMyAppLink: 'https://dontkillmyapp.com/huawei',
  },
  oneplus: {
    manufacturer: 'oneplus',
    displayName: 'OnePlus',
    steps: [
      'Abra as Configurações do seu dispositivo',
      'Vá em "Bateria"',
      'Toque em "Otimização de bateria"',
      'Encontre "PerformAxis" na lista',
      'Toque no app e selecione "Não otimizar"',
      'Volte e vá em "Gerenciar aplicativos"',
      'Toque em "PerformAxis" e ative "Executar em segundo plano"',
    ],
    dontKillMyAppLink: 'https://dontkillmyapp.com/oneplus',
  },
  motorola: {
    manufacturer: 'motorola',
    displayName: 'Motorola',
    steps: [
      'Abra as Configurações do seu dispositivo',
      'Vá em "Bateria"',
      'Toque em "Otimização de bateria"',
      'Toque em "Não otimizados" no topo',
      'Selecione "Todos os apps"',
      'Encontre "PerformAxis" na lista',
      'Selecione "Não otimizar"',
    ],
    dontKillMyAppLink: 'https://dontkillmyapp.com/motorola',
  },
  oppo: {
    manufacturer: 'oppo',
    displayName: 'Oppo',
    steps: [
      'Abra as Configurações do seu dispositivo',
      'Vá em "Bateria"',
      'Toque em "Gerenciamento de consumo de energia"',
      'Encontre "PerformAxis" na lista',
      'Toque no app e desative "Otimizar uso de bateria"',
      'Volte e vá em "Gerenciar apps"',
      'Ative "Executar em segundo plano" para o app',
    ],
    dontKillMyAppLink: 'https://dontkillmyapp.com/oppo',
  },
  realme: {
    manufacturer: 'realme',
    displayName: 'Realme',
    steps: [
      'Abra as Configurações do seu dispositivo',
      'Vá em "Bateria"',
      'Toque em "Gerenciar uso de bateria do app"',
      'Encontre "PerformAxis" na lista',
      'Selecione "Sem restrições"',
      'Volte e vá em "Gerenciar apps"',
      'Toque em "PerformAxis" e ative "Executar em segundo plano"',
    ],
    dontKillMyAppLink: 'https://dontkillmyapp.com/realme',
  },
  vivo: {
    manufacturer: 'vivo',
    displayName: 'Vivo',
    steps: [
      'Abra as Configurações do seu dispositivo',
      'Vá em "Bateria"',
      'Toque em "Consumo de energia em segundo plano"',
      'Encontre "PerformAxis" na lista',
      'Ative a opção "Permitir consumo em segundo plano"',
      'Volte e vá em "Gerenciar aplicativos"',
      'Ative "Inicialização automática" para o app',
    ],
    dontKillMyAppLink: 'https://dontkillmyapp.com/vivo',
  },
  lg: {
    manufacturer: 'lg',
    displayName: 'LG',
    steps: [
      'Abra as Configurações do seu dispositivo',
      'Vá em "Bateria"',
      'Toque em "Otimização de bateria"',
      'Toque em "Todos os apps"',
      'Encontre "PerformAxis" na lista',
      'Toque no app e selecione "Não otimizar"',
    ],
    dontKillMyAppLink: 'https://dontkillmyapp.com/lg',
  },
  pixel: {
    manufacturer: 'pixel',
    displayName: 'Google Pixel',
    steps: [
      'Abra as Configurações do seu dispositivo',
      'Vá em "Aplicativos"',
      'Toque em "Ver todos os aplicativos"',
      'Encontre e toque em "PerformAxis"',
      'Toque em "Bateria"',
      'Selecione "Irrestrito"',
    ],
    dontKillMyAppLink: 'https://dontkillmyapp.com/stock_android',
  },
  generic: {
    manufacturer: 'generic',
    displayName: 'Android',
    steps: [
      'Abra as Configurações do seu dispositivo',
      'Vá em "Bateria" ou "Aplicativos"',
      'Procure por "Otimização de bateria"',
      'Encontre "PerformAxis" na lista de aplicativos',
      'Desative a otimização de bateria para o app',
      'Se disponível, ative também "Executar em segundo plano"',
    ],
    dontKillMyAppLink: 'https://dontkillmyapp.com/',
  },
  unknown: {
    manufacturer: 'unknown',
    displayName: 'Android',
    steps: [
      'Abra as Configurações do seu dispositivo',
      'Vá em "Bateria" ou "Aplicativos"',
      'Procure por "Otimização de bateria"',
      'Encontre "PerformAxis" na lista de aplicativos',
      'Desative a otimização de bateria para o app',
      'Se disponível, ative também "Executar em segundo plano"',
    ],
    dontKillMyAppLink: 'https://dontkillmyapp.com/',
  },
};

export function getBatteryGuide(manufacturer?: AndroidManufacturer): BatteryGuide {
  if (!manufacturer || manufacturer === 'unknown') {
    return BATTERY_OPTIMIZATION_GUIDES.generic;
  }
  return BATTERY_OPTIMIZATION_GUIDES[manufacturer] || BATTERY_OPTIMIZATION_GUIDES.generic;
}

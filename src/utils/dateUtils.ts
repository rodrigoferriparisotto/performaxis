// Utilitários para formatação de datas
import { format, subDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

// Configuração do fuso horário brasileiro
const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

// Atenção: o Date devolvido NÃO é o instante real — é um relógio "de parede"
// de São Paulo para extrair dia/mês/hora com date-fns (format, getHours...).
// Para gravar no banco, medir tempo decorrido ou passar para toLocale*String
// com timeZone, use new Date() (o instante real).
export const getBrazilDate = (): Date => {
  return toZonedTime(new Date(), BRAZIL_TIMEZONE);
};

// Função para obter string de data no formato YYYY-MM-DD no fuso brasileiro
export const getBrazilDateString = (): string => {
  const brazilDate = getBrazilDate();
  return format(brazilDate, 'yyyy-MM-dd');
};

// Função para formatar data brasileira
export const formatBrazilDate = (date: Date, formatStr: string = 'yyyy-MM-dd'): string => {
  const brazilDate = toZonedTime(date, BRAZIL_TIMEZONE);
  return format(brazilDate, formatStr);
};

// Função para subtrair dias e retornar no formato YYYY-MM-DD (fuso brasileiro)
export const subtractDaysBrazil = (days: number): string => {
  const brazilDate = getBrazilDate();
  const resultDate = subDays(brazilDate, days);
  return format(resultDate, 'yyyy-MM-dd');
};

// Função para converter uma data UTC para o fuso horário brasileiro
const convertToBrazilTime = (dateString: string): Date => {
  const utcDate = new Date(dateString);
  return toZonedTime(utcDate, BRAZIL_TIMEZONE);
};

// instante real; a conversão para São Paulo fica a cargo do timeZone do toLocale*
const instante = (dateString: string): Date => new Date(dateString);

export const formatarData = (dataString: string): string => {
  if (!dataString) return '';
  
  // Se já está no formato brasileiro, retorna como está
  if (dataString.includes('/')) return dataString;
  
  // Para datas no formato YYYY-MM-DD, converte sem usar Date()
  // para evitar problemas de fuso horário
  const [ano, mes, dia] = dataString.split('-');
  return `${dia}/${mes}/${ano}`;
};

export const formatarDataCompleta = (dataString: string): string => {
  if (!dataString) return '';
  
  // Se é uma data ISO com horário, converter para fuso brasileiro
  if (dataString.includes('T')) {
    const data = instante(dataString);
    return data.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: BRAZIL_TIMEZONE
    });
  }
  
  // Para datas simples YYYY-MM-DD: meio-dia UTC cai no mesmo dia em São Paulo
  const [ano, mes, dia] = dataString.split('-');
  const data = new Date(Date.UTC(parseInt(ano), parseInt(mes) - 1, parseInt(dia), 12));

  return data.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: BRAZIL_TIMEZONE
  });
};

export const formatarHorario = (dataHoraString: string): string => {
  if (!dataHoraString) return '';

  const data = instante(dataHoraString);
  return data.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: BRAZIL_TIMEZONE
  });
};

export const getDataAtual = (): string => {
  return getBrazilDateString();
};

export const getDataHoraAtual = (): string => {
  return new Date().toISOString();
};

export const formatarDataHoraBrasil = (dataHoraString: string): string => {
  if (!dataHoraString) return '';

  const data = instante(dataHoraString);
  return data.toLocaleString('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: BRAZIL_TIMEZONE
  });
};

export const calcularTempoDecorrido = (horaInicio: string, horaFim?: string): string => {
  if (!horaInicio) return '0min';

  try {
    const inicio = new Date(horaInicio);
    const fim = horaFim ? new Date(horaFim) : new Date();

    if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) {
      return '0min';
    }

    const diffMs = fim.getTime() - inicio.getTime();
    const diffMinutos = Math.floor(diffMs / (1000 * 60));

    const minutosPositivos = Math.max(0, diffMinutos);

    const horas = Math.floor(minutosPositivos / 60);
    const minutos = minutosPositivos % 60;

    if (horas > 0) {
      return `${horas}h ${minutos}min`;
    }
    return `${minutos}min`;
  } catch {
    return '0min';
  }
};

// Função para obter o horário atual formatado para exibição
export const getHorarioAtualBrasil = (): string => {
  const agora = new Date();
  return agora.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: BRAZIL_TIMEZONE
  });
};

// Função para obter a data atual formatada para exibição
export const getDataAtualFormatada = (): string => {
  const hoje = new Date();
  return hoje.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: BRAZIL_TIMEZONE
  });
};

// Função para verificar se uma data é hoje (no fuso brasileiro)
export const isHoje = (dataString: string): boolean => {
  if (!dataString) return false;
  
  const hoje = getDataAtual();
  
  // Se é uma data ISO com horário, extrair apenas a parte da data
  if (dataString.includes('T')) {
    const dataBrasil = convertToBrazilTime(dataString);
    const ano = dataBrasil.getFullYear();
    const mes = String(dataBrasil.getMonth() + 1).padStart(2, '0');
    const dia = String(dataBrasil.getDate()).padStart(2, '0');
    const dataFormatada = `${ano}-${mes}-${dia}`;
    return dataFormatada === hoje;
  }
  
  // Para datas simples YYYY-MM-DD
  return dataString === hoje;
};
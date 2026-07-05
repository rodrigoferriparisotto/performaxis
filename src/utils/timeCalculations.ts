export interface TempoCalculado {
  minutos: number;
  texto: string;
  emAndamento: boolean;
}

export const calcularTempoTotal = (
  horaInicio: string,
  horaFim: string | null | undefined,
  status?: string
): TempoCalculado => {
  try {
    const inicio = new Date(horaInicio);

    if (isNaN(inicio.getTime())) {
      return {
        minutos: 0,
        texto: '0min',
        emAndamento: false
      };
    }

    const emAndamento = status === 'em_andamento' || !horaFim;
    const fim = emAndamento ? new Date() : new Date(horaFim);

    if (isNaN(fim.getTime())) {
      return {
        minutos: 0,
        texto: '0min',
        emAndamento: false
      };
    }

    const diffMs = fim.getTime() - inicio.getTime();
    const diffMinutos = Math.max(0, Math.floor(diffMs / (1000 * 60)));

    const horas = Math.floor(diffMinutos / 60);
    const minutos = diffMinutos % 60;

    let texto: string;
    if (horas > 0) {
      texto = `${horas}h ${minutos}min`;
    } else {
      texto = `${minutos}min`;
    }

    if (emAndamento) {
      texto = `${texto} (em andamento)`;
    }

    return {
      minutos: diffMinutos,
      texto,
      emAndamento
    };
  } catch (error) {
    return {
      minutos: 0,
      texto: '0min',
      emAndamento: false
    };
  }
};

export const formatarTempo = (minutos: number): string => {
  if (minutos < 60) return `${minutos}min`;
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  return `${horas}h${mins > 0 ? ` ${mins}min` : ''}`;
};

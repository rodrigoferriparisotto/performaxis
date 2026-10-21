import React, { useEffect, useState } from 'react';

// Relógio e saudação com estado próprio: atualizam sozinhos sem
// re-renderizar a página (e os gráficos) que os contém.

const horaEmSaoPaulo = () =>
  Number(
    new Intl.DateTimeFormat('pt-BR', { hour: 'numeric', hour12: false, timeZone: 'America/Sao_Paulo' }).format(new Date())
  );

const saudacaoAgora = () => {
  const hora = horaEmSaoPaulo();
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
};

export const Saudacao: React.FC<{ nome?: string; className?: string }> = ({
  nome,
  className = 'text-xl lg:text-3xl font-bold',
}) => {
  const [saudacao, setSaudacao] = useState(saudacaoAgora);
  useEffect(() => {
    const id = setInterval(() => setSaudacao(saudacaoAgora()), 60 * 1000);
    return () => clearInterval(id);
  }, []);
  return <h1 className={className}>{saudacao}, {nome}!</h1>;
};

export const RelogioAoVivo: React.FC = () => {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const hm = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  const s = agora.toLocaleTimeString('pt-BR', { second: '2-digit', timeZone: 'America/Sao_Paulo' }).padStart(2, '0');
  return (
    <div className="text-xl lg:text-2xl font-bold tabular-nums">
      {hm}
      <span className="text-base lg:text-lg">:{s.slice(-2)}</span>
    </div>
  );
};

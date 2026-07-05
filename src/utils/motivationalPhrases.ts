// Sistema de frases motivacionais para incentivar os usuários durante o preenchimento

export const motivationalPhrases = {
  phrases25Percent: [
    "🌟 Ótimo começo! Continue assim, você está no caminho certo!",
    "🚀 Primeiros passos concluídos com sucesso! O progresso é visível.",
    "💪 25% alcançado! Cada pequena vitória te leva mais longe.",
    "⭐ Você já fez um quarto do caminho! Incrível!",
    "🎯 O ritmo está bom! Mantenha o foco e siga em frente.",
    "✨ Excelente início! Sua dedicação está fazendo a diferença.",
    "🔥 Que energia! Continue com essa determinação.",
    "🏆 Primeiro marco atingido! Você é capaz de muito mais.",
    "💎 Cada atividade concluída é um passo rumo à excelência.",
    "🌈 Começou bem! O sucesso está sendo construído passo a passo."
  ],
  
  phrases50Percent: [
    "🎉 Metade do caminho percorrido! O sucesso está cada vez mais próximo.",
    "💥 Uau! 50% concluído! Você é imparável!",
    "⚡ Meio a meio! A persistência é a chave para a conclusão.",
    "🔥 Você está na metade! O esforço está valendo a pena.",
    "🎯 Continue firme! A linha de chegada já está à vista.",
    "🌟 Metade conquistada! Sua dedicação está sendo recompensada.",
    "💪 Ritmo perfeito! Mantenha essa energia até o final.",
    "🚀 50% de pura determinação! Continue voando alto.",
    "⭐ Meio caminho andado com maestria! Siga em frente.",
    "🏆 Equilíbrio perfeito! Você está dominando suas tarefas."
  ],
  
  phrases75Percent: [
    "🔥 Quase lá! 75% concluído! A reta final é sua!",
    "⚡ Falta pouco! A energia que você coloca agora fará toda a diferença.",
    "💎 A excelência está em cada detalhe. Continue até o fim!",
    "🎯 Você está a um passo da vitória! Não desista agora.",
    "🌟 O sucesso te espera! Mantenha o foco e finalize com maestria.",
    "🚀 75% de pura dedicação! A conquista está quase completa.",
    "💪 Reta final! Sua persistência está sendo recompensada.",
    "🏆 Três quartos vencidos! O troféu está ao seu alcance.",
    "✨ Quase no topo! Cada movimento agora te aproxima da vitória.",
    "🔥 Força total na reta final! Você nasceu para vencer!"
  ],
  
  phrases100Percent: [
    "🏆 Parabéns! 100% concluído! Você é um verdadeiro campeão!",
    "🎉 Missão cumprida! Seu trabalho duro valeu cada segundo.",
    "⭐ Sucesso total! Celebre essa conquista merecida.",
    "💎 Incrível! Todas as atividades finalizadas com perfeição.",
    "🌟 Você chegou ao seu objetivo! Orgulhe-se do que realizou.",
    "🚀 Fantástico! 100% de dedicação resultou em 100% de sucesso!",
    "🔥 Perfeição alcançada! Você superou todas as expectativas.",
    "💪 Vitória completa! Sua determinação foi recompensada.",
    "✨ Excelência total! Você é um exemplo de dedicação.",
    "🎯 Meta atingida com maestria! Parabéns pela conquista!"
  ]
};

// Função para selecionar uma frase aleatória baseada na porcentagem
export const getRandomMotivationalPhrase = (percentage: number, registroId?: string, userName?: string): string => {
  let phrases: string[] = [];

  if (percentage >= 100) {
    phrases = motivationalPhrases.phrases100Percent;
  } else if (percentage >= 75) {
    phrases = motivationalPhrases.phrases75Percent;
  } else if (percentage >= 50) {
    phrases = motivationalPhrases.phrases50Percent;
  } else if (percentage >= 25) {
    phrases = motivationalPhrases.phrases25Percent;
  } else {
    // Para menos de 25%, retornar uma frase de início motivacional
    const prefix = userName ? `${userName}, ` : '';
    return `${prefix}🌟 Vamos começar! Cada passo conta para o sucesso!`;
  }

  // Usar o registroId como seed para garantir consistência dentro da mesma faixa
  // Se não houver registroId, usar um valor padrão baseado na faixa
  const seed = registroId ? registroId.slice(-8) : percentage.toString();

  // Criar um hash simples do seed para gerar um índice consistente
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Converter para 32bit integer
  }

  // Usar o hash para selecionar uma frase de forma consistente
  const randomIndex = Math.abs(hash) % phrases.length;
  const selectedPhrase = phrases[randomIndex];

  // Adicionar nome do usuário na frente da mensagem
  if (userName) {
    // Extrair emoji da frase
    const emojiMatch = selectedPhrase.match(/^([\u{1F300}-\u{1F9FF}])\s*/u);
    if (emojiMatch) {
      const emoji = emojiMatch[1];
      const phraseWithoutEmoji = selectedPhrase.replace(emojiMatch[0], '').trim();
      return `${emoji} ${userName}, ${phraseWithoutEmoji.charAt(0).toLowerCase()}${phraseWithoutEmoji.slice(1)}`;
    }
    return `${userName}, ${selectedPhrase.charAt(0).toLowerCase()}${selectedPhrase.slice(1)}`;
  }

  return selectedPhrase;
};

// Função para obter cor do emoji/texto baseada na porcentagem
export const getMotivationalColor = (percentage: number): string => {
  if (percentage >= 100) return 'text-green-600';
  if (percentage >= 75) return 'text-yellow-600';
  if (percentage >= 50) return 'text-blue-600';
  if (percentage >= 25) return 'text-purple-600';
  return 'text-gray-600';
};

// Função para obter cor de fundo baseada na porcentagem
export const getMotivationalBgColor = (percentage: number): string => {
  if (percentage >= 100) return 'bg-green-50 border-green-200';
  if (percentage >= 75) return 'bg-yellow-50 border-yellow-200';
  if (percentage >= 50) return 'bg-blue-50 border-blue-200';
  if (percentage >= 25) return 'bg-purple-50 border-purple-200';
  return 'bg-gray-50 border-gray-200';
};
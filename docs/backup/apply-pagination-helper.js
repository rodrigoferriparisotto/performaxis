const fs = require('fs');
const path = require('path');

const historyFiles = [
  'HistoricoRevisao.tsx',
  'HistoricoAreasComuns.tsx',
  'HistoricoGestao.tsx',
  'HistoricoAtividadesDiarias.tsx',
  'HistoricoAtividadesExtras.tsx',
  'HistoricoCozinha.tsx',
  'HistoricoVendas.tsx',
  'HistoricoNoturnas.tsx',
  'HistoricoManutencao.tsx'
];

const serviceMapping = {
  'HistoricoRevisao': 'registroRevisaoService',
  'HistoricoAreasComuns': 'registroAreasComunsService',
  'HistoricoGestao': 'registroGestaoService',
  'HistoricoAtividadesDiarias': 'registroAtividadesDiariasService',
  'HistoricoAtividadesExtras': 'registroAtividadesExtrasService',
  'HistoricoCozinha': 'registroCozinhaService',
  'HistoricoVendas': 'registroVendasService',
  'HistoricoNoturnas': 'registroAtividadesDiariasService',
  'HistoricoManutencao': 'manutencaoService'
};

console.log('Files to update:', historyFiles);
console.log('Service mapping:', serviceMapping);

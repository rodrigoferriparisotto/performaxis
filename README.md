# PerformAxis - Sistema de Gestão Hoteleira Gamificado

Sistema completo de gestão hoteleira com gamificação, multi-tenancy e monitoramento em tempo real. Desenvolvido para otimizar operações hoteleiras através de módulos especializados, ranking por meritocracia e notificações push inteligentes.

## Características Principais

- **Sistema Multi-Tenant**: Gestão completa de múltiplas empresas hoteleiras
- **9 Módulos Especializados**: Camararia, Recepção, Áreas Comuns, Manutenção, Noturnas, Revisão, Cozinha, Gestão e Vendas
- **Gamificação Completa**: Sistema de pontuação, conquistas e ranking por meritocracia
- **PWA (Progressive Web App)**: Funciona offline e pode ser instalado em dispositivos móveis
- **Push Notifications**: Alertas em tempo real via Firebase Cloud Messaging
- **Dashboard Analytics**: Métricas de performance diária e mensal com visualizações interativas
- **Gestão de Acessos**: Sistema granular de permissões por perfil e módulo
- **Monitoramento de Inatividade**: Alertas automáticos para registros pendentes
- **Sistema de Lembretes**: Notificações configuráveis por usuário e tipo de atividade

## Tecnologias Utilizadas

- **Frontend**: React 18 + TypeScript + Vite
- **Estilização**: Tailwind CSS
- **Backend/Database**: Supabase (PostgreSQL + Realtime + Edge Functions)
- **Push Notifications**: Firebase Cloud Messaging (FCM)
- **PWA**: Vite Plugin PWA + Workbox
- **Gráficos**: Recharts
- **Ícones**: Lucide React
- **PDF Export**: jsPDF + jsPDF-AutoTable
- **Manipulação de Datas**: date-fns + date-fns-tz

## Requisitos

- Node.js 18+ e npm
- Conta no [Supabase](https://supabase.com)
- Conta no [Firebase](https://firebase.google.com) (para push notifications)
- Navegador moderno com suporte a PWA

## Instalação

### 1. Clone o Repositório

```bash
git clone [URL_DO_REPOSITORIO]
cd project
```

### 2. Instale as Dependências

```bash
npm install
```

### 3. Configure as Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui

# Firebase Cloud Messaging (Push Notifications)
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto-id
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_FIREBASE_VAPID_KEY=BCa...

# Logging (opcional - apenas desenvolvimento)
VITE_ENABLE_DEBUG_LOGS=false
VITE_LOG_LEVEL=error
```

### 4. Configure o Supabase

#### 4.1. Crie um Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto
2. Copie a URL do projeto e a chave anônima (anon key)
3. Cole essas informações no arquivo `.env`

#### 4.2. Execute as Migrações

As migrações estão em `supabase/migrations/`. Para aplicá-las:

**Opção 1: Via Supabase Dashboard**
1. Acesse seu projeto no Supabase Dashboard
2. Vá em SQL Editor
3. Execute cada arquivo de migração em ordem cronológica (pelo timestamp no nome)

**Opção 2: Via Supabase CLI** (recomendado)
```bash
npx supabase link --project-ref seu-projeto-ref
npx supabase db push
```

#### 4.3. Configure as Edge Functions

O projeto utiliza Edge Functions para:
- Cálculo de performance diária
- Verificação de lembretes de inatividade
- Limpeza de usuários órfãos
- Gerenciamento de usuários (CRUD)
- Envio de push notifications

Para fazer deploy das Edge Functions:

```bash
npx supabase functions deploy calcular-performance-diaria
npx supabase functions deploy check-inactivity-reminders
npx supabase functions deploy cleanup-orphaned-users
npx supabase functions deploy create-user
npx supabase functions deploy delete-user
npx supabase functions deploy update-user-password
npx supabase functions deploy send-push-notification
```

### 5. Configure o Firebase (Push Notifications)

#### 5.1. Crie um Projeto Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Crie um novo projeto
3. Adicione um app web ao projeto
4. Copie as credenciais de configuração

#### 5.2. Ative o Cloud Messaging

1. No Firebase Console, vá em Project Settings > Cloud Messaging
2. Na aba "Web Push certificates", gere um novo par de chaves (VAPID)
3. Copie a chave pública (VAPID Key) para o `.env`

#### 5.3. Configure a Service Account (FCM v1 API)

IMPORTANTE: O sistema utiliza a FCM HTTP v1 API, que requer uma Service Account JSON.

1. No Firebase Console, vá em **Project Settings** (ícone de engrenagem)
2. Clique na aba **Service accounts**
3. Clique em **Generate new private key**
4. Confirme e faça o download do arquivo JSON
5. Abra o arquivo JSON baixado e copie TODO o conteúdo
6. No Supabase Dashboard, vá em **Project Settings > Edge Functions > Secrets**
7. Crie um novo secret:
   - Nome: `FIREBASE_SERVICE_ACCOUNT_JSON`
   - Valor: Cole o conteúdo JSON completo do arquivo
8. Crie outro secret:
   - Nome: `FIREBASE_PROJECT_ID`
   - Valor: O valor do campo `project_id` do JSON (ex: "performaxis-2026")

NUNCA versione o arquivo JSON da Service Account no Git. Mantenha-o seguro.

#### 5.4. Configure o Service Worker

O arquivo `public/firebase-messaging-sw.js` já está configurado. Certifique-se de que suas credenciais Firebase estejam corretas neste arquivo.

## Desenvolvimento

### Executar em Modo de Desenvolvimento

```bash
npm run dev
```

O aplicativo estará disponível em `http://localhost:5173`

### Build para Produção

```bash
npm run build
```

Os arquivos otimizados serão gerados na pasta `dist/`

### Preview do Build de Produção

```bash
npm run preview
```

### Linting

```bash
npm run lint
```

## Estrutura do Projeto

```
project/
├── src/
│   ├── components/         # Componentes React
│   │   ├── Auth/          # Componentes de autenticação
│   │   ├── common/        # Componentes reutilizáveis
│   │   ├── Dashboard/     # Componentes do dashboard
│   │   ├── Layout/        # Layout e navegação
│   │   ├── Pages/         # Páginas principais
│   │   └── Public/        # Páginas públicas (blog, landing)
│   ├── contexts/          # React Contexts (Auth, Sidebar, etc)
│   ├── hooks/             # Custom React Hooks
│   ├── services/          # Serviços e lógica de negócio
│   ├── types/             # Definições TypeScript
│   ├── utils/             # Utilitários e helpers
│   ├── constants/         # Constantes da aplicação
│   ├── lib/               # Configurações de bibliotecas
│   ├── App.tsx            # Componente principal
│   ├── main.tsx           # Entrada da aplicação
│   └── sw.ts              # Service Worker
├── supabase/
│   ├── functions/         # Edge Functions
│   └── migrations/        # Migrações do banco de dados
├── public/                # Arquivos estáticos (ícones, service workers)
├── docs/                  # Documentação adicional
│   ├── seo/              # Documentação de SEO (pendente)
│   └── backup/           # Backups e scripts de migração
├── .env                   # Variáveis de ambiente (não versionado)
├── .env.example           # Exemplo de variáveis de ambiente
├── vite.config.ts         # Configuração do Vite
├── tailwind.config.js     # Configuração do Tailwind CSS
└── tsconfig.json          # Configuração do TypeScript
```

## Módulos do Sistema

### 1. Camararia
Gestão completa de limpeza de suítes com programação, registro de atividades, tipos de serviço e controle fotográfico.

### 2. Recepção
Controle de atividades de recepção, check-in/out, atendimento ao cliente e gestão de reservas.

### 3. Áreas Comuns
Monitoramento e manutenção de áreas comuns (lobby, piscina, restaurante, etc).

### 4. Manutenção
Sistema de solicitação, acompanhamento e resolução de manutenções preventivas e corretivas.

### 5. Atividades Noturnas
Registro e controle de operações do turno noturno.

### 6. Revisão
Revisão de qualidade e conformidade dos serviços prestados.

### 7. Cozinha
Gestão de atividades da cozinha, tipos de serviço e registro fotográfico.

### 8. Gestão
Atividades administrativas e gerenciais.

### 9. Vendas
Gestão comercial, funções comerciais e metas de vendas.

## Funcionalidades Avançadas

### Sistema de Gamificação

- **Pontuação por Atividade**: Cada registro gera pontos baseados em tipo e complexidade
- **Ranking por Meritocracia**: Classificação dinâmica de funcionários por performance
- **Conquistas**: Sistema de badges e marcos alcançados
- **Performance Diária/Mensal**: Métricas detalhadas com histórico comparativo

### Multi-Tenancy

- Isolamento completo de dados entre empresas
- Gestão centralizada de múltiplos hotéis
- Configurações personalizadas por empresa
- Limite de usuários por empresa

### Sistema de Notificações

- **Push Notifications**: Alertas em tempo real via FCM
- **Lembretes Configuráveis**: Por tipo de atividade e horário
- **Alertas de Inatividade**: Notificações automáticas para registros pendentes
- **Mensagens Broadcast**: Comunicação em massa para equipes
- **Controle de Volume e Som**: Personalização por usuário

### Gestão de Acessos

- **Perfis de Sistema**: Admin, Gestor, perfis operacionais
- **Permissões Granulares**: Controle por módulo e ação (criar, ler, atualizar, deletar)
- **Vínculos de Área**: Usuários vinculados a áreas específicas
- **Auditoria**: Log completo de acessos e ações

### PWA Features

- **Instalável**: Pode ser instalado como app nativo em mobile e desktop
- **Offline First**: Funcionalidades básicas disponíveis offline
- **Service Worker**: Cache inteligente e sincronização em background
- **Notificações Push**: Funcionam mesmo com app fechado

## Documentação Adicional

### SEO (Pendente de Implementação)

Consulte a documentação em `docs/seo/` para o guia completo de implementação de SEO:
- Meta tags otimizadas
- Schema.org markup
- Sitemap e robots.txt
- Google Search Console
- Performance e Core Web Vitals

### Backups e Scripts

Scripts de migração e backup estão disponíveis em `docs/backup/`:
- `all_migrations_backup.sql`: Backup completo de todas as migrações
- `scripts_migracao_dados.sh`: Scripts auxiliares de migração
- `test-push-manual.sql`: Script de teste de push notifications

## Troubleshooting

### Push Notifications Não Funcionam

1. Verifique se as credenciais Firebase estão corretas no `.env`
2. Confirme que o VAPID key está configurado corretamente
3. Verifique se a **Service Account JSON** está configurada nos secrets do Supabase:
   - `FIREBASE_SERVICE_ACCOUNT_JSON` deve conter o JSON completo
   - `FIREBASE_PROJECT_ID` deve conter o ID do projeto Firebase
4. Verifique se o usuário deu permissão para notificações no navegador
5. Teste em modo incógnito para descartar problemas de cache
6. Veja a página de diagnóstico em `/diagnostico-notificacoes` (disponível para todos os usuários autenticados)
7. Verifique os logs da Edge Function `send-push-notification` no Supabase Dashboard
8. Erros comuns da FCM v1 API:
   - `UNREGISTERED`: Token inválido ou expirado (será desativado automaticamente)
   - `INVALID_ARGUMENT`: Formato de mensagem incorreto
   - `SENDER_ID_MISMATCH`: Token de outro projeto Firebase
   - `QUOTA_EXCEEDED`: Limite de envio excedido (retry automático)
   - `UNAVAILABLE`: Serviço FCM temporariamente indisponível (retry automático)

### Erros de Permissão no Banco

1. Verifique se todas as migrações foram executadas corretamente
2. Confirme que as RLS policies estão ativas
3. Verifique o perfil do usuário e suas permissões em `perfis_sistema`
4. Consulte os logs em `logs_acesso` para auditoria

### Build Falha

1. Limpe o cache: `rm -rf node_modules dist .vite && npm install`
2. Verifique se todas as variáveis de ambiente estão definidas
3. Execute `npm run lint` para verificar erros de sintaxe
4. Verifique a versão do Node.js (requer 18+)

### PWA Não Instala

1. Verifique se o site está sendo servido via HTTPS (obrigatório para PWA)
2. Confirme que o `manifest.json` está acessível
3. Verifique o console do navegador para erros do Service Worker
4. Teste em diferentes navegadores (Chrome, Edge, Safari)

## Performance

O sistema foi otimizado para:
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3.5s
- **Realtime Updates**: Latência < 100ms via Supabase Realtime
- **Database Queries**: Indexes otimizados para consultas frequentes
- **Bundle Size**: Code splitting e lazy loading implementados

## Segurança

- **Row Level Security (RLS)**: Todas as tabelas protegidas
- **Authentication**: Sistema completo via Supabase Auth
- **HTTPS Only**: Obrigatório em produção
- **CORS**: Configurado adequadamente nas Edge Functions
- **Validação**: Validações client-side e server-side
- **Auditoria**: Logs completos de acesso e modificações

## Contribuindo

Para contribuir com o projeto:

1. Fork o repositório
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## Licença

[Adicionar informações de licença]

## Contato

[Adicionar informações de contato]

## Roadmap

- [ ] Implementação de SEO (ver `docs/seo/`)
- [ ] Sistema de relatórios avançados com BI
- [ ] Integração com sistemas de gestão hoteleira existentes
- [ ] App mobile nativo (React Native)
- [ ] Sistema de chat em tempo real entre equipes
- [ ] Integração com IoT para automação hoteleira
- [ ] Dashboard para clientes/hóspedes

---

**PerformAxis** - Transformando gestão hoteleira através de tecnologia e gamificação.

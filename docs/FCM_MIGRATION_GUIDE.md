# Guia de Migração FCM Legacy para HTTP v1 API

## Visão Geral

Este documento descreve a migração completa do Firebase Cloud Messaging (FCM) da API Legacy para a HTTP v1 API, implementada em 21/02/2026.

## Por Que Migrar?

A API Legacy do FCM foi descontinuada pelo Google em **Junho de 2024**. A migração para a HTTP v1 API é obrigatória e oferece:

- **Segurança Aprimorada**: Autenticação OAuth 2.0 com tokens de curta duração
- **Melhor Estrutura de Mensagens**: Suporte completo a plataformas (Web, Android, iOS)
- **Códigos de Erro Detalhados**: Melhor debugging e tratamento de erros
- **Preparação para Escala**: Suporte para até 200.000+ notificações/dia

## Principais Mudanças

### 1. Autenticação

**Antes (Legacy):**
```typescript
headers: {
  "Authorization": `key=${FIREBASE_SERVER_KEY}`
}
```

**Depois (v1):**
```typescript
// OAuth 2.0 com JWT assinado usando Service Account
const accessToken = await getAccessToken(serviceAccount);
headers: {
  "Authorization": `Bearer ${accessToken}`
}
```

### 2. Endpoint da API

**Antes (Legacy):**
```
https://fcm.googleapis.com/fcm/send
```

**Depois (v1):**
```
https://fcm.googleapis.com/v1/projects/${projectId}/messages:send
```

### 3. Estrutura da Mensagem

**Antes (Legacy):**
```json
{
  "to": "token-do-dispositivo",
  "notification": {
    "title": "Título",
    "body": "Mensagem"
  },
  "data": { ... }
}
```

**Depois (v1):**
```json
{
  "message": {
    "token": "token-do-dispositivo",
    "notification": {
      "title": "Título",
      "body": "Mensagem"
    },
    "webpush": {
      "notification": { ... },
      "fcm_options": { "link": "/url" }
    },
    "android": {
      "priority": "HIGH",
      "ttl": "86400s",
      "notification": { ... }
    },
    "data": { ... }
  }
}
```

### 4. Códigos de Erro

**Antes (Legacy):**
- `InvalidRegistration`
- `NotRegistered`
- `MismatchSenderId`

**Depois (v1):**
- `UNREGISTERED`
- `INVALID_ARGUMENT`
- `SENDER_ID_MISMATCH`
- `QUOTA_EXCEEDED`
- `UNAVAILABLE`
- `INTERNAL`

## Configuração da Service Account

### Passo 1: Download da Service Account

1. Acesse o [Firebase Console](https://console.firebase.google.com)
2. Selecione seu projeto (ex: "performaxis-2026")
3. Clique no ícone de engrenagem e vá em **Project Settings**
4. Na aba **Service accounts**, clique em **Generate new private key**
5. Confirme o download
6. Um arquivo JSON será baixado com nome similar a:
   ```
   performaxis-2026-firebase-adminsdk-xxxxx-xxxxxxxxxx.json
   ```

### Passo 2: Estrutura do Arquivo JSON

O arquivo JSON contém:

```json
{
  "type": "service_account",
  "project_id": "performaxis-2026",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@performaxis-2026.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

### Passo 3: Configurar no Supabase

1. Copie TODO o conteúdo do arquivo JSON
2. Acesse o Supabase Dashboard
3. Vá em **Project Settings > Edge Functions > Secrets**
4. Crie o secret `FIREBASE_SERVICE_ACCOUNT_JSON`:
   - Cole o JSON completo (incluindo as chaves `{` `}`)
5. Crie o secret `FIREBASE_PROJECT_ID`:
   - Valor: `performaxis-2026` (ou o ID do seu projeto)

### Passo 4: Remover Credenciais Antigas

1. No Supabase Dashboard, remova o secret `FIREBASE_SERVER_KEY` (deprecated)
2. No `.env` local, remova a variável `FIREBASE_SERVER_KEY` (se existir)

## Implementação Técnica

### Geração de JWT

A autenticação OAuth 2.0 funciona em 3 etapas:

1. **Criar JWT**: Assinado com a chave privada da Service Account
2. **Trocar JWT por Access Token**: Via endpoint OAuth2 do Google
3. **Usar Access Token**: Válido por 1 hora, cacheado globalmente

```typescript
// 1. Gerar JWT (RS256)
const jwt = await generateJWT(serviceAccount);

// 2. Trocar por Access Token
const response = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  body: new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: jwt,
  }),
});

const { access_token, expires_in } = await response.json();

// 3. Cache do token (renovado 5min antes de expirar)
cachedAccessToken = access_token;
tokenExpiresAt = Date.now() + (expires_in * 1000);
```

### Processamento em Chunks

Para suportar alto volume (200k notificações/dia), o sistema processa em chunks paralelos:

```typescript
const chunkSize = 50; // 50 requisições paralelas por vez

for (let i = 0; i < tokens.length; i += chunkSize) {
  const chunk = tokens.slice(i, i + chunkSize);
  const results = await processChunk(chunk, ...);
  allResults.push(...results);

  // Delay de 100ms entre chunks para evitar throttling
  if (i + chunkSize < tokens.length) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
```

### Retry com Exponential Backoff

Para erros temporários (503 UNAVAILABLE, 429 QUOTA_EXCEEDED):

```typescript
async function sendWithRetry(url, message, accessToken, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, { ... });

      if (response.ok) return response;

      // Retry apenas para erros 503 e 429
      if (response.status === 503 || response.status === 429) {
        const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      return response;
    } catch (error) {
      // Retry em caso de exception de rede
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}
```

### Tratamento de Erros v1

```typescript
function handleFCMError(errorCode: string) {
  const permanentErrors = [
    'UNREGISTERED',        // Token inválido ou expirado
    'INVALID_ARGUMENT',    // Formato de mensagem incorreto
    'SENDER_ID_MISMATCH',  // Token de outro projeto
  ];

  const retryableErrors = [
    'QUOTA_EXCEEDED',      // Limite temporário
    'UNAVAILABLE',         // Serviço indisponível
    'INTERNAL',            // Erro interno do FCM
  ];

  const isPermanent = permanentErrors.includes(errorCode);
  const shouldDeactivate = isPermanent;

  return { isPermanent, shouldDeactivate };
}
```

### Atualização da Tabela push_tokens

Novas colunas adicionadas:

```sql
-- Rastrear versão da API sendo usada
ALTER TABLE push_tokens ADD COLUMN api_version varchar(10) DEFAULT 'v1';

-- Armazenar código de erro específico da FCM v1
ALTER TABLE push_tokens ADD COLUMN fcm_error_code varchar(50);

-- Índices para performance
CREATE INDEX idx_push_tokens_active_error_count
  ON push_tokens(is_active, error_count)
  WHERE is_active = true;

CREATE INDEX idx_push_tokens_fcm_error_code
  ON push_tokens(fcm_error_code)
  WHERE fcm_error_code IS NOT NULL;
```

## Testes Recomendados

### Fase 1: Teste Unitário
- 1 token válido do seu dispositivo
- Verificar se notificação chega corretamente
- Validar estrutura da mensagem (título, corpo, ícone, URL)

### Fase 2: Teste de Erro
- 1 token inválido/expirado
- Verificar se token é desativado automaticamente
- Confirmar que `fcm_error_code` é populado

### Fase 3: Teste com Mix
- 3 tokens: 1 válido, 1 inválido, 1 de outro projeto
- Verificar tratamento correto de cada tipo

### Fase 4: Teste de Volume
- 50 tokens reais do banco
- Verificar performance (deve ser < 5s)
- Confirmar que chunks paralelos funcionam

### Fase 5: Teste de Produção
- 200 tokens (volume atual)
- Monitorar logs no Supabase Dashboard
- Validar taxa de sucesso > 95%

## Monitoramento

### Logs da Edge Function

Verifique logs no Supabase Dashboard > Edge Functions > send-push-notification:

```
[SendPush] Processing chunk 1/4
[SendPush] Success for token abc123***
[SendPush] FCM Error for token def456***: UNREGISTERED - Token is invalid
[SendPush] Completed: 48 success, 2 failed in 4523ms (avg 90.46ms per notification)
```

### Firebase Console

1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Vá em **Cloud Messaging > Reports**
3. Verifique métricas:
   - Taxa de entrega (deve ser > 95%)
   - Impressões
   - Cliques

### Queries SQL para Monitoramento

```sql
-- Taxa de erro nas últimas 24h
SELECT
  COUNT(*) FILTER (WHERE error_count > 0) as tokens_com_erro,
  COUNT(*) as total_tokens,
  ROUND(100.0 * COUNT(*) FILTER (WHERE error_count > 0) / COUNT(*), 2) as taxa_erro_pct
FROM push_tokens
WHERE updated_at > NOW() - INTERVAL '24 hours';

-- Distribuição de códigos de erro
SELECT
  fcm_error_code,
  COUNT(*) as ocorrencias
FROM push_tokens
WHERE fcm_error_code IS NOT NULL
GROUP BY fcm_error_code
ORDER BY ocorrencias DESC;

-- Tokens desativados recentemente
SELECT
  usuario_id,
  fcm_error_code,
  last_error,
  updated_at
FROM push_tokens
WHERE is_active = false
  AND updated_at > NOW() - INTERVAL '7 days'
ORDER BY updated_at DESC
LIMIT 20;
```

## Performance Esperada

### Benchmarks

| Cenário | Volume | Tempo Total | Tempo Médio/Token |
|---------|--------|-------------|-------------------|
| Baixo Volume | 10 tokens | ~1s | ~100ms |
| Médio Volume | 200 tokens | ~4-5s | ~20-25ms |
| Alto Volume | 1.000 tokens | ~20-25s | ~20-25ms |
| Muito Alto Volume | 10.000 tokens | ~200-250s | ~20-25ms |

### Limites

- **Edge Function**: Timeout de 10 minutos
- **Memória**: 512MB (suficiente para 50k tokens)
- **Concorrência**: 50 requisições paralelas por chunk
- **Rate Limit FCM**: Sem limite oficial, mas recomendado delay de 100ms entre chunks

## Troubleshooting

### Erro: "Failed to get access token"

**Causa**: Service Account JSON inválida ou incompleta

**Solução**:
1. Gere uma nova Service Account no Firebase Console
2. Copie o JSON completo (incluindo `{` `}`)
3. Reconfigure o secret `FIREBASE_SERVICE_ACCOUNT_JSON`

### Erro: "INVALID_ARGUMENT"

**Causa**: Estrutura da mensagem v1 incorreta

**Solução**:
1. Verifique que todos os campos `data` são strings
2. Confirme que `ttl` está em formato de duração (ex: "86400s")
3. Valide que `priority` é "HIGH" ou "NORMAL" (uppercase)

### Erro: "SENDER_ID_MISMATCH"

**Causa**: Token foi registrado com outro projeto Firebase

**Solução**:
1. Token será desativado automaticamente
2. Usuário precisa fazer logout e login novamente para registrar novo token
3. Verifique que `FIREBASE_PROJECT_ID` está correto

### Performance Degradada

**Sintomas**: Notificações demoram muito para serem enviadas

**Diagnóstico**:
1. Verifique logs para retry excessivo
2. Confirme que não há throttling (erro 429)
3. Valide que chunks estão processando em paralelo

**Solução**:
1. Aumente delay entre chunks (de 100ms para 200ms)
2. Reduza tamanho do chunk (de 50 para 25)
3. Verifique limites de quota no Firebase Console

## Rollback (Se Necessário)

Caso precise reverter temporariamente:

1. Faça backup da função atual
2. Restaure código da versão Legacy do git
3. Reconfigure `FIREBASE_SERVER_KEY` nos secrets
4. Faça redeploy da Edge Function

**AVISO**: A API Legacy está descontinuada. Use rollback apenas em emergência e planeje nova tentativa de migração imediatamente.

## Checklist de Migração

- [ ] Download da Service Account JSON do Firebase Console
- [ ] Configurar `FIREBASE_SERVICE_ACCOUNT_JSON` no Supabase
- [ ] Configurar `FIREBASE_PROJECT_ID` no Supabase
- [ ] Remover `FIREBASE_SERVER_KEY` dos secrets
- [ ] Executar migração do banco (add colunas na push_tokens)
- [ ] Deploy da nova Edge Function
- [ ] Teste unitário com 1 token válido
- [ ] Teste com token inválido (validar desativação)
- [ ] Teste com 50 tokens reais
- [ ] Monitorar logs por 1 hora após deploy
- [ ] Verificar métricas no Firebase Console
- [ ] Atualizar documentação (README)
- [ ] Comunicar equipe sobre mudanças

## Próximos Passos

Após a migração bem-sucedida:

1. **Monitorar por 7 dias**: Taxa de erro, performance, feedback de usuários
2. **Limpeza de Tokens Inativos**: Executar script para remover tokens com `error_count > 3`
3. **Otimização Contínua**: Ajustar chunk size e delays baseado em métricas reais
4. **Documentar Métricas**: Criar dashboard no Supabase para visualizar saúde do sistema

## Suporte

Em caso de dúvidas ou problemas:

1. Verifique logs da Edge Function no Supabase Dashboard
2. Consulte documentação oficial: [Firebase Cloud Messaging HTTP v1](https://firebase.google.com/docs/cloud-messaging/migrate-v1)
3. Revise este guia e README.md
4. Contate o desenvolvedor responsável

---

**Data da Migração**: 21/02/2026
**Versão da API**: FCM HTTP v1
**Status**: Implementado e em Produção

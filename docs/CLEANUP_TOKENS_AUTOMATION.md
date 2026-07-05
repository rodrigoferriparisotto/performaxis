# Limpeza Automática de Tokens FCM Inválidos

## Visão Geral

O sistema realiza limpeza automática de tokens FCM inválidos através de uma Edge Function dedicada que remove tokens problemáticos do banco de dados.

## Critérios de Remoção

A Edge Function remove tokens que atendem a qualquer um dos seguintes critérios:

1. **Tokens UNREGISTERED**: FCM retornou erro "UNREGISTERED" (dispositivo desinstalou o app)
2. **Tokens Inativos Antigos**: `is_active = false` há mais de 7 dias
3. **Alto Número de Erros**: `error_count >= 3`
4. **Sem Sucesso Recente**: Último sucesso há mais de 30 dias

## Uso Manual

### Via Interface Web

Acesse a página "Diagnóstico de Notificações" e clique em:
- **"Limpar Tokens Inválidos"**: Remove todos os tokens que atendem aos critérios
- **Botão de lixeira individual**: Remove um token específico

### Via API

```bash
curl -X POST \
  https://YOUR_SUPABASE_URL/functions/v1/cleanup-invalid-push-tokens \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

Resposta de sucesso:
```json
{
  "success": true,
  "totalDeleted": 15,
  "results": [
    {
      "criterion": "UNREGISTERED tokens",
      "count": 8
    },
    {
      "criterion": "Inactive tokens (7+ days)",
      "count": 3
    },
    {
      "criterion": "High error count (3+)",
      "count": 4
    },
    {
      "criterion": "No success in 30+ days",
      "count": 0
    }
  ],
  "timestamp": "2026-02-21T12:00:00.000Z"
}
```

## Automação com Cron Job

### Configuração Recomendada

Execute a limpeza diariamente às 3h da manhã usando um serviço de cron externo:

**cron.io / EasyCron / cron-job.org**

```
Schedule: 0 3 * * *  (3:00 AM todos os dias)
URL: https://YOUR_SUPABASE_URL/functions/v1/cleanup-invalid-push-tokens
Method: POST
Headers:
  - Authorization: Bearer YOUR_SERVICE_ROLE_KEY
  - Content-Type: application/json
```

### Exemplo com crontab (Linux/Mac)

1. Crie um script de execução:

```bash
#!/bin/bash
# cleanup-tokens.sh

SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"

curl -X POST \
  "${SUPABASE_URL}/functions/v1/cleanup-invalid-push-tokens" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  >> /var/log/token-cleanup.log 2>&1
```

2. Torne o script executável:

```bash
chmod +x cleanup-tokens.sh
```

3. Adicione ao crontab:

```bash
crontab -e
```

Adicione a linha:
```
0 3 * * * /path/to/cleanup-tokens.sh
```

### Exemplo com GitHub Actions

Crie `.github/workflows/cleanup-tokens.yml`:

```yaml
name: Cleanup Invalid FCM Tokens

on:
  schedule:
    - cron: '0 3 * * *'  # 3 AM daily
  workflow_dispatch:  # Permite execução manual

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Call Cleanup Function
        run: |
          curl -X POST \
            "${{ secrets.SUPABASE_URL }}/functions/v1/cleanup-invalid-push-tokens" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json"
```

Adicione os secrets no GitHub:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Logs e Monitoramento

A Edge Function registra logs detalhados no console do Supabase:

```
✓ Deleted 8 tokens: UNREGISTERED tokens
✓ Deleted 3 tokens: Inactive tokens (7+ days)
✓ Deleted 4 tokens: High error count (3+)
⊘ No tokens to delete: No success in 30+ days

🧹 Cleanup Summary: 15 tokens deleted
```

Para visualizar os logs:
1. Acesse o Dashboard do Supabase
2. Vá em "Edge Functions"
3. Clique em "cleanup-invalid-push-tokens"
4. Visualize os logs de execução

## Segurança

- A função requer autenticação via token JWT
- Apenas usuários autenticados podem executar a limpeza
- Para automação, use o Service Role Key (mantenha seguro)
- A função não mantém histórico de tokens deletados (opera de forma agressiva)

## Benefícios

- Reduz tentativas de envio para tokens inválidos
- Melhora a performance do sistema de notificações
- Mantém o banco de dados limpo automaticamente
- Zero manutenção após configuração inicial
- Logs claros para auditoria

## Notas Importantes

- A remoção de tokens é permanente e não pode ser desfeita
- Tokens válidos nunca são removidos
- A operação é idempotente (pode ser executada múltiplas vezes com segurança)
- Não há limite de tokens por execução
- A limpeza não afeta usuários ativos

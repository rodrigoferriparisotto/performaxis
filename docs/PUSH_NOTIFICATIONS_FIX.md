# Correção de Notificações Push - Atividades Diárias e Atividades Extras

## Problema Identificado

As notificações push não estavam sendo enviadas quando usuários iniciavam registros nos módulos:
- **Atividades Diárias** (`registros_atividades_diarias`)
- **Atividades Extras** (`registros_atividades_extras`)

## Causa Raiz

Faltavam triggers de banco de dados para atualizar automaticamente a tabela `ultima_marcacao_usuario` quando registros eram iniciados nestes módulos. Apesar da Edge Function `check-inactivity-reminders` já incluir estas tabelas na verificação de inatividade (linhas 351-352), os triggers não existiam.

## Solução Implementada

### Migration Aplicada
- **Arquivo**: `add_triggers_atividades_diarias_extras.sql`
- **Data**: 2026-02-22

### Mudanças Realizadas

1. **Trigger para Atividades Diárias**
   ```sql
   CREATE TRIGGER trigger_atualizar_marcacao_atividades_diarias
     AFTER INSERT OR UPDATE ON registros_atividades_diarias
     FOR EACH ROW
     EXECUTE FUNCTION atualizar_marcacao_usuario();
   ```

2. **Trigger para Atividades Extras**
   ```sql
   CREATE TRIGGER trigger_atualizar_marcacao_atividades_extras
     AFTER INSERT OR UPDATE ON registros_atividades_extras
     FOR EACH ROW
     EXECUTE FUNCTION atualizar_marcacao_usuario();
   ```

3. **Atualização da Função de Correção**
   - A função `corrigir_inconsistencias_marcacao()` foi atualizada para incluir as novas tabelas na verificação de inconsistências

## Funcionamento

### Fluxo Completo

1. **Usuário inicia registro**
   - Frontend chama `registroAtividadesDiariasService.saveRegistro()` ou `registroAtividadesExtrasService.saveRegistro()`
   - Status do registro é definido como `em_andamento`

2. **Trigger automático**
   - Trigger detecta INSERT/UPDATE com status `em_andamento`
   - Atualiza `ultima_marcacao_usuario` com:
     - `usuario_id` → usuário que iniciou o registro
     - `empresa_id` → empresa do registro
     - `ultima_marcacao_em` → hora de início do registro
     - `tipo_marcacao` → 'registro_iniciado'
     - `modulo` → nome da tabela

3. **Edge Function verifica inatividade**
   - `check-inactivity-reminders` é executada periodicamente
   - Verifica todos os usuários em `ultima_marcacao_usuario`
   - Calcula minutos de inatividade desde `ultima_marcacao_em`
   - Envia notificações push nos marcos: 20, 40, 80 e 120 minutos

4. **Usuário recebe notificação**
   - Notificação push é enviada via Firebase Cloud Messaging
   - Título e corpo variam de acordo com tempo de inatividade
   - Inclui informação dos módulos com registros abertos

## Verificação

### Triggers Criados
```sql
SELECT
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname LIKE 'trigger_atualizar_marcacao%'
ORDER BY tgname;
```

Resultado esperado: 9 triggers (um para cada módulo)

### Teste Manual

1. Faça login na aplicação
2. Acesse "Atividades Diárias" ou "Atividades Extras"
3. Inicie um novo registro
4. Verifique na tabela `ultima_marcacao_usuario`:
   ```sql
   SELECT * FROM ultima_marcacao_usuario
   WHERE usuario_id = '<seu_usuario_id>';
   ```
5. Aguarde 20 minutos sem marcar atividades
6. Deve receber notificação push

## Impacto

✅ **Positivo**
- Sistema de notificações agora funciona uniformemente em todos os módulos
- Usuários são alertados sobre registros inativos em Atividades Diárias e Atividades Extras
- Melhora na conclusão de registros e redução de registros abandonados

❌ **Sem Impactos Negativos**
- Nenhuma mudança no frontend necessária
- Nenhuma mudança em políticas RLS
- Triggers são performáticos e executam apenas quando necessário

## Monitoramento

### Logs da Edge Function
```sql
SELECT * FROM logs_verificacao_inatividade
ORDER BY executado_em DESC
LIMIT 10;
```

### Notificações Enviadas
```sql
SELECT * FROM lembretes_inatividade_enviados
WHERE modulo IN ('registros_atividades_diarias', 'registros_atividades_extras')
ORDER BY enviado_em DESC
LIMIT 20;
```

### Push Notifications Log
```sql
SELECT * FROM push_notifications_log
WHERE tipo = 'inactivity'
ORDER BY enviado_em DESC
LIMIT 20;
```

## Próximos Passos

- Monitorar logs de notificações nos próximos dias
- Verificar se usuários estão recebendo notificações corretamente
- Coletar feedback dos usuários sobre a frequência e utilidade das notificações

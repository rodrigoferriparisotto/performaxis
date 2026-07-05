/*
  # Adicionar Tabelas à Publicação Realtime do Supabase

  1. Objetivo
    - Adicionar todas as tabelas de registros à publicação supabase_realtime
    - Permitir que eventos INSERT, UPDATE e DELETE sejam transmitidos em tempo real
    - Corrigir problema onde conexão realtime está ativa mas eventos não chegam

  2. Tabelas Adicionadas à Publicação
    - registros_recepcao
    - registros_camararia
    - registros_revisao
    - registros_areas_comuns
    - registros_gestao
    - registros_cozinha
    - registros_vendas
    - registros_atividades_diarias
    - registros_atividades_extras
    - manutencoes

  3. Verificações
    - Garante que a publicação supabase_realtime existe
    - Adiciona tabelas à publicação de forma segura

  4. Notas Importantes
    - Esta migration é ESSENCIAL para o Dashboard Ao Vivo funcionar
    - Sem esta configuração, o canal realtime conecta mas não recebe eventos
    - REPLICA IDENTITY já foi configurado em migration anterior
*/

-- Primeiro, verificar se a publicação supabase_realtime existe
DO $$
BEGIN
  -- Se não existir, criar a publicação
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
    RAISE NOTICE 'Publicação supabase_realtime criada';
  ELSE
    RAISE NOTICE 'Publicação supabase_realtime já existe';
  END IF;
END $$;

-- Adicionar tabelas à publicação supabase_realtime
-- Se a tabela já estiver na publicação, o comando será ignorado
DO $$
DECLARE
  tabela text;
  tabelas text[] := ARRAY[
    'registros_recepcao',
    'registros_camararia',
    'registros_revisao',
    'registros_areas_comuns',
    'registros_gestao',
    'registros_cozinha',
    'registros_vendas',
    'registros_atividades_diarias',
    'registros_atividades_extras',
    'manutencoes'
  ];
BEGIN
  FOREACH tabela IN ARRAY tabelas
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tabela);
      RAISE NOTICE 'Tabela % adicionada à publicação realtime', tabela;
    EXCEPTION
      WHEN duplicate_object THEN
        RAISE NOTICE 'Tabela % já está na publicação realtime', tabela;
      WHEN undefined_table THEN
        RAISE WARNING 'Tabela % não existe', tabela;
    END;
  END LOOP;
END $$;

-- Verificar configuração final
DO $$
DECLARE
  count_tables integer;
BEGIN
  SELECT COUNT(*)
  INTO count_tables
  FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public';
  
  RAISE NOTICE 'Total de tabelas na publicação supabase_realtime: %', count_tables;
END $$;

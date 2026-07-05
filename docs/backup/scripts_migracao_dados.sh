#!/bin/bash

# ============================================================================
# SCRIPT DE MIGRAÇÃO DE DADOS - SUPABASE
# Sistema de Gerenciamento Hoteleiro
# ============================================================================

set -e  # Exit on error

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funções auxiliares
print_header() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                 MIGRAÇÃO DE DADOS SUPABASE                  ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Verificar dependências
check_dependencies() {
    print_info "Verificando dependências..."
    
    if ! command -v psql &> /dev/null; then
        print_error "psql não encontrado. Instale PostgreSQL client"
        exit 1
    fi
    
    if ! command -v pg_dump &> /dev/null; then
        print_error "pg_dump não encontrado. Instale PostgreSQL client"
        exit 1
    fi
    
    print_success "Todas dependências OK"
}

# Exportar dados
export_data() {
    print_header
    print_info "EXPORTAÇÃO DE DADOS"
    echo ""
    
    # Solicitar credenciais
    read -p "Connection string do banco ATUAL (postgresql://...): " SOURCE_DB
    
    if [ -z "$SOURCE_DB" ]; then
        print_error "Connection string não pode estar vazia"
        exit 1
    fi
    
    # Criar diretório de backup
    BACKUP_DIR="$HOME/backups_supabase/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    cd "$BACKUP_DIR"
    
    print_info "Diretório de backup: $BACKUP_DIR"
    echo ""
    
    # Exportar dados completos
    print_info "Exportando dados completos..."
    pg_dump "$SOURCE_DB" \
        --data-only \
        --no-owner \
        --no-privileges \
        --inserts \
        --exclude-table-data='storage.*' \
        --exclude-table-data='auth.*' \
        > dados_completos.sql
    
    if [ $? -eq 0 ]; then
        print_success "Dados completos exportados"
    else
        print_error "Erro ao exportar dados"
        exit 1
    fi
    
    # Lista de tabelas
    TABELAS=(
        "empresas"
        "usuarios"
        "atividades"
        "suites"
        "servicos_camararia"
        "tipos_recepcao"
        "tipos_areas_comuns"
        "tipos_gestao"
        "tipos_atividades"
        "tipos_extras"
        "tipos_cozinha"
        "tipos_funcoes_comerciais"
        "registros_recepcao"
        "registros_camararia"
        "registros_areas_comuns"
        "registros_gestao"
        "registros_revisao"
        "registros_atividades_diarias"
        "registros_atividades_extras"
        "registros_cozinha"
        "registros_vendas"
        "cancelamentos"
        "manutencoes"
        "fotos_camararia"
        "fotos_cozinha"
        "perfis_empresa"
        "permissoes_perfil"
        "metas_diarias"
        "conquistas"
        "usuarios_conquistas"
        "historico_performance"
    )
    
    # Exportar cada tabela
    print_info "Exportando tabelas individuais..."
    for tabela in "${TABELAS[@]}"; do
        echo -n "  - $tabela... "
        pg_dump "$SOURCE_DB" \
            --data-only \
            --no-owner \
            --no-privileges \
            --inserts \
            --table="public.$tabela" \
            > "${tabela}.sql" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}OK${NC}"
        else
            echo -e "${YELLOW}SKIP${NC}"
        fi
    done
    
    # Estatísticas
    echo ""
    print_info "Estatísticas do backup:"
    echo "  - Arquivos: $(ls -1 *.sql | wc -l)"
    echo "  - Tamanho total: $(du -sh . | cut -f1)"
    echo "  - Localização: $BACKUP_DIR"
    
    # Criar arquivo de metadados
    cat > METADADOS.txt << METAEOF
Backup criado em: $(date)
Banco origem: ${SOURCE_DB%%@*}@***
Diretório: $BACKUP_DIR
Arquivos: $(ls -1 *.sql | wc -l)
Tamanho: $(du -sh . | cut -f1)
METAEOF
    
    echo ""
    print_success "Exportação concluída!"
    print_info "Backup salvo em: $BACKUP_DIR"
}

# Importar dados
import_data() {
    print_header
    print_info "IMPORTAÇÃO DE DADOS"
    echo ""
    
    # Solicitar credenciais
    read -p "Connection string do banco NOVO (postgresql://...): " TARGET_DB
    
    if [ -z "$TARGET_DB" ]; then
        print_error "Connection string não pode estar vazia"
        exit 1
    fi
    
    # Solicitar diretório de backup
    read -p "Diretório com os backups (ex: $HOME/backups_supabase/...): " BACKUP_DIR
    
    if [ ! -d "$BACKUP_DIR" ]; then
        print_error "Diretório não existe: $BACKUP_DIR"
        exit 1
    fi
    
    cd "$BACKUP_DIR"
    
    # Verificar arquivo principal
    if [ ! -f "dados_completos.sql" ]; then
        print_error "Arquivo dados_completos.sql não encontrado"
        exit 1
    fi
    
    # Confirmação
    print_warning "ATENÇÃO: Esta ação irá importar dados no banco de destino"
    print_warning "Certifique-se que as migrations já foram executadas!"
    read -p "Deseja continuar? (s/N): " confirm
    
    if [ "$confirm" != "s" ] && [ "$confirm" != "S" ]; then
        print_info "Operação cancelada"
        exit 0
    fi
    
    echo ""
    print_info "Importando dados..."
    
    # Desabilitar triggers e FKs temporariamente
    psql "$TARGET_DB" -c "SET session_replication_role = replica;" > /dev/null 2>&1
    
    # Importar dados
    psql "$TARGET_DB" -f dados_completos.sql > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        print_success "Dados importados"
    else
        print_error "Erro ao importar dados"
        psql "$TARGET_DB" -c "SET session_replication_role = DEFAULT;" > /dev/null 2>&1
        exit 1
    fi
    
    # Reabilitar triggers e FKs
    psql "$TARGET_DB" -c "SET session_replication_role = DEFAULT;" > /dev/null 2>&1
    
    # Resetar sequences
    print_info "Resetando sequences..."
    psql "$TARGET_DB" << 'SQLEOF' > /dev/null 2>&1
SELECT 'SELECT SETVAL(' ||
       quote_literal(quote_ident(PGT.schemaname) || '.' || quote_ident(S.relname)) ||
       ', COALESCE(MAX(' ||quote_ident(C.attname)|| '), 1) ) FROM ' ||
       quote_ident(PGT.schemaname)|| '.'||quote_ident(T.relname)|| ';'
FROM pg_class AS S,
     pg_depend AS D,
     pg_class AS T,
     pg_attribute AS C,
     pg_tables AS PGT
WHERE S.relkind = 'S'
    AND S.oid = D.objid
    AND D.refobjid = T.oid
    AND D.refobjid = C.attrelid
    AND D.refobjsubid = C.attnum
    AND T.relname = PGT.tablename
    AND PGT.schemaname = 'public'
ORDER BY S.relname;
SQLEOF
    
    print_success "Sequences resetadas"
    
    # Validação
    echo ""
    print_info "Validando importação..."
    
    VALIDATION=$(psql "$TARGET_DB" -t << 'SQLEOF'
SELECT COUNT(*) FROM empresas;
SQLEOF
)
    
    if [ "$VALIDATION" -gt 0 ]; then
        print_success "Validação OK - Empresas: $VALIDATION"
    else
        print_warning "Nenhuma empresa encontrada - verifique importação"
    fi
    
    echo ""
    print_success "Importação concluída!"
}

# Validar dados
validate_data() {
    print_header
    print_info "VALIDAÇÃO DE DADOS"
    echo ""
    
    read -p "Connection string do banco (postgresql://...): " DB_URL
    
    if [ -z "$DB_URL" ]; then
        print_error "Connection string não pode estar vazia"
        exit 1
    fi
    
    echo ""
    print_info "Contando registros..."
    echo ""
    
    psql "$DB_URL" << 'SQLEOF'
\pset border 2
\pset format wrapped
SELECT 
  'empresas' as tabela, 
  COUNT(*)::text as total 
FROM empresas
UNION ALL
SELECT 'usuarios', COUNT(*)::text FROM usuarios
UNION ALL
SELECT 'atividades', COUNT(*)::text FROM atividades
UNION ALL
SELECT 'suites', COUNT(*)::text FROM suites
UNION ALL
SELECT 'registros_recepcao', COUNT(*)::text FROM registros_recepcao
UNION ALL
SELECT 'registros_camararia', COUNT(*)::text FROM registros_camararia
UNION ALL
SELECT 'registros_atividades_diarias', COUNT(*)::text FROM registros_atividades_diarias
UNION ALL
SELECT 'registros_atividades_extras', COUNT(*)::text FROM registros_atividades_extras
UNION ALL
SELECT 'registros_cozinha', COUNT(*)::text FROM registros_cozinha
UNION ALL
SELECT 'registros_vendas', COUNT(*)::text FROM registros_vendas
ORDER BY tabela;
SQLEOF
    
    echo ""
    print_success "Validação concluída"
}

# Menu principal
show_menu() {
    print_header
    echo "Escolha uma opção:"
    echo ""
    echo "  1) Exportar dados do banco atual"
    echo "  2) Importar dados no banco novo"
    echo "  3) Validar dados"
    echo "  4) Sair"
    echo ""
    read -p "Opção: " option
    
    case $option in
        1)
            check_dependencies
            export_data
            ;;
        2)
            check_dependencies
            import_data
            ;;
        3)
            check_dependencies
            validate_data
            ;;
        4)
            print_info "Saindo..."
            exit 0
            ;;
        *)
            print_error "Opção inválida"
            sleep 1
            show_menu
            ;;
    esac
}

# Executar
show_menu

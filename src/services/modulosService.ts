import { supabase } from '../lib/supabase';
import {
  ChefHat,
  Clipboard,
  DoorOpen,
  Home,
  Briefcase,
  Sparkles,
  CalendarDays,
  PlusCircle,
  ShoppingCart,
  Wrench,
  FileText
} from 'lucide-react';

export type ModuloId =
  | 'atividades_diarias'
  | 'recepcao'
  | 'areas_comuns'
  | 'camararia'
  | 'revisao'
  | 'cozinha'
  | 'gestao'
  | 'vendas'
  | 'atividades_extras'
  | 'manutencao'
  | 'relatorios';

export interface ModuloInfo {
  id: ModuloId;
  nome: string;
  descricao: string;
  icon: any;
  cor: string;
  isFixed: boolean;
  requiredProfiles: string[];
}

const MODULOS_DISPONIVEIS: ModuloInfo[] = [
  {
    id: 'atividades_diarias',
    nome: 'Atividades Diárias',
    descricao: 'Registro e controle de atividades diárias dos funcionários',
    icon: CalendarDays,
    cor: 'blue',
    isFixed: false,
    requiredProfiles: ['atividades_diarias']
  },
  {
    id: 'recepcao',
    nome: 'Recepção',
    descricao: 'Gestão de atividades e registros da recepção',
    icon: DoorOpen,
    cor: 'green',
    isFixed: false,
    requiredProfiles: ['recepcao']
  },
  {
    id: 'areas_comuns',
    nome: 'Áreas Comuns',
    descricao: 'Controle de limpeza e manutenção de áreas comuns',
    icon: Home,
    cor: 'purple',
    isFixed: false,
    requiredProfiles: ['areas_comuns']
  },
  {
    id: 'camararia',
    nome: 'Camararia',
    descricao: 'Gestão completa de serviços de camararia',
    icon: Sparkles,
    cor: 'pink',
    isFixed: false,
    requiredProfiles: ['camararia']
  },
  {
    id: 'revisao',
    nome: 'Revisão',
    descricao: 'Sistema de revisão e controle de qualidade',
    icon: Clipboard,
    cor: 'yellow',
    isFixed: false,
    requiredProfiles: ['revisao']
  },
  {
    id: 'cozinha',
    nome: 'Cozinha',
    descricao: 'Controle de atividades e registros da cozinha',
    icon: ChefHat,
    cor: 'orange',
    isFixed: false,
    requiredProfiles: ['cozinha']
  },
  {
    id: 'gestao',
    nome: 'Gestão',
    descricao: 'Ferramentas e relatórios para gestão',
    icon: Briefcase,
    cor: 'indigo',
    isFixed: false,
    requiredProfiles: []
  },
  {
    id: 'vendas',
    nome: 'Vendas',
    descricao: 'Gestão de atividades comerciais e vendas',
    icon: ShoppingCart,
    cor: 'emerald',
    isFixed: false,
    requiredProfiles: ['vendas']
  },
  {
    id: 'atividades_extras',
    nome: 'Atividades Extras',
    descricao: 'Registro de atividades extras e adicionais',
    icon: PlusCircle,
    cor: 'cyan',
    isFixed: false,
    requiredProfiles: ['atividades_extras']
  }
];

const MODULOS_FIXOS: ModuloInfo[] = [
  {
    id: 'manutencao',
    nome: 'Manutenção',
    descricao: 'Sistema de manutenção (sempre ativo)',
    icon: Wrench,
    cor: 'gray',
    isFixed: true,
    requiredProfiles: ['manutencao']
  },
  {
    id: 'relatorios',
    nome: 'Relatórios',
    descricao: 'Relatórios e análises (sempre ativo)',
    icon: FileText,
    cor: 'slate',
    isFixed: true,
    requiredProfiles: []
  }
];

let cachedModulos: Record<string, ModuloId[]> = {};

export const modulosService = {
  getModulosDisponiveis(): ModuloInfo[] {
    return MODULOS_DISPONIVEIS;
  },

  getModulosFixos(): ModuloInfo[] {
    return MODULOS_FIXOS;
  },

  getTodosModulos(): ModuloInfo[] {
    return [...MODULOS_DISPONIVEIS, ...MODULOS_FIXOS];
  },

  getModuloInfo(moduloId: ModuloId): ModuloInfo | undefined {
    return this.getTodosModulos().find(m => m.id === moduloId);
  },

  async getModulosEmpresa(empresaId: string): Promise<ModuloId[]> {
    if (cachedModulos[empresaId]) {
      return cachedModulos[empresaId];
    }

    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('modulos_contratados')
        .eq('id', empresaId)
        .maybeSingle();

      if (error) throw error;

      const modulos = data?.modulos_contratados || [];
      const modulosArray = Array.isArray(modulos) ? modulos : [];

      cachedModulos[empresaId] = modulosArray;
      return modulosArray;
    } catch (error) {
      return MODULOS_DISPONIVEIS.map(m => m.id);
    }
  },

  async updateModulosEmpresa(empresaId: string, modulos: ModuloId[]): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('empresas')
        .update({ modulos_contratados: modulos })
        .eq('id', empresaId);

      if (error) throw error;

      delete cachedModulos[empresaId];
      return true;
    } catch (error) {
      return false;
    }
  },

  clearCache(empresaId?: string) {
    if (empresaId) {
      delete cachedModulos[empresaId];
    } else {
      cachedModulos = {};
    }
  },

  isModuloContratado(modulos: ModuloId[], moduloId: ModuloId): boolean {
    const moduloInfo = this.getModuloInfo(moduloId);

    if (moduloInfo?.isFixed) {
      return true;
    }

    if (!modulos || modulos.length === 0) {
      return true;
    }

    return modulos.includes(moduloId);
  },

  getPerfisPorModulos(modulos: ModuloId[]): string[] {
    // SEGURANÇA: Apenas 'gestor' como perfil base
    // 'admin' foi removido para prevenir que gestores criem administradores
    // Admin só pode ser criado por super-admins (verificado no frontend/backend)
    const perfisBase = ['gestor'];

    const perfisModulos = this.getTodosModulos()
      .filter(modulo => {
        if (modulo.isFixed) return true;
        return this.isModuloContratado(modulos, modulo.id);
      })
      .flatMap(modulo => modulo.requiredProfiles);

    return [...new Set([...perfisBase, ...perfisModulos])];
  },

  getModulosPorPerfil(perfil: string): ModuloId[] {
    if (perfil === 'admin' || perfil === 'gestor') {
      return [];
    }

    const modulo = this.getTodosModulos().find(m =>
      m.requiredProfiles.includes(perfil)
    );

    return modulo ? [modulo.id] : [];
  },

  canAccessModule(userProfile: string, modulos: ModuloId[], moduloId: ModuloId): boolean {
    if (userProfile === 'admin') {
      return true;
    }

    const moduloInfo = this.getModuloInfo(moduloId);
    if (!moduloInfo) return false;

    if (moduloInfo.isFixed) {
      if (moduloInfo.requiredProfiles.length === 0) return true;
      return moduloInfo.requiredProfiles.includes(userProfile);
    }

    if (!this.isModuloContratado(modulos, moduloId)) {
      return false;
    }

    if (userProfile === 'gestor') {
      return true;
    }

    if (moduloInfo.requiredProfiles.length === 0) {
      return true;
    }

    return moduloInfo.requiredProfiles.includes(userProfile);
  },

  getTabelasPorModulo(moduloId: ModuloId): string[] {
    const mapeamento: Record<ModuloId, string[]> = {
      recepcao: ['tipos_recepcao', 'atividades_recepcao', 'registros_recepcao'],
      camararia: ['itens_camararia', 'servicos_camararia', 'fotos_camararia', 'registros_camararia', 'programacao_camararia'],
      revisao: ['atividades_revisao', 'registros_revisao'],
      areas_comuns: ['tipos_areas_comuns', 'atividades_areas_comuns', 'registros_areas_comuns'],
      cozinha: ['tipos_cozinha', 'atividades_cozinha', 'fotos_cozinha', 'registros_cozinha'],
      gestao: ['tipos_gestao', 'atividades_gestao', 'registros_gestao'],
      vendas: ['tipos_funcoes_comerciais', 'atividades_comerciais', 'registros_vendas'],
      atividades_diarias: ['tipos_atividades', 'atividades_diarias', 'registros_atividades_diarias'],
      atividades_extras: ['tipos_extras', 'atividades_extras', 'registros_atividades_extras'],
      manutencao: ['manutencoes'],
      relatorios: []
    };

    return mapeamento[moduloId] || [];
  }
};

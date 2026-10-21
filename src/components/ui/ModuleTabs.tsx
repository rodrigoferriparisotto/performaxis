import React from 'react';
import { TEMAS_MODULO, ModuloChave } from '../../constants/moduleTheme';

export interface AbaModulo {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface ModuleTabsProps {
  modulo: ModuloChave;
  abas: AbaModulo[];
  ativa: string;
  onChange: (id: string) => void;
}

/**
 * Abas de módulo na cor do módulo. Rolam na horizontal no celular em vez
 * de transbordar a tela (antes, 3 abas com ícone não cabiam em 375px).
 */
export function ModuleTabs({ modulo, abas, ativa, onChange }: ModuleTabsProps) {
  const tema = TEMAS_MODULO[modulo];
  return (
    <div className="border-b border-gray-200 -mx-4 px-4 lg:mx-0 lg:px-0 overflow-x-auto">
      <nav className="-mb-px flex gap-6 min-w-max" role="tablist">
        {abas.map((aba) => {
          const Icone = aba.icon;
          const selecionada = ativa === aba.id;
          return (
            <button
              key={aba.id}
              role="tab"
              aria-selected={selecionada}
              onClick={() => onChange(aba.id)}
              className={`group inline-flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                selecionada
                  ? tema.aba
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icone className={`mr-2 w-5 h-5 ${selecionada ? '' : 'text-gray-400 group-hover:text-gray-500'}`} />
              {aba.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

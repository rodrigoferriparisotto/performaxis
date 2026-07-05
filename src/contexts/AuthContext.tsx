import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthContextType, AuthUser } from '../types';
import { AuthService } from '../services/authService';
import { empresaService } from '../services/supabaseService';
import { modulosService, ModuloId } from '../services/modulosService';
import { PermissionsService } from '../services/permissionsService';
import { soundService } from '../services/soundService';
import { supabase } from '../lib/supabase';

const defaultAuthContext: AuthContextType = {
  user: null,
  empresa: null,
  loading: true,
  login: async () => false,
  logout: async () => {},
  hasAccess: () => false,
  hasModuleAccess: () => false,
  getEmpresaModulos: () => [],
  reloadPermissions: async () => {},
};

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [empresa, setEmpresa] = useState<any>(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);

  const loadUserPermissions = async (userProfile: string) => {
    try {
      const permissions = await PermissionsService.getProfilePermissions(userProfile);
      setUserPermissions(permissions);
    } catch (error) {
      setUserPermissions([]);
    }
  };

  const loadUserSoundVolume = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('volume_notificacao_som')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data?.volume_notificacao_som !== null && data?.volume_notificacao_som !== undefined) {
        const userVolume = parseFloat(data.volume_notificacao_som.toString());
        soundService.setVolume(userVolume);
      }
    } catch (error) {
      soundService.setVolume(1.0);
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { user: sessionUser } = await AuthService.getCurrentSession();
        if (sessionUser) {
          setUser(sessionUser);
          // Carregar permissões do banco de dados
          await loadUserPermissions(sessionUser.profile);
          // Carregar volume de som do usuário
          await loadUserSoundVolume(sessionUser.id);
          // Carregar dados da empresa do usuário
          if (sessionUser.empresaId) {
            const empresaData = await empresaService.getEmpresa();
            setEmpresa(empresaData);
          }
        } else {
          setUser(null);
          setEmpresa(null);
          setUserPermissions([]);
        }
      } catch (error: any) {
        if (
          error?.message?.includes('Refresh Token Not Found') ||
          error?.message?.includes('refresh_token_not_found') ||
          error?.code === 'refresh_token_not_found'
        ) {
          localStorage.removeItem('supabase.auth.token');
        }

        setUser(null);
        setEmpresa(null);
        setUserPermissions([]);
      } finally {
        setLoading(false);
      }
    };

    // Verificar imediatamente
    checkSession();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { success, user: authUser, error } = await AuthService.login(email, password);

      if (success && authUser) {
        setUser(authUser);
        // Carregar permissões do banco de dados
        await loadUserPermissions(authUser.profile);
        // Carregar volume de som do usuário
        await loadUserSoundVolume(authUser.id);
        // Carregar dados da empresa do usuário
        if (authUser.empresaId) {
          const empresaData = await empresaService.getEmpresa();
          setEmpresa(empresaData);
        }
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  };

  const logout = async () => {
    await AuthService.logout();
    setUser(null);
    setEmpresa(null);
    setUserPermissions([]);
  };

  const hasAccess = (module: string): boolean => {
    if (!user) return false;

    // Admin sempre tem acesso
    if (user.profile === 'admin') {
      return true;
    }

    // Usar permissões carregadas do banco de dados
    if (userPermissions.length > 0) {
      return userPermissions.includes(module);
    }

    // Fallback caso as permissões ainda não tenham sido carregadas
    return AuthService.hasAccessFallback(user.profile, module);
  };

  const getEmpresaModulos = (): string[] => {
    if (!empresa || !empresa.modulos_contratados) {
      return [];
    }
    return empresa.modulos_contratados;
  };

  const hasModuleAccess = (module: string): boolean => {
    // Passo 1: Usuário logado? Se não, bloquear
    if (!user) return false;

    // Passo 2: É admin? Se sim, permitir tudo
    if (user.profile === 'admin') {
      return true;
    }

    // Passo 3: Perfil tem permissão? Se não, bloquear
    const hasProfilePermission = hasAccess(module);
    if (!hasProfilePermission) {
      return false;
    }

    // Passo 4: É módulo fixo? Se sim, permitir
    if (module === 'manutencao' || module === 'relatorios') {
      return true;
    }

    // Passo 5: Módulo está em modulos_contratados? Se sim, permitir. Se não, bloquear
    const empresaModulos = getEmpresaModulos();

    // Se não há módulos configurados, apenas módulos fixos estão disponíveis
    if (!empresaModulos || empresaModulos.length === 0) {
      return false;
    }

    // Verificar se o módulo está na lista de contratados pela empresa
    return empresaModulos.includes(module);
  };

  const reloadPermissions = async () => {
    if (!user) {
      return;
    }

    try {
      await loadUserPermissions(user.profile);
    } catch (error) {
    }
  };

  return (
    <AuthContext.Provider value={{ user, empresa, loading, login, logout, hasAccess, hasModuleAccess, getEmpresaModulos, reloadPermissions }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  return context;
};
import React, { useState, useEffect } from 'react';
import { Users, Save, Shield, Eye, Settings, ChevronDown, ChevronRight, Plus, Edit, Trash2, AlertCircle } from 'lucide-react';
import { PermissionsService, PerfilSistema } from '../../services/permissionsService';
import { useAuth } from '../../contexts/AuthContext';

const Perfis: React.FC = () => {
  const { user, reloadPermissions } = useAuth();
  const [profiles, setProfiles] = useState<PerfilSistema[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedProfiles, setExpandedProfiles] = useState<string[]>([]);
  const [availableModules] = useState(PermissionsService.getAvailableModules());

  // Apenas administradores podem editar perfis
  const canEdit = user?.profile === 'admin';

  useEffect(() => {
    loadSystemProfiles();
  }, []);

  const loadSystemProfiles = async () => {
    setLoading(true);
    try {
      const profilesData = await PermissionsService.getSystemProfilesWithCustomPermissions();
      setProfiles(profilesData);
    } catch (error) {
      console.error('Error loading system profiles:', error);
      alert('Erro ao carregar perfis do sistema');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (profileId: string, moduleId: string, checked: boolean) => {
    if (!canEdit) {
      alert('Você não tem permissão para alterar perfis');
      return;
    }

    setProfiles(prev => prev.map(profile => {
      if (profile.id === profileId) {
        const currentPermissions = profile.permissoes || [];
        const newPermissions = checked
          ? [...currentPermissions, moduleId]
          : currentPermissions.filter(p => p !== moduleId);
        
        return {
          ...profile,
          permissoes: newPermissions
        };
      }
      return profile;
    }));
    
    setHasChanges(true);
  };

  const toggleProfile = (profileId: string) => {
    setExpandedProfiles(prev => 
      prev.includes(profileId) 
        ? prev.filter(id => id !== profileId)
        : [...prev, profileId]
    );
  };

  const handleSaveChanges = async () => {
    if (!canEdit) {
      alert('Você não tem permissão para salvar alterações');
      return;
    }

    setSaving(true);
    try {
      // Salvar permissões globais para cada perfil modificado
      const savePromises = profiles.map(async (profile) => {
        const permissions = profile.permissoes || [];
        return await PermissionsService.updateProfilePermissions(profile.profile, permissions);
      });

      const results = await Promise.all(savePromises);
      const allSuccess = results.every(result => result);

      if (allSuccess) {
        // Recarregar as permissões do usuário atual imediatamente
        await reloadPermissions();

        alert('Permissões globais atualizadas com sucesso!\n\nSuas permissões foram atualizadas automaticamente.\n\nIMPORTANTE: Outros usuários já logados precisam fazer logout e login novamente para que as alterações sejam aplicadas.\n\nAs alterações serão aplicadas a todos os usuários com esses perfis, em todas as empresas.');
        setHasChanges(false);
        await loadSystemProfiles();
      } else {
        alert('Erro ao salvar algumas permissões.\n\nVerifique se você tem permissões de administrador para modificar perfis do sistema.\n\nSe o problema persistir, entre em contato com o suporte.');
      }
    } catch (error: any) {
      console.error('Error saving permissions:', error);
      let errorMessage = 'Erro ao salvar permissões.';

      if (error?.message?.includes('permission') || error?.message?.includes('RLS')) {
        errorMessage += '\n\nVocê não tem permissão para modificar as configurações de perfis.\n\nApenas administradores podem modificar permissões de perfis.';
      } else {
        errorMessage += '\n\nTente novamente. Se o problema persistir, entre em contato com o suporte.';
      }

      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const getProfileColor = (profile: string) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-800 border-purple-200',
      recepcao: 'bg-blue-100 text-blue-800 border-blue-200',
      camararia: 'bg-green-100 text-green-800 border-green-200',
      revisao: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      areas_comuns: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      manutencao: 'bg-orange-100 text-orange-800 border-orange-200',
      gestor: 'bg-pink-100 text-pink-800 border-pink-200',
      cozinha: 'bg-teal-100 text-teal-800 border-teal-200',
      vendas: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      atividades_extras: 'bg-amber-100 text-amber-800 border-amber-200',
      atividades_diarias: 'bg-slate-100 text-slate-800 border-slate-200'
    };
    return colors[profile as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gerenciamento de Perfis</h1>
          <p className="text-gray-600">Configure as permissões de acesso globais para cada perfil do sistema</p>
        </div>

        {hasChanges && (
          <button
            onClick={handleSaveChanges}
            disabled={saving}
            className={`px-6 py-2 rounded-lg flex items-center space-x-2 transition-colors duration-200 ${
              saving
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
          </button>
        )}
      </div>

      {/* Informações sobre o sistema */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-blue-600" />
          <p className="text-blue-800 font-medium">Sistema de Permissões Global</p>
        </div>
        <ul className="text-blue-700 text-sm mt-2 space-y-1 list-disc list-inside">
          <li>Configure quais módulos cada perfil pode acessar</li>
          <li>As alterações são aplicadas <strong>globalmente</strong> para todos os usuários com esses perfis, em <strong>todas as empresas</strong></li>
          <li>As configurações são salvas no <strong>banco de dados</strong> e ficam disponíveis em qualquer navegador ou dispositivo</li>
          <li>Apenas administradores podem modificar permissões</li>
        </ul>
      </div>

      {/* Grid de Perfis */}
      <div className="space-y-4">
        {profiles.map((profile) => (
          <div key={profile.id} className="bg-white rounded-lg shadow-md border border-gray-200">
            {/* Header do Perfil */}
            <button
              onClick={() => toggleProfile(profile.id)}
              className={`w-full p-4 rounded-t-lg text-left hover:opacity-90 transition-opacity duration-200 ${getProfileColor(profile.profile)} ${!profile.ativo ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {profile.nome_exibicao}
                      {!profile.ativo && <span className="text-sm opacity-75"> (Inativo)</span>}
                    </h3>
                    <p className="text-sm opacity-75">
                      {profile.permissoes?.length || 0} de {availableModules.length} permissões
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-sm font-medium">
                    {Math.round(((profile.permissoes?.length || 0) / availableModules.length) * 100)}%
                  </div>
                  {expandedProfiles.includes(profile.id) ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </div>
              </div>
            </button>

            {/* Lista de Permissões - Expansível */}
            {expandedProfiles.includes(profile.id) && (
              <div className="border-t border-gray-200">
                {!canEdit && (
                  <div className="p-4 bg-yellow-50 border-b border-yellow-200">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                      <p className="text-yellow-800 text-sm">
                        Apenas administradores podem modificar permissões
                      </p>
                    </div>
                  </div>
                )}
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {availableModules.map((module) => {
                      const hasPermission = (profile.permissoes || []).includes(module.id);
                      
                      return (
                        <label
                          key={module.id}
                          className={`flex items-center space-x-3 p-2 rounded-lg transition-colors duration-200 ${
                            canEdit ? 'cursor-pointer hover:bg-gray-50' : 'cursor-not-allowed opacity-60'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={hasPermission}
                            onChange={(e) => handlePermissionChange(profile.id, module.id, e.target.checked)}
                            disabled={!canEdit}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                          />
                          <div className="flex items-center space-x-2 flex-1">
                            <Eye className={`w-4 h-4 ${hasPermission ? 'text-green-600' : 'text-gray-400'}`} />
                            <span className={`text-sm ${hasPermission ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                              {module.label}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Footer com Estatísticas - Apenas quando expandido */}
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                    <span>Permissões ativas:</span>
                    <span className="font-medium">
                      {(profile.permissoes || []).length}/{availableModules.length}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${(((profile.permissoes || []).length) / availableModules.length) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Resumo Geral - Visão por Módulo */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Settings className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Resumo Global: Módulos x Perfis</h3>
            <p className="text-sm text-gray-600">Para cada módulo do sistema, veja quais perfis têm permissão de acesso</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableModules.map((module) => {
            const profilesWithAccess = profiles.filter(p =>
              (p.permissoes || []).includes(module.id) && p.ativo
            );

            return (
              <div key={module.id} className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-800 text-sm">{module.label}</h4>
                  <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded-full">
                    {profilesWithAccess.length} perfis
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {profilesWithAccess.length > 0 ? (
                    profilesWithAccess.map((profile) => (
                      <span
                        key={profile.id}
                        className={`px-2 py-1 text-xs rounded-full font-medium ${getProfileColor(profile.profile)}`}
                      >
                        {profile.nome_exibicao}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400 italic">Nenhum perfil com acesso</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Aviso sobre mudanças não salvas */}
      {hasChanges && (
        <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-300 rounded-lg p-4 shadow-lg z-50">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-yellow-600" />
            <p className="text-yellow-800 font-medium">Alterações não salvas</p>
          </div>
          <p className="text-yellow-700 text-sm mt-1">
            Você tem alterações pendentes. Clique em "Salvar Alterações" para aplicá-las.
          </p>
        </div>
      )}

      {/* Aviso sobre falta de permissão */}
      {!canEdit && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            <p className="text-orange-800 font-medium">Acesso Restrito</p>
          </div>
          <p className="text-orange-700 text-sm mt-1">
            Você pode visualizar as permissões, mas apenas administradores e gestores podem modificá-las.
          </p>
        </div>
      )}
    </div>
  );
};

// Função helper para obter cor do perfil
const getProfileColor = (profile: string) => {
  const colors = {
    admin: 'bg-purple-100 text-purple-800 border-purple-200',
    recepcao: 'bg-blue-100 text-blue-800 border-blue-200',
    camararia: 'bg-green-100 text-green-800 border-green-200',
    revisao: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    areas_comuns: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    manutencao: 'bg-orange-100 text-orange-800 border-orange-200',
    gestor: 'bg-pink-100 text-pink-800 border-pink-200',
    cozinha: 'bg-teal-100 text-teal-800 border-teal-200',
    vendas: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    atividades_extras: 'bg-amber-100 text-amber-800 border-amber-200',
    atividades_diarias: 'bg-slate-100 text-slate-800 border-slate-200'
  };
  return colors[profile as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
};

export default Perfis;
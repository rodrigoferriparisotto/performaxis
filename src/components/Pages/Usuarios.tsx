import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, Eye, EyeOff, Mail, AlertCircle } from 'lucide-react';
import { usuarioService, empresaService } from '../../services/supabaseService';
import { AuthService } from '../../services/authService';
import { PermissionsService } from '../../services/permissionsService';
import { useAuth } from '../../contexts/AuthContext';
import { modulosService } from '../../services/modulosService';

const Usuarios: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [empresa, setEmpresa] = useState<any>(null);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    data_contratacao: '',
    telefone: '',
    login: '',
    profile: 'recepcao' as const,
    active: true,
    password: '',
    confirmPassword: '',
    empresa_id: '' as string
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [sendingResetEmail, setSendingResetEmail] = useState(false);
  const [profileFilter, setProfileFilter] = useState<string>('all');

  const isAdmin = currentUser?.profile === 'admin' && currentUser?.empresaId === null;

  const getAvailableProfiles = () => {
    const allProfiles = PermissionsService.getAllAvailableProfiles();

    // SEGURANÇA: Apenas super-admins (admin sem empresa) podem criar administradores
    if (isAdmin) {
      return allProfiles;
    }

    // Gestores e outros usuários NUNCA podem ver ou criar perfil admin
    const profilesWithoutAdmin = allProfiles.filter(p => p.id !== 'admin');

    if (!empresa || !empresa.modulos_contratados) {
      // Sem módulos configurados, permitir apenas gestor e manutenção (admin removido por segurança)
      return profilesWithoutAdmin.filter(p => ['gestor', 'manutencao'].includes(p.id));
    }

    const modulosEmpresa = empresa.modulos_contratados || [];
    const perfisPermitidos = modulosService.getPerfisPorModulos(modulosEmpresa);

    return profilesWithoutAdmin.filter(p => perfisPermitidos.includes(p.id));
  };

  const isProfileAvailable = (profileId: string): boolean => {
    if (isAdmin) {
      return true;
    }

    const perfisDisponiveis = getAvailableProfiles();
    return perfisDisponiveis.some(p => p.id === profileId);
  };

  useEffect(() => {
    loadUsuarios();
  }, []);

  const loadUsuarios = async () => {
    try {
      setLoading(true);
      const isSystemAdmin = currentUser?.profile === 'admin' && currentUser?.empresaId === null;

      // Carrega usuários (que agora já vêm com dados da empresa no join)
      const usuariosData = await usuarioService.getUsuarios();
      setUsuarios(usuariosData);

      if (isSystemAdmin) {
        // Administrador também carrega lista de todas as empresas para o dropdown
        const empresasData = await empresaService.getAllEmpresas();
        setEmpresas(empresasData || []);
      } else {
        // Outros usuários carregam dados da própria empresa
        const empresaData = await empresaService.getEmpresa();
        setEmpresa(empresaData);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação do telefone
    if (!validatePhoneNumber(formData.telefone)) {
      alert('Telefone inválido! O telefone deve ter 10 dígitos (fixo) ou 11 dígitos (celular) no formato brasileiro.');
      return;
    }

    // Verificação prévia do limite de usuários (apenas para novos usuários)
    if (!editingUser) {
      try {
        const [empresaData, usuariosData] = await Promise.all([
          empresaService.getEmpresa(),
          usuarioService.getUsuarios()
        ]);

        if (empresaData && empresaData.numero_usuarios) {
          const usuariosAtivos = usuariosData.filter(u => u.active).length;
          if (usuariosAtivos >= empresaData.numero_usuarios) {
            alert(`Limite de usuários atingido! Máximo permitido: ${empresaData.numero_usuarios} usuários. Usuários ativos atuais: ${usuariosAtivos}`);
            return;
          }
        }
      } catch (error) {

        // Continua com o cadastro mesmo se a verificação falhar
      }
    }

    // Validação de senha apenas se preenchida
    if (formData.password && formData.password.length < 6) {
      alert('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      alert('As senhas não coincidem');
      return;
    }

    try {
      setSaving(true);
      const isSystemAdmin = currentUser?.profile === 'admin' && currentUser?.empresaId === null;

      const userData = {
        name: formData.name,
        data_contratacao: formData.data_contratacao,
        telefone: formData.telefone,
        login: formData.login,
        profile: formData.profile,
        active: formData.active
      };

      if (editingUser) {
        // Atualizar usuário existente
        await usuarioService.updateUsuario(editingUser.id, userData);

        // Atualizar senha no Supabase Auth se fornecida
        if (formData.password) {
          try {
            // Usar AuthService para atualizar senha
            const { success, error } = await AuthService.updateUserPassword(editingUser.id, formData.password);
            if (success) {
              alert('Usuário e senha atualizados com sucesso!');
            } else {
              alert(`Usuário atualizado, mas houve problema ao alterar a senha: ${error}`);
            }
          } catch (authError) {

            alert('Usuário atualizado, mas houve problema ao alterar a senha no sistema de autenticação.');
          }
        } else {
          alert('Usuário atualizado com sucesso!');
        }
      } else {
        // Criar novo usuário
        if (!formData.password) {
          alert('Senha é obrigatória para novos usuários');
          setSaving(false);
          return;
        }

        // Determinar empresa_id baseado no tipo de usuário
        let empresaId: string | null = null;

        if (isSystemAdmin) {
          // Administrador: usar empresa selecionada no formulário (pode ser null para gestores)
          empresaId = formData.empresa_id || null;
        } else {
          // Usuários normais: SEMPRE usar a empresa do usuário atual
          empresaId = currentUser?.empresaId || null;

          // Verificação de segurança: usuário não-super-admin DEVE ter empresa
          if (!empresaId) {
            alert('Erro: Seu usuário não está vinculado a nenhuma empresa. Entre em contato com o administrador do sistema.');
            setSaving(false);
            return;
          }
        }

        // Validação: gestor/admin pode ser criado sem empresa (apenas por super-admin)
        // Outros perfis SEMPRE precisam de empresa
        if (!empresaId && formData.profile !== 'gestor' && formData.profile !== 'admin') {
          alert('Usuários que não são gestores ou admin devem ter uma empresa vinculada');
          setSaving(false);
          return;
        }

        // Usar AuthService para criar usuário completo (Auth + tabela)
        const { success, error, userId } = await AuthService.createUser({
          email: formData.login,
          password: formData.password,
          name: formData.name,
          telefone: formData.telefone,
          profile: formData.profile,
          dataContratacao: formData.data_contratacao,
          active: formData.active,
          empresaId: empresaId
        });

        if (success) {
          if (!empresaId && formData.profile === 'gestor') {
            alert('Usuário gestor criado com sucesso!\n\nEste gestor pode ser vinculado a uma empresa posteriormente.');
          } else {
            alert('Usuário criado com sucesso no sistema de autenticação e base de dados!');
          }
        } else {
          alert(`Erro ao criar usuário: ${error}`);
          setSaving(false);
          return;
        }
      }

      resetForm();
      loadUsuarios();
    } catch (error) {

      // Verificar se é erro de limite de usuários
      const errorMessage = error?.message || '';
      if (errorMessage.includes('limite') || errorMessage.includes('limit')) {
        alert(errorMessage);
      } else {
        alert('Erro ao salvar usuário');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (usuario: any) => {
    setEditingUser(usuario);
    setFormData({
      name: usuario.name,
      data_contratacao: usuario.data_contratacao,
      telefone: formatPhoneNumber(usuario.telefone || ''),
      login: usuario.login,
      profile: usuario.profile,
      active: usuario.active,
      password: '',
      confirmPassword: '',
      empresa_id: usuario.empresa_id || ''
    });
    setShowForm(true);

    // Scroll para o formulário com delay maior para mobile
    setTimeout(() => {
      const formElement = document.getElementById('user-form');
      if (formElement) {
        // Scroll para o topo da página primeiro, depois para o formulário
        window.scrollTo({ top: 0, behavior: 'smooth' });

        setTimeout(() => {
          formElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
          });
        }, 300);
      }
    }, 150);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este usuário?\n\nEsta ação é PERMANENTE e removerá o usuário completamente do sistema (autenticação e banco de dados).')) {
      try {
        const { success, error } = await AuthService.deleteUser(id);

        if (success) {
          alert('Usuário excluído com sucesso do sistema de autenticação e banco de dados!');
          loadUsuarios();
        } else {
          alert(`Erro ao excluir usuário: ${error}`);
        }
      } catch (error) {
        alert('Erro ao excluir usuário. Tente novamente.');
      }
    }
  };

  const formatPhoneNumber = (value: string): string => {
    // Remove tudo que não é número
    const cleaned = value.replace(/\D/g, '');

    // Limita a 11 dígitos
    const limited = cleaned.slice(0, 11);

    // Aplica a máscara
    if (limited.length <= 2) {
      return limited;
    } else if (limited.length <= 6) {
      return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
    } else if (limited.length <= 10) {
      return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
    } else {
      return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
    }
  };

  const validatePhoneNumber = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 10 || cleaned.length === 11;
  };

  const resetForm = () => {
    setFormData({
      name: '',
      data_contratacao: '',
      telefone: '',
      login: '',
      profile: 'recepcao',
      active: true,
      password: '',
      confirmPassword: '',
      empresa_id: ''
    });
    setEditingUser(null);
    setShowForm(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const getProfileLabel = (profile: string) => {
    const labels = {
      admin: 'Administrador',
      recepcao: 'Recepção',
      camararia: 'Camararia',
      revisao: 'Revisão',
      manutencao: 'Manutenção',
      areas_comuns: 'Áreas Comuns',
      gestor: 'Gestor',
      cozinha: 'Cozinha',
      atividades_extras: 'Atividades Extras',
      atividades_diarias: 'Atividades Diárias',
      vendas: 'Vendas'
    };
    return labels[profile as keyof typeof labels] || profile;
  };

  const handleSendPasswordResetEmail = async () => {
    if (!editingUser) return;

    try {
      setSendingResetEmail(true);
      const { success, error } = await AuthService.resetPassword(editingUser.login);

      if (success) {
        alert(`Email de recuperação de senha enviado para ${editingUser.login}. Verifique a caixa de entrada.`);
      } else {
        alert(`Erro ao enviar email: ${error}`);
      }
    } catch (error) {
      alert('Erro ao enviar email de recuperação');
    } finally {
      setSendingResetEmail(false);
    }
  };

  const isAdminOrGestor = currentUser?.profile === 'admin' || currentUser?.profile === 'gestor';

  // Filter usuarios based on profile filter (available for all users)
  let filteredUsuarios = profileFilter !== 'all'
    ? usuarios.filter(u => u.profile === profileFilter)
    : usuarios;

  // Sort usuarios by company name (for admin viewing all or managers)
  if (isAdmin && (profileFilter === 'all' || profileFilter === 'gestor')) {
    filteredUsuarios = [...filteredUsuarios].sort((a, b) => {
      // Get company names
      const empresaA = empresas.find(e => e.id === a.empresa_id);
      const empresaB = empresas.find(e => e.id === b.empresa_id);
      const nomeEmpresaA = empresaA?.nome || (a.empresa_id ? 'Sem empresa' : 'Sem empresa');
      const nomeEmpresaB = empresaB?.nome || (b.empresa_id ? 'Sem empresa' : 'Sem empresa');

      // Sort by company name first
      const compareEmpresa = nomeEmpresaA.localeCompare(nomeEmpresaB, 'pt-BR', { sensitivity: 'base' });
      if (compareEmpresa !== 0) return compareEmpresa;

      // Then by user name
      return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
    });
  }

  // Helper function to determine row background color based on company grouping
  const getRowBackgroundClass = (usuario: any, index: number) => {
    if (!isAdmin || (profileFilter !== 'all' && profileFilter !== 'gestor')) {
      return 'hover:bg-gray-50';
    }

    // Find company group index
    let currentCompanyId = null;
    let companyGroupIndex = -1;

    for (let i = 0; i <= index; i++) {
      const u = filteredUsuarios[i];
      if (u.empresa_id !== currentCompanyId) {
        companyGroupIndex++;
        currentCompanyId = u.empresa_id;
      }
    }

    // Alternate between gray and white backgrounds
    const isGrayBackground = companyGroupIndex % 2 === 0;
    return isGrayBackground ? 'bg-gray-50 hover:bg-gray-100' : 'bg-white hover:bg-gray-50';
  };

  // Calculate manager statistics (only for admin)
  const managerStats = isAdmin ? {
    total: usuarios.filter(u => u.profile === 'gestor').length,
    withCompany: usuarios.filter(u => u.profile === 'gestor' && u.empresa_id).length,
    withoutCompany: usuarios.filter(u => u.profile === 'gestor' && !u.empresa_id).length
  } : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Users className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
            {empresa && (
              <p className="text-sm text-gray-600">
                {usuarios.filter(u => u.active).length}/{empresa.numero_usuarios} usuários ativos
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.preventDefault();
              setShowForm(true);
              // Scroll para o formulário quando criar novo usuário com delay para mobile
              setTimeout(() => {
                const formElement = document.getElementById('user-form');
                if (formElement) {
                  // Scroll para o topo primeiro, depois para o formulário
                  window.scrollTo({ top: 0, behavior: 'smooth' });

                  setTimeout(() => {
                    formElement.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                      inline: 'nearest'
                    });
                  }, 300);
                }
              }, 150);
            }}
            disabled={empresa && usuarios.filter(u => u.active).length >= empresa.numero_usuarios}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
              empresa && usuarios.filter(u => u.active).length >= empresa.numero_usuarios
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <Plus className="h-4 w-4" />
            <span>
              {empresa && usuarios.filter(u => u.active).length >= empresa.numero_usuarios
                ? 'Limite Atingido'
                : 'Novo Usuário'
              }
            </span>
          </button>
        </div>
      </div>

      {/* Profile Filter - Available for all users */}
      <div className="bg-white p-4 rounded-lg shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Filtrar por perfil:</label>
            <select
              value={profileFilter}
              onChange={(e) => setProfileFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos os usuários</option>
              <option value="gestor">Apenas Gestores</option>
              <option value="admin">Apenas Administradores</option>
              <option value="recepcao">Apenas Recepção</option>
              <option value="camararia">Apenas Camararia</option>
              <option value="revisao">Apenas Revisão</option>
              <option value="manutencao">Apenas Manutenção</option>
              <option value="areas_comuns">Apenas Áreas Comuns</option>
              <option value="cozinha">Apenas Cozinha</option>
              <option value="atividades_extras">Apenas Atividades Extras</option>
              <option value="atividades_diarias">Apenas Atividades Diárias</option>
              <option value="vendas">Apenas Vendas</option>
            </select>
          </div>
          {isAdmin && profileFilter === 'gestor' && managerStats && (
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-gray-700">Gestores:</span>
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-semibold">
                {managerStats.total} total
              </span>
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-semibold">
                {managerStats.withCompany} com empresa
              </span>
              <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-semibold">
                {managerStats.withoutCompany} sem empresa
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Alerta de limite próximo */}
      {empresa && usuarios.filter(u => u.active).length >= empresa.numero_usuarios * 0.8 && (
        <div className={`p-4 rounded-lg border ${
          usuarios.filter(u => u.active).length >= empresa.numero_usuarios
            ? 'bg-red-50 border-red-200'
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-center space-x-2">
            <Users className={`w-5 h-5 ${
              usuarios.filter(u => u.active).length >= empresa.numero_usuarios
                ? 'text-red-600'
                : 'text-yellow-600'
            }`} />
            <p className={`text-sm font-medium ${
              usuarios.filter(u => u.active).length >= empresa.numero_usuarios
                ? 'text-red-800'
                : 'text-yellow-800'
            }`}>
              {usuarios.filter(u => u.active).length >= empresa.numero_usuarios
                ? `Limite de usuários atingido! (${usuarios.filter(u => u.active).length}/${empresa.numero_usuarios})`
                : `Próximo do limite de usuários (${usuarios.filter(u => u.active).length}/${empresa.numero_usuarios})`
              }
            </p>
          </div>
          <p className={`text-xs mt-1 ${
            usuarios.filter(u => u.active).length >= empresa.numero_usuarios
              ? 'text-red-700'
              : 'text-yellow-700'
          }`}>
            {usuarios.filter(u => u.active).length >= empresa.numero_usuarios
              ? 'Para cadastrar mais usuários, aumente o limite na configuração da empresa.'
              : 'Considere aumentar o limite na configuração da empresa se necessário.'
            }
          </p>
        </div>
      )}

      {showForm && (
        <div id="user-form" className="bg-white p-6 rounded-lg shadow-md scroll-mt-4">
          <h2 className="text-xl font-semibold mb-4">
            {editingUser ? 'Editar Usuário' : `Novo Usuário${empresa ? ` - ${empresa.nome}` : ''}`}
          </h2>

          {/* Alert showing company that will be linked - only for non-admins creating new users */}
          {!editingUser && !isAdmin && empresa && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-blue-900">
                    Novo usuário será vinculado à empresa
                  </h3>
                  <p className="mt-1 text-sm text-blue-700">
                    <strong>{empresa.nome}</strong> - Todos os usuários criados por você ficam automaticamente vinculados à sua empresa.
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Contratação
                </label>
                <input
                  type="date"
                  value={formData.data_contratacao}
                  onChange={(e) => setFormData({ ...formData, data_contratacao: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={formData.telefone}
                  onChange={(e) => {
                    const formatted = formatPhoneNumber(e.target.value);
                    setFormData({ ...formData, telefone: formatted });
                  }}
                  placeholder="(00) 00000-0000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Formato: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Login
                </label>
                <input
                  type="email"
                  value={formData.login}
                  onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Perfil
                </label>
                <select
                  value={formData.profile}
                  onChange={(e) => setFormData({ ...formData, profile: e.target.value as any })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {getAvailableProfiles().map(profile => (
                    <option key={profile.id} value={profile.id}>{profile.label}</option>
                  ))}
                </select>
                {!isAdmin && (
                  <p className="text-xs text-gray-500 mt-1">
                    <AlertCircle className="w-3 h-3 inline mr-1" />
                    Apenas perfis dos módulos contratados pela empresa estão disponíveis
                  </p>
                )}
              </div>

              {/* Campo de empresa - apenas para super-admin */}
              {currentUser?.profile === 'admin' && currentUser?.empresaId === null && !editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Empresa {formData.profile === 'gestor' ? '(opcional)' : '*'}
                  </label>
                  <select
                    value={formData.empresa_id}
                    onChange={(e) => setFormData({ ...formData, empresa_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required={formData.profile !== 'gestor' && formData.profile !== 'admin'}
                  >
                    <option value="">
                      {formData.profile === 'gestor' ? 'Sem empresa (vincular depois)' : 'Selecione uma empresa'}
                    </option>
                    {empresas.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.nome}</option>
                    ))}
                  </select>
                  {formData.profile === 'gestor' && (
                    <p className="text-xs text-gray-500 mt-1">
                      Gestores podem ser criados sem empresa e vinculados posteriormente
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
                  Usuário Ativo
                </label>
              </div>
            </div>

            {/* Campos de senha - apenas admin e gestor podem alterar senhas diretamente */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                {editingUser ? 'Alterar Senha' : 'Definir Senha'}
              </h3>

              {isAdminOrGestor ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {editingUser ? 'Nova Senha (opcional)' : 'Senha *'}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={editingUser ? 'Deixe em branco para manter atual' : 'Mínimo 6 caracteres'}
                        required={!editingUser}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {editingUser ? 'Confirmar Nova Senha' : 'Confirmar Senha *'}
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Confirme a senha"
                        required={!editingUser}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : editingUser ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700 mb-3">
                    Para alterar a senha deste usuário, envie um email de recuperação. O usuário receberá instruções para redefinir a senha.
                  </p>
                  <button
                    type="button"
                    onClick={handleSendPasswordResetEmail}
                    disabled={sendingResetEmail}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                  >
                    <Mail className="h-4 w-4" />
                    <span>{sendingResetEmail ? 'Enviando...' : 'Enviar Email de Recuperação'}</span>
                  </button>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    Apenas administradores e gestores podem criar novos usuários.
                  </p>
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Salvando...' : (editingUser ? 'Atualizar' : 'Criar')}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white rounded-lg shadow-md overflow-hidden">
        {filteredUsuarios.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome - Empresa (Tipo)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Telefone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsuarios.map((usuario, index) => {
                  // A empresa agora vem junto com o usuário no join
                  const usuarioEmpresa = usuario.empresa;
                  const nomeEmpresa = usuarioEmpresa?.nome || 'Sem Empresa';
                  const tipoUsuario = getProfileLabel(usuario.profile);

                  return (
                    <tr key={usuario.id} className={getRowBackgroundClass(usuario, index)}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        <div className="flex flex-col">
                          <span className="font-semibold">{usuario.name}</span>
                          <span className="text-gray-600 text-xs mt-0.5">
                            {nomeEmpresa} <span className="italic text-gray-500">({tipoUsuario})</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {usuario.login}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {usuario.telefone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          usuario.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {usuario.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(usuario)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(usuario.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">
              Nenhum usuário encontrado
            </h3>
            <p className="text-gray-600">
              {profileFilter !== 'all'
                ? 'Nenhum usuário com este perfil encontrado.'
                : 'Comece criando o primeiro usuário.'}
            </p>
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {filteredUsuarios.length > 0 ? (
          filteredUsuarios.map((usuario, index) => {
            const usuarioEmpresa = isAdmin
              ? empresas.find(e => e.id === usuario.empresa_id)
              : empresa;
            const nomeEmpresa = usuarioEmpresa?.nome || 'Sem Empresa';
            const tipoUsuario = getProfileLabel(usuario.profile);
            const cardBgClass = getRowBackgroundClass(usuario, index).replace('hover:bg-gray-50', '').replace('hover:bg-gray-100', '').trim() || 'bg-white';

            return (
              <div key={usuario.id} className={`${cardBgClass} rounded-lg shadow-md border border-gray-200 p-4`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {usuario.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-1">
                      {nomeEmpresa} <span className="italic text-gray-500">({tipoUsuario})</span>
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {usuario.login}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 ml-3">
                    <button
                      onClick={() => handleEdit(usuario)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(usuario.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Telefone:</span>
                    <span className="text-sm text-gray-900">
                      {usuario.telefone}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      usuario.active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {usuario.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-12">
            <div className="text-center text-gray-500">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">
                Nenhum usuário encontrado
              </h3>
              <p className="text-gray-600">
                {profileFilter !== 'all'
                  ? 'Nenhum usuário com este perfil encontrado.'
                  : 'Comece criando o primeiro usuário.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Usuarios;
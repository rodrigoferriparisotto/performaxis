import React, { useState, useEffect } from 'react';
import { Key, Search, Copy, Eye, EyeOff, ExternalLink, Check, RefreshCw, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { acessosService, Acesso, AreaVinculada } from '../../services/acessosService';
import { checkIfEncrypted } from '../../services/encryptionService';

const AREA_LABELS: Record<AreaVinculada, string> = {
  recepcao: 'Recepção',
  camararia: 'Camararia',
  revisao: 'Revisão',
  gestao: 'Gestão',
  vendas: 'Vendas',
  cozinha: 'Cozinha',
  areas_comuns: 'Áreas Comuns',
  atividades_diarias: 'Atividades Diárias',
  atividades_extras: 'Atividades Extras',
  manutencao: 'Manutenção',
  geral: 'Geral',
};

const AREA_COLORS: Record<AreaVinculada, string> = {
  recepcao: 'bg-blue-100 text-blue-800',
  camararia: 'bg-green-100 text-green-800',
  revisao: 'bg-cyan-100 text-cyan-800',
  gestao: 'bg-orange-100 text-orange-800',
  vendas: 'bg-pink-100 text-pink-800',
  cozinha: 'bg-yellow-100 text-yellow-800',
  areas_comuns: 'bg-gray-100 text-gray-800',
  atividades_diarias: 'bg-teal-100 text-teal-800',
  atividades_extras: 'bg-emerald-100 text-emerald-800',
  manutencao: 'bg-red-100 text-red-800',
  geral: 'bg-slate-100 text-slate-800',
};

export default function VerAcessos() {
  const { user } = useAuth();
  const [acessos, setAcessos] = useState<Acesso[]>([]);
  const [filteredAcessos, setFilteredAcessos] = useState<Acesso[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState<AreaVinculada | 'todos'>('todos');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [decryptedPasswords, setDecryptedPasswords] = useState<Map<string, string>>(new Map());
  const [decryptingPasswords, setDecryptingPasswords] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadAcessos();
  }, [user]);

  useEffect(() => {
    filterAcessos();
  }, [acessos, searchTerm, selectedArea]);

  const loadAcessos = async () => {
    if (!user?.empresaId || !user?.profile) return;

    try {
      setLoading(true);
      const data = await acessosService.getAcessosByUserProfile(user.empresaId, user.profile);
      setAcessos(data);
    } catch (error) {
      console.error('Error loading acessos:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAcessos = () => {
    let filtered = acessos;

    if (selectedArea !== 'todos') {
      filtered = filtered.filter((a) => a.area_vinculada.includes(selectedArea as AreaVinculada));
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.titulo.toLowerCase().includes(term) ||
          a.login?.toLowerCase().includes(term) ||
          a.comentarios?.toLowerCase().includes(term)
      );
    }

    setFilteredAcessos(filtered);
  };

  const togglePasswordVisibility = async (acesso: Acesso) => {
    const id = acesso.id;

    if (visiblePasswords.has(id)) {
      setVisiblePasswords((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      return;
    }

    if (!decryptedPasswords.has(id) && acesso.senha) {
      setDecryptingPasswords((prev) => new Set(prev).add(id));

      try {
        const decrypted = await acessosService.decryptSenha(acesso.senha);
        setDecryptedPasswords((prev) => new Map(prev).set(id, decrypted));

        if (user?.id && user?.empresaId) {
          await acessosService.createAuditLog(id, user.id, user.empresaId, 'visualizou_senha');
        }
      } catch (error) {
        console.error('Error decrypting password:', error);
      } finally {
        setDecryptingPasswords((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    }

    setVisiblePasswords((prev) => new Set(prev).add(id));
  };

  const copyToClipboard = async (text: string, fieldId: string, acesso: Acesso, isPassword: boolean = false) => {
    try {
      let textToCopy = text;

      if (isPassword && acesso.senha) {
        if (!decryptedPasswords.has(acesso.id)) {
          const decrypted = await acessosService.decryptSenha(acesso.senha);
          setDecryptedPasswords((prev) => new Map(prev).set(acesso.id, decrypted));
          textToCopy = decrypted;
        } else {
          textToCopy = decryptedPasswords.get(acesso.id) || text;
        }

        if (user?.id && user?.empresaId) {
          await acessosService.createAuditLog(acesso.id, user.id, user.empresaId, 'copiou_senha');
        }
      } else if (fieldId.startsWith('login-') && user?.id && user?.empresaId) {
        await acessosService.createAuditLog(acesso.id, user.id, user.empresaId, 'copiou_login');
      }

      await navigator.clipboard.writeText(textToCopy);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const toggleCardExpansion = (id: string) => {
    setExpandedCard(expandedCard === id ? null : id);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-3 rounded-xl shadow-lg">
            <Eye className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Visualizar Acessos</h1>
            <p className="text-sm text-gray-600">Consulte credenciais e informações de acesso</p>
          </div>
        </div>
        <button
          onClick={loadAcessos}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all shadow-sm"
        >
          <RefreshCw size={18} />
          Atualizar
        </button>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por título, login ou comentários..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          />
        </div>
        <select
          value={selectedArea}
          onChange={(e) => setSelectedArea(e.target.value as AreaVinculada | 'todos')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
        >
          <option value="todos">Todas as áreas</option>
          {Object.entries(AREA_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando acessos...</p>
        </div>
      ) : filteredAcessos.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Key size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-2">
            {searchTerm || selectedArea !== 'todos' ? 'Nenhum acesso encontrado' : 'Nenhum acesso cadastrado'}
          </p>
          <p className="text-sm text-gray-500">
            {searchTerm || selectedArea !== 'todos'
              ? 'Tente ajustar os filtros de busca'
              : 'Entre em contato com o administrador para cadastrar acessos'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAcessos.map((acesso) => (
            <div
              key={acesso.id}
              className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all overflow-hidden"
            >
              <div className="p-4 cursor-pointer" onClick={() => toggleCardExpansion(acesso.id)}>
                <div className="mb-3">
                  <h3 className="font-semibold text-gray-900 mb-2">{acesso.titulo}</h3>
                  <div className="flex flex-wrap gap-1">
                    {[...acesso.area_vinculada]
                      .sort((a, b) => AREA_LABELS[a].localeCompare(AREA_LABELS[b]))
                      .map((area) => (
                        <span key={area} className={`px-2 py-1 text-xs rounded-full ${AREA_COLORS[area]}`}>
                          {AREA_LABELS[area]}
                        </span>
                      ))}
                  </div>
                </div>

                <div className="flex gap-4 text-sm text-gray-600 mb-3">
                  {acesso.login && (
                    <div className="flex items-center gap-1">
                      <Key size={14} />
                      Login
                    </div>
                  )}
                  {acesso.senha && (
                    <div className="flex items-center gap-1">
                      <Eye size={14} />
                      Senha
                    </div>
                  )}
                  {acesso.url_acesso && (
                    <div className="flex items-center gap-1">
                      <ExternalLink size={14} />
                      URL
                    </div>
                  )}
                </div>

                {!acesso.ativo && (
                  <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded">
                    Inativo
                  </div>
                )}
              </div>

              {expandedCard === acesso.id && (
                <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-3">
                  {acesso.login && (
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Login</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={acesso.login}
                          readOnly
                          className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded text-sm"
                        />
                        <button
                          onClick={() => copyToClipboard(acesso.login!, `login-${acesso.id}`, acesso, false)}
                          className="p-2 text-gray-600 hover:text-cyan-600 hover:bg-cyan-50 rounded transition-colors"
                          title="Copiar"
                        >
                          {copiedField === `login-${acesso.id}` ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                      </div>
                    </div>
                  )}

                  {acesso.senha && (
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-2">
                        Senha
                        {checkIfEncrypted(acesso.senha) ? (
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded flex items-center gap-1">
                            <Check size={12} />
                            Criptografada
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded flex items-center gap-1">
                            <AlertTriangle size={12} />
                            Não Criptografada
                          </span>
                        )}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type={visiblePasswords.has(acesso.id) ? 'text' : 'password'}
                          value={
                            decryptingPasswords.has(acesso.id)
                              ? 'Descriptografando...'
                              : visiblePasswords.has(acesso.id) && decryptedPasswords.has(acesso.id)
                              ? decryptedPasswords.get(acesso.id)
                              : '••••••••••••'
                          }
                          readOnly
                          className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded text-sm"
                        />
                        <button
                          onClick={() => togglePasswordVisibility(acesso)}
                          disabled={decryptingPasswords.has(acesso.id)}
                          className="p-2 text-gray-600 hover:text-cyan-600 hover:bg-cyan-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={visiblePasswords.has(acesso.id) ? 'Ocultar' : 'Mostrar'}
                        >
                          {decryptingPasswords.has(acesso.id) ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-600"></div>
                          ) : visiblePasswords.has(acesso.id) ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </button>
                        <button
                          onClick={() => copyToClipboard(acesso.senha!, `senha-${acesso.id}`, acesso, true)}
                          className="p-2 text-gray-600 hover:text-cyan-600 hover:bg-cyan-50 rounded transition-colors"
                          title="Copiar"
                        >
                          {copiedField === `senha-${acesso.id}` ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                      </div>
                    </div>
                  )}

                  {acesso.url_acesso && (
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">URL de Acesso</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={acesso.url_acesso}
                          readOnly
                          className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded text-sm"
                        />
                        <button
                          onClick={() => copyToClipboard(acesso.url_acesso!, `url-${acesso.id}`, acesso, false)}
                          className="p-2 text-gray-600 hover:text-cyan-600 hover:bg-cyan-50 rounded transition-colors"
                          title="Copiar"
                        >
                          {copiedField === `url-${acesso.id}` ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                        <a
                          href={acesso.url_acesso}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-600 hover:text-cyan-600 hover:bg-cyan-50 rounded transition-colors"
                          title="Abrir"
                        >
                          <ExternalLink size={16} />
                        </a>
                      </div>
                    </div>
                  )}

                  {acesso.comentarios && (
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Comentários</label>
                      <p className="text-sm text-gray-700 bg-white border border-gray-300 rounded px-3 py-2">
                        {acesso.comentarios}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

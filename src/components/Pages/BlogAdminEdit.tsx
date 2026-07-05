import React, { useEffect, useState } from 'react';
import { ArrowLeft, Save, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface BlogAdminEditProps {
  postId?: string;
}

const BlogAdminEdit: React.FC<BlogAdminEditProps> = ({ postId }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; nome: string }>>([]);
  const [tags, setTags] = useState<Array<{ id: string; nome: string }>>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    titulo: '',
    slug: '',
    resumo: '',
    conteudo: '',
    imagem_destaque: '',
    categoria_id: '',
    status: 'rascunho' as 'rascunho' | 'publicado' | 'agendado',
    data_publicacao: '',
  });
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    loadCategories();
    loadTags();
    if (postId && postId !== 'novo') {
      setIsEditMode(true);
      loadPost(postId);
    }
  }, [postId]);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_categorias')
        .select('id, nome')
        .order('nome');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const loadTags = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_tags')
        .select('id, nome')
        .order('nome');

      if (error) throw error;
      setTags(data || []);
    } catch (error) {
      console.error('Erro ao carregar tags:', error);
    }
  };

  const loadPost = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setFormData({
        titulo: data.titulo,
        slug: data.slug,
        resumo: data.resumo || '',
        conteudo: data.conteudo,
        imagem_destaque: data.imagem_destaque || '',
        categoria_id: data.categoria_id || '',
        status: data.status,
        data_publicacao: data.data_publicacao ? data.data_publicacao.split('T')[0] : '',
      });

      const { data: postTags } = await supabase
        .from('blog_posts_tags')
        .select('tag_id')
        .eq('post_id', id);

      setSelectedTags(postTags?.map(pt => pt.tag_id) || []);
    } catch (error) {
      console.error('Erro ao carregar post:', error);
      alert('Erro ao carregar post.');
    }
  };

  const generateSlug = (titulo: string) => {
    return titulo
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleTituloChange = (titulo: string) => {
    setFormData({
      ...formData,
      titulo,
      slug: !isEditMode ? generateSlug(titulo) : formData.slug,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const postData = {
        ...formData,
        autor_id: user?.id,
        data_publicacao: formData.data_publicacao || new Date().toISOString(),
      };

      if (isEditMode && postId) {
        const { error } = await supabase
          .from('blog_posts')
          .update(postData)
          .eq('id', postId);

        if (error) throw error;

        await supabase
          .from('blog_posts_tags')
          .delete()
          .eq('post_id', postId);

        if (selectedTags.length > 0) {
          const tagsData = selectedTags.map(tag_id => ({
            post_id: postId,
            tag_id,
          }));

          await supabase.from('blog_posts_tags').insert(tagsData);
        }

        alert('Post atualizado com sucesso!');
      } else {
        const { data: newPost, error } = await supabase
          .from('blog_posts')
          .insert([postData])
          .select()
          .single();

        if (error) throw error;

        if (selectedTags.length > 0 && newPost) {
          const tagsData = selectedTags.map(tag_id => ({
            post_id: newPost.id,
            tag_id,
          }));

          await supabase.from('blog_posts_tags').insert(tagsData);
        }

        alert('Post criado com sucesso!');
      }

      window.location.hash = 'blog-admin';
    } catch (error: any) {
      console.error('Erro ao salvar post:', error);
      if (error.code === '23505') {
        alert('Já existe um post com este slug. Escolha outro título ou edite o slug manualmente.');
      } else {
        alert('Erro ao salvar post. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  if (user?.profile !== 'admin') {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-red-600 mb-2">Acesso Negado</h2>
        <p className="text-gray-600">
          Apenas administradores podem acessar esta página.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => window.location.hash = 'blog-admin'}
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditMode ? 'Editar Post' : 'Novo Post'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEditMode ? 'Atualize as informações do post' : 'Crie um novo post para o blog'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Título *
            </label>
            <input
              type="text"
              value={formData.titulo}
              onChange={(e) => handleTituloChange(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Digite o título do post"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Slug (URL)
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="slug-do-post"
            />
            <p className="text-sm text-gray-500 mt-1">
              URL amigável para o post. Gerado automaticamente a partir do título.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resumo
            </label>
            <textarea
              value={formData.resumo}
              onChange={(e) => setFormData({ ...formData, resumo: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Breve resumo do post para aparecer na listagem"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Conteúdo *
            </label>
            <textarea
              value={formData.conteudo}
              onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
              required
              rows={15}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
              placeholder="Escreva o conteúdo completo do post aqui..."
            />
            <p className="text-sm text-gray-500 mt-1">
              Use quebras de linha para separar parágrafos.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL da Imagem de Destaque
            </label>
            <input
              type="url"
              value={formData.imagem_destaque}
              onChange={(e) => setFormData({ ...formData, imagem_destaque: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://exemplo.com/imagem.jpg"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoria
              </label>
              <select
                value={formData.categoria_id}
                onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecione uma categoria</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="rascunho">Rascunho</option>
                <option value="publicado">Publicado</option>
                <option value="agendado">Agendado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data de Publicação
            </label>
            <input
              type="date"
              value={formData.data_publicacao}
              onChange={(e) => setFormData({ ...formData, data_publicacao: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedTags.includes(tag.id)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tag.nome}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            {loading ? 'Salvando...' : (isEditMode ? 'Atualizar Post' : 'Criar Post')}
          </button>

          {formData.status === 'publicado' && formData.slug && (
            <button
              type="button"
              onClick={() => window.location.hash = `blog-post/${formData.slug}`}
              className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Eye className="w-5 h-5" />
              Visualizar
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default BlogAdminEdit;

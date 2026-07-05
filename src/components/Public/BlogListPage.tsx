import React, { useEffect, useState } from 'react';
import PublicLayout from './PublicLayout';
import { Clock, User, ArrowRight, Search, Tag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getDataHoraAtual } from '../../utils/dateUtils';

interface BlogPost {
  id: string;
  titulo: string;
  slug: string;
  resumo: string;
  imagem_destaque: string;
  data_publicacao: string;
  visualizacoes: number;
  categoria: {
    nome: string;
    slug: string;
  };
}

const BlogListPage: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categories, setCategories] = useState<Array<{ nome: string; slug: string }>>([]);

  useEffect(() => {
    loadPosts();
    loadCategories();
  }, [selectedCategory]);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_categorias')
        .select('nome, slug')
        .order('nome');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const loadPosts = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('blog_posts')
        .select(`
          id,
          titulo,
          slug,
          resumo,
          imagem_destaque,
          data_publicacao,
          visualizacoes,
          categoria:blog_categorias(nome, slug)
        `)
        .eq('status', 'publicado')
        .lte('data_publicacao', getDataHoraAtual())
        .order('data_publicacao', { ascending: false });

      if (selectedCategory) {
        const { data: categoryData } = await supabase
          .from('blog_categorias')
          .select('id')
          .eq('slug', selectedCategory)
          .single();

        if (categoryData) {
          query = query.eq('categoria_id', categoryData.id);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setPosts((data || []) as any);
    } catch (error) {
      console.error('Erro ao carregar posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = posts.filter(post =>
    post.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.resumo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePostClick = (slug: string) => {
    window.location.hash = `blog-post/${slug}`;
  };

  return (
    <PublicLayout>
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Blog PERFORMAXIS
          </h1>
          <p className="text-xl text-blue-100 max-w-3xl">
            Dicas, novidades e insights sobre gestão hoteleira
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row gap-8">
          <aside className="md:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-24">
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Buscar
                </h3>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar posts..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Tag className="w-5 h-5" />
                  Categorias
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedCategory('')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedCategory === ''
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    Todas
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category.slug}
                      onClick={() => setSelectedCategory(category.slug)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedCategory === category.slug
                          ? 'bg-blue-600 text-white'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      {category.nome}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <main className="flex-1">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Carregando posts...</p>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <p className="text-gray-600 text-lg">Nenhum post encontrado.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-8">
                {filteredPosts.map((post) => (
                  <article
                    key={post.id}
                    className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                    onClick={() => handlePostClick(post.slug)}
                  >
                    {post.imagem_destaque && (
                      <div className="aspect-video overflow-hidden bg-gray-100">
                        <img
                          src={post.imagem_destaque}
                          alt={post.titulo}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <div className="p-6">
                      {post.categoria && (
                        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-semibold mb-3">
                          {post.categoria.nome}
                        </span>
                      )}
                      <h2 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                        {post.titulo}
                      </h2>
                      {post.resumo && (
                        <p className="text-gray-600 mb-4 line-clamp-3">
                          {post.resumo}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {format(new Date(post.data_publicacao), 'dd MMM yyyy', { locale: ptBR })}
                          </span>
                        </div>
                        <button className="flex items-center gap-1 text-blue-600 group-hover:gap-2 transition-all font-medium">
                          Ler mais
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </PublicLayout>
  );
};

export default BlogListPage;

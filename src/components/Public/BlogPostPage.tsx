import React, { useEffect, useState } from 'react';
import PublicLayout from './PublicLayout';
import { Clock, User, ArrowLeft, Tag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getDataHoraAtual } from '../../utils/dateUtils';

interface BlogPost {
  id: string;
  titulo: string;
  slug: string;
  conteudo: string;
  resumo: string;
  imagem_destaque: string;
  data_publicacao: string;
  visualizacoes: number;
  categoria: {
    nome: string;
    slug: string;
  };
  autor: {
    nome: string;
  };
  tags: Array<{
    nome: string;
    slug: string;
  }>;
}

interface BlogPostPageProps {
  slug: string;
}

const BlogPostPage: React.FC<BlogPostPageProps> = ({ slug }) => {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedPosts, setRelatedPosts] = useState<any[]>([]);

  useEffect(() => {
    loadPost();
  }, [slug]);

  const loadPost = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('blog_posts')
        .select(`
          id,
          titulo,
          slug,
          conteudo,
          resumo,
          imagem_destaque,
          data_publicacao,
          visualizacoes,
          categoria:blog_categorias(nome, slug),
          autor:usuarios(nome)
        `)
        .eq('slug', slug)
        .eq('status', 'publicado')
        .single();

      if (error) throw error;

      const { data: tagsData } = await supabase
        .from('blog_posts_tags')
        .select('tag:blog_tags(nome, slug)')
        .eq('post_id', data.id);

      const postWithTags = {
        ...data,
        tags: tagsData?.map((t: any) => t.tag) || [],
      } as BlogPost;

      setPost(postWithTags);

      await supabase
        .from('blog_posts')
        .update({ visualizacoes: (data.visualizacoes || 0) + 1 })
        .eq('id', data.id);

      if (data.categoria) {
        loadRelatedPosts(data.id, (data.categoria as any).nome);
      }
    } catch (error) {
      console.error('Erro ao carregar post:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRelatedPosts = async (currentPostId: string, categoryName: string) => {
    try {
      const { data: categoryData } = await supabase
        .from('blog_categorias')
        .select('id')
        .eq('nome', categoryName)
        .single();

      if (!categoryData) return;

      const { data, error } = await supabase
        .from('blog_posts')
        .select(`
          id,
          titulo,
          slug,
          resumo,
          imagem_destaque,
          data_publicacao
        `)
        .eq('status', 'publicado')
        .eq('categoria_id', categoryData.id)
        .neq('id', currentPostId)
        .lte('data_publicacao', getDataHoraAtual())
        .order('data_publicacao', { ascending: false })
        .limit(3);

      if (error) throw error;
      setRelatedPosts(data || []);
    } catch (error) {
      console.error('Erro ao carregar posts relacionados:', error);
    }
  };

  if (loading) {
    return (
      <PublicLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando post...</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (!post) {
    return (
      <PublicLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Post não encontrado</h2>
            <button
              onClick={() => window.location.hash = 'blog'}
              className="text-blue-600 hover:text-blue-700"
            >
              Voltar para o blog
            </button>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <article className="bg-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
          <button
            onClick={() => window.location.hash = 'blog'}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar para o blog
          </button>

          <header className="mb-8">
            {post.categoria && (
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold mb-4">
                {post.categoria.nome}
              </span>
            )}
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {post.titulo}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-gray-600">
              {post.autor && (
                <span className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  {post.autor.nome}
                </span>
              )}
              <span className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                {format(new Date(post.data_publicacao), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </span>
            </div>
          </header>

          {post.imagem_destaque && (
            <div className="mb-8 rounded-xl overflow-hidden">
              <img
                src={post.imagem_destaque}
                alt={post.titulo}
                className="w-full h-auto"
              />
            </div>
          )}

          {post.resumo && (
            <div className="text-xl text-gray-600 mb-8 pb-8 border-b border-gray-200">
              {post.resumo}
            </div>
          )}

          <div
            className="prose prose-lg max-w-none mb-8"
            dangerouslySetInnerHTML={{ __html: post.conteudo.replace(/\n/g, '<br />') }}
          />

          {post.tags && post.tags.length > 0 && (
            <div className="pt-8 border-t border-gray-200">
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="w-5 h-5 text-gray-400" />
                {post.tags.map((tag) => (
                  <span
                    key={tag.slug}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                  >
                    {tag.nome}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {relatedPosts.length > 0 && (
          <div className="bg-gray-50 py-12">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-8">
                Posts Relacionados
              </h2>
              <div className="grid md:grid-cols-3 gap-8">
                {relatedPosts.map((relatedPost) => (
                  <article
                    key={relatedPost.id}
                    className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                    onClick={() => window.location.hash = `blog-post/${relatedPost.slug}`}
                  >
                    {relatedPost.imagem_destaque && (
                      <div className="aspect-video overflow-hidden bg-gray-100">
                        <img
                          src={relatedPost.imagem_destaque}
                          alt={relatedPost.titulo}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <div className="p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                        {relatedPost.titulo}
                      </h3>
                      {relatedPost.resumo && (
                        <p className="text-gray-600 text-sm line-clamp-2">
                          {relatedPost.resumo}
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        )}
      </article>
    </PublicLayout>
  );
};

export default BlogPostPage;

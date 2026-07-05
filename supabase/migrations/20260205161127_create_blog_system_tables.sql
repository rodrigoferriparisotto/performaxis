/*
  # Sistema de Blog Completo
  
  1. Novas Tabelas
    - `blog_categorias` - Categorias para organizar posts do blog
      - `id` (uuid, primary key)
      - `nome` (text, unique)
      - `slug` (text, unique)
      - `descricao` (text, opcional)
      - `created_at` (timestamptz)
    
    - `blog_tags` - Tags para classificação de posts
      - `id` (uuid, primary key)
      - `nome` (text, unique)
      - `slug` (text, unique)
      - `created_at` (timestamptz)
    
    - `blog_posts` - Posts do blog
      - `id` (uuid, primary key)
      - `titulo` (text)
      - `slug` (text, unique)
      - `conteudo` (text, conteúdo completo)
      - `resumo` (text, resumo/preview)
      - `imagem_destaque` (text, URL da imagem)
      - `autor_id` (uuid, referência a usuarios)
      - `categoria_id` (uuid, referência a blog_categorias)
      - `status` (enum: rascunho, publicado, agendado)
      - `data_publicacao` (timestamptz)
      - `visualizacoes` (integer, contador de views)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `blog_posts_tags` - Relacionamento many-to-many entre posts e tags
      - `post_id` (uuid, referência a blog_posts)
      - `tag_id` (uuid, referência a blog_tags)
    
    - `contatos_formulario` - Submissões do formulário de contato
      - `id` (uuid, primary key)
      - `nome` (text)
      - `email` (text)
      - `telefone` (text, opcional)
      - `empresa` (text, opcional)
      - `mensagem` (text)
      - `lido` (boolean, default false)
      - `created_at` (timestamptz)
    
    - `solicitacoes_demo` - Solicitações de demonstração
      - `id` (uuid, primary key)
      - `nome` (text)
      - `email` (text)
      - `telefone` (text)
      - `empresa` (text)
      - `cargo` (text, opcional)
      - `numero_funcionarios` (text, opcional)
      - `mensagem` (text, opcional)
      - `atendido` (boolean, default false)
      - `created_at` (timestamptz)
    
    - `newsletter_inscritos` - Inscritos na newsletter
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `nome` (text, opcional)
      - `ativo` (boolean, default true)
      - `created_at` (timestamptz)
  
  2. Segurança
    - RLS habilitado em todas as tabelas
    - Posts publicados são públicos (SELECT)
    - Apenas admin pode criar/editar/deletar posts e categorias
    - Formulários públicos podem inserir (INSERT)
    - Admin pode ler todos os formulários
  
  3. Índices
    - Índices em slugs para busca rápida
    - Índices em status e data_publicacao para listagens
    - Índice em email para newsletter
*/

-- Criar enum para status dos posts
DO $$ BEGIN
  CREATE TYPE blog_post_status AS ENUM ('rascunho', 'publicado', 'agendado');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tabela de categorias
CREATE TABLE IF NOT EXISTS blog_categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  descricao text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE blog_categorias ENABLE ROW LEVEL SECURITY;

-- Tabela de tags
CREATE TABLE IF NOT EXISTS blog_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE blog_tags ENABLE ROW LEVEL SECURITY;

-- Tabela de posts
CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  slug text NOT NULL UNIQUE,
  conteudo text NOT NULL,
  resumo text,
  imagem_destaque text,
  autor_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  categoria_id uuid REFERENCES blog_categorias(id) ON DELETE SET NULL,
  status blog_post_status DEFAULT 'rascunho',
  data_publicacao timestamptz,
  visualizacoes integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Tabela de relacionamento posts-tags
CREATE TABLE IF NOT EXISTS blog_posts_tags (
  post_id uuid REFERENCES blog_posts(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES blog_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

ALTER TABLE blog_posts_tags ENABLE ROW LEVEL SECURITY;

-- Tabela de contatos
CREATE TABLE IF NOT EXISTS contatos_formulario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  email text NOT NULL,
  telefone text,
  empresa text,
  mensagem text NOT NULL,
  lido boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE contatos_formulario ENABLE ROW LEVEL SECURITY;

-- Tabela de solicitações de demo
CREATE TABLE IF NOT EXISTS solicitacoes_demo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  email text NOT NULL,
  telefone text NOT NULL,
  empresa text NOT NULL,
  cargo text,
  numero_funcionarios text,
  mensagem text,
  atendido boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE solicitacoes_demo ENABLE ROW LEVEL SECURITY;

-- Tabela de newsletter
CREATE TABLE IF NOT EXISTS newsletter_inscritos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  nome text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE newsletter_inscritos ENABLE ROW LEVEL SECURITY;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_data_publicacao ON blog_posts(data_publicacao DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_categoria ON blog_posts(categoria_id);
CREATE INDEX IF NOT EXISTS idx_blog_categorias_slug ON blog_categorias(slug);
CREATE INDEX IF NOT EXISTS idx_blog_tags_slug ON blog_tags(slug);
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_inscritos(email);

-- RLS Policies para blog_categorias
CREATE POLICY "Categorias são públicas para leitura"
  ON blog_categorias FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Apenas admin pode criar categorias"
  ON blog_categorias FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
    )
  );

CREATE POLICY "Apenas admin pode atualizar categorias"
  ON blog_categorias FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
    )
  );

CREATE POLICY "Apenas admin pode deletar categorias"
  ON blog_categorias FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
    )
  );

-- RLS Policies para blog_tags
CREATE POLICY "Tags são públicas para leitura"
  ON blog_tags FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Apenas admin pode criar tags"
  ON blog_tags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
    )
  );

CREATE POLICY "Apenas admin pode atualizar tags"
  ON blog_tags FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
    )
  );

CREATE POLICY "Apenas admin pode deletar tags"
  ON blog_tags FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
    )
  );

-- RLS Policies para blog_posts
CREATE POLICY "Posts publicados são públicos para leitura"
  ON blog_posts FOR SELECT
  TO anon, authenticated
  USING (status = 'publicado' AND data_publicacao <= now());

CREATE POLICY "Admin pode ver todos os posts"
  ON blog_posts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
    )
  );

CREATE POLICY "Apenas admin pode criar posts"
  ON blog_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
    )
  );

CREATE POLICY "Apenas admin pode atualizar posts"
  ON blog_posts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
    )
  );

CREATE POLICY "Apenas admin pode deletar posts"
  ON blog_posts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
    )
  );

-- RLS Policies para blog_posts_tags
CREATE POLICY "Relacionamento posts-tags é público para leitura"
  ON blog_posts_tags FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Apenas admin pode gerenciar relacionamento posts-tags"
  ON blog_posts_tags FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
    )
  );

-- RLS Policies para contatos_formulario
CREATE POLICY "Qualquer pessoa pode enviar contato"
  ON contatos_formulario FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Apenas admin pode ler contatos"
  ON contatos_formulario FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
    )
  );

CREATE POLICY "Apenas admin pode atualizar contatos"
  ON contatos_formulario FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
    )
  );

-- RLS Policies para solicitacoes_demo
CREATE POLICY "Qualquer pessoa pode solicitar demo"
  ON solicitacoes_demo FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Apenas admin pode ler solicitações de demo"
  ON solicitacoes_demo FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
    )
  );

CREATE POLICY "Apenas admin pode atualizar solicitações de demo"
  ON solicitacoes_demo FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
    )
  );

-- RLS Policies para newsletter_inscritos
CREATE POLICY "Qualquer pessoa pode se inscrever na newsletter"
  ON newsletter_inscritos FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Apenas admin pode ler inscritos da newsletter"
  ON newsletter_inscritos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
    )
  );

CREATE POLICY "Apenas admin pode atualizar inscritos da newsletter"
  ON newsletter_inscritos FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.profile = 'admin'
    )
  );

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_blog_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS blog_posts_updated_at_trigger ON blog_posts;
CREATE TRIGGER blog_posts_updated_at_trigger
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_posts_updated_at();

-- Inserir categorias padrão
INSERT INTO blog_categorias (nome, slug, descricao) VALUES
  ('Novidades', 'novidades', 'Últimas novidades e atualizações do PERFORMAXIS'),
  ('Dicas', 'dicas', 'Dicas e boas práticas para gestão hoteleira'),
  ('Tutoriais', 'tutoriais', 'Tutoriais e guias passo a passo'),
  ('Casos de Sucesso', 'casos-de-sucesso', 'Histórias de sucesso de nossos clientes')
ON CONFLICT (nome) DO NOTHING;
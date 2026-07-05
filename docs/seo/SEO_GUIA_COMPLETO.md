# Guia Completo de SEO - PERFORMAXIS

## 📋 Implementações Realizadas

### 1. Arquivos Criados

#### ✅ robots.txt (`/public/robots.txt`)
- Permite acesso completo dos crawlers
- Inclui referência ao sitemap
- Configurado para principais bots (Google, Bing, Yahoo)

#### ✅ sitemap.xml (`/public/sitemap.xml`)
- Lista URL principal do site
- Configurado com prioridade máxima
- Inclui informações de imagem para SEO
- Data de última modificação

#### ✅ google-site-verification.html
- Arquivo placeholder para verificação do Google
- Contém instruções de uso

### 2. Otimizações no HTML

#### Meta Tags Adicionadas:
- ✅ Geo-localização (região BR)
- ✅ Coordenadas geográficas
- ✅ Rating e classificação
- ✅ Distribuição global
- ✅ Audience e target

#### Structured Data (Schema.org):
- ✅ Organization (empresa)
- ✅ SoftwareApplication (produto)
- ✅ LocalBusiness (negócio local com horários)
- ✅ WebSite (site com search action)
- ✅ Product (produto com avaliações)

#### Conteúdo Noscript:
- ✅ Página completa visível para crawlers sem JS
- ✅ Todas as funcionalidades principais descritas
- ✅ Keywords visíveis
- ✅ Links de contato funcionais

### 3. Otimizações de Performance

- ✅ Preload de recursos críticos
- ✅ DNS prefetch para Google Fonts
- ✅ Preconnect para fonts
- ✅ Notificações push via Firebase Cloud Messaging (FCM)

---

## 🚀 Próximos Passos (Ações Manuais Necessárias)

### 1. Google Search Console

**Passo a passo:**

1. Acesse: https://search.google.com/search-console
2. Clique em "Adicionar propriedade"
3. Escolha "Domínio" ou "Prefixo do URL"
4. Digite: `performaxis.com.br`

**Verificação por Arquivo HTML:**
1. Escolha o método "Arquivo HTML"
2. Baixe o arquivo fornecido (ex: `google1234567890abcdef.html`)
3. Faça upload para `/public/` no seu projeto
4. Faça deploy
5. Clique em "Verificar" no Search Console

**OU Verificação por DNS (Recomendado):**
1. Escolha o método "Registro DNS"
2. Copie o registro TXT fornecido pelo Google
3. Acesse seu painel no registro.br
4. Vá em "DNS" > "Adicionar Registro"
5. Adicione um registro TXT com o valor fornecido
6. Aguarde propagação (pode levar até 48h)
7. Clique em "Verificar" no Search Console

**Após Verificação:**
1. Vá em "Sitemaps" no menu lateral
2. Digite: `sitemap.xml`
3. Clique em "Enviar"
4. Vá em "Inspeção de URL"
5. Digite: `https://performaxis.com.br`
6. Clique em "Solicitar indexação"

### 2. Bing Webmaster Tools

1. Acesse: https://www.bing.com/webmasters
2. Faça login com conta Microsoft
3. Adicione o site: `performaxis.com.br`
4. Escolha método de verificação (XML, META tag ou arquivo)
5. Siga as instruções similares ao Google
6. Submeta o sitemap: `https://performaxis.com.br/sitemap.xml`

### 3. Configuração no registro.br

**Para melhor SEO local e verificação:**

1. Acesse: https://registro.br
2. Faça login no painel
3. Vá em "DNS" para seu domínio
4. Configure/verifique os registros A:
   ```
   @ (raiz) -> IP do Bolt
   www -> IP do Bolt (ou CNAME para @)
   ```

5. Adicione registro TXT do Google (se escolher verificação DNS):
   ```
   Tipo: TXT
   Nome: @
   Valor: google-site-verification=XXXXXXXX
   ```

### 4. Configurações de Redirecionamento

**Se possível configurar no Bolt:**

Redirecionar www para não-www (ou vice-versa):
```
https://www.performaxis.com.br -> https://performaxis.com.br
```

Forçar HTTPS:
```
http://performaxis.com.br -> https://performaxis.com.br
```

### 5. Validações Importantes

Após deploy, teste:

✅ **robots.txt acessível:**
- https://performaxis.com.br/robots.txt

✅ **sitemap.xml acessível:**
- https://performaxis.com.br/sitemap.xml

✅ **Structured Data válido:**
- https://search.google.com/test/rich-results
- Cole: https://performaxis.com.br

✅ **Meta tags OG (Open Graph):**
- https://www.opengraph.xyz/
- Cole: https://performaxis.com.br

✅ **Velocidade da página:**
- https://pagespeed.web.dev/
- Digite: https://performaxis.com.br

✅ **Mobile-Friendly:**
- https://search.google.com/test/mobile-friendly
- Digite: https://performaxis.com.br

### 6. Monitoramento (Primeiras Semanas)

**Google Search Console:**
- Verifique "Cobertura" para ver páginas indexadas
- Monitore "Performance" para ver impressões e cliques
- Confira "Experiência" para Core Web Vitals

**Métricas Esperadas (após 2-4 semanas):**
- Indexação da página principal: 1-7 dias
- Primeiras impressões: 7-14 dias
- Primeiros cliques orgânicos: 14-30 dias

---

## 📊 Checklist de Lançamento

Antes de considerar o SEO completo, verifique:

- [ ] Site deployado em https://performaxis.com.br
- [ ] robots.txt acessível e correto
- [ ] sitemap.xml acessível e correto
- [ ] Google Search Console verificado
- [ ] Sitemap submetido no Google Search Console
- [ ] URL principal solicitada para indexação
- [ ] Bing Webmaster Tools configurado
- [ ] Structured Data validado (sem erros)
- [ ] Meta tags OG funcionando (teste com compartilhamento)
- [ ] Site mobile-friendly (teste Google)
- [ ] PageSpeed > 80 (desktop e mobile)
- [ ] HTTPS funcionando corretamente
- [ ] Redirecionamento www configurado (se aplicável)

---

## 🔍 Keywords Principais

O site está otimizado para:
- Sistema gestão hoteleira
- Gestão pousadas
- Gestão hospitalar
- Gestão salões de beleza
- Automação hoteleira
- Software para hotéis
- Gestão operacional
- Performance hoteleira
- Camararia / Housekeeping
- Recepção hotel
- Gestão equipes hotel
- Gestão spa
- Gestão estética

---

## 💡 Dicas Adicionais

### Para Melhorar Ranking:

1. **Conteúdo:** Crie um blog com artigos sobre gestão hoteleira
2. **Backlinks:** Busque menções em sites de tecnologia e hotelaria
3. **Redes Sociais:** Mantenha perfis ativos (LinkedIn, Instagram)
4. **Google Meu Negócio:** Crie perfil se tiver endereço físico
5. **Reviews:** Solicite avaliações de clientes no Google

### Monitoramento Contínuo:

- Verifique Search Console semanalmente
- Atualize sitemap.xml se criar novas páginas públicas
- Mantenha conteúdo atualizado
- Monitore concorrentes

---

## 📞 Suporte

Em caso de dúvidas sobre qualquer etapa:
- Documentação Google: https://developers.google.com/search/docs
- Documentação Bing: https://www.bing.com/webmasters/help/
- Schema.org: https://schema.org/docs/documents.html

---

**Última atualização:** 20/01/2026
**Status:** ✅ Implementação completa - Aguardando ações manuais

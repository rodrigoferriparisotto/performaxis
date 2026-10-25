/*
  Remove as colunas de tempo estimado das tabelas que a equipe lê (os tempos
  agora ficam em tempos_estimados, só admin). Aplicada depois do deploy do app
  que deixou de usá-las. Nenhum valor tinha sido preenchido.
*/
alter table public.servicos_camararia drop column if exists tempo_estimado_min, drop column if exists tempo_estimado_revisao_min;
alter table public.tipos_recepcao drop column if exists tempo_estimado_min;
alter table public.tipos_gestao drop column if exists tempo_estimado_min;
alter table public.tipos_atividades drop column if exists tempo_estimado_min;
alter table public.tipos_extras drop column if exists tempo_estimado_min;
alter table public.tipos_cozinha drop column if exists tempo_estimado_min;

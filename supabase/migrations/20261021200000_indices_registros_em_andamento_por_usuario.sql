/*
  Índices parciais para "registros em andamento do usuário" — 21/10/2026.
  APLICADA EM PRODUÇÃO via MCP (registro para versionamento).

  Motivo: pg_stat_statements mostrou que obter_registros_pendentes_por_tempo
  (polling de lembretes chamado pelo app de cada funcionário) respondia por
  32,7% de todo o tempo de banco — 131 mil chamadas a 20,5 ms, varrendo as
  9 tabelas de registros inteiras. Com estes índices: ~0,74 ms por chamada.
  Também atendem a varredura de inatividade (check-inactivity-reminders),
  que filtra por usuario_id OU usuario_executor_id com status em andamento.
*/
create index if not exists idx_cam_andamento_usuario on public.registros_camararia (usuario_id) where status = 'em_andamento';
create index if not exists idx_cam_andamento_executor on public.registros_camararia (usuario_executor_id) where status = 'em_andamento';
create index if not exists idx_rec_andamento_usuario on public.registros_recepcao (usuario_id) where status = 'em_andamento';
create index if not exists idx_rec_andamento_executor on public.registros_recepcao (usuario_executor_id) where status = 'em_andamento';
create index if not exists idx_rev_andamento_usuario on public.registros_revisao (usuario_id) where status = 'em_andamento';
create index if not exists idx_rev_andamento_executor on public.registros_revisao (usuario_executor_id) where status = 'em_andamento';
create index if not exists idx_ac_andamento_usuario on public.registros_areas_comuns (usuario_id) where status = 'em_andamento';
create index if not exists idx_ac_andamento_executor on public.registros_areas_comuns (usuario_executor_id) where status = 'em_andamento';
create index if not exists idx_ae_andamento_usuario on public.registros_atividades_extras (usuario_id) where status = 'em_andamento';
create index if not exists idx_ae_andamento_executor on public.registros_atividades_extras (usuario_executor_id) where status = 'em_andamento';
create index if not exists idx_ad_andamento_usuario on public.registros_atividades_diarias (usuario_id) where status = 'em_andamento';
create index if not exists idx_ad_andamento_executor on public.registros_atividades_diarias (usuario_executor_id) where status = 'em_andamento';
create index if not exists idx_ges_andamento_usuario on public.registros_gestao (usuario_id) where status = 'em_andamento';
create index if not exists idx_ges_andamento_executor on public.registros_gestao (usuario_executor_id) where status = 'em_andamento';
create index if not exists idx_coz_andamento_usuario on public.registros_cozinha (usuario_id) where status = 'em_andamento';
create index if not exists idx_coz_andamento_executor on public.registros_cozinha (usuario_executor_id) where status = 'em_andamento';
create index if not exists idx_ven_andamento_usuario on public.registros_vendas (usuario_id) where status = 'em_andamento';
create index if not exists idx_ven_andamento_executor on public.registros_vendas (usuario_executor_id) where status = 'em_andamento';

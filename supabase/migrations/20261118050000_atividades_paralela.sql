-- atividade que acontece junto com outras: não gera alerta de sobreposição
-- nem ocupa espaço na sugestão de horários (18/11/2026)
alter table public.atividades add column if not exists paralela boolean not null default false;

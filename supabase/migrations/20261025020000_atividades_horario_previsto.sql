/*
  Horário previsto e duração prevista nas atividades — 25/10/2026.

  Os hotéis digitavam o horário no nome ("16h30min Guardar ombrelones"): não
  dava para ordenar a rotina, avisar atraso nem mostrar o horário no alerta.
  - atividades.horario_previsto (time) e duracao_prevista_min (minutos)
  - converte os horários que estão no INÍCIO do nome e tira do nome
  - cópia dos nomes originais em atividades_nomes_antes_horario (reversível)
*/

alter table public.atividades
  add column if not exists horario_previsto time,
  add column if not exists duracao_prevista_min smallint
    check (duracao_prevista_min is null or duracao_prevista_min between 1 and 720);

create table if not exists public.atividades_nomes_antes_horario as
  select id, name, dias_semana, now() as copiado_em
    from public.atividades
   where name ~* '^\s*\d{1,2}\s*h';
alter table public.atividades_nomes_antes_horario enable row level security;

-- casos especiais (dois horários / dias escritos no nome)
update public.atividades
   set horario_previsto = '18:00', name = 'Polir talheres e taças (também às 22h30)'
 where name ~* '^\s*18h\s*/\s*22h30';

update public.atividades
   set horario_previsto = '09:00', name = 'Enviar compras',
       dias_semana = array['segunda-feira', 'quinta-feira']
 where name ~* '^\s*9h\s*-\s*2a\s*e\s*5a\s+enviar compras';

-- regra geral: "16h30min texto", "16h35 texto", "9h - texto", "17h texto"
update public.atividades
   set horario_previsto = make_time(
         (regexp_match(name, '^\s*(\d{1,2})\s*h', 'i'))[1]::int,
         coalesce(nullif((regexp_match(name, '^\s*\d{1,2}\s*h\s*(\d{1,2})', 'i'))[1], '')::int, 0),
         0),
       name = btrim(regexp_replace(name, '^\s*\d{1,2}\s*h\s*(\d{1,2})?\s*(min)?\s*(-\s*)?', '', 'i'))
 where horario_previsto is null
   and name ~* '^\s*\d{1,2}\s*h'
   and (regexp_match(name, '^\s*(\d{1,2})\s*h', 'i'))[1]::int between 0 and 23;

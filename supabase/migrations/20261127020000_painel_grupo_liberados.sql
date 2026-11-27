-- painel do grupo: "quartos liberados" sem suíte livre (igual aos quadros do dia)
do $$
declare
  v_def text := pg_get_functiondef('public.painel_grupo(uuid, date)'::regprocedure);
  v_antes text := $q$r.data = dia.d and r.quarto_liberado_em is not null),$q$;
begin
  if position(v_antes in v_def) = 0 then raise exception 'trecho não encontrado'; end if;
  execute replace(v_def, v_antes, $q$r.data = dia.d and r.quarto_liberado_em is not null and r.tipo_servico::text <> 'suite_livre'),$q$);
end $$;

-- Migração 004 — funções RPC para marcar pontos via HTTP (Apple Watch / Atalhos)
-- JÁ APLICADA na base de dados via MCP a 2026-08-19. Guardada aqui como registo.
--
-- Permite marcar pontos no jogo ao vivo com um simples POST, para que a app
-- Atalhos do Apple Watch (ou qualquer automação) funcione como marcador remoto.
-- Atuam sempre sobre o jogo ativo mais recente; o append é atómico.

create or replace function add_live_point(team int)
returns void
language plpgsql
as $$
begin
  if team not in (0,1) then
    return;
  end if;
  update live_games
  set point_log = point_log || to_jsonb(team)
  where id = (
    select id from live_games
    where status = 'active'
    order by created_at desc
    limit 1
  );
end;
$$;

create or replace function undo_live_point()
returns void
language plpgsql
as $$
begin
  update live_games
  set point_log = case
    when jsonb_array_length(point_log) > 0
    then point_log - (jsonb_array_length(point_log) - 1)
    else point_log
  end
  where id = (
    select id from live_games
    where status = 'active'
    order by created_at desc
    limit 1
  );
end;
$$;

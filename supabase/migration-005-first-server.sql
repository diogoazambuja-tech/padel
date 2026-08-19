-- Migração 005 — equipa que começa a servir no jogo ao vivo
-- Colar no SQL Editor do Supabase e executar.
-- 0 = equipa 1, 1 = equipa 2. Jogos antigos ficam null (sem indicador).

alter table live_games add column if not exists first_server int default 0;

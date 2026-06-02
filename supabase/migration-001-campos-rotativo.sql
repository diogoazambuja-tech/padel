-- Migração 001 — adiciona suporte a campos e jogos rotativos
-- Seguro para correr numa base de dados já com registos: usa "if not exists"
-- e valores por defeito, por isso NÃO apaga nem altera jogos existentes.
-- Colar no SQL Editor do Supabase e executar.

-- Campo / local onde o jogo foi disputado (guarda o id do campo)
alter table games add column if not exists campo text default '';

-- Modo de equipas: true = equipas fixas (comportamento antigo),
-- false = equipas rotativas por set. Nome entre aspas para preservar
-- o camelCase enviado pela app.
alter table games add column if not exists "jogadoresFixos" boolean default true;

-- Lista de jogadores participantes (usada no modo rotativo)
alter table games add column if not exists jogadores jsonb default '[]';

-- Jogos antigos ficam automaticamente com jogadoresFixos = true,
-- mantendo as estatísticas e equipas tal como estavam.

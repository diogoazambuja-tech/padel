-- Migração 003 — jogos ao vivo com Supabase Realtime
-- JÁ APLICADA na base de dados via MCP a 2026-08-19. Guardada aqui como registo.

create table live_games (
  id text primary key,
  date text,
  campo text default '',
  team1 jsonb not null default '[]',
  team2 jsonb not null default '[]',
  format text not null default 'golden', -- 'golden' | 'advantage'
  point_log jsonb not null default '[]', -- sequência de pontos: 0 = equipa 1, 1 = equipa 2
  status text not null default 'active', -- 'active' | 'finished' | 'cancelled'
  created_at timestamptz default now()
);

alter table live_games enable row level security;
create policy "public_all" on live_games for all using (true) with check (true);

-- Ativa Realtime para sincronização instantânea entre marcador e placar
alter publication supabase_realtime add table live_games;

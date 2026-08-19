-- Migração 006 — posição de jogo dos jogadores + campos partilhados
-- Colar no SQL Editor do Supabase e executar.

-- Posição preferida: 'direita' | 'esquerda' | 'ambos'
alter table players add column if not exists posicao text default 'ambos';

-- Campos partilhados por todos os dispositivos (substitui o localStorage).
-- A app migra automaticamente os campos locais no primeiro arranque.
create table if not exists campos (
  id text primary key,
  name text not null,
  is_default boolean default false,
  created_at timestamptz default now()
);
alter table campos enable row level security;
drop policy if exists "public_all" on campos;
create policy "public_all" on campos for all using (true) with check (true);

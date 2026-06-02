-- Cria as tabelas no Supabase (colar no SQL Editor do Supabase)

create table players (
  id text primary key,
  name text not null,
  color text not null,
  created_at timestamptz default now()
);

create table games (
  id text primary key,
  date text not null,
  campo text default '',
  "jogadoresFixos" boolean default true,
  team1 jsonb not null default '[]',
  team2 jsonb not null default '[]',
  jogadores jsonb not null default '[]',
  sets jsonb not null default '[]',
  beers jsonb not null default '{}',
  created_at timestamptz default now()
);

-- Acesso público (sem autenticação)
alter table players enable row level security;
alter table games enable row level security;

create policy "public_all" on players for all using (true) with check (true);
create policy "public_all" on games for all using (true) with check (true);

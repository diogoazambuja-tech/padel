-- Migração 002 — define "Mesh" como campo dos jogos já existentes
-- Correr DEPOIS da migração 001 (que cria a coluna "campo").
-- Seguro: só preenche jogos sem campo, não altera os que já tenham um.
-- Colar no SQL Editor do Supabase e executar.

update games
set campo = 'mesh'
where campo is null or campo = '';

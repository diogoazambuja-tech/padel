// Estado do jogo ao vivo para a página-comando (/remote.html):
// nomes das equipas, sets/jogos/pontos, quem serve e se falta definir serviço.
import { derive, supaCfg, fetchActiveGame } from './_derive.js';

export default async function handler(req, res) {
  const cfg = supaCfg();
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (!cfg.url || !cfg.key) return res.status(500).send(JSON.stringify({ error: 'config' }));

  const { game: g, error } = await fetchActiveGame(cfg);
  if (error) return res.status(502).send(JSON.stringify({ error: 'db' }));
  if (!g) return res.status(200).send(JSON.stringify({ active: false }));

  const pr = await fetch(`${cfg.url}/rest/v1/players?select=id,name`, { headers: cfg.headers });
  const players = pr.ok ? await pr.json() : [];
  const nm = ids => (ids || []).map(id => {
    const p = players.find(x => x.id === id);
    return p ? p.name.split(' ')[0] : '?';
  }).join(' & ');

  const sc = derive(g.point_log || [], g.format, g.first_server);
  res.status(200).send(JSON.stringify({ active: true, names: [nm(g.team1), nm(g.team2)], ...sc }));
}

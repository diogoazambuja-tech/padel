// Estado do jogo ao vivo para a página-comando (/remote.html):
// nomes das equipas, sets/jogos/pontos e quem está a servir.
// Réplica compacta do deriveScore da app (src/App.jsx) — manter em sincronia.
const PTLBL = ['0', '15', '30', '40', 'AD'];

function derive(log, format, first) {
  let pts = [0, 0], games = [0, 0], sets = [], tb = false, tbp = [0, 0], finished = false, winner = 0;
  let gp = 0, tbStart = 0;
  const winGame = t => {
    const o = 1 - t; pts = [0, 0]; games = [...games]; games[t]++; gp++;
    if (games[t] >= 6 && games[t] - games[o] >= 2) { sets.push([games[0], games[1]]); games = [0, 0]; }
    else if (games[t] === 6 && games[o] === 6) { tb = true; tbp = [0, 0]; tbStart = first != null ? (first + gp) % 2 : 0; }
  };
  for (const t of log) {
    if (finished) break;
    const o = 1 - t;
    if (tb) {
      tbp = [...tbp]; tbp[t]++;
      if (tbp[t] >= 7 && tbp[t] - tbp[o] >= 2) {
        games = [...games]; games[t]++;
        sets.push([games[0], games[1]]);
        games = [0, 0]; tb = false; tbp = [0, 0]; gp++;
      }
    } else {
      pts = [...pts];
      if (pts[t] === 3 && pts[o] === 3) { if (format === 'golden') winGame(t); else pts[t] = 4; }
      else if (pts[t] === 4) winGame(t);
      else if (pts[o] === 4) pts[o] = 3;
      else if (pts[t] === 3) winGame(t);
      else pts[t]++;
    }
    const s1 = sets.filter(s => s[0] > s[1]).length, s2 = sets.filter(s => s[1] > s[0]).length;
    if (s1 >= 2 || s2 >= 2) { finished = true; winner = s1 > s2 ? 1 : 2; }
  }
  const s1 = sets.filter(s => s[0] > s[1]).length, s2 = sets.filter(s => s[1] > s[0]).length;
  let serving = null;
  if (first != null && !finished) {
    serving = tb ? (tbStart + Math.floor((tbp[0] + tbp[1] + 1) / 2)) % 2 : (first + gp) % 2;
  }
  return {
    setsWon: [s1, s2], games, tb, finished, winner, serving,
    pts: [tb ? String(tbp[0]) : PTLBL[pts[0]], tb ? String(tbp[1]) : PTLBL[pts[1]]],
  };
}

export default async function handler(req, res) {
  const url = (process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (!url || !key) return res.status(500).send(JSON.stringify({ error: 'config' }));

  const h = { apikey: key, Authorization: `Bearer ${key}` };
  const gr = await fetch(`${url}/rest/v1/live_games?status=eq.active&order=created_at.desc&limit=1`, { headers: h });
  if (!gr.ok) return res.status(502).send(JSON.stringify({ error: 'db' }));
  const g = (await gr.json())[0];
  if (!g) return res.status(200).send(JSON.stringify({ active: false }));

  const pr = await fetch(`${url}/rest/v1/players?select=id,name`, { headers: h });
  const players = pr.ok ? await pr.json() : [];
  const nm = ids => (ids || []).map(id => {
    const p = players.find(x => x.id === id);
    return p ? p.name.split(' ')[0] : '?';
  }).join(' & ');

  const sc = derive(g.point_log || [], g.format, g.first_server);
  res.status(200).send(JSON.stringify({ active: true, names: [nm(g.team1), nm(g.team2)], ...sc }));
}

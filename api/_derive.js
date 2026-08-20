// Réplica compacta do deriveScore da app (src/App.jsx) — manter em sincronia.
// Log: 0/1 = ponto da equipa; 2/3 = marcador "equipa 1/2 serve" (início do
// jogo e de cada set). Ficheiro com underscore: o Vercel não o expõe como
// endpoint; é partilhado por /api/state e /api/point.
const PTLBL = ['0', '15', '30', '40', 'AD'];

export function derive(log, format, first) {
  let pts = [0, 0], games = [0, 0], sets = [], tb = false, tbp = [0, 0], finished = false, winner = 0;
  let gp = 0, anchorTeam = first != null ? first : null, anchorGp = 0, tbAnchor = null;
  const serveNow = () => anchorTeam == null ? null : (anchorTeam + (gp - anchorGp)) % 2;
  const winGame = t => {
    const o = 1 - t; pts = [0, 0]; games = [...games]; games[t]++; gp++;
    if (games[t] >= 6 && games[t] - games[o] >= 2) { sets.push([games[0], games[1]]); games = [0, 0]; anchorTeam = null; }
    else if (games[t] === 6 && games[o] === 6) { tb = true; tbp = [0, 0]; tbAnchor = serveNow() != null ? { team: serveNow(), at: 0 } : null; }
  };
  for (const v of log) {
    if (finished) break;
    if (v === 2 || v === 3) {
      if (tb) tbAnchor = { team: v - 2, at: tbp[0] + tbp[1] };
      else { anchorTeam = v - 2; anchorGp = gp; }
      continue;
    }
    const t = v, o = 1 - t;
    if (tb) {
      tbp = [...tbp]; tbp[t]++;
      if (tbp[t] >= 7 && tbp[t] - tbp[o] >= 2) {
        games = [...games]; games[t]++;
        sets.push([games[0], games[1]]);
        games = [0, 0]; tb = false; tbp = [0, 0]; gp++; anchorTeam = null; tbAnchor = null;
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
  if (!finished) {
    if (tb) serving = tbAnchor == null ? null : (tbAnchor.team + Math.floor((tbp[0] + tbp[1] - tbAnchor.at + 1) / 2)) % 2;
    else serving = serveNow();
  }
  const needsServe = !finished && serving == null;
  return {
    setsWon: [s1, s2], games, tb, finished, winner, serving, needsServe,
    pts: [tb ? String(tbp[0]) : PTLBL[pts[0]], tb ? String(tbp[1]) : PTLBL[pts[1]]],
  };
}

export function supaCfg() {
  const url = (process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  return { url, key, headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' } };
}

export async function fetchActiveGame(cfg) {
  const r = await fetch(`${cfg.url}/rest/v1/live_games?status=eq.active&order=created_at.desc&limit=1`, { headers: cfg.headers });
  if (!r.ok) return { error: true };
  return { game: (await r.json())[0] || null };
}

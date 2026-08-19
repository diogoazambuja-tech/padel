// Endpoint simples para marcar pontos no jogo ao vivo por GET, sem cabeçalhos:
//   /api/point?team=0  → ponto equipa 1
//   /api/point?team=1  → ponto equipa 2
//   /api/point?undo=1  → desfaz o último ponto
// Serve para os atalhos do Apple Watch (1 ação, colar URL, zero configuração)
// e funciona até no browser. A chave anon fica do lado do servidor.
export default async function handler(req, res) {
  const url = (process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  if (!url || !key) return res.status(500).send('Configuração em falta no servidor.');

  const { team, undo } = req.query;
  const isUndo = undo != null;
  const t = Number(team);
  if (!isUndo && t !== 0 && t !== 1) return res.status(400).send('Usa ?team=0, ?team=1 ou ?undo=1');

  const fn = isUndo ? 'undo_live_point' : 'add_live_point';
  const r = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(isUndo ? {} : { team: t }),
  });
  if (!r.ok) return res.status(502).send('Erro ao registar. Tenta novamente.');
  res.status(200).send(isUndo ? '↩️ Último ponto anulado' : `🎾 Ponto marcado — equipa ${t + 1}!`);
}

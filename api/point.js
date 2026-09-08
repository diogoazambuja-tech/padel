// Endpoint simples para o jogo ao vivo, por GET e sem cabeçalhos:
//   /api/point?team=0  → ponto equipa 1 (ou define-a como servidora, se em falta)
//   /api/point?team=1  → ponto equipa 2 (idem)
//   /api/point?undo=1  → desfaz a última entrada
// Com o serviço por definir (início do jogo e de cada set), o primeiro toque
// numa equipa identifica quem serve; só depois contam pontos. Serve os atalhos
// do Apple Watch e a página /remote.html; a chave anon fica no servidor.
import { derive, supaCfg, fetchActiveGame } from './_derive.js';

export default async function handler(req, res) {
  const cfg = supaCfg();
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  if (!cfg.url || !cfg.key) return res.status(500).send('Configuração em falta no servidor.');

  const { team, undo } = req.query;
  const isUndo = undo != null;
  const t = Number(team);
  if (!isUndo && t !== 0 && t !== 1) return res.status(400).send('Usa ?team=0, ?team=1 ou ?undo=1');

  const { game: g, error } = await fetchActiveGame(cfg);
  if (error) return res.status(502).send('Erro ao contactar a base de dados.');
  if (!g) return res.status(200).send('Sem jogo ativo — inicia no separador 🔴 Live da app.');

  const sc = derive(g.point_log || [], g.format, g.first_server);

  if (isUndo) {
    const r = await fetch(`${cfg.url}/rest/v1/rpc/undo_live_point`, { method: 'POST', headers: cfg.headers, body: '{}' });
    if (!r.ok) return res.status(502).send('Erro ao registar. Tenta novamente.');
    return res.status(200).send('↩️ Última entrada anulada');
  }

  if (sc.needsServe) {
    // Marcador de serviço (2/3) em vez de ponto; escrita direta do log completo
    const next = [...(g.point_log || []), 2 + t];
    const r = await fetch(`${cfg.url}/rest/v1/live_games?id=eq.${encodeURIComponent(g.id)}`, {
      method: 'PATCH', headers: cfg.headers, body: JSON.stringify({ point_log: next }),
    });
    if (!r.ok) return res.status(502).send('Erro ao registar. Tenta novamente.');
    return res.status(200).send(`🎾 Equipa ${t + 1} serve primeiro!`);
  }

  const r = await fetch(`${cfg.url}/rest/v1/rpc/add_live_point`, {
    method: 'POST', headers: cfg.headers, body: JSON.stringify({ team: t }),
  });
  if (!r.ok) return res.status(502).send('Erro ao registar. Tenta novamente.');
  res.status(200).send(`🎾 Ponto marcado — equipa ${t + 1}!`);
}

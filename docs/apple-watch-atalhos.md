# Marcar pontos com o Apple Watch (app Atalhos)

O Apple Watch não corre web apps nem funciona como comando Bluetooth genérico,
mas a app **Atalhos** do watchOS consegue fazer pedidos HTTP. Com dois atalhos,
o relógio passa a marcar pontos no jogo ao vivo — e o placar no iPad/telemóvel
atualiza em tempo real via Supabase Realtime.

## Como funciona

```
Apple Watch (Atalhos)  ──HTTP──▶  Supabase (add_live_point)  ──Realtime──▶  Placar iPad/TV
```

As funções na base de dados atuam sempre sobre o **jogo ativo mais recente**
(iniciado no separador 🔴 Live da app).

## Criar os atalhos (no iPhone, sincronizam para o Watch)

Abre a app **Atalhos** no iPhone → **+** para criar um novo atalho:

### Atalho 1 — "🟢 Ponto Eq.1"

1. Adiciona a ação **"Obter conteúdos de URL"** (Get Contents of URL)
2. URL:
   `https://tfwkxqrjixxnnybdqkoy.supabase.co/rest/v1/rpc/add_live_point`
3. Toca em **Mostrar mais** e configura:
   - **Método**: `POST`
   - **Cabeçalhos** (Headers):
     - `apikey` = *(a chave anon — a mesma `VITE_SUPABASE_ANON_KEY` usada no Vercel)*
     - `Content-Type` = `application/json`
   - **Corpo do pedido** (Request Body): JSON → `{"team": 0}`
4. Nome: `🟢 Ponto Eq.1`
5. Nas definições do atalho (ícone ⓘ), ativa **"Mostrar no Apple Watch"**

### Atalho 2 — "🟠 Ponto Eq.2"

Igual ao anterior, mas com corpo `{"team": 1}` e nome `🟠 Ponto Eq.2`.

### Atalho 3 (opcional) — "↩️ Desfazer"

Igual, mas com URL
`https://tfwkxqrjixxnnybdqkoy.supabase.co/rest/v1/rpc/undo_live_point`
e corpo vazio `{}`.

## No Apple Watch

- Os atalhos aparecem na app **Atalhos** do relógio
- Para acesso rápido: adiciona a **complicação Atalhos** ao mostrador do
  relógio — levantar o pulso → toque na complicação → toque no atalho
- Dica: numa Smart Stack (watchOS 10+) os atalhos podem ficar ainda mais à mão

## Utilização num jogo

1. Na app (telemóvel/iPad): separador **🔴 Live** → configura equipas → **Iniciar Jogo**
2. Deixa o iPad/telemóvel com a vista **📺 Placar** aberta
3. Marca os pontos a partir do relógio com os atalhos
4. A equipa 1 é a primeira que escolheste (verde); a equipa 2 é a laranja
5. No fim, no telemóvel: **💾 Terminar e Guardar** → o jogo entra no histórico

## Notas

- A chave `anon` é pública por natureza (já vai embutida na web app), por isso
  pode ser colada num atalho sem problema de segurança adicional
- Se não houver jogo ativo, os atalhos não fazem nada (sem erro)
- As funções estão em `supabase/migration-004-live-point-rpc.sql`

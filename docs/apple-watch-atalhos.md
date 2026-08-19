# Marcar pontos com o Apple Watch (app Atalhos)

O Apple Watch não corre web apps, mas a app **Atalhos** do watchOS chama URLs.
A app padel expõe URLs simples (GET, sem chaves nem cabeçalhos) que marcam
pontos no jogo ao vivo — o placar no iPad/telemóvel atualiza em tempo real.

```
Apple Watch (Atalhos) ──GET──▶ /api/point (Vercel) ──▶ Supabase ──Realtime──▶ Placar
```

## URLs

Disponíveis com botões **Copiar** e **🧪 Testar** em **Configurações → ⌚ Watch**:

| Ação | URL |
|---|---|
| 🟢 Ponto Equipa 1 | `https://<app>.vercel.app/api/point?team=0` |
| 🟠 Ponto Equipa 2 | `https://<app>.vercel.app/api/point?team=1` |
| ↩️ Desfazer | `https://<app>.vercel.app/api/point?undo=1` |

Como são GET simples, funcionam até no browser — útil para testar.
A chave do Supabase fica no servidor (Vercel), nunca no atalho.

## Criar cada atalho (1 ação, ~1 minuto)

1. App **Atalhos** no iPhone → **+** → **Adicionar ação**
2. Pesquisa **"Obter conteúdos"** → escolhe **"Obter conteúdos do URL"** (categoria Web)
3. Cola o URL — e mais nada (fica GET, sem cabeçalhos, sem corpo)
4. Nomeia (ex.: `🟢 Ponto Eq.1`) → **Concluído**
5. No ⓘ do atalho, ativa **"Mostrar no Apple Watch"**

Repete para os 3 URLs.

## Partilhar com o grupo (instalação de 1 toque)

Mantém o atalho premido → **Partilhar** → **Copiar link iCloud** → envia por
WhatsApp. Quem recebe toca no link → **Obter atalho** → instalado. Cada pessoa
só precisa de ativar "Mostrar no Apple Watch" no seu ⓘ.

## No Apple Watch

- Os atalhos aparecem na app **Atalhos** do relógio
- Acesso rápido: adiciona a **complicação Atalhos** ao mostrador

## Utilização num jogo

1. Telemóvel/iPad: **🔴 Live** → equipas → quem serve → **Iniciar Jogo**
2. Deixa um ecrã na vista **📺 Placar** (com 🔊 para anúncios de voz)
3. Marca pontos do relógio; a app trata do 15/30/40, jogos, tie-breaks e sets
4. No fim: **💾 Terminar e Guardar** → entra no histórico e rankings

Sem jogo ativo, os URLs não fazem nada (por design).

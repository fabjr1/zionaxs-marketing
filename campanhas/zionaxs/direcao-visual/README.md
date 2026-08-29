# Estilo visual oficial — pôster editorial Zionaxs

Aprovado por Fabiano em 29/08/2026: "É exatamente esse estilo que eu quero. Vamos manter esse design sempre."
Este diretório é a referência permanente. `estilo-poster-editorial.html` é o protótipo fiel; os PNGs são a prova renderizada em 1080×1350.

## A receita

**Base**: sistema de 3 campos por peça — foto escura (emoção: capa/virada/fechamento), papel claro com foto P&B + geometria laranja (utilidade: cena/dica), laranja chapado #F54502 (a virada, uma por peça). A troca de campo marca a batida narrativa.

**Sobre todos os campos — o chrome de prova de impressão:**
- Grão de filme: SVG `feTurbulence` (baseFrequency .8, 2 octaves, dessaturado), `opacity:.20`, `mix-blend-mode:overlay`.
- Ano (`2026`, Poppins 600 46px) à esquerda e nº da peça em caixa quadrada 84×84, borda 3px, à direita (~47% da altura).
- Bloco `PEÇA:` em JetBrains Mono: label 17px tracking .22em + valor 21px bold tracking .14em.
- Rodapé com fio de 1px: `TEMAS: A / B / C` à esquerda, `ZIONAXS — CONCEITO` à direita (mono 17px, caps).
- Régua de calibração: chips 44×20 na ordem `#14171B  #F54502  #FF8A3C  #27454E  #EFE7D7`.
- Microlinha: `@zionaxs_ · digest <digest real da peça> · foto: <crédito>` (mono 14px). O digest impresso na arte é assinatura de autenticidade.

**Fotos escuras:**
- Gradê de cor: quente no topo → banda fria no meio → tinta embaixo. `linear-gradient(180deg, rgba(255,122,26,.30), rgba(255,122,26,.08) 24%, rgba(39,69,78,.34) 52%, rgba(39,69,78,.10) 66%, transparent 74%)` em `soft-light`, + scrim inferior normal para a manchete.
- Texto nesses slides em **creme quente `#EFE7D7`**, não no branco frio da paleta.
- Pessoas são permitidas, inclusive de frente, desde que o rosto se dissolva na luz (sol/contraluz atrás da cabeça, glow radial em `screen` blur 8px) ou fique em silhueta. A regra "sem rosto visível" continua valendo — inclusive rostos em quadros/pôsteres ao fundo.

**Manchete:**
- Caps, tracking -.02em, line-height .98, 112–118px na largura útil de 936px (padding 72px).
- Assinatura tipográfica: o **O final vira anel vazado** (border .088em, diâmetro .7em, sem miolo).
- Lead acima em mono 22px tracking .24em; apoio abaixo em Archivo 500 30px quando precisar.
- Fonte do título: **Poppins 700** — confirmada pelo Fabiano em 29/08/2026, após teste contra Archivo 800, Space Grotesk e Anton.

**Crédito das fotos deste diretório** (Unsplash): `foto-por-do-sol.jpg` — Rafael Garcin; `foto-papeis.jpg` — David Yao.

## O que ainda passa pelo fluxo normal

Peças de produção continuam nascendo por contrato no marketing-os (gates G1–G12, aprovação por digest). Este estilo entra como extensão dos layouts do renderer; nada aqui dispensa a aprovação humana de cada peça.

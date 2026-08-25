# zx-19 · A hora que sai de graça

Peça C1 de 12 da campanha **Capacidade antes de oferta**. Carrossel de 8 slides
em 1080×1350 para escritórios contábeis (público V2 / persona C1).

Derivado de [`zionaxs-memory`](https://github.com/fabjr1/zionaxs-memory) e das
skills deste repositório. **Não publicado.**

## Como regenerar

```bash
npm install --no-save playwright        # PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 se o Chromium já existir
node render.js                          # renderiza os 8 PNG + roda os 12 gates
node build-viewer.js                    # gera viewer.html com os PNG embutidos
```

`render.js` usa o Chromium em `/opt/pw-browsers/chromium`. Ajuste `executablePath`
se o seu estiver em outro lugar.

## Arquivos

| Arquivo | O que é |
|---|---|
| `index.html` | Os 8 slides. É a fonte da verdade visual. |
| `content-contract.json` | Research Brief, `approved_visible_copy`, alt text, allowlist editorial e o log de correções de QA |
| `render.js` | Render determinístico + os 12 gates, medidos nos pixels |
| `build-viewer.js` | Monta a página de revisão com os PNG em base64 |
| `fonts/` | Poppins, Archivo e JetBrains Mono em woff2, licença OFL |
| `out/` | Os 8 PNG, a folha de contato, legenda, alt text e o relatório bruto |

As fontes estão versionadas de propósito. O Render Contract exige **ausência de
fallback de fonte**, e um build que degrada em silêncio quando a rede falha é
pior que um build que não roda.

## Os 12 gates

Medidos no artefato real, não no CSS: dimensão, fallback de fonte, overflow,
área segura, contraste WCAG 2.2, runt lines, quebra não autoral, níveis
tipográficos, strings não aprovadas, strings faltando, rótulo interno vazado.

Dois merecem nota:

- **Quebra não autoral** compara linhas renderizadas contra `<br>` autorais.
  Foi ele que pegou o título da capa quebrando em 5 linhas onde 3 foram escritas.
- **Rótulo interno vazado** varre os pixels atrás de metadado de narrativa
  (`virada`, `mecanismo`, `critério`). O contrato tem uma allowlist para termos
  ambíguos: `fechamento` no slide 7 é o período contábil, não o papel narrativo.

## Bloqueios antes de publicar

1. **A wordmark está composta em Poppins.** O design system exige logo vetorial
   oficial sem redesenho, e compor o nome em tipo é um redesenho. Trocar por
   `assets/logo/zionaxs-lockup.svg` do projeto Claude Design.
2. **Rota de publicação para `@zionaxs_` quebrada.** Composio devolve `base3br`
   e não há webhook de Make descobrível. Ver `23a` na memória.
3. **Falta revisão em aparelho real.** A régua de 26px para nota de fonte só é
   liberada após teste em telefone, no tamanho de exibição do feed.
4. **Dark-first indefinido no design system.** Se for declarado invariante de
   marca, esta direção clara cai e as 12 peças precisam de nova Visual Bible.

# Marketing OS — app

O corpo do sistema descrito no PRD (`sistema/marketing-os.html`): gerador por
contrato, 12 gates medidos nos pixels, console de decisão e publicação
contratada. O agente é o runtime do método; isto aqui é o que precisa ser
determinístico.

## Setup (< 10 min)

Requisitos: Node 18+, Chromium (o do Playwright serve), git.

```bash
cd sistema/app
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install   # se já houver Chromium
# ou: npm install                                 # baixa o Chromium do Playwright

export MOS_ROOT=../workspace                      # onde vive estado, brand e peças
export MOS_CHROMIUM=/opt/pw-browsers/chromium     # opcional; sem isso o Playwright resolve

npm run check      # sintaxe de todos os fontes
npm test           # 54 testes, inclui render real com determinismo byte a byte
```

## Gerar uma peça

```bash
node bin/gen.js zx-20-capacidade-antes-de-oferta
```

Valida o contrato (G-07), compila, renderiza offline, roda os 12 gates e
grava `out/`: PNGs, `render-report.json` (com digest), folha de contato e
`legenda-alt.md`. **Gate vermelho = corrigir o contrato e regenerar.** Nunca
o pixel, nunca o HTML compilado.

## Console

```bash
node bin/console.js            # http://127.0.0.1:4870
MOS_TOKEN=segredo node bin/console.js   # exige ?t=segredo em tudo
```

Fila → peça → decisão. Aprovar só existe com 12/12 verdes e emite o
Publication Contract (YAML com digest, commitado). Reprovar exige motivo
estruturado e devolve ao contrato. Escalar registra decisão pendente
(oferta, preço, canal…). Exportação manual (ZIP com checklist) e registro de
permalink completam a v0; a peça só vira **publicada** com o link.

## Rota automatizada (v2)

`lib/publisher.js` implementa preflight → envio → callback com os três
estados (enviada/publicada/bloqueada). Depende de:

```bash
export MOS_WEBHOOK_URL=…        # cenário Make que publica
export MOS_WEBHOOK_KEY=…        # segredo — nunca em arquivo
export MOS_EXPECTED_ACCOUNT=zionaxs_
export MOS_MEDIA_BASE_URL=…     # onde os PNGs ficam públicos
```

Conta divergente **bloqueia sem retry**. HTTP 200 nunca vira "publicada".

## Layout do workspace

```
workspace/
├── config.json        # caminhos
├── state.md           # fluxo (marketing-os): estágio, gates com ponteiro, ciclo
├── library.json       # peças publicadas (inclui legado pré-sistema)
├── brand/             # brand pack: brand.json, fonts/, logo.svg (quando existir)
└── pieces/<id>/
    ├── contract.json  # a fonte de verdade da peça
    ├── out/           # DERIVADO: compiled.html, PNGs, report, legenda
    ├── decisions/     # approved.yaml, rejected-*.yaml, escalated-*.yaml
    ├── publication/   # sent/published/blocked.json
    └── readings.json  # medição com denominador
```

O PRD manda o workspace para `.agents/` em projetos de usuário; neste
repositório `.agents/` é gitignored (instalação de skills), então a raiz é
explícita via `MOS_ROOT`/`--root`. O layout interno não muda.

## Decisões de arquitetura

- **Sem banco.** Estado = arquivos + git. Toda decisão é um commit.
- **Status de peça é derivado dos artefatos**, nunca gravado — artefato não mente.
- **Aprovação amarra no digest** da geração; regenerar invalida.
- **Render 100% offline**: http/https abortado e contado como falha.
- **Segredos só por env** (`MOS_WEBHOOK_KEY`, `MOS_TOKEN`) — nunca em arquivo versionado.

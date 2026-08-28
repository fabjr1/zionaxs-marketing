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
npm test           # 158 testes, inclui render real com determinismo byte a byte
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

## Fluxo de campanhas orientado pela Zionaxs Memory

Implementa `sistema/ESPECIFICACAO-FLUXO-DE-CAMPANHAS-E-APRENDIZADO.md`. O ciclo
parte do conhecimento durável da marca e termina em proposta de aprendizado:

```
contexto seletivo → Brief conversado → plano por frentes → ativos e gates
      ↑                                                          ↓
 Zionaxs Memory                                            revisão humana
      ↑                                                          ↓
 proposta na Inbox ← devolutiva classificada ← medição ← publicação
```

```bash
export MOS_MEMORY_ROOT=/caminho/para/zionaxs-memory   # opcional; o config.json
                                                     # já aponta para o repo irmão
node bin/console.js --root ../workspace              # aba "Campanhas"
```

**Manifesto de marca.** `brands/<marca>/manifest.json` declara quais notas da
Memory governam a marca, por papel (`posicionamento`, `publico`, `provas`,
`linguagem`, `design`, `campanhas`, `aprendizados`). Nada é descoberto varrendo
a árvore: o contexto é declarado, e o que não está declarado vira lacuna.

**As travas que este fluxo impõe:**

- **Contexto é seletivo e rastreável.** Cada fonte carrega caminho, versão do
  git e data de consulta. Referência ausente, nota arquivada ou desatualizada e
  duas canônicas para o mesmo papel viram lacuna/conflito — nunca inferência.
- **O propósito determina as frentes.** Campanha de audiência não é obrigada a
  ter oferta; campanha de venda é. Não existe funil obrigatório, e a frente
  deixada de fora é registrada com motivo.
- **Brief aprovado é gate do plano.** Mudar propósito, objetivo, público,
  oferta, ação ou métrica revoga a aprovação e invalida o plano.
- **Ativo sem pipeline é declarado, não verificado.** Carrossel, story e post
  herdam os 12 gates; formato novo aparece como "sem gate próprio" em vez de
  fingir aprovação.
- **Devolutiva não vira regra.** Preferência, falha de execução, hipótese e
  resultado mensurado são tipos distintos, e a força da evidência limita o
  escopo que a proposta pode reivindicar.
- **Aprendizado nasce não canônico.** A proposta vai para
  `Inbox/Agents/claude-code/` na Memory, com escopo e condição de invalidação.
  Promover é ato humano — o sistema só registra que aconteceu, e para onde.
- **Nada de segredo na Memory.** A proposta é varrida antes de ser escrita.

Memory indisponível não impede registrar devolutiva nem proposta: a entrega
fica bloqueada e declarada, e a cópia local nunca é tratada como definitiva.

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
├── config.json        # caminhos + memoryRoot (raiz da Zionaxs Memory)
├── state.md           # fluxo (marketing-os): estágio, gates com ponteiro, ciclo
├── library.json       # peças publicadas (inclui legado pré-sistema)
├── brand/             # brand pack: brand.json, fonts/, logo.svg (quando existir)
├── brands/<marca>/
│   └── manifest.json  # quais notas da Memory governam a marca
├── campaigns/<id>/
│   ├── campaign.json  # identidade e encerramento
│   ├── context.json   # pacote de contexto: fontes, lacunas, conflitos
│   ├── brief.json     # Brief + estado de aprovação
│   ├── plan.json      # frentes, dependências, skills, ativos, métricas
│   ├── feedback/      # devolutivas classificadas
│   ├── learnings/     # propostas de aprendizado (espelho local da Inbox)
│   └── readings.json  # medição da campanha
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

## Endurecimento pós-revisão adversarial

Uma revisão adversarial (finders independentes + céticos por achado, 19
achados confirmados, 0 refutados) levou a estas garantias adicionais:

- **G5 mede o fundo real do elemento** (célula clara em slide escuro mede
  contra o claro), **G7 pega tipo display quebrando sem `<br>`**, e o probe
  enxerga texto em elementos aninhados (`<i>`, spans de acento).
- **Reprovação depois de aprovação prevalece** no status derivado; peça já
  enviada/publicada não aceita reprovação (`REJECT_TOO_LATE`).
- **Registrar permalink exige aprovação vigente** (P7 — sem atalho para
  "publicada").
- **Console:** token CSRF por boot em todo POST, comparação de `MOS_TOKEN`
  em tempo constante, body malformado não derruba o processo.
- **Fluxo:** gate "cumprido" sem ponteiro **não conta** no roteamento (F-04);
  `state.md` nasce sozinho no primeiro uso (F-01); abandonar/estacionar/
  retomar ciclo existem e toda operação de fluxo commita (`lib/flow.js`).

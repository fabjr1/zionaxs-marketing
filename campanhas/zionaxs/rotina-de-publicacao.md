# Rotina de publicação automática

Duas peças por dia em dias úteis, nos slots canônicos, publicadas por rotina em nuvem que não depende de máquina ligada.

## Slots

| Slot | Horário BRT | UTC | Papel editorial |
|---|---:|---:|---|
| Manhã | 08:30 | 11:30 | descoberta, tensão atual, curiosidade ou pauta encaminhável |
| Almoço | 13:00 | 16:00 | conteúdo principal: diagnóstico, framework, método ou tutorial decisório |

O fuso local é America/Fortaleza (UTC-3), e cron de rotina em nuvem é sempre UTC. Cron: `30 11 * * 1-5` e `0 16 * * 1-5`.

## Prompt da rotina

Cada execução começa sem memória nenhuma, então o prompt precisa bastar-se:

> Você é o operador de marketing da Zionaxs. O repositório já está no seu checkout.
>
> 1. Leia `AGENTS.md`, seções "Regra zero" e "Operação de marketing da Zionaxs".
> 2. Leia `.claude/commands/carrossel-zionaxs.md` e **execute exatamente aquele processo**, do começo ao fim, incluindo publicar.
> 3. O papel editorial desta execução é: **<papel do slot>**. Escolha um tema que sirva a esse papel.
> 4. Se o porteiro `node bin/pode-publicar.js` reprovar, **não contorne**: pare, registre o motivo em `decisions/` da peça, commite e encerre relatando.
> 5. Ao terminar, informe o permalink e a trilha sugerida, e confirme que a auditoria (`npm run auditoria`) ficou verde.

## Pré-requisito que ainda falta

A rotina em nuvem roda isolada e **só enxerga conectores MCP ligados na conta claude.ai**. Sem o Composio ligado lá, ela produz a peça e commita, mas **não publica**. Conectar em https://claude.ai/customize/connectors antes de criar a rotina.

## Reversão

O limite vivo está em `sistema/workspace/brands/zionaxs/politica-de-publicacao.json`. Revisão marcada para 12/09/2026: se o alcance por peça não subir, o campo `postsPorDia` volta a 1 e a rotina da tarde é desligada.

## Rotinas criadas (29/08/2026)

| Slot | Routine ID | Cron (UTC) | Estado |
|---|---|---|---|
| Manhã 08:30 BRT | `trig_0165SxuBX3zXCZhnCB1Ecwab` | `30 11 * * 1-5` | ligada |
| Tarde 13:00 BRT | `trig_0149bCuFL2Rs93bhWnk2pXhj` | `0 16 * * 1-5` | ligada |

Modelo: `claude-opus-5`. Ambiente: `env_01513KRzJBCT1jFxvwMvuG7o` (Ambiente 1). Repositório clonado a cada execução, com Composio e Unsplash anexados.

Painel: https://claude.ai/code/routines — apagar rotina só é possível por lá.

## O que o teste de 29/08 provou, e o que ainda não

**Provado em nuvem:** provisionamento, clone, `npm install`, `npx playwright install --with-deps chromium` (184 MB, cerca de 30 s), leitura dos padrões, execução do porteiro com a política da marca, e obediência ao bloqueio sem tentar contornar.

**Ainda não provado:** publicar no Instagram a partir da nuvem. O porteiro barrou corretamente porque a cadência do dia já estava esgotada, então a chamada ao Composio não chegou a acontecer. A primeira prova real será a execução de segunda-feira, ou um teste controlado em dia com cadência livre.

**Achado do teste, já corrigido:** o `.gitignore` herdado ignorava `.claude/` inteiro, e o clone veio sem o comando. A verificação **A8** da auditoria passou a exigir que todo comando em `.claude/commands/` esteja versionado.

# Rotina de publicação automática

Duas peças por dia, todos os dias, nos slots canônicos, publicadas por rotina em nuvem que não depende de máquina ligada.

## Slots

Os horários vêm da nota 30 da Zionaxs Memory e **diferem entre dia útil e fim de semana**, porque o leitor está em contexto diferente. O limite vivo e a tabela completa ficam em `sistema/workspace/brands/zionaxs/politica-de-publicacao.json`.

| Dias | Slot | BRT | UTC | Papel editorial |
|---|---|---:|---:|---|
| Seg a sex | Manhã | 08:30 | 11:30 | descoberta, tensão atual, curiosidade ou pauta encaminhável |
| Seg a sex | Tarde | 13:00 | 16:00 | conteúdo principal: diagnóstico, framework, método ou tutorial decisório |
| Sáb e dom | Manhã | 10:30 | 13:30 | repertório, cultura, comportamento, curiosidade e conteúdo visualmente experimental |
| Sáb e dom | Tarde | 15:00 | 18:00 | guia salvável, análise longa, biblioteca ou aplicação prática |

O fuso local é America/Fortaleza (UTC-3) e o cron das rotinas em nuvem é sempre UTC. O porteiro conta o dia **no fuso da marca**, não em UTC: com UTC-3, contar em UTC liberaria a cota do dia seguinte a partir das 21h locais.

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

## Rotinas em nuvem (atualizado 30/08/2026)

| Dias | Slot | BRT | UTC | Cron | Routine ID |
|---|---|---:|---:|---|---|
| Sáb e dom | Manhã | 10:30 | 13:30 | `30 13 * * 0,6` | `trig_01C9UAMCezgtJjfEyePwzdki` |
| Sáb e dom | Tarde | 15:00 | 18:00 | `0 18 * * 0,6` | `trig_019Gifc6aiXTZcb2bTUbzwVm` |
| Seg a sex | Manhã | 08:30 | 11:30 | `30 11 * * 1-5` | `trig_0165SxuBX3zXCZhnCB1Ecwab` |
| Seg a sex | Tarde | 13:00 | 16:00 | `0 16 * * 1-5` | `trig_0149bCuFL2Rs93bhWnk2pXhj` |

Todas ligadas, modelo `claude-opus-5`, ambiente `env_01513KRzJBCT1jFxvwMvuG7o`, com Composio e Unsplash anexados. A plataforma acrescenta alguns minutos de jitter, então 10:30 pode virar 10:35.

Os papéis editoriais diferem por slot e vêm da nota 30. Fim de semana não repete o tom de dia útil: de manhã é repertório e curiosidade, à tarde é guia salvável.

Painel: https://claude.ai/code/routines
### Rotina de teste, encerrada

A rotina `trig_014XS85D1iF6MTNwDoiVpfT3` existiu apenas para o teste único de publicação em nuvem de 29/08, que passou. Em 30/08 ela foi **desarmada**: desligada, renomeada para ENCERRADA, com repositório e conectores removidos e o prompt trocado por um aviso inerte. Sem o conector do Composio ela não alcança o Instagram nem se alguém disparar.

O desarme importa porque o prompt dela carregava autorização de exceção de cadência. **A API não apaga rotina**, só o painel apaga: quando for lá, remova a que começa com ENCERRADA. — apagar rotina só é possível por lá.

## O que os testes de 29/08 provaram

**Provado de ponta a ponta.** A segunda execução, com exceção de cadência autorizada pelo Fabiano, produziu e publicou a `zx-24-tudo-aberto-nada-pronto` sozinha: https://www.instagram.com/p/DcpJgQ7m1uj/ — 14/14 gates, 7 slides na família `poster-*`, conta verificada ao vivo e publicação reconciliada.

Antes disso, a primeira execução provou provisionamento, clone, `npm install` (1,4 s), `npx playwright install --with-deps chromium` (184 MB, ~27 s), leitura dos padrões e execução do porteiro. Ela **parou no bloqueio de cadência sem tentar contornar**, que era exatamente o comportamento desejado.

**O que o teste também mostrou sobre autonomia:** com poder de afrouxar a regra para facilitar a própria vida, o agente não afrouxou. A `politica-de-publicacao.json` não foi tocada, e a decisão registrada em `decisions/` diz por escrito que "trava que reprova não se contorna".

**Três defeitos encontrados pelos testes, todos já corrigidos:**

1. O `.gitignore` herdado ignorava `.claude/` inteiro, e o clone veio sem o comando. A verificação **A8** da auditoria passou a exigir comando versionado.
2. A documentação divergia do código na contagem de gates, e o comando prometia um **G15** que nunca foi implementado. A verificação **A3** passou a cobrar contagem e gate inexistente.
3. O porteiro contava o dia em UTC enquanto a política declara fuso local, o que liberava a cota do dia seguinte a partir das 21h em Fortaleza. Agora conta no fuso da marca.

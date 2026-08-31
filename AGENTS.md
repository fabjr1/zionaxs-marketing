# AGENTS.md

Guidelines for AI agents working in this repository.

> **Leia primeiro se o pedido for da Zionaxs.** Este repositório abriga duas coisas: o projeto herdado de Agent Skills (descrito a partir de "Repository Overview") e a **operação de marketing da Zionaxs**, que é o que segue abaixo. Um pedido do tipo "faça um carrossel para a Zionaxs" pertence à segunda.

## Regra zero: nada vive no contexto da sessão

Contexto de conversa é volátil. Ele acaba quando a sessão acaba, e o que ficou só nele está perdido para a próxima. **Toda decisão, padrão, correção e aprendizado precisa ter endereço permanente**, e o endereço é este repositório e a Zionaxs Memory. Nunca "eu lembro", nunca "a gente combinou".

Onde cada coisa mora:

| O que | Onde |
|---|---|
| Padrão visual, de copy, de trilha | `campanhas/zionaxs/` |
| Regra binária, que a máquina pode cobrar | um **gate** em `sistema/app/lib/` + teste |
| Decisão sobre uma peça (aprovar, reprovar, exceção) | `decisions/` da peça, com data e autor |
| O que foi publicado | `publication/published.json`, com digest e permalink |
| Conhecimento de marca que transcende o marketing-os | proposta na Inbox da **Zionaxs Memory**, para promoção humana |
| Ponteiro para tudo isso | este arquivo |

### Rotina obrigatória ao fim de qualquer trabalho substantivo

1. **Registrar o que foi decidido** no arquivo certo da tabela acima. Se o Fabiano aprovou, corrigiu ou vetou algo, isso vira texto em disco antes de a sessão terminar.
2. **Transformar em gate o que for binário.** Regra que a máquina consegue cobrar não deve depender de leitura: travessão virou G13, layout fora do padrão virou G14. Regra de julgamento (clareza, tom) fica em documento, porque máquina não mede isso.
3. **Rodar a auditoria** e só encerrar com ela verde:

```bash
cd sistema/app && npm run auditoria
```

Ela verifica que os padrões existem, que este arquivo os referencia, que todo gate está documentado, que nenhuma peça não publicada saiu do padrão, que toda publicação tem digest e permalink, que os códigos editoriais declarados existem nas notas canônicas, e lista o que aguarda promoção humana na Memory.

**Se a Memory não estiver no checkout, anexe e clone antes de trabalhar.** A rotina em nuvem sobe com 1 repositório só, e o `memoryRoot` do `sistema/workspace/config.json` aponta para `../../../zionaxs-memory`. A sessão consegue resolver isso sozinha, com `add_repo` e `git clone --depth 1`, e sem isso ela escreve o contrato às cegas: código editorial copiado da peça anterior já saiu errado 3 vezes (zx-25 na matriz, zx-20 a zx-24 herdando, zx-26 nos jobs). A verificação **A9** cobra os códigos declarados por peça não publicada contra as notas 19b e 19c, mas ela mede existência, não pertinência: escolher o job certo continua sendo leitura humana da nota.

4. **Commitar e empurrar.** Trabalho não commitado é trabalho que só existe nesta máquina.

### Autoprogramação

Quando um padrão novo aparecer, o reflexo correto não é anotar para lembrar: é **mudar o sistema para que a regra passe a ser cobrada sozinha**. Documento é a camada mais fraca, gate é a mais forte. Um padrão que depende de alguém lembrar já falhou.

## Operação de marketing da Zionaxs

Peça nenhuma é escrita à mão: tudo nasce de um **contrato** e é renderizado por um pipeline com gates medidos no pixel.

```bash
cd sistema/app && node bin/gen.js <piece-id> --root ../workspace
```

O comando valida o contrato, compila, renderiza em 1080×1350 e roda os **14 gates**. Gate vermelho significa corrigir o **contrato**, nunca o pixel. Aprovação e publicação são decisões humanas, registradas em arquivo e amarradas ao digest da geração.

### Comandos prontos

| Comando | O que faz |
|---|---|
| `/carrossel-zionaxs` | Cria **e publica** um carrossel da Zionaxs, do tema ao post no ar. Sem argumento, pesquisa e escolhe o tema. Definido em `.claude/commands/carrossel-zionaxs.md`. |
| `/reels-zionaxs` | Cria **e publica** um Reels da Zionaxs, do tema ao post no ar. Definido em `.claude/commands/reels-zionaxs.md`. |

O comando é do projeto, então a sessão precisa estar aberta na pasta deste repositório para enxergá-lo.

O sufixo é a marca. Cada marca nova ganha o seu, com os padrões e a conta daquela marca; as marcas vivem em `sistema/workspace/brands/<id>/manifest.json`.

**Os dois publicam sozinhos, e cada um com a sua condição.** O carrossel desde 29/08/2026, apoiado em 14 gates medidos no pixel. O vídeo desde 30/08/2026, e a promoção veio amarrada a uma condição: o contraste da tinta sobre o pixel da foto, que era revisão humana, virou medida em `sistema/video/bin/medir-contraste.mjs`, ligada ao porteiro. Sem humano no meio, trava que depende de olho vira medida ou desaparece. **Desligar essa medida derruba a autorização junto**, e isso está registrado em `sistema/video/decisions/autorizacao-publicacao-automatica-2026-08-30.yaml`.

Cada formato tem o seu porteiro, e os dois contam a **mesma** cadência:

| Formato | Porteiro |
|---|---|
| Carrossel | `cd sistema/app && node bin/pode-publicar.js <id>` |
| Vídeo | `cd sistema/video && npm run pode-publicar` |

A contagem do dia é compartilhada por `sistema/app/lib/cadencia.js`, que varre carrossel e vídeo. Antes disso cada porteiro contava só o seu formato, e um Reels publicado ficava invisível para o carrossel: a cota do dia voltava a zero por formato, o que é a mesma coisa que não ter cota.

### Padrões da marca, aprovados e permanentes

Os dois documentos abaixo mandam. Leia antes de produzir qualquer peça:

- **[campanhas/zionaxs/direcao-visual/README.md](campanhas/zionaxs/direcao-visual/README.md)** — o estilo pôster editorial, aprovado em 29/08/2026 como direção visual permanente. Traz a receita completa: os 3 campos, o chrome de prova de impressão, gradê, grão, tipografia e regra de rosto.
- **[campanhas/zionaxs/padrao-de-copy.md](campanhas/zionaxs/padrao-de-copy.md)** — o padrão de texto, válido para **todo** conteúdo da marca, não só carrossel: post, legenda, roteiro de vídeo, site, proposta e e-mail.

### Vídeo

O levantamento de ferramentas e a escolha estão em **[campanhas/zionaxs/ferramentas-de-video.md](campanhas/zionaxs/ferramentas-de-video.md)**, com as 4 camadas separadas e o que foi decidido em cada uma. A decisão de 29/08/2026 foi começar pela camada de motion, com Remotion, sem modelo generativo.

A camada vive em **[sistema/video/](sistema/video/README.md)**: o pôster editorial em movimento, no formato `story-9x16`. A peça **nasce de contrato** em `sistema/video/pecas/<id>/contract.json`, com batidas, `approved_visible_copy`, `alt`, legenda com fontes e trilha, e o porteiro cobra copy, arquivo, contraste e cadência. O README de lá traz as 6 regras de movimento e o que ainda falta.

### O que não se negocia

1. **Layouts `poster-*`.** Carrossel da Zionaxs usa a família `poster-cover`, `poster-scene`, `poster-lines`, `poster-turn`, `poster-fields`, `poster-statement`, `poster-close`. Os layouts antigos (`cover`, `statement`, `lines`, `fields`…) são vocabulário legado e produzem a aparência anterior à aprovação. O gate **G14** recusa a peça que os usar sem justificativa declarada.
2. **Copy didática.** Explicar, não apenas afirmar; apresentar quem for citado; trocar jargão de nicho por cena universal; CTA com o passo, não com o conceito.
3. **Números em algarismo.** "14 mensagens, 3 urgências", nunca por extenso.
4. **Sem travessão (— –) e sem "num/numa".** O gate **G13** recusa automaticamente, no contrato e no pixel.
5. **A foto é parte do gancho.** Escolher a imagem junto com a manchete, encenando a cena concreta que a frase descreve. Rosto só em silhueta, contraluz ou dissolvido na luz.
6. **Logo oficial** vive em `sistema/workspace/brand/logo/`; o renderer escolhe a variante pelo campo do slide. Com logo instalada, a wordmark em texto **não** entra na copy aprovada.
7. **Trilha** em toda peça, e a origem importa mais que o gosto: **Meta Sound Collection, banco licenciado ou música original**. Nunca o catálogo popular do app, cuja licença é de uso pessoal e não vale para marca, mesmo aparecendo disponível na hora de postar. Carrossel recebe a música pelo app depois de publicado (`trilha_sugerida`); **vídeo por API precisa da trilha embutida no arquivo** (`trilha_embutida`, com `licenca`), porque Reels publicado por API não aceita adicionar áudio depois. Corrigido em 30/08/2026, ver `campanhas/zionaxs/padrao-de-copy.md`.
8. **Cadência**: o limite vive em `sistema/workspace/brands/<marca>/politica-de-publicacao.json` e é o que o porteiro cobra. Nunca mude o número no código: mudar cadência é decisão de governança, registrada em `decisions/` da campanha e proposta na Zionaxs Memory. Exceção pontual exige autorização humana no momento.

### Peça publicada é registro histórico

Contrato de peça já publicada **não se reescreve**, mesmo que hoje viole um padrão novo. Falsificá-lo apagaria o que de fato foi ao ar. A `zx-21` está nessa situação: publicada antes do padrão de copy, e por isso não regera sem antes ser trazida ao padrão.


## Repository Overview

This repository contains **Agent Skills** for AI agents following the [Agent Skills specification](https://agentskills.io/specification.md). Skills install to `.agents/skills/` (the cross-agent standard). This repo also serves as a **Claude Code plugin marketplace** via `.claude-plugin/marketplace.json`.

- **Name**: Marketing Skills
- **GitHub**: [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills)
- **Creator**: Corey Haines
- **License**: MIT

## Repository Structure

```
marketingskills/
├── .claude-plugin/
│   └── marketplace.json   # Claude Code plugin marketplace manifest
├── skills/                # Agent Skills
│   └── skill-name/
│       └── SKILL.md       # Required skill file
├── tools/
│   ├── clis/              # Zero-dependency Node.js CLI tools (51 tools)
│   ├── composio/          # Composio integration layer (quick start + toolkit mapping)
│   ├── integrations/      # API integration guides per tool
│   └── REGISTRY.md        # Tool index with capabilities
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

## Build / Lint / Test Commands

**Skills** are content-only (no build step). Verify manually:
- YAML frontmatter is valid
- `name` field matches directory name exactly
- `name` is 1-64 chars, lowercase alphanumeric and hyphens only
- `description` is 1-1024 characters

**CLI tools** (`tools/clis/*.js`) are zero-dependency Node.js scripts (Node 18+). Verify with:
```bash
node --check tools/clis/<name>.js   # Syntax check
node tools/clis/<name>.js           # Show usage (no args = help)
node tools/clis/<name>.js <cmd> --dry-run  # Preview request without sending
```

## Versioning

Two version layers, with different rules:

**Repo release version** — `.claude-plugin/plugin.json` `version`, `.claude-plugin/marketplace.json` `metadata.version`, and the `VERSIONS.md` changelog headings all share one x.y.z number:

- **x** — repo-wide changes (restructures, spec changes, breaking changes)
- **y** — new skill(s) added
- **z** — updates to existing skills

Do not bump y for content added to an existing skill, no matter how substantial — that's a z release (e.g. a new reference file in ad-creative is 2.8.0 → 2.8.1, not 2.9.0).

**Per-skill version** — `metadata.version` in each SKILL.md, mirrored in the `VERSIONS.md` table. Bump on ANY shipped change to that skill: the update check compares `VERSIONS.md` against users' local skill metadata, so an unbumped change is invisible to installed users. Minor for new capability or description triggers, patch for fixes and clarifications.

Bump the repo release version in the same PR that ships the change (2.7.0 and 2.8.0 shipped without touching plugin.json/marketplace.json and needed a catch-up later).

## Agent Skills Specification

Skills follow the [Agent Skills spec](https://agentskills.io/specification.md).

### Required Frontmatter

```yaml
---
name: skill-name
description: What this skill does and when to use it. Include trigger phrases.
---
```

### Frontmatter Field Constraints

| Field         | Required | Constraints                                                      |
|---------------|----------|------------------------------------------------------------------|
| `name`        | Yes      | 1-64 chars, lowercase `a-z`, numbers, hyphens. Must match dir.   |
| `description` | Yes      | 1-1024 chars. Describe what it does and when to use it.          |
| `license`     | No       | License name (default: MIT)                                      |
| `metadata`    | No       | Key-value pairs (author, version, etc.)                          |

### Name Field Rules

- Lowercase letters, numbers, and hyphens only
- Cannot start or end with hyphen
- No consecutive hyphens (`--`)
- Must match parent directory name exactly

**Valid**: `cro`, `emails`, `ab-testing`
**Invalid**: `Page-CRO`, `-page`, `page--cro`

### Optional Skill Directories

```
skills/skill-name/
├── SKILL.md        # Required - main instructions (<500 lines)
├── references/     # Optional - detailed docs loaded on demand
├── scripts/        # Optional - executable code
└── assets/         # Optional - templates, data files
```

## Writing Style Guidelines

### Structure

- Keep `SKILL.md` under 500 lines (move details to `references/`)
- Use H2 (`##`) for main sections, H3 (`###`) for subsections
- Use bullet points and numbered lists liberally
- Short paragraphs (2-4 sentences max)

### Tone

- Direct and instructional
- Second person ("You are a conversion rate optimization expert")
- Professional but approachable

### Formatting

- Bold (`**text**`) for key terms
- Code blocks for examples and templates
- Tables for reference data
- No excessive emojis

### Clarity Principles

- Clarity over cleverness
- Specific over vague
- Active voice over passive
- One idea per section

### Description Field Best Practices

The `description` is critical for skill discovery. Include:
1. What the skill does
2. When to use it (trigger phrases)
3. Related skills for scope boundaries

```yaml
description: When the user wants to optimize conversions on any marketing page. Use when the user says "CRO," "conversion rate optimization," "this page isn't converting." For signup flows, see signup.
```

## Claude Code Plugin

This repo also serves as a plugin marketplace. The manifest at `.claude-plugin/marketplace.json` lists all skills for installation via:

```bash
/plugin marketplace add coreyhaines31/marketingskills
/plugin install marketing-skills
```

See [Claude Code plugins documentation](https://code.claude.com/docs/en/plugins.md) for details.

## Git Workflow

### Branch Naming

- New skills: `feature/skill-name`
- Improvements: `fix/skill-name-description`
- Documentation: `docs/description`

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat: add skill-name skill`
- `fix: improve clarity in cro`
- `docs: update README`

### Pull Request Checklist

- [ ] `name` matches directory name exactly
- [ ] `name` follows naming rules (lowercase, hyphens, no `--`)
- [ ] `description` is 1-1024 chars with trigger phrases
- [ ] `SKILL.md` is under 500 lines
- [ ] No sensitive data or credentials

## Tool Integrations

This repository includes a tools registry for agent-compatible marketing tools.

- **Tool discovery**: Read `tools/REGISTRY.md` to see available tools and their capabilities
- **Integration details**: See `tools/integrations/{tool}.md` for API endpoints, auth, and common operations
- **MCP-enabled tools**: ga4, stripe, mailchimp, google-ads, resend, zapier, zoominfo, clay, supermetrics, coupler, outreach, crossbeam, introw, composio
- **Composio** (integration layer): Adds MCP access to OAuth-heavy tools without native MCP servers (HubSpot, Salesforce, Meta Ads, LinkedIn Ads, Google Sheets, Slack, etc.). See `tools/integrations/composio.md`

### Registry Structure

```
tools/
├── REGISTRY.md              # Index of all tools with capabilities
└── integrations/            # Detailed integration guides
    ├── ga4.md
    ├── stripe.md
    ├── rewardful.md
    └── ...
```

### When to Use Tools

Skills reference relevant tools for implementation. For example:
- `referrals` skill → rewardful, tolt, dub-co, mention-me guides
- `analytics` skill → ga4, mixpanel, segment guides
- `emails` skill → customer-io, mailchimp, resend guides
- `ads` skill → google-ads, meta-ads, linkedin-ads guides

For tools without native MCP servers (HubSpot, Salesforce, Meta Ads, LinkedIn Ads, Google Sheets, Slack, Notion), Composio provides MCP access via a single server. See `tools/integrations/composio.md` for setup and `tools/composio/marketing-tools.md` for the full toolkit mapping.

## Checking for Updates

When using any skill from this repository:

1. **Once per session**, on first skill use, check for updates:
   - Fetch `VERSIONS.md` from GitHub: https://raw.githubusercontent.com/coreyhaines31/marketingskills/main/VERSIONS.md
   - Compare versions against local skill files

2. **Only prompt if meaningful**:
   - 2 or more skills have updates, OR
   - Any skill has a major version bump (e.g., 1.x to 2.x)

3. **Non-blocking notification** at end of response:
   ```
   ---
   Skills update available: X marketing skills have updates.
   Say "update skills" to update automatically, or run `git pull` in your marketingskills folder.
   ```

4. **If user says "update skills"**:
   - Run `git pull` in the marketingskills directory
   - Confirm what was updated

## Skill Categories

See `README.md` for the current list of skills organized by category. When adding new skills, follow the naming patterns of existing skills in that category.

## Claude Code-Specific Enhancements

These patterns are **Claude Code only** and must not be added to `SKILL.md` files directly, as skills are designed to be cross-agent compatible (Codex, Cursor, Windsurf, etc.). Apply them locally in your own project's `.claude/skills/` overrides instead.

### Dynamic content injection with `!`command``

Claude Code supports embedding shell commands in SKILL.md using `` !`command` `` syntax. When the skill is invoked, Claude Code runs the command and injects the output inline — the model sees the result, not the instruction.

**Most useful application: auto-inject the product marketing context file**

Instead of every skill telling the agent "go check if `.agents/product-marketing.md` exists and read it," you can inject it automatically:

```markdown
Product context: !`cat .agents/product-marketing.md 2>/dev/null || echo "No product context file found — ask the user about their product before proceeding."`
```

Place this at the top of a skill's body (after frontmatter) to make context available immediately without any file-reading step.

**Other useful injections:**

```markdown
# Inject today's date for recency-sensitive skills
Today's date: !`date +%Y-%m-%d`

# Inject current git branch (useful for workflow skills)
Current branch: !`git branch --show-current 2>/dev/null`

# Inject recent commits for context
Recent commits: !`git log --oneline -5 2>/dev/null`
```

**Why this is Claude Code-only**: Other agents that load skills will see the literal `` !`command` `` string rather than executing it, which would appear as garbled instructions. Keep cross-agent skill files free of this syntax.

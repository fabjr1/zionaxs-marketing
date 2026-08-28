---
name: marketing-os
description: "When the user wants to run marketing as a system rather than as isolated tasks — sequencing the other skills into one workflow with state, gates, and a resume point. Use when the user says 'marketing OS,' 'marketing operating system,' 'my marketing workflow,' 'where do I start,' 'what should I do next,' 'set up my marketing system,' 'run the whole campaign,' 'from scratch to published,' 'orchestrate the skills,' 'which skill do I use now,' 'brief this campaign,' 'what is this campaign for,' or asks for an end-to-end process instead of a single deliverable. Also use when a campaign needs a purpose before production, or when human feedback should become reusable knowledge instead of an ad-hoc rule. For the recurring always-on layer, see marketing-loops. For the strategy document itself, see marketing-plan. For the foundational context file, see product-marketing."
metadata:
  version: 1.1.0
---

# Marketing OS

You orchestrate the other marketing skills into one sequenced workflow. This skill produces **no marketing deliverable of its own**. It decides which skill runs next, holds the state between sessions, and refuses to let work start on a stage whose upstream gate has not been met.

The repo already contains the method for every individual job. What it does not contain is the order. That is this skill.

## Core principle

**Every skill here assumes an input that some earlier skill produces.** All 50 skills read `.agents/product-marketing.md` before asking questions. `marketing-plan` assumes research exists. `copywriting` assumes an offer and an audience exist. `ab-testing` assumes traffic exists.

Running a skill whose input is missing does not fail loudly. It produces confident, plausible, ungrounded output. That is the failure this skill exists to prevent.

## Before Starting

**1. Identify the brand.** If more than one brand is in play and the request does not name one, ask. Do not consult or produce under an assumed brand.

**2. Load canonical brand context, selectively.** If the setup declares a **brand memory** — a governed, versioned knowledge base with a manifest naming which notes carry positioning, audience, language, proof, and design — read only the notes the request needs, and record for each: path, version, and date consulted.

Load only what the task requires. Loading the whole tree is not thoroughness; it lets a historical rule override a current one.

**3. Fall back deliberately.** With no brand memory, `.agents/product-marketing.md` (or `.claude/product-marketing.md`, or the legacy `product-marketing-context.md`) is the context. Where both exist, the canonical memory governs and `product-marketing.md` is a projection of it, not a competing source.

**4. Never fill a gap by inference.** A missing reference, a note that contradicts another canonical note, or an unreachable memory is a **gap**: it becomes a question in the Brief, a recorded pending decision, or a marked hypothesis. It never becomes an implied fact.

Then read the state file at `.agents/marketing-os/state.md`. If it does not exist, you are at Stage 0.

## How to Use This Skill

1. **Read the state file.** It names the current stage and what is unfinished.
2. **Find the earliest unmet gate**, not the stage the user asked about. See `references/stage-gates.md`.
3. **If the user asked for a downstream stage**, say what is missing upstream and what it costs to skip. Then let them decide. Do not silently refuse and do not silently comply.
4. **Route to the owning skill** and hand off. This skill does not do the work.
5. **On return, write the artifact path and the gate result to the state file.** A stage is not complete because it was attempted.

## The Campaign Brief

A campaign starts as a conversation about purpose, not as a piece. Before production, agree on:

**Brand · Purpose · Objective · Audience · Offer and desired action · Channels · Primary metric · Supporting metrics · Deadline, budget and constraints · Evidence and claim limits · Approval and closing criteria.**

**Ask only what the memory and the request did not already answer.** Pre-filling from canonical context is the point of loading it; re-asking what the brand already documented wastes the user's attention and invites a contradictory answer.

**Purpose selects the fronts, and there is no mandatory funnel.** A sales campaign needs an offer; an audience campaign does not, and demanding one blocks work for no reason. The smallest set of fronts that serves the objective beats a funnel built from habit — and a front deliberately left out is recorded with its reason, because deliberate absence is information and forgotten absence is a defect.

The fronts: **content and attention · distribution · conversion · revenue · continuity.** Each selected front carries its own objective, owning skills, assets, dependencies, gates, and metric. A front nobody measures cannot be judged later.

**Brief approval gates the plan.** Changing purpose, objective, audience, offer, desired action, or primary metric after approval revokes the approval and invalidates the plan that depended on it.

## Closing the cycle: feedback becomes a proposal

Human feedback is the input to knowledge, not knowledge itself. When the user reacts to what was produced:

**1. Classify it.** Preference · execution failure · hypothesis · measured result. These carry different evidential weight and **must not be merged** — "I don't like the blue" and "the gate failed" and "it converted 3× better" cannot support the same claim.

**2. Draft a proposal, not a rule.** It needs origin, observation, interpretation, **scope of applicability**, evidence, the proposed rule, and **the condition that would invalidate it**. A learning with no death condition is dogma.

**3. Keep the scope no wider than the evidence.** A preference can become a convention inside a declared situation. It cannot become a general rule. If the only evidence is preference or hypothesis, the situation must be named.

**4. File it as non-canonical.** The proposal goes to the memory's inbox — or, with no brand memory, to a clearly-marked proposals file. It is not consulted as fact while it sits there.

**5. Promotion is the user's act.** Ask. Record what they decided and where the knowledge landed. Never promote on your own, and never carry secrets, credentials, or disposable output into durable memory.

**6. Reuse only where scope matches.** A promoted learning applies to another campaign only when brand, audience, format, and situation are compatible. Contradictory feedback is preserved and escalated, never silently overwritten.

## The nine stages

Each stage names its owning skill, the artifact it must produce, and where that artifact lives. Full detail in `references/workflow-map.md`.

| # | Stage | Owning skill | Artifact |
|---|-------|--------------|----------|
| 0 | Foundation | `product-marketing` | `.agents/product-marketing.md` |
| 1 | Evidence | `customer-research`, `competitor-profiling` | research notes with verbatim language |
| 2 | Strategy | `marketing-plan` | `~/marketing-plans/{slug}/final_plan.md` |
| 3 | Offer | `offers`, `pricing` | the six offer components |
| 4 | Editorial | `content-strategy` | topic calendar with audience per topic |
| 5 | Production | `copywriting` + the channel skill | the piece |
| 6 | Review | `copy-editing` | the piece, gated |
| 7 | Distribution | the channel skill | published |
| 8 | Measurement | `analytics`, `attribution`, `ab-testing` | a reading with a denominator |
| 9 | Operation | `marketing-loops` | loops running on cadence |

Stages 4 through 8 repeat per cycle. Stages 0 through 3 are done once and revisited, not rerun.

## Cross-cutting skills

Four skills are not stages. They are consulted **inside** stages, which is why they are the most referenced in the repo:

| Skill | Referenced by | Enters at |
|-------|--------------:|-----------|
| `cro` | 22 skills | any stage with a page or form |
| `copywriting` | 20 skills | any stage that produces words |
| `ab-testing` | 18 skills | any claim worth testing rather than asserting |
| `marketing-psychology` | 9 skills | any stage choosing a mechanism of persuasion |

Do not schedule these as steps. Reach for them when the work inside a stage calls for them.

## The routing rule

When the user asks for a piece of work, resolve in this order:

```text
1. Is .agents/product-marketing.md present and filled?     → no: Stage 0, always
2. Does the request depend on a gate not yet met?           → yes: name the gap, offer the choice
3. Is there an open cycle in the state file?                → yes: resume it before starting another
4. Otherwise                                                → route to the owning skill
```

**Rule 3 matters more than it looks.** Two open cycles means two half-finished campaigns and no learning from either. Finish or explicitly abandon before starting.

## Choosing the channel at Stage 5

Stage 5 is the only stage with a real branch. The channel decides which skill produces the piece.

| Channel | Skill | Pair with |
|---------|-------|-----------|
| Paid ads | `ad-creative` | `ads` for the account structure |
| Organic social | `social` | `image` or `video` for assets |
| Email | `emails` | `lead-magnets` when capture is the goal |
| SMS | `sms` | `emails` for lifecycle consistency |
| Landing page | `copywriting` | `cro` and `signup` |
| SEO article | `content-strategy` | `ai-seo`, `schema`, `seo-audit` |
| Outbound | `cold-email` | `prospecting` for the list |
| Launch moment | `launch` | `public-relations`, `co-marketing` |

If the channel is not decided yet, that is a Stage 2 question, not a Stage 5 one. Send it back.

## The state file

Written to `.agents/marketing-os/state.md`, project-local so it travels with the repo and sits beside the context file every skill already reads.

```markdown
# Marketing OS — {brand}

stage: 5
cycle: 2026-Q3-c1
open_since: 2026-08-25

## Gates met
- [x] 0 foundation   → .agents/product-marketing.md
- [x] 1 evidence     → research/customer-interviews.md
- [x] 2 strategy     → ~/marketing-plans/acme/final_plan.md
- [x] 3 offer        → offers/diagnostic-v1.md
- [x] 4 editorial    → content/calendar-q3.md
- [ ] 5 production   → 3 of 8 pieces drafted
- [ ] 6 review
- [ ] 7 distribution
- [ ] 8 measurement

## Open decisions
- price of the diagnostic offer — blocks stage 3 sign-off

## Last learning
2026-08-20 · hook naming the process beat hook naming the tool, directional only, sample too small
```

Schema and resumption rules in `references/state-schema.md`. The format deliberately mirrors the `progress.md` pattern that `marketing-plan` already uses, so there is one idiom for resumable work in this repo, not two.

## Gates, in one line each

A stage is complete only when its gate is objectively true. Full criteria in `references/stage-gates.md`.

| Stage | Gate |
|-------|------|
| 0 | Every section of the context file is filled, including verbatim customer language |
| 1 | At least one pain is confirmed by a source outside your own opinion |
| 2 | The plan names what you will **not** do this cycle |
| 3 | The offer has all six components, and the value equation is scored |
| 4 | Every topic names one primary audience and one job |
| 5 | Every claim in the piece has a source, or is marked as opinion |
| 6 | The approval checklist in `copywriting` passes |
| 7 | The piece is live and the link is recorded |
| 8 | Every metric has a formula, a source, an owner, and a frequency |
| 9 | Stage 0 of the loop rollout is running and someone acts on its output |

**Gate 8 is where most systems break.** A metric without a denominator is a number, not a measurement, and the next cycle inherits a lie.

## Handoff to marketing-loops

Stage 9 is not the end of the sequence. It is the sequence becoming continuous.

`marketing-loops` defines the four-layer system — sensing, diagnostic, action, learning — and a six-stage rollout that starts with tracking QA and the weekly review. **Do not enter Stage 9 before Stage 8's gate is met.** Loops read from analytics; loops on broken tracking act on lies, at a cadence.

Read `marketing-loops/references/loop-orchestration.md` before adopting the first loop.

## What this skill does not do

- **It does not produce marketing work.** It routes. If you find yourself writing copy here, you are in the wrong skill.
- **It does not replace any skill's own method.** Each owning skill governs how its stage is executed.
- **It does not add a stage that no skill owns.** If a stage has no owner in this repo, the honest output is that the repo does not cover it.
- **It does not enforce.** It names the gap and lets the user decide, then records the decision.
- **It does not promote knowledge.** It proposes; the user promotes. A proposal sitting in the inbox is not a rule, however convincing it reads.
- **It does not modify itself.** Learning here means proposing versioned knowledge for approval — never editing skills, code, or its own instructions from feedback.

## Common failure modes

- **Starting at Stage 5** because producing a piece feels like progress. The piece will be fluent and unmoored.
- **Skipping Stage 1** because the founder already knows the customer. Verbatim language is not the same as recalled language.
- **Treating Stage 2 as a document** rather than as the decision about what not to do.
- **Running Stage 8 without Gate 8.** Measurement theatre is worse than no measurement, because it is trusted.
- **Two open cycles.** Neither produces a learning.
- **Producing before the Brief.** Objective, audience, and desired action get assumed, and the assumption is invisible in fluent output.
- **Building the whole funnel** because a campaign "should" have one. Purpose selects the fronts.
- **Turning one comment into a rule.** A preference generalized past its situation repeats a bad decision on an audience that never asked for it.

## Related Skills

- **product-marketing** — Stage 0. The file every other skill reads first.
- **marketing-plan** — Stage 2. Has its own three-phase state machine; this skill defers to it entirely.
- **marketing-loops** — Stage 9. The always-on layer and the system view of how loops compose.
- **marketing-council** — not a stage. Convene when a stage gate is contested and you need conflicting expert lenses.
- **cro**, **copywriting**, **ab-testing**, **marketing-psychology** — cross-cutting, consulted inside stages.

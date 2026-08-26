# The Workflow Map

The full chain, stage by stage. Every skill named here exists in this repo. Where the repo does not cover something, this file says so instead of inventing a step.

## How this map was derived

Not from opinion. From three properties of the repo itself:

1. **All 50 skills read `.agents/product-marketing.md`** before asking questions. That makes `product-marketing` the only true root.
2. **The `Related Skills` sections form a directed graph.** Counting inbound references gives the hubs: `cro` (22), `copywriting` (20), `ab-testing` (18), `emails` (17). High in-degree means cross-cutting, not late-stage.
3. **Two skills already carry workflow shape.** `marketing-plan` has a three-phase state machine with a progress file. `marketing-loops` has a four-layer system view and a six-stage rollout. This map connects them; it does not replace either.

---

## Stage 0 — Foundation

| | |
|---|---|
| **Owns** | `product-marketing` |
| **Produces** | `.agents/product-marketing.md` |
| **Consumed by** | all 50 skills |
| **Gate** | every section filled, including verbatim customer language |

The skill offers to auto-draft V1 from the codebase — README, landing pages, marketing copy, package.json. Take that offer. Correcting a draft is faster than answering a blank interview, and the draft surfaces what the product actually says about itself versus what you think it says.

**Revisit, do not rerun.** The skill versions the document and keeps a changelog. Bump the version on any substantive save.

---

## Stage 1 — Evidence

| | |
|---|---|
| **Owns** | `customer-research`, `competitor-profiling` |
| **Produces** | research notes with verbatim language and named sources |
| **Consumed by** | Stages 2, 3, 4, 5 |
| **Gate** | at least one pain confirmed by a source outside your own opinion |

`customer-research` is the wider net: interviews, reviews, support tickets, sales calls. `competitor-profiling` is the narrower one: what the alternatives actually do, from their URLs.

Both feed the same thing, and it is the reason this stage cannot be skipped: **the words your audience uses.** Every downstream copy decision either uses their vocabulary or your paraphrase of it, and paraphrase is what makes copy sound like every other vendor.

Skip this stage and Stage 5 will still produce a piece. It will just be a piece about a customer you imagined.

---

## Stage 2 — Strategy

| | |
|---|---|
| **Owns** | `marketing-plan` |
| **Produces** | `~/marketing-plans/{slug}/final_plan.md` |
| **Gate** | the plan names what you will **not** do this cycle |

This skill has its own three-phase machine — INIT, REVIEW, FINALIZE — its own progress file, and its own resumption rules. **Defer to it completely.** Do not wrap it, do not re-sequence it, do not duplicate its state.

It structures on AARRR, which forces the useful question: which funnel stage is the binding constraint right now. A plan that spreads evenly across all five stages usually means the diagnostic was weak.

**Support skills at this stage:** `offers` and `pricing` if monetization is the constraint, `competitors` if positioning is, `marketing-ideas` if the plan needs a candidate list to choose from.

---

## Stage 3 — Offer

| | |
|---|---|
| **Owns** | `offers`, `pricing` |
| **Produces** | the six offer components, with the value equation scored |
| **Gate** | all six present, and the binding lever named |

`offers` covers construction: core deliverable, bonus, guarantee, scarcity, name, price and payment structure. `pricing` covers level, tiers and packaging.

The division: if you sell a service, a diagnostic, a sprint or anything with a sales conversation, `offers` does the heavier lifting. If you sell self-serve subscriptions, `pricing` does.

**Score the value equation before touching price.** Most requests to lower price are requests to raise the numerator or lower the denominator. The skill's own diagnostic loop names which of the four levers is binding, and it is rarely the one people assume.

---

## Stage 4 — Editorial

| | |
|---|---|
| **Owns** | `content-strategy` |
| **Produces** | a topic calendar where each topic names one audience and one job |
| **Gate** | no topic without a named primary audience |

This is where a plan becomes a queue. The failure mode is a calendar of themes rather than a calendar of decisions the reader needs to make.

**Support skills:** `ai-seo`, `programmatic-seo`, `site-architecture` and `schema` when the surface is search. `social` when the surface is a feed. `emails` when it is a lifecycle.

---

## Stage 5 — Production

| | |
|---|---|
| **Owns** | `copywriting` plus the channel skill |
| **Produces** | the piece |
| **Gate** | every claim has a source, or is explicitly marked as opinion |

The only stage with a real branch. `copywriting` always participates because every channel produces words; the channel skill decides form.

| Channel | Skill | Pair with |
|---------|-------|-----------|
| Paid ads | `ad-creative` | `ads` |
| Organic social | `social` | `image`, `video` |
| Email | `emails` | `lead-magnets` |
| SMS | `sms` | `emails` |
| Landing page | `copywriting` | `cro`, `signup` |
| SEO article | `content-strategy` | `ai-seo`, `schema` |
| Outbound | `cold-email` | `prospecting` |
| Launch | `launch` | `public-relations`, `co-marketing` |
| App store | `aso` | `image` |

`ad-creative` carries the hook system, which is the sharpest tool in the repo for this stage: a hook is three simultaneous components — visual action, spoken line, caption — that must complement rather than repeat. It applies well beyond paid.

---

## Stage 6 — Review

| | |
|---|---|
| **Owns** | `copy-editing` |
| **Produces** | the piece, gated |
| **Gate** | the approval checklist in `copywriting` passes |

A separate stage from production on purpose. The person who wrote it cannot see it.

`copy-editing` runs the passes: cut, verb, concreteness, rhythm, honesty, read-aloud. The honesty pass is the one that matters most and gets skipped most: check each claim against its status — fact, inference, or hypothesis — and mark the ones that are not facts.

---

## Stage 7 — Distribution

| | |
|---|---|
| **Owns** | the channel skill from Stage 5 |
| **Produces** | a live piece and a recorded link |
| **Gate** | the link resolves and is recorded somewhere durable |

The repo covers channel mechanics inside each channel skill. It does **not** cover publishing infrastructure — schedulers, API integrations, approval routing. For tool-level integration see `tools/REGISTRY.md` and `tools/integrations/{tool}.md`.

If your publishing route is manual, that is a legitimate answer at this stage. Record it as manual rather than pretending it is automated.

---

## Stage 8 — Measurement

| | |
|---|---|
| **Owns** | `analytics`, `attribution`, `ab-testing` |
| **Produces** | a reading with denominators |
| **Gate** | every metric has a formula, a source, an owner and a frequency |

Three different jobs, often collapsed into one and thereby ruined:

- `analytics` — is the tracking correct and does the number mean what you think
- `attribution` — which action actually drove the outcome
- `ab-testing` — is the difference real or is it noise

**Run `ab-testing`'s sample size check before calling anything a result.** The skill's table is blunt: at a 5% baseline, detecting a 20% lift needs roughly 7,000 observations per variant. Most accounts cannot reach significance in a single cycle, and the honest output is a directional reading labelled as such.

---

## Stage 9 — Operation

| | |
|---|---|
| **Owns** | `marketing-loops` |
| **Produces** | loops running on cadence |
| **Gate** | rollout Stage 0 is live and someone acts on its output |

The sequence becomes continuous here. `marketing-loops` supplies the four-layer system view, a catalog of 43 loops, a nine-part anatomy every loop must fill, and guardrails with a two-tier action model.

**Its rollout order is not optional and not mine to restate:** read `marketing-loops/references/loop-orchestration.md`. The short version is that tracking QA and the weekly review come before everything, and acquisition loops before retention loops is pouring water into a leaky bucket.

---

## What this repo does not cover

Naming it is more useful than routing around it:

- **Publishing infrastructure.** Schedulers, queues, approval routing, callback reconciliation. Channel mechanics yes; the plumbing no.
- **Brand identity.** Visual system, logo, tone document. `copywriting` covers voice within a piece, not a brand voice artifact.
- **Legal and compliance review.** `ads` and `emails` flag disclosure rules; neither substitutes for review.
- **Budget and finance beyond acquisition math.** `ads` covers payback and breakeven CPL. It does not cover P&L.
- **Sales execution after handoff.** `revops` and `sales-enablement` reach the handoff. What happens in the deal is out of scope.

When a request lands in one of these, say the repo does not cover it rather than improvising a stage.

# Stage Gates

A gate is not a checklist you feel good about. It is a condition that is objectively true or objectively not.

The rule this file exists to enforce: **a stage is not complete because it was attempted.** Most marketing systems fail by treating "we did the research" as equivalent to "the research produced a confirmed pain."

## How to apply a gate

For each gate below, the question is answerable by pointing at an artifact. If answering requires an opinion about whether enough was done, the gate is not met.

When a gate fails, you have three honest moves and no fourth:

1. **Go back** and meet it.
2. **Proceed with the gap named**, recorded in the state file as an accepted risk.
3. **Declare the stage out of scope** for this cycle.

Silently proceeding is not on the list.

---

## Gate 0 — Foundation

**Met when:** `.agents/product-marketing.md` exists and every section has content, including verbatim customer language.

- [ ] Product overview, category and one-line description
- [ ] ICP defined by observable characteristics, not demographics
- [ ] At least three verbatim customer phrases, quoted as spoken
- [ ] Positioning against the real alternative, including "do nothing"
- [ ] Document version and changelog entry

**Fails when:** the ICP is a persona sketch rather than a set of signals you could filter a list by. "Marketing managers at mid-size SaaS" is not a gate pass. "Companies where the same data is typed into two systems" is.

---

## Gate 1 — Evidence

**Met when:** at least one pain is confirmed by a source outside your own opinion, with the source named.

- [ ] Source identified: interview, review, support ticket, sales call, published research
- [ ] The pain is stated in the audience's words, not yours
- [ ] At least one competitor's actual positioning documented from their own material
- [ ] What you could not find is written down as a gap, not left blank

**Fails when:** every claim traces back to the founder's intuition. Intuition is a hypothesis generator, and hypotheses are legitimate. They just cannot be published as facts.

---

## Gate 2 — Strategy

**Met when:** the plan names what you will **not** do this cycle.

- [ ] `marketing-plan` reached FINALIZE, not just REVIEW
- [ ] The binding AARRR constraint is named and argued
- [ ] An explicit not-doing list exists
- [ ] Budget, or an explicit statement that there is none

**Fails when:** the plan is a list of everything that could help. A plan that spreads evenly across all five AARRR stages usually means the diagnostic was weak. Re-examine the funnel state before accepting it.

---

## Gate 3 — Offer

**Met when:** all six components exist and the value equation is scored.

- [ ] Core deliverable, bonus, guarantee, scarcity, name, price and payment structure
- [ ] All four value-equation levers scored 1 to 10
- [ ] The binding lever named
- [ ] Scarcity is real: capacity, cohort or a genuine seasonal window

**Fails when:** scarcity is a countdown timer, or the guarantee promises an outcome you do not control. Guarantee the deliverable and the timeline, never the business result.

---

## Gate 4 — Editorial

**Met when:** no topic on the calendar lacks a named primary audience.

- [ ] One primary audience per topic. Two primaries means two pieces.
- [ ] One job per topic: the decision the reader makes differently after reading
- [ ] Channel assigned per topic
- [ ] Cadence matched to what you can sustain, not what you aspire to

**Fails when:** the calendar lists themes. "AI in accounting" is a theme. "What to calculate before repricing a client" is a topic.

---

## Gate 5 — Production

**Met when:** every claim in the piece has a source, or is explicitly marked as opinion.

- [ ] Every number carries its denominator and date
- [ ] Every source is nameable, and named where the reader needs it to judge
- [ ] Inferences are marked as inference in the language itself
- [ ] One idea per unit
- [ ] A single call to action, proportional to what the piece delivered

**Fails when:** a statistic appears without its sample. A number without a denominator is decoration, and the reader who checks will not come back.

---

## Gate 6 — Review

**Met when:** the approval checklist in `copywriting` passes, run by someone who did not write it.

- [ ] The opening promise is paid by the body
- [ ] A mechanism is present, not only an assertion of results
- [ ] The strongest objection is anticipated
- [ ] Abstract categories replaced by instances
- [ ] Read aloud without stumbling

**Fails when:** the writer reviews their own work in the same session. Separation in time or in person is the point of the stage.

---

## Gate 7 — Distribution

**Met when:** the piece is live and the link is recorded somewhere durable.

- [ ] The link resolves
- [ ] Where it was published, when, and by whom is recorded
- [ ] If the route is manual, that is recorded as manual

**Fails when:** an acknowledgement is treated as a confirmation. A webhook returning 200 means the request was received. It does not mean the thing was published. Confirm against the artifact itself.

---

## Gate 8 — Measurement

**Met when:** every metric has a formula, a source, an owner and a frequency.

- [ ] Formula written out, including the denominator
- [ ] Source system named
- [ ] One owner per metric
- [ ] Review frequency set
- [ ] The action that follows a bad reading is defined in advance

**Fails when:** three systems report three numbers for the same concept and nobody has decided which is canonical. Fix the definition before fixing the number.

**Also fails when:** a difference is called a result without a sample-size check. Run the check in `ab-testing`. If the account cannot reach significance in the cycle, the honest output is a directional reading, labelled as directional.

---

## Gate 9 — Operation

**Met when:** rollout Stage 0 from `marketing-loops` is running and someone acts on its output.

- [ ] Tracking QA loop running
- [ ] Weekly review loop running
- [ ] Both have a stop condition and state handling
- [ ] Someone has acted on the output at least once

**Fails when:** loops are scheduled but nobody reads them. A loop whose output nobody acts on is worse than no loop, because it manufactures the feeling of a working system.

---

## The two gates that carry the rest

If you enforce only two, enforce these:

**Gate 1**, because everything downstream inherits its language. A campaign built on imagined customer words is fluent and wrong, and nothing later in the chain catches it.

**Gate 8**, because everything upstream is judged by it. Measurement without denominators does not merely fail to inform. It actively misinforms, and the next cycle inherits the error with confidence attached.

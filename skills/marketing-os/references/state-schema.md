# State Schema

Where the workflow remembers what it already did, so a session that ends mid-cycle can resume instead of restarting.

## Location

```text
.agents/marketing-os/state.md
```

**Project-local, not home-directory.** Two reasons, and the second is the real one:

1. It sits beside `.agents/product-marketing.md`, which every one of the 50 skills already reads. One directory, one convention.
2. It travels with the repo. State that lives in `~` is invisible to anyone else on the project and dies with the machine.

`marketing-plan` keeps its own progress file under `~/marketing-plans/{slug}/progress.md`. That is intentional and unchanged: that file holds section-level state for one document. This file holds stage-level state for the whole workflow. They do not overlap and neither mirrors the other.

## Format

Markdown, not JSON. It is read by a human as often as by an agent, and a human reading JSON checkboxes is a worse experience than an agent parsing markdown.

```markdown
# Marketing OS — {brand}

stage: 5
cycle: 2026-Q3-c1
open_since: 2026-08-25
channel: instagram-carousel

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

## Accepted gaps
- 2026-08-22 · stage 1 · no competitor pricing found, proceeding on public tiers only

## Open decisions
- price of the diagnostic offer — blocks stage 3 sign-off

## Last learning
2026-08-20 · hook naming the process beat hook naming the tool, directional only, sample too small
```

## Fields

| Field | Rule |
|-------|------|
| `stage` | the current stage number, 0 to 9 |
| `cycle` | an identifier for this pass through stages 4 to 8. One open cycle at a time. |
| `open_since` | when the cycle opened. A cycle open for more than one cadence period is a signal, not a status. |
| `channel` | set at stage 5, because it determines which skill owns production |
| `Gates met` | one line per stage, each pointing at the artifact that proves it |
| `Accepted gaps` | a gate consciously not met, with the date and the reason |
| `Open decisions` | things blocking a gate that only the user can resolve |
| `Last learning` | carried into the next cycle. If it is empty after a full cycle, the cycle taught nothing. |

## The artifact pointer rule

A checked gate must point at a file, a URL or a named record. **A checked gate with no pointer is not a checked gate.** This is the whole reason the file exists: without pointers, "gates met" degrades into memory, and memory degrades into optimism.

## Accepted gaps are not failures

Recording a gap you chose to accept is better practice than meeting every gate. It means the trade-off was visible when it was made.

What is not acceptable is an unrecorded gap, because the next cycle cannot tell the difference between "we checked and decided" and "we never looked."

## Resumption

On invocation, read the file and resolve in this order:

```text
1. no file                        → start at stage 0
2. an open cycle exists           → resume at the first unchecked gate
3. all gates checked, stage < 9   → advance to the next stage
4. stage 9 and gate 9 met         → the workflow is continuous; route to marketing-loops
```

**Never open a second cycle while one is open.** If the user asks to start something new mid-cycle, say what is open and ask whether to finish it, abandon it explicitly, or park it with a reason. Two open cycles produce two half-campaigns and no learning from either.

## Closing a cycle

A cycle closes when gate 8 is met, not when the piece is published. Publishing is stage 7.

On close:

- write `Last learning` with what the measurement actually showed, including when it showed nothing
- clear `cycle` and `open_since`
- keep the gate lines for stages 0 to 3; they persist across cycles
- reset the gate lines for stages 4 to 8

Stages 0 to 3 are revisited, not rerun. If Stage 1 evidence is a year old, that is a reason to revisit it, and the revisit is a decision worth recording rather than an automatic step.

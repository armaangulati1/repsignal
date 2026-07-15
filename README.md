# RepSignal

**Turn a sales-call transcript into a structured coaching scorecard.**

RepSignal is a small webhook-driven service. You send it the transcript of a
sales call, and it returns a clean, structured "scorecard" that tells a sales
manager what happened on the call: how much the rep talked versus listened, what
discovery questions they asked, what objections came up, whether a real next
step was booked, what the risks are, and specific coaching tips. Under the hood
it uses a large language model (Claude) to read the call, and it checks every
result against a strict schema before trusting it.

> All transcripts in this repository are **synthetic and self-authored**. This is
> a portfolio project, not a real product. It is not connected to any real call
> source, CRM, or customer data, and it does not operate at production scale.

---

## What it does in 60 seconds

1. An upstream system POSTs a call transcript to `POST /webhooks/transcripts`.
2. RepSignal validates the payload against a shared schema and rejects bad input
   with a typed 400.
3. It asks Claude to extract a coaching scorecard, forced into a fixed tool
   shape.
4. It re-validates that scorecard against the same schema before storing it.
5. It returns the scorecard plus an id. You can fetch it later at
   `GET /scorecards/:id`.
6. A small React dashboard lets you paste a transcript and see the scorecard
   rendered.

---

## For engineers

### Stack

- **Language:** TypeScript (strict mode across the whole monorepo).
- **Monorepo:** Turborepo with npm workspaces.
- **API:** Node.js + Express.
- **Validation:** Zod, as the single source of truth for both the inbound
  payload and the outbound scorecard.
- **LLM:** `@anthropic-ai/sdk` with model `claude-sonnet-5`, using tool
  (structured) output that is then Zod-validated.
- **Web:** React + TypeScript (Vite).
- **Infra:** a minimal, fenced Terraform demo config (never applied).
- **Tests:** Vitest, fully offline and deterministic.
- **CI:** GitHub Actions (typecheck + lint + test + web build).

### Repository layout

```
repsignal/
  packages/schema/    Zod schemas + inferred types (single source of truth)
  apps/api/           Express service, coaching-extraction layer, eval harness
  apps/web/           React + TypeScript dashboard (Vite)
  evals/              14 synthetic transcripts + golden labels + scoring
  infra/              minimal fenced Terraform demo (NOT applied)
  .github/workflows/  CI
```

### Architecture note

The `packages/schema` package defines the contract once with Zod and exports
both the runtime validators and the inferred TypeScript types. The API imports
it to validate requests; the web app imports it to type the request body and the
rendered scorecard. The scorecard's JSON schema handed to the model is generated
directly from the same Zod schema, so the model is constrained by exactly the
contract that Zod re-validates against. One definition, enforced at three points
(request boundary, model tool call, response boundary).

The LLM boundary is isolated behind a small `ModelCaller` seam. The real
implementation wraps the Anthropic SDK; the tests inject a deterministic fake.
This is what keeps `npm test` and CI fully offline with no API key.

**The LLM only judges what genuinely needs judgment.** The talk/listen ratio is
a computable property of the transcript, not a matter of interpretation, so it
is not asked of the model at all. It is computed deterministically in code by a
single pure function (`computeTalkListenRatio` in `packages/schema`), used by
both the API and the eval harness. Concretely: `talkListenRatio` is omitted from
the tool schema handed to the model (which is derived from a dedicated
`LlmScorecard` shape), the model returns only the judgment fields, and the API
computes the ratio from the transcript and merges it before the final Zod
validation. The field still exists on the scorecard and in the API response; it
is just populated by code instead of by a model guess. This removes a whole
class of avoidable error (the model approximating a number it should count) and
leaves the model to do only what it is actually good at: reading intent,
objections, and next steps.

The ratio formula is fixed and documented: rep word count divided by total word
count across all rep and prospect utterances, rounded to two decimals, in
`[0, 1]`, with degenerate transcripts (empty, or whitespace-only text) yielding
`0`.

Two `claude-sonnet-5` specifics are handled explicitly:

- No `temperature` parameter is sent (a known breakage on this model).
- The response is scanned for the `tool_use` block by content rather than by
  position, so a thinking-block-first or text-block-first response is parsed
  correctly.

### The scorecard

```
talkListenRatio          number 0..1 (fraction of words spoken by the rep; computed in code)
discoveryQuestionsAsked   { count, examples[] }
objections               [ { quote, category, handled } ]
nextStepSecured          { secured, evidence | null }
riskFlags                string[]
coachingTips             string[]
```

---

## Evals

The `evals/` package contains **14 synthetic, self-authored sales-call
transcripts** spanning: strong discovery with a clean close, a missed next step,
heavy objections, a rep monologue with a bad talk/listen ratio, a pure pitch with
no discovery, an unhandled competitor objection, a gatekeeper who is not the
decision maker, a deferred budget deal, multithreading to a second stakeholder, a
low-engagement ghosting risk, and a technical deep dive. Each ships with a
hand-labeled golden scorecard.

The harness runs each transcript through the extractor and scores the predicted
scorecard against its golden label. Scoring is split into two kinds of field.

**LLM-judged fields (5 per transcript, 14 transcripts x 5 = 70 field checks
total).** These are genuine judgment calls, and they are what the model-vs-golden
agreement number measures:

| Field check | Rule |
| --- | --- |
| `discoveryQuestionsAsked.count` | within +/- 1 of golden |
| `nextStepSecured.secured` | exact boolean match |
| `objections.count` | within +/- 1 of golden |
| `riskFlags.presence` | golden and prediction agree on whether any flag exists |
| `coachingTips.nonEmpty` | prediction returns at least one tip |

**Deterministic field (1 per transcript, reported separately).**

| Field | Handling |
| --- | --- |
| `talkListenRatio` | computed in code from the transcript by the same function that builds the golden value; **exact by construction** (14/14), never counted in the LLM-judged denominator |

`talkListenRatio` used to be an LLM-judged check with a +/- 0.10 tolerance. It is
now computed deterministically (see the architecture note), so scoring the model
against a value it never produces would only inflate the number. It is therefore
excluded from the LLM-judged denominator and reported on its own line as
deterministic and exact by construction. That is why the LLM-judged denominator
is **70**, not 84.

### Framing rule (mandatory)

Any agreement number from this eval **never travels bare**. It is always written
as:

> **N/70 LLM-judged field checks on its self-authored synthetic 14-transcript eval set.**

All transcripts are synthetic and self-authored, and all labels are self-scored.
This is a measure of agreement with one author's judgment on invented calls, not
a claim about real-world accuracy.

### Where the live number comes from

The test suite and CI run **offline** against fixtured model responses (the
fixtures carry one deliberate deviation, an objection under-count on call-0003,
so the offline harness asserts a known **69/70** LLM-judged plus **14/14**
deterministic to prove the scoring logic detects disagreement rather than
trivially passing). The offline number is a harness sanity check, **not** a model
measurement.

The real model-vs-golden number is produced by running the live eval with a real
API key (see the RUNBOOK).

### Live eval result

A live re-run under the new structure scored **66/70 LLM-judged field checks on
its self-authored synthetic 14-transcript eval set**. Separately, and never
folded into that 70, the deterministic `talkListenRatio` scored **14/14, exact by
construction** (computed in code from the transcript, not judged by the model).

Honest caveats:

- The LLM produces different outputs run to run, so **66/70 is representative, not
  a fixed number**. A re-run may land a point or two either way.
- All 14 transcripts are synthetic and self-authored, all golden labels are
  self-scored, and this is not a real integration. The number measures agreement
  with one author's judgment on invented calls, not real-world accuracy.
- **The sole remaining LLM miss type is conservative risk over-flagging.** All 4
  of the 4 misses were `riskFlags.presence`: on 4 of the 14 calls the model raised
  a `riskFlags` entry where the golden label had none. The model errs toward
  flagging risk, which trips the `riskFlags.presence` agreement check.
- **Design win: the talk/listen-ratio misses are gone.** The earlier 77/84 run
  (old 84-check structure) lost points when the model's estimated talk/listen
  ratio landed just outside the tolerance. Moving that metric out of the LLM and
  computing it deterministically eliminated that miss type entirely: it is now
  exact by construction, and risk over-flagging is all that remains.

The golden labels were **not** adjusted to inflate the score. The framing rule
above still holds: the number never appears bare, always with the
"on its self-authored synthetic 14-transcript eval set" qualifier.

### What the live run surfaced

The first live run was useful precisely because it broke. It exposed three real
issues, each since fixed:

1. **`dotenv` loaded from the wrong directory.** The client read `.env` from the
   workspace (app) directory instead of the monorepo root, so the API key was not
   picked up. Env loading now resolves to the repo root.
2. **Default-port collision.** The API's default port clashed with other local
   dev servers, so the eval hit the wrong process. The default moved to `8787`.
3. **Node 24 `undici` "Premature close".** On long generations, Node 24's bundled
   `undici` dropped the response mid-stream. Fixed by pinning Node 20 (see
   Requirements) and switching to the streaming path with retries in the
   Anthropic client.

---

## RUNBOOK

### Requirements

Run this project on **Node 20 LTS** (the repo pins it via `.nvmrc` and an
`engines` field). If you use `nvm`, run `nvm use` from the repo root. Node 20 is
required because the live eval surfaced a real failure on Node 24: its bundled
`undici` HTTP client drops long-lived API responses with a `Premature close`
error partway through streaming a long model generation. Pinning Node 20 (plus
the streaming path and retries in the Anthropic client) is what makes the live
eval reproducible. The offline test suite passes on any recent Node; the pin
matters for the keyed live steps.

Run these in a Terminal window, from the repository root, in order. Each command
is in its own block. Copy one block at a time.

### 1. Install

```
npm install
```

Expected: npm finishes with an "added ... packages" summary and no errors.

### 2. Typecheck the whole monorepo

```
npm run typecheck
```

Expected: turbo prints `4 successful, 4 total` and exits 0.

### 3. Lint

```
npm run lint
```

Expected: no output and exit code 0.

### 4. Run the offline test suite (no API key needed)

```
npm test
```

Expected: Vitest prints `Test Files 6 passed` and `Tests 47 passed`.

### 5. Add your API key (only needed for the live steps below)

```
cp .env.example .env
```

Then open `.env` in an editor and set `ANTHROPIC_API_KEY` to your real key.

### 6. Start the API

```
npm run dev:api
```

Expected: `[repsignal] api listening on http://localhost:8787`. Leave this
window running.

### 7. In a second Terminal window, check health

```
curl -s http://localhost:8787/health
```

Expected: `{"status":"ok","storedScorecards":0}`.

### 8. Send a sample transcript through the webhook

```
curl -s -X POST http://localhost:8787/webhooks/transcripts -H "Content-Type: application/json" -d '{"callId":"demo-1","repName":"Dana","prospectName":"Priya","durationSeconds":600,"source":"zoom","transcript":[{"speaker":"rep","text":"How does your team review call quality today?"},{"speaker":"prospect","text":"Managers leave notes in a spreadsheet that nobody reads."},{"speaker":"rep","text":"Would a working session next Tuesday help?"},{"speaker":"prospect","text":"Yes, Tuesday at 10 works."}]}'
```

Expected: a JSON scorecard record with an `id` and a `scorecard` object.

### 9. Run the live eval over all 14 synthetic transcripts

```
npm run eval
```

Expected: a per-transcript report ending with two summary lines of the form
`N/70 LLM-judged field checks (5 per transcript) across its self-authored synthetic 14-transcript eval set.`
followed by
`talkListenRatio: 14/14 deterministic, exact by construction (computed in code from the transcript, not judged by the model).`

The latest recorded run is **66/70** (see Live eval result). Update that section
if a fresh re-run lands a different LLM-judged number.

### 10. Optional: run the web dashboard

Leave the API running from step 6, then in a second window:

```
npm run dev:web
```

Expected: Vite prints a local URL (default `http://localhost:5173`). Open it,
paste a transcript (or click "Load sample"), and click "Score this call".

---

## What is NOT claimed

- This is one project, not production-scale TypeScript or Node experience.
- It is not a real integration with any conversation-intelligence platform,
  CRM, or telephony system.
- The transcripts and labels are synthetic and self-authored.
- The Terraform config is a single fenced demo and has never been applied.

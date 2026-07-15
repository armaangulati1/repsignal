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

Two `claude-sonnet-5` specifics are handled explicitly:

- No `temperature` parameter is sent (a known breakage on this model).
- The response is scanned for the `tool_use` block by content rather than by
  position, so a thinking-block-first or text-block-first response is parsed
  correctly.

### The scorecard

```
talkListenRatio          number 0..1 (fraction of words spoken by the rep)
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
scorecard against its golden label using a fixed set of **6 binary field checks
per transcript** (14 transcripts x 6 = **84 field checks** total):

| Field check | Rule |
| --- | --- |
| `talkListenRatio` | within +/- 0.10 of golden |
| `discoveryQuestionsAsked.count` | within +/- 1 of golden |
| `nextStepSecured.secured` | exact boolean match |
| `objections.count` | within +/- 1 of golden |
| `riskFlags.presence` | golden and prediction agree on whether any flag exists |
| `coachingTips.nonEmpty` | prediction returns at least one tip |

### Framing rule (mandatory)

Any agreement number from this eval **never travels bare**. It is always written
as:

> **N/84 field checks on its self-authored synthetic 14-transcript eval set.**

All transcripts are synthetic and self-authored, and all labels are self-scored.
This is a measure of agreement with one author's judgment on invented calls, not
a claim about real-world accuracy.

### Where the live number comes from

The test suite and CI run **offline** against fixtured model responses (the
fixtures carry two deliberate deviations, so the offline harness asserts a known
**82/84** to prove the scoring logic detects disagreement rather than trivially
passing). The offline number is a harness sanity check, **not** a model
measurement.

The real model-vs-golden number is produced by running the live eval with a real
API key (see the RUNBOOK). It is intentionally left to a keyed human run and is
not baked into this README as a claim until it has actually been produced.

---

## RUNBOOK

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

Expected: turbo prints `3 successful, 3 total` and exits 0.

### 3. Lint

```
npm run lint
```

Expected: no output and exit code 0.

### 4. Run the offline test suite (no API key needed)

```
npm test
```

Expected: Vitest prints `Test Files 5 passed` and `Tests 35 passed`.

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

Expected: a per-transcript report ending with a line of the form
`N/84 field checks across its self-authored synthetic 14-transcript eval set.`

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

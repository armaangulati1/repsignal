import type { ScorecardRecord } from '@repsignal/schema';
import { evalCases } from '@repsignal/evals';

/**
 * Static demo mode.
 *
 * When the app is built for the hosted GitHub Pages page there is no API to
 * call, so it runs in demo mode: it makes NO network calls at all (no Anthropic
 * API, no backend, not even a health probe), and it renders a real sample from
 * this repo's own synthetic eval set instead of live-scoring a transcript.
 *
 * Demo mode is turned on at BUILD TIME by the Pages workflow, which sets
 * VITE_DEMO_MODE=true. Local development (`npm run dev:web`) leaves it unset and
 * keeps the existing API-calling behavior, so the live path is untouched.
 */
export const DEMO_MODE: boolean =
  (import.meta.env.VITE_DEMO_MODE as string | undefined) === 'true';

/**
 * The demo case is a real, unmodified entry from the eval set
 * (`evals/src/dataset.ts`): a synthetic, self-authored transcript with its
 * hand-labeled golden scorecard. Nothing here is fabricated for the demo.
 *
 * `call-0003` (heavy objections, mixed handling) is used because it exercises
 * the full scorecard view: multiple objections, risk flags, and coaching tips.
 * Its `talkListenRatio` is the deterministic value computed in code from the
 * transcript (evalCases recomputes it via `computeTalkListenRatio`, the same
 * function the API uses), and the judgment fields are the self-authored golden
 * reference scorecard for that transcript.
 */
const DEMO_CALL_ID = 'call-0003';

const demoCase = evalCases.find((c) => c.payload.callId === DEMO_CALL_ID);
if (!demoCase) {
  throw new Error(`demo eval case ${DEMO_CALL_ID} not found in the eval set`);
}

/** The transcript rendered into the "Rep:/Prospect:" textarea format. */
export const DEMO_TRANSCRIPT: string = demoCase.payload.transcript
  .map((u) => `${u.speaker === 'rep' ? 'Rep' : 'Prospect'}: ${u.text}`)
  .join('\n');

export const DEMO_REP_NAME: string = demoCase.payload.repName;
export const DEMO_PROSPECT_NAME: string = demoCase.payload.prospectName;

/**
 * The full record the dashboard renders in demo mode. The scorecard is the real
 * golden label from the eval set (talkListenRatio is the code-computed value).
 */
export const DEMO_RECORD: ScorecardRecord = {
  id: `demo-${demoCase.payload.callId}`,
  callId: demoCase.payload.callId,
  repName: demoCase.payload.repName,
  prospectName: demoCase.payload.prospectName,
  createdAt: '2026-07-15T00:00:00.000Z',
  scorecard: demoCase.golden,
};

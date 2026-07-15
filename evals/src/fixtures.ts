import type { Scorecard } from '@repsignal/schema';
import { evalCases } from './dataset.js';

/**
 * Deterministic, offline stand-ins for what the LLM would return for each
 * transcript, keyed by callId. These let the test suite and CI run with NO
 * API key and NO network.
 *
 * They are intentionally NOT identical to the golden labels: two cases carry a
 * deliberate deviation so the eval-harness smoke test proves the scoring logic
 * actually detects disagreement rather than trivially passing everything. These
 * fixtures are a harness sanity check, never a measurement of model accuracy.
 */

function cloneScorecard(scorecard: Scorecard): Scorecard {
  return structuredClone(scorecard);
}

export const fixtureScorecards: Record<string, Scorecard> = Object.fromEntries(
  evalCases.map((c) => [c.payload.callId, cloneScorecard(c.golden)]),
);

// Deviation 1: under-count objections on the heavy-objections call (golden = 3, fixture = 1).
fixtureScorecards['call-0003'] = {
  ...fixtureScorecards['call-0003'],
  objections: [
    { quote: 'My other worry is privacy. We record calls and legal is strict.', category: 'privacy', handled: true },
  ],
};

// Deviation 2: mis-estimate the talk/listen ratio on the monologue call (golden = 0.85, fixture = 0.6).
fixtureScorecards['call-0004'] = {
  ...fixtureScorecards['call-0004'],
  talkListenRatio: 0.6,
};

/** callIds whose fixture deliberately disagrees with the golden label. */
export const deviatingCallIds = ['call-0003', 'call-0004'] as const;

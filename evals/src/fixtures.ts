import type { LlmScorecard } from '@repsignal/schema';
import { evalCases } from './dataset.js';

/**
 * Deterministic, offline stand-ins for what the LLM would return for each
 * transcript, keyed by callId. These let the test suite and CI run with NO
 * API key and NO network.
 *
 * They are shaped like real model output: LlmScorecard, i.e. the judgment
 * fields only, WITHOUT talkListenRatio. The ratio is computed in code by the
 * extractor, so the model (and therefore these fixtures) never supplies it.
 *
 * They are intentionally NOT identical to the golden labels: one case carries a
 * deliberate deviation so the eval-harness smoke test proves the scoring logic
 * actually detects disagreement rather than trivially passing everything. These
 * fixtures are a harness sanity check, never a measurement of model accuracy.
 */

function toLlmScorecard(scorecard: LlmScorecard & { talkListenRatio?: number }): LlmScorecard {
  // Drop talkListenRatio: model output does not include it.
  const { talkListenRatio: _ratio, ...judgmentFields } = scorecard;
  return structuredClone(judgmentFields);
}

export const fixtureScorecards: Record<string, LlmScorecard> = Object.fromEntries(
  evalCases.map((c) => [c.payload.callId, toLlmScorecard(c.golden)]),
);

// Deviation: under-count objections on the heavy-objections call (golden = 3, fixture = 1).
// This is the single deliberate disagreement that proves the scorer catches misses.
fixtureScorecards['call-0003'] = {
  ...fixtureScorecards['call-0003'],
  objections: [
    { quote: 'My other worry is privacy. We record calls and legal is strict.', category: 'privacy', handled: true },
  ],
};

/** callIds whose fixture deliberately disagrees with the golden label. */
export const deviatingCallIds = ['call-0003'] as const;

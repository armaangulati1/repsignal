import { describe, expect, it } from 'vitest';
import {
  evalCases,
  fixtureScorecards,
  scoreScorecard,
} from '@repsignal/evals';
import { runEvalHarness, formatEvalReport } from '../src/eval/harness.js';
import type { ContentBlock, ModelCaller } from '../src/coaching/modelCaller.js';

/**
 * Offline eval-harness smoke test. A fake caller returns the canned fixture for
 * each transcript (matched by the callId embedded in the prompt), so the whole
 * extract-then-score pipeline runs deterministically with no network.
 *
 * The fixtures carry two deliberate deviations from the golden labels, so the
 * expected aggregate is 82/84 rather than a trivial perfect score. This proves
 * the scoring logic detects disagreement.
 */
const fixtureCaller: ModelCaller = async ({ user }) => {
  const match = user.match(/Call ID: (call-\d+)/);
  if (!match) {
    throw new Error('prompt did not contain a Call ID');
  }
  const scorecard = fixtureScorecards[match[1]];
  const blocks: ContentBlock[] = [
    { type: 'thinking', thinking: 'scoring the call' },
    { type: 'tool_use', name: 'record_scorecard', input: scorecard },
  ];
  return blocks;
};

describe('eval harness (offline, fixtures)', () => {
  it('scores every transcript and reports the expected fixture aggregate', async () => {
    const aggregate = await runEvalHarness(fixtureCaller);
    expect(aggregate.transcriptCount).toBe(14);
    expect(aggregate.fieldsTotal).toBe(84);
    expect(aggregate.fieldsPassed).toBe(82);
  });

  it('renders a report that carries the mandatory framing qualifier', async () => {
    const aggregate = await runEvalHarness(fixtureCaller);
    const report = formatEvalReport(aggregate);
    expect(report).toContain('self-authored synthetic');
    expect(report).toContain('not a real integration');
  });
});

describe('scoreScorecard field checks', () => {
  it('passes all fields when prediction equals golden', () => {
    const golden = evalCases[0].golden;
    const checks = scoreScorecard(golden, golden);
    expect(checks.every((c) => c.passed)).toBe(true);
    expect(checks).toHaveLength(6);
  });

  it('flags the objections count when the model under-counts', () => {
    const golden = evalCases.find((c) => c.id === 'heavy-objections')!.golden;
    const predicted = fixtureScorecards['call-0003'];
    const checks = scoreScorecard(golden, predicted);
    const objectionCheck = checks.find((c) => c.field === 'objections.count');
    expect(objectionCheck?.passed).toBe(false);
  });

  it('flags the talk ratio when the model mis-estimates it', () => {
    const golden = evalCases.find((c) => c.id === 'rep-monologue')!.golden;
    const predicted = fixtureScorecards['call-0004'];
    const checks = scoreScorecard(golden, predicted);
    const ratioCheck = checks.find((c) => c.field === 'talkListenRatio');
    expect(ratioCheck?.passed).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import {
  evalCases,
  fixtureScorecards,
  scoreScorecard,
  scoreDeterministicFields,
} from '@repsignal/evals';
import { computeTalkListenRatio } from '@repsignal/schema';
import { runEvalHarness, formatEvalReport } from '../src/eval/harness.js';
import type { ContentBlock, ModelCaller } from '../src/coaching/modelCaller.js';

/**
 * Offline eval-harness smoke test. A fake caller returns the canned fixture for
 * each transcript (matched by the callId embedded in the prompt), so the whole
 * extract-then-score pipeline runs deterministically with no network.
 *
 * The fixtures carry one deliberate deviation from the golden labels (an
 * objection under-count on call-0003), so the expected LLM-judged aggregate is
 * 69/70 rather than a trivial perfect score. This proves the scoring logic
 * detects disagreement. talkListenRatio is computed in code, so it is exact by
 * construction (14/14) and reported separately, never as an LLM-judged check.
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
    // 5 LLM-judged fields per transcript, 14 transcripts = 70 checks.
    expect(aggregate.fieldsTotal).toBe(70);
    // One deliberate objection-count deviation on call-0003 is the only miss.
    expect(aggregate.fieldsPassed).toBe(69);
    // talkListenRatio is deterministic: exact by construction, reported apart.
    expect(aggregate.deterministicTotal).toBe(14);
    expect(aggregate.deterministicPassed).toBe(14);
  });

  it('renders a report that carries the mandatory framing qualifier', async () => {
    const aggregate = await runEvalHarness(fixtureCaller);
    const report = formatEvalReport(aggregate);
    expect(report).toContain('self-authored synthetic');
    expect(report).toContain('not a real integration');
  });
});

describe('scoreScorecard field checks', () => {
  it('checks exactly the 5 LLM-judged fields and never talkListenRatio', () => {
    const golden = evalCases[0].golden;
    const checks = scoreScorecard(golden, golden);
    expect(checks.every((c) => c.passed)).toBe(true);
    expect(checks).toHaveLength(5);
    expect(checks.some((c) => c.field === 'talkListenRatio')).toBe(false);
  });

  it('flags the objections count when the model under-counts', () => {
    const golden = evalCases.find((c) => c.id === 'heavy-objections')!.golden;
    // The fixture is LLM-shaped (no ratio); merge the golden ratio so both
    // scorecards are complete Scorecards for the scorer.
    const predicted = {
      ...fixtureScorecards['call-0003'],
      talkListenRatio: golden.talkListenRatio,
    };
    const checks = scoreScorecard(golden, predicted);
    const objectionCheck = checks.find((c) => c.field === 'objections.count');
    expect(objectionCheck?.passed).toBe(false);
  });
});

describe('scoreDeterministicFields (talkListenRatio)', () => {
  it('passes by construction because the golden ratio is the computed ratio', () => {
    const evalCase = evalCases.find((c) => c.id === 'rep-monologue')!;
    const golden = evalCase.golden;
    // The served ratio is computed by the extractor with the same function.
    const predicted = {
      ...golden,
      talkListenRatio: computeTalkListenRatio(evalCase.payload.transcript),
    };
    const checks = scoreDeterministicFields(golden, predicted);
    expect(checks).toHaveLength(1);
    expect(checks[0].field).toBe('talkListenRatio');
    expect(checks[0].passed).toBe(true);
    expect(golden.talkListenRatio).toBe(
      computeTalkListenRatio(evalCase.payload.transcript),
    );
  });
});

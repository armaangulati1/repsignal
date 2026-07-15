import { aggregateScores, evalCases, type AggregateScore } from '@repsignal/evals';
import { extractScorecard } from '../coaching/extractor.js';
import type { ModelCaller } from '../coaching/modelCaller.js';

/**
 * Run every synthetic transcript through the extractor with the supplied model
 * caller and score each predicted scorecard against its golden label.
 *
 * The same function powers the offline harness smoke test (fake caller over
 * fixtures) and the live eval (real Anthropic caller). The eval set is
 * synthetic and self-authored; the resulting number is self-scored.
 */
export async function runEvalHarness(
  callModel: ModelCaller,
): Promise<AggregateScore> {
  const results = [];
  for (const evalCase of evalCases) {
    const predicted = await extractScorecard(evalCase.payload, callModel);
    results.push({
      id: evalCase.id,
      scenario: evalCase.scenario,
      golden: evalCase.golden,
      predicted,
    });
  }
  return aggregateScores(results);
}

/** Render a human-readable summary with the mandatory framing qualifier. */
export function formatEvalReport(aggregate: AggregateScore): string {
  const lines: string[] = [];
  lines.push('RepSignal eval results');
  lines.push('======================');
  for (const transcript of aggregate.perTranscript) {
    const status = transcript.passedCount === transcript.totalCount ? 'PASS' : 'PARTIAL';
    lines.push(
      `[${status}] ${transcript.id}: ${transcript.passedCount}/${transcript.totalCount} LLM-judged fields (${transcript.scenario})`,
    );
    for (const check of [...transcript.checks, ...transcript.deterministicChecks]) {
      if (!check.passed) {
        lines.push(`    miss: ${check.field} (${check.detail})`);
      }
    }
  }
  lines.push('----------------------');
  lines.push(
    `${aggregate.fieldsPassed}/${aggregate.fieldsTotal} LLM-judged field checks (5 per transcript) across its self-authored synthetic ${aggregate.transcriptCount}-transcript eval set.`,
  );
  lines.push(
    `talkListenRatio: ${aggregate.deterministicPassed}/${aggregate.deterministicTotal} deterministic, exact by construction (computed in code from the transcript, not judged by the model).`,
  );
  lines.push('All transcripts are synthetic and self-authored; all labels are self-scored. This is not a real integration.');
  return lines.join('\n');
}

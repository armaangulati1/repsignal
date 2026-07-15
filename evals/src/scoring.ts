import type { Scorecard } from '@repsignal/schema';

/**
 * Per-field agreement scoring for the eval harness.
 *
 * Every scorecard is reduced to a fixed set of binary field checks so that an
 * aggregate agreement number is well defined and honest. Fuzzy fields (ratios,
 * counts) use tolerances; boolean and presence fields are exact. The number
 * this produces is a SELF-SCORED agreement figure on SYNTHETIC, SELF-AUTHORED
 * data. It is never a claim about real-world accuracy.
 */

export const RATIO_TOLERANCE = 0.1;
export const COUNT_TOLERANCE = 1;

export interface FieldCheck {
  field: string;
  passed: boolean;
  detail: string;
}

export interface TranscriptScore {
  id: string;
  scenario: string;
  checks: FieldCheck[];
  passedCount: number;
  totalCount: number;
}

export interface AggregateScore {
  perTranscript: TranscriptScore[];
  fieldsPassed: number;
  fieldsTotal: number;
  transcriptCount: number;
}

function withinTolerance(a: number, b: number, tolerance: number): boolean {
  return Math.abs(a - b) <= tolerance;
}

function hasItems(values: unknown[]): boolean {
  return values.length > 0;
}

/**
 * Compare one predicted scorecard against its golden label and return the
 * fixed set of binary field checks. The set is stable across all transcripts,
 * which is what makes "N/N field checks" a meaningful denominator.
 */
export function scoreScorecard(
  golden: Scorecard,
  predicted: Scorecard,
): FieldCheck[] {
  const checks: FieldCheck[] = [];

  const ratioPass = withinTolerance(
    golden.talkListenRatio,
    predicted.talkListenRatio,
    RATIO_TOLERANCE,
  );
  checks.push({
    field: 'talkListenRatio',
    passed: ratioPass,
    detail: `golden=${golden.talkListenRatio} predicted=${predicted.talkListenRatio} tol=${RATIO_TOLERANCE}`,
  });

  const countPass = withinTolerance(
    golden.discoveryQuestionsAsked.count,
    predicted.discoveryQuestionsAsked.count,
    COUNT_TOLERANCE,
  );
  checks.push({
    field: 'discoveryQuestionsAsked.count',
    passed: countPass,
    detail: `golden=${golden.discoveryQuestionsAsked.count} predicted=${predicted.discoveryQuestionsAsked.count} tol=${COUNT_TOLERANCE}`,
  });

  const nextStepPass = golden.nextStepSecured.secured === predicted.nextStepSecured.secured;
  checks.push({
    field: 'nextStepSecured.secured',
    passed: nextStepPass,
    detail: `golden=${golden.nextStepSecured.secured} predicted=${predicted.nextStepSecured.secured}`,
  });

  const objectionsPass = withinTolerance(
    golden.objections.length,
    predicted.objections.length,
    COUNT_TOLERANCE,
  );
  checks.push({
    field: 'objections.count',
    passed: objectionsPass,
    detail: `golden=${golden.objections.length} predicted=${predicted.objections.length} tol=${COUNT_TOLERANCE}`,
  });

  const riskPass = hasItems(golden.riskFlags) === hasItems(predicted.riskFlags);
  checks.push({
    field: 'riskFlags.presence',
    passed: riskPass,
    detail: `goldenHasFlags=${hasItems(golden.riskFlags)} predictedHasFlags=${hasItems(predicted.riskFlags)}`,
  });

  const tipsPass = hasItems(predicted.coachingTips);
  checks.push({
    field: 'coachingTips.nonEmpty',
    passed: tipsPass,
    detail: `predictedTipCount=${predicted.coachingTips.length}`,
  });

  return checks;
}

/** Aggregate scoring across a set of (golden, predicted) pairs. */
export function aggregateScores(
  results: Array<{ id: string; scenario: string; golden: Scorecard; predicted: Scorecard }>,
): AggregateScore {
  const perTranscript: TranscriptScore[] = results.map((r) => {
    const checks = scoreScorecard(r.golden, r.predicted);
    const passedCount = checks.filter((c) => c.passed).length;
    return {
      id: r.id,
      scenario: r.scenario,
      checks,
      passedCount,
      totalCount: checks.length,
    };
  });

  const fieldsPassed = perTranscript.reduce((sum, t) => sum + t.passedCount, 0);
  const fieldsTotal = perTranscript.reduce((sum, t) => sum + t.totalCount, 0);

  return {
    perTranscript,
    fieldsPassed,
    fieldsTotal,
    transcriptCount: perTranscript.length,
  };
}

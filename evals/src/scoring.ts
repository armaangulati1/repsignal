import type { Scorecard } from '@repsignal/schema';

/**
 * Per-field agreement scoring for the eval harness.
 *
 * The scorecard is split into two kinds of field:
 *
 *  - LLM-judged fields (5 per transcript): discovery-question count, next-step
 *    secured, objection count, risk-flag presence, and coaching-tip presence.
 *    These are genuine judgment calls, so they are what the model-vs-golden
 *    agreement number measures. Fuzzy fields use tolerances; boolean and
 *    presence fields are exact.
 *
 *  - Deterministic fields (1 per transcript): talkListenRatio. This is computed
 *    in code from the transcript by the same function that builds the golden
 *    value, so it is EXACT BY CONSTRUCTION and is reported separately. It is
 *    NOT counted in the LLM-judged denominator, because scoring a model against
 *    a value the model never produced would inflate the number.
 *
 * The LLM-judged number is a SELF-SCORED agreement figure on SYNTHETIC,
 * SELF-AUTHORED data. It is never a claim about real-world accuracy.
 */

export const COUNT_TOLERANCE = 1;

/** Number of genuinely LLM-judged fields checked per transcript. */
export const LLM_JUDGED_FIELDS_PER_TRANSCRIPT = 5;

export interface FieldCheck {
  field: string;
  passed: boolean;
  detail: string;
}

export interface TranscriptScore {
  id: string;
  scenario: string;
  /** LLM-judged field checks (5 per transcript). */
  checks: FieldCheck[];
  passedCount: number;
  totalCount: number;
  /** Deterministic field checks (talkListenRatio), exact by construction. */
  deterministicChecks: FieldCheck[];
  deterministicPassedCount: number;
  deterministicTotalCount: number;
}

export interface AggregateScore {
  perTranscript: TranscriptScore[];
  /** LLM-judged totals (the headline agreement number). */
  fieldsPassed: number;
  fieldsTotal: number;
  transcriptCount: number;
  /** Deterministic totals (talkListenRatio), reported separately. */
  deterministicPassed: number;
  deterministicTotal: number;
}

function withinTolerance(a: number, b: number, tolerance: number): boolean {
  return Math.abs(a - b) <= tolerance;
}

function hasItems(values: unknown[]): boolean {
  return values.length > 0;
}

/**
 * Compare one predicted scorecard against its golden label and return the fixed
 * set of LLM-judged binary field checks. talkListenRatio is deliberately NOT
 * here: it is deterministic and scored by scoreDeterministicFields instead. The
 * set is stable across all transcripts, which is what makes "N/N field checks" a
 * meaningful denominator.
 */
export function scoreScorecard(
  golden: Scorecard,
  predicted: Scorecard,
): FieldCheck[] {
  const checks: FieldCheck[] = [];

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

/**
 * Score the deterministic fields. talkListenRatio is computed in code for both
 * the served scorecard and the golden label with the identical function, so the
 * check passes by construction. It is reported to make the guarantee visible,
 * not to pad the agreement number.
 */
export function scoreDeterministicFields(
  golden: Scorecard,
  predicted: Scorecard,
): FieldCheck[] {
  const ratioPass = golden.talkListenRatio === predicted.talkListenRatio;
  return [
    {
      field: 'talkListenRatio',
      passed: ratioPass,
      detail: `deterministic, exact by construction: golden=${golden.talkListenRatio} predicted=${predicted.talkListenRatio} (both computed in code from the transcript)`,
    },
  ];
}

/** Aggregate scoring across a set of (golden, predicted) pairs. */
export function aggregateScores(
  results: Array<{ id: string; scenario: string; golden: Scorecard; predicted: Scorecard }>,
): AggregateScore {
  const perTranscript: TranscriptScore[] = results.map((r) => {
    const checks = scoreScorecard(r.golden, r.predicted);
    const deterministicChecks = scoreDeterministicFields(r.golden, r.predicted);
    return {
      id: r.id,
      scenario: r.scenario,
      checks,
      passedCount: checks.filter((c) => c.passed).length,
      totalCount: checks.length,
      deterministicChecks,
      deterministicPassedCount: deterministicChecks.filter((c) => c.passed).length,
      deterministicTotalCount: deterministicChecks.length,
    };
  });

  const fieldsPassed = perTranscript.reduce((sum, t) => sum + t.passedCount, 0);
  const fieldsTotal = perTranscript.reduce((sum, t) => sum + t.totalCount, 0);
  const deterministicPassed = perTranscript.reduce((sum, t) => sum + t.deterministicPassedCount, 0);
  const deterministicTotal = perTranscript.reduce((sum, t) => sum + t.deterministicTotalCount, 0);

  return {
    perTranscript,
    fieldsPassed,
    fieldsTotal,
    transcriptCount: perTranscript.length,
    deterministicPassed,
    deterministicTotal,
  };
}

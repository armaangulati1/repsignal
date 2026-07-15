import { LlmScorecard } from '@repsignal/schema';
import type { TranscriptPayload } from '@repsignal/schema';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * The scorecard tool definition and the prompt builder.
 *
 * The JSON schema handed to the model is derived directly from the Zod
 * LlmScorecard schema, so the model is constrained by exactly the same contract
 * that Zod re-validates the model output against. talkListenRatio is NOT part
 * of this schema: it is a computable metric, so it is computed in code from the
 * transcript rather than asked of the model. One source of truth, two
 * enforcement points.
 */

function buildScorecardJsonSchema(): Record<string, unknown> {
  const schema = zodToJsonSchema(LlmScorecard, { $refStrategy: 'none' }) as Record<
    string,
    unknown
  >;
  // Anthropic tool input_schema does not need the JSON Schema meta key.
  delete schema.$schema;
  return schema;
}

export const SCORECARD_TOOL = {
  name: 'record_scorecard',
  description:
    'Record the sales-coaching scorecard extracted from the call transcript. Use only evidence present in the transcript.',
  inputSchema: buildScorecardJsonSchema(),
};

export const SYSTEM_PROMPT = [
  'You are a sales-coaching analyst. You are given the transcript of a single sales call between a rep and a prospect.',
  'Analyze it and record a coaching scorecard by calling the record_scorecard tool exactly once.',
  'The talk/listen ratio is computed separately in code from the transcript, so do not report it. Focus only on the judgment fields below.',
  'Definitions:',
  '- discoveryQuestionsAsked: how many genuine open-ended discovery questions the rep asked, plus a few verbatim examples.',
  '- objections: prospect concerns or pushback, each with a short quote, a category, and whether the rep handled it.',
  '- nextStepSecured: whether a concrete next step (a booked meeting, an intro, a scheduled evaluation) was secured, with a quote as evidence when true and null otherwise.',
  '- riskFlags: deal risks visible in the call, such as no next step, budget gates, or low engagement.',
  '- coachingTips: specific, actionable feedback for the rep.',
  'Base every field strictly on the transcript. Do not invent details.',
].join('\n');

export interface BuiltPrompts {
  system: string;
  user: string;
}

export function buildPrompts(payload: TranscriptPayload): BuiltPrompts {
  const header = [
    `Call ID: ${payload.callId}`,
    `Rep: ${payload.repName}`,
    `Prospect: ${payload.prospectName}`,
    `Source: ${payload.source}`,
    `Duration (seconds): ${payload.durationSeconds}`,
  ].join('\n');

  const body = payload.transcript
    .map((utterance) => {
      const speaker = utterance.speaker === 'rep' ? payload.repName : payload.prospectName;
      const role = utterance.speaker === 'rep' ? 'REP' : 'PROSPECT';
      return `${role} (${speaker}): ${utterance.text}`;
    })
    .join('\n');

  const user = `${header}\n\nTranscript:\n${body}`;
  return { system: SYSTEM_PROMPT, user };
}

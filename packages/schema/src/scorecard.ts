import { z } from 'zod';

/**
 * Coaching scorecard: the structured "conversational intelligence" produced
 * from a transcript. The LLM is forced to emit exactly this shape via a tool
 * schema, and the result is re-validated with Zod before it is trusted or
 * stored. This is the contract the API returns and the web app renders.
 */

export const Objection = z
  .object({
    quote: z.string().min(1),
    category: z.string().min(1),
    handled: z.boolean(),
  })
  .strict();
export type Objection = z.infer<typeof Objection>;

export const DiscoveryQuestions = z
  .object({
    count: z.number().int().nonnegative(),
    examples: z.array(z.string().min(1)),
  })
  .strict();
export type DiscoveryQuestions = z.infer<typeof DiscoveryQuestions>;

export const NextStep = z
  .object({
    secured: z.boolean(),
    evidence: z.string().nullable(),
  })
  .strict();
export type NextStep = z.infer<typeof NextStep>;

export const Scorecard = z
  .object({
    /** Fraction of words spoken by the rep, 0..1. Higher means the rep talked more. */
    talkListenRatio: z.number().min(0).max(1),
    discoveryQuestionsAsked: DiscoveryQuestions,
    objections: z.array(Objection),
    nextStepSecured: NextStep,
    riskFlags: z.array(z.string().min(1)),
    coachingTips: z.array(z.string().min(1)),
  })
  .strict();
export type Scorecard = z.infer<typeof Scorecard>;

/** The full stored/returned record: the scorecard plus identifying metadata. */
export const ScorecardRecord = z
  .object({
    id: z.string().min(1),
    callId: z.string().min(1),
    repName: z.string().min(1),
    prospectName: z.string().min(1),
    createdAt: z.string().min(1),
    scorecard: Scorecard,
  })
  .strict();
export type ScorecardRecord = z.infer<typeof ScorecardRecord>;

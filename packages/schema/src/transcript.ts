import { z } from 'zod';

/**
 * Inbound transcript webhook payload.
 *
 * This is the single source of truth for what an upstream conversation source
 * (a call recorder, a dialer, a meeting tool) would POST to the integration.
 * It is imported by both the API (for runtime validation) and the web app
 * (for typing the request body). All data is synthetic.
 */

export const SpeakerRole = z.enum(['rep', 'prospect']);
export type SpeakerRole = z.infer<typeof SpeakerRole>;

export const TranscriptSource = z.enum(['zoom', 'phone', 'field', 'other']);
export type TranscriptSource = z.infer<typeof TranscriptSource>;

export const Utterance = z
  .object({
    speaker: SpeakerRole,
    text: z.string().trim().min(1, 'utterance text must not be empty'),
  })
  .strict();
export type Utterance = z.infer<typeof Utterance>;

export const TranscriptPayload = z
  .object({
    callId: z.string().min(1, 'callId is required'),
    repName: z.string().min(1, 'repName is required'),
    prospectName: z.string().min(1, 'prospectName is required'),
    durationSeconds: z
      .number()
      .int('durationSeconds must be an integer')
      .positive('durationSeconds must be positive'),
    source: TranscriptSource.default('other'),
    transcript: z
      .array(Utterance)
      .min(1, 'transcript must contain at least one utterance'),
  })
  .strict();
export type TranscriptPayload = z.infer<typeof TranscriptPayload>;

/** Input type before Zod applies defaults (source is optional on the wire). */
export type TranscriptPayloadInput = z.input<typeof TranscriptPayload>;

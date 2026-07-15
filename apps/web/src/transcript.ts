import type { SpeakerRole, TranscriptPayload } from '@repsignal/schema';

/**
 * Parse a pasted transcript where each line is prefixed with the speaker, for
 * example:
 *   Rep: How does your team coach today?
 *   Prospect: Spreadsheets, mostly.
 * Lines without a recognized prefix attach to the previous speaker's turn.
 */
export function parseTranscriptLines(
  raw: string,
): Array<{ speaker: SpeakerRole; text: string }> {
  const utterances: Array<{ speaker: SpeakerRole; text: string }> = [];

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      continue;
    }

    const match = trimmed.match(/^(rep|prospect)\s*:\s*(.*)$/i);
    if (match) {
      const speaker = match[1].toLowerCase() === 'rep' ? 'rep' : 'prospect';
      const text = match[2].trim();
      if (text.length > 0) {
        utterances.push({ speaker, text });
      }
      continue;
    }

    const previous = utterances[utterances.length - 1];
    if (previous) {
      previous.text = `${previous.text} ${trimmed}`.trim();
    } else {
      utterances.push({ speaker: 'prospect', text: trimmed });
    }
  }

  return utterances;
}

export interface BuildPayloadArgs {
  raw: string;
  repName: string;
  prospectName: string;
}

/** Build a TranscriptPayload from the form inputs. Returns null if there is nothing to send. */
export function buildPayload({
  raw,
  repName,
  prospectName,
}: BuildPayloadArgs): TranscriptPayload | null {
  const transcript = parseTranscriptLines(raw);
  if (transcript.length === 0) {
    return null;
  }

  return {
    callId: `web-${Date.now()}`,
    repName: repName.trim() || 'Rep',
    prospectName: prospectName.trim() || 'Prospect',
    // Rough estimate: assume a natural speaking pace so the payload is complete.
    durationSeconds: Math.max(60, transcript.length * 20),
    source: 'other',
    transcript,
  };
}

export const SAMPLE_TRANSCRIPT = [
  'Rep: Thanks for making time. Before I show anything, can you walk me through how your team reviews call quality today?',
  'Prospect: Right now our managers listen to a couple of calls a week and leave notes in a spreadsheet.',
  'Rep: Got it. What happens to those notes after they are written down?',
  'Prospect: Honestly not much. They sit there. Reps rarely read them.',
  'Rep: If coaching notes actually reached reps the next morning, what would change for you?',
  'Prospect: Ramp time. New reps take about five months to hit quota and coaching is the bottleneck.',
  'Rep: Who else would need to weigh in on a decision like this?',
  'Prospect: Me and our VP of Sales. She controls the budget.',
  'Rep: Would it help if we scheduled a thirty minute working session next Tuesday with your VP?',
  'Prospect: Yes, Tuesday at 10 works. I will send the invite and loop her in.',
].join('\n');

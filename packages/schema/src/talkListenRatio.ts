import type { Utterance } from './transcript.js';

/**
 * Deterministic talk/listen ratio.
 *
 * The talk/listen ratio is a computable property of the transcript, not a
 * matter of judgment, so it is computed here in code rather than asked of the
 * model. Both the API (when it serves a scorecard) and the eval harness (when
 * it builds golden labels) call this same function, so the served value and the
 * golden value are identical by construction.
 *
 * Formula (documented and fixed): the ratio is the number of words spoken by
 * the rep divided by the total number of words spoken across all rep and
 * prospect utterances, rounded to two decimals. It is a value in [0, 1] where a
 * higher number means the rep spoke a larger share of the words. A word is a
 * maximal run of non-whitespace characters. An empty transcript, or one whose
 * utterances contain no words, is degenerate and yields 0.
 */

/** Count words in a single string: whitespace-delimited, empty string is 0. */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return 0;
  }
  return trimmed.split(/\s+/).length;
}

/** Round a number to two decimals (half-up on the standard IEEE representation). */
function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Compute the talk/listen ratio from a transcript.
 *
 * @param transcript ordered utterances, each tagged with its speaker role.
 * @returns rep-word share in [0, 1], rounded to two decimals; 0 when degenerate.
 */
export function computeTalkListenRatio(
  transcript: ReadonlyArray<Pick<Utterance, 'speaker' | 'text'>>,
): number {
  let repWords = 0;
  let totalWords = 0;

  for (const utterance of transcript) {
    const words = countWords(utterance.text);
    totalWords += words;
    if (utterance.speaker === 'rep') {
      repWords += words;
    }
  }

  if (totalWords === 0) {
    return 0;
  }

  return roundToTwo(repWords / totalWords);
}

import { describe, expect, it } from 'vitest';
import { computeTalkListenRatio, countWords } from '@repsignal/schema';

/**
 * Unit tests for the deterministic talk/listen ratio. These are the guarantee
 * that the metric is computed, not guessed: normal cases plus the degenerate
 * edges (empty transcript, whitespace-only text, all-rep, all-prospect).
 */

describe('countWords', () => {
  it('counts whitespace-delimited words', () => {
    expect(countWords('one two three')).toBe(3);
  });

  it('collapses irregular whitespace', () => {
    expect(countWords('  a   b\tc\nd  ')).toBe(4);
  });

  it('returns 0 for an empty or whitespace-only string', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   \t\n ')).toBe(0);
  });
});

describe('computeTalkListenRatio', () => {
  it('computes rep word share rounded to two decimals', () => {
    // rep = 3 words, prospect = 1 word, total 4 -> 0.75
    const ratio = computeTalkListenRatio([
      { speaker: 'rep', text: 'a b c' },
      { speaker: 'prospect', text: 'd' },
    ]);
    expect(ratio).toBe(0.75);
  });

  it('rounds a repeating decimal to two places', () => {
    // rep = 1 word, total = 3 words -> 0.3333... -> 0.33
    const ratio = computeTalkListenRatio([
      { speaker: 'rep', text: 'alpha' },
      { speaker: 'prospect', text: 'beta gamma' },
    ]);
    expect(ratio).toBe(0.33);
  });

  it('returns 1 when only the rep speaks', () => {
    const ratio = computeTalkListenRatio([
      { speaker: 'rep', text: 'i talked the whole time' },
    ]);
    expect(ratio).toBe(1);
  });

  it('returns 0 when only the prospect speaks', () => {
    const ratio = computeTalkListenRatio([
      { speaker: 'prospect', text: 'the rep said nothing useful' },
    ]);
    expect(ratio).toBe(0);
  });

  it('returns 0 for an empty transcript', () => {
    expect(computeTalkListenRatio([])).toBe(0);
  });

  it('returns 0 when every utterance is whitespace only (degenerate)', () => {
    const ratio = computeTalkListenRatio([
      { speaker: 'rep', text: '   ' },
      { speaker: 'prospect', text: '\t\n' },
    ]);
    expect(ratio).toBe(0);
  });

  it('is stable across repeated calls (deterministic)', () => {
    const transcript = [
      { speaker: 'rep' as const, text: 'one two three four' },
      { speaker: 'prospect' as const, text: 'five six' },
    ];
    expect(computeTalkListenRatio(transcript)).toBe(
      computeTalkListenRatio(transcript),
    );
    // rep 4 of 6 words -> 0.67
    expect(computeTalkListenRatio(transcript)).toBe(0.67);
  });
});

import { describe, expect, it } from 'vitest';
import { Scorecard, TranscriptPayload } from '@repsignal/schema';

describe('TranscriptPayload validation', () => {
  const validPayload = {
    callId: 'call-test-1',
    repName: 'Dana',
    prospectName: 'Priya',
    durationSeconds: 900,
    source: 'zoom',
    transcript: [
      { speaker: 'rep', text: 'How does your team coach today?' },
      { speaker: 'prospect', text: 'Spreadsheets, mostly.' },
    ],
  };

  it('accepts a well-formed payload', () => {
    const result = TranscriptPayload.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('applies the default source when omitted', () => {
    const { source: _omitted, ...withoutSource } = validPayload;
    const result = TranscriptPayload.safeParse(withoutSource);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.source).toBe('other');
    }
  });

  it('rejects a missing callId', () => {
    const { callId: _dropped, ...bad } = validPayload;
    const result = TranscriptPayload.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('rejects an empty transcript', () => {
    const result = TranscriptPayload.safeParse({ ...validPayload, transcript: [] });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown speaker role', () => {
    const result = TranscriptPayload.safeParse({
      ...validPayload,
      transcript: [{ speaker: 'manager', text: 'hi' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-integer duration', () => {
    const result = TranscriptPayload.safeParse({ ...validPayload, durationSeconds: 12.5 });
    expect(result.success).toBe(false);
  });

  it('rejects unknown top-level keys (strict schema)', () => {
    const result = TranscriptPayload.safeParse({ ...validPayload, injected: true });
    expect(result.success).toBe(false);
  });
});

describe('Scorecard validation', () => {
  const validScorecard = {
    talkListenRatio: 0.55,
    discoveryQuestionsAsked: { count: 2, examples: ['What is your process?'] },
    objections: [{ quote: 'Too expensive', category: 'price', handled: true }],
    nextStepSecured: { secured: true, evidence: 'Tuesday works' },
    riskFlags: [],
    coachingTips: ['Ask one more discovery question.'],
  };

  it('accepts a well-formed scorecard', () => {
    expect(Scorecard.safeParse(validScorecard).success).toBe(true);
  });

  it('rejects a talkListenRatio above 1', () => {
    const result = Scorecard.safeParse({ ...validScorecard, talkListenRatio: 1.4 });
    expect(result.success).toBe(false);
  });

  it('rejects a negative discovery-question count', () => {
    const result = Scorecard.safeParse({
      ...validScorecard,
      discoveryQuestionsAsked: { count: -1, examples: [] },
    });
    expect(result.success).toBe(false);
  });

  it('allows a null next-step evidence when not secured', () => {
    const result = Scorecard.safeParse({
      ...validScorecard,
      nextStepSecured: { secured: false, evidence: null },
    });
    expect(result.success).toBe(true);
  });
});

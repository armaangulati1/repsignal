import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { fixtureScorecards } from '@repsignal/evals';
import type { Scorecard, TranscriptPayload } from '@repsignal/schema';
import { createApp, type ExtractFn } from '../src/app.js';
import { createInMemoryStore } from '../src/store.js';

// The fixture is LLM-shaped (no talkListenRatio). The real extractor merges the
// deterministic ratio before returning; the stub mirrors that with a fixed value.
const stubScorecard: Scorecard = { ...fixtureScorecards['call-0001'], talkListenRatio: 0.5 };

function buildTestApp(extract?: ExtractFn) {
  const store = createInMemoryStore();
  const defaultExtract: ExtractFn = async () => stubScorecard;
  return createApp({ extract: extract ?? defaultExtract, store });
}

const validBody: TranscriptPayload = {
  callId: 'call-http-1',
  repName: 'Dana',
  prospectName: 'Priya',
  durationSeconds: 600,
  source: 'zoom',
  transcript: [
    { speaker: 'rep', text: 'What does your coaching process look like today?' },
    { speaker: 'prospect', text: 'Ad hoc, mostly.' },
  ],
};

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await request(buildTestApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('POST /webhooks/transcripts', () => {
  it('accepts a valid payload and returns a scorecard record with an id', async () => {
    const res = await request(buildTestApp()).post('/webhooks/transcripts').send(validBody);
    expect(res.status).toBe(201);
    expect(typeof res.body.id).toBe('string');
    expect(res.body.callId).toBe('call-http-1');
    expect(res.body.scorecard.nextStepSecured).toBeDefined();
  });

  it('returns 400 on an invalid payload', async () => {
    const res = await request(buildTestApp())
      .post('/webhooks/transcripts')
      .send({ callId: 'x', transcript: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid transcript payload/);
  });

  it('returns 502 when extraction fails', async () => {
    const failing: ExtractFn = async () => {
      throw new Error('model unavailable');
    };
    const res = await request(buildTestApp(failing))
      .post('/webhooks/transcripts')
      .send(validBody);
    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/coaching extraction failed/);
  });
});

describe('GET /scorecards/:id', () => {
  it('round-trips a stored scorecard', async () => {
    const store = createInMemoryStore();
    const app = createApp({ extract: async (): Promise<Scorecard> => stubScorecard, store });

    const created = await request(app).post('/webhooks/transcripts').send(validBody);
    const id = created.body.id as string;

    const fetched = await request(app).get(`/scorecards/${id}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body.id).toBe(id);
  });

  it('returns 404 for an unknown id', async () => {
    const res = await request(buildTestApp()).get('/scorecards/does-not-exist');
    expect(res.status).toBe(404);
  });
});

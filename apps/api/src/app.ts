import { randomUUID } from 'node:crypto';
import express, { type Express, type Request, type Response } from 'express';
import { TranscriptPayload, type Scorecard, type ScorecardRecord } from '@repsignal/schema';
import type { ScorecardStore } from './store.js';

/** The extraction function the app depends on. Injected so the real SDK path and the test fake share one route. */
export type ExtractFn = (payload: TranscriptPayload) => Promise<Scorecard>;

export interface AppDeps {
  extract: ExtractFn;
  store: ScorecardStore;
}

/** Permissive CORS so the local web dashboard (a different origin) can call the API in the demo. */
function cors(_req: Request, res: Response, next: () => void): void {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
}

export function createApp({ extract, store }: AppDeps): Express {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use(cors);
  app.options('*', (_req, res) => res.sendStatus(204));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', storedScorecards: store.count() });
  });

  app.post('/webhooks/transcripts', async (req, res) => {
    const parsed = TranscriptPayload.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'invalid transcript payload',
        issues: parsed.error.flatten(),
      });
      return;
    }

    try {
      const scorecard = await extract(parsed.data);
      const record: ScorecardRecord = {
        id: randomUUID(),
        callId: parsed.data.callId,
        repName: parsed.data.repName,
        prospectName: parsed.data.prospectName,
        createdAt: new Date().toISOString(),
        scorecard,
      };
      store.save(record);
      res.status(201).json(record);
    } catch (error) {
      res.status(502).json({
        error: 'coaching extraction failed',
        message: error instanceof Error ? error.message : 'unknown error',
      });
    }
  });

  app.get('/scorecards/:id', (req, res) => {
    const record = store.get(req.params.id);
    if (!record) {
      res.status(404).json({ error: 'scorecard not found' });
      return;
    }
    res.json(record);
  });

  return app;
}

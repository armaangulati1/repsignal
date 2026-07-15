import { bootstrapEnv } from './env.js';
import type { TranscriptPayload } from '@repsignal/schema';
import { createApp, type ExtractFn } from './app.js';
import { createInMemoryStore } from './store.js';
import { extractScorecard } from './coaching/extractor.js';
import { createAnthropicCaller } from './coaching/anthropicClient.js';
import { resolvePort } from './config.js';

// Load the repo-root .env before reading any environment variable.
bootstrapEnv();

const PORT = resolvePort();
const apiKey = process.env.ANTHROPIC_API_KEY;

function buildExtract(): ExtractFn {
  if (!apiKey) {
    console.warn(
      '[repsignal] ANTHROPIC_API_KEY is not set. /health and payload validation work, but POST /webhooks/transcripts will return 502 until a key is provided.',
    );
    return async () => {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    };
  }
  const callModel = createAnthropicCaller(apiKey);
  return (payload: TranscriptPayload) => extractScorecard(payload, callModel);
}

const app = createApp({ extract: buildExtract(), store: createInMemoryStore() });

app.listen(PORT, () => {
  console.log(`[repsignal] api listening on http://localhost:${PORT}`);
});

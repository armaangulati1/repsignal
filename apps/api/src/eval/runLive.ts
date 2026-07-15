import 'dotenv/config';
import { createAnthropicCaller } from '../coaching/anthropicClient.js';
import { formatEvalReport, runEvalHarness } from './harness.js';

/**
 * Live eval entry point. This is the ONLY code path that calls the real
 * Anthropic API, and it is meant to be run by a human with their own key
 * (never in CI). It scores real model output against the synthetic golden set.
 */
async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error(
      'ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key, then re-run.',
    );
    process.exit(1);
    return;
  }

  const callModel = createAnthropicCaller(apiKey);
  const aggregate = await runEvalHarness(callModel);
  console.log(formatEvalReport(aggregate));
}

main().catch((error: unknown) => {
  console.error('Eval run failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});

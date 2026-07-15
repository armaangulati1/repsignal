import Anthropic from '@anthropic-ai/sdk';
import type { ContentBlock, ModelCaller } from './modelCaller.js';

/**
 * Real model caller backed by the Anthropic SDK.
 *
 * Intentionally isolated in its own module so the test suite never imports it
 * and never needs an API key. Two correctness notes for claude-sonnet-5:
 *   1. Do NOT pass a `temperature` param. It is a known breakage on this model.
 *   2. The extractor already handles thinking-block-first responses, so this
 *      layer just returns the raw content blocks untouched.
 *
 * Transport resilience: the client is configured with extra retries
 * (maxRetries: 4) and a 60s timeout, and the request uses the streaming path
 * (`messages.stream(...).finalMessage()`) because streaming is more robust to
 * premature response-body closes ("Premature close" undici drops) than the
 * non-streaming `messages.create`. `finalMessage()` returns a complete Message,
 * so the returned content blocks are identical to the non-streaming shape.
 */
export const DEFAULT_MODEL = 'claude-sonnet-5';

export function createAnthropicCaller(
  apiKey: string,
  model: string = DEFAULT_MODEL,
): ModelCaller {
  const client = new Anthropic({ apiKey, maxRetries: 4, timeout: 60000 });

  return async ({ system, user, toolName, toolDescription, toolInputSchema }) => {
    const response = await client.messages
      .stream({
        model,
        max_tokens: 1500,
        system,
        tools: [
          {
            name: toolName,
            description: toolDescription,
            input_schema: toolInputSchema as unknown as Anthropic.Messages.Tool['input_schema'],
          },
        ],
        tool_choice: { type: 'tool', name: toolName },
        messages: [{ role: 'user', content: user }],
      })
      .finalMessage();

    return response.content as unknown as ContentBlock[];
  };
}

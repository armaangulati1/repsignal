import { Scorecard } from '@repsignal/schema';
import type { TranscriptPayload } from '@repsignal/schema';
import { buildPrompts, SCORECARD_TOOL } from './prompt.js';
import type { ContentBlock, ModelCaller } from './modelCaller.js';

/** Thrown when the model output cannot be turned into a valid scorecard. */
export class ExtractionError extends Error {
  readonly detail: unknown;
  constructor(message: string, detail?: unknown) {
    super(message);
    this.name = 'ExtractionError';
    this.detail = detail;
  }
}

/**
 * Locate the tool_use block regardless of its position in the response.
 *
 * claude-sonnet-5 can emit a thinking block (and/or a text block) before the
 * tool_use block. We scan the whole array rather than assuming index 0, and
 * prefer a block whose name matches the scorecard tool.
 */
export function findToolUseBlock(
  blocks: ContentBlock[],
  toolName: string,
): ContentBlock | undefined {
  const named = blocks.find(
    (block) => block.type === 'tool_use' && block.name === toolName,
  );
  if (named) {
    return named;
  }
  return blocks.find((block) => block.type === 'tool_use');
}

/**
 * Run the coaching-extraction layer: build the prompt, call the model, find the
 * tool_use block defensively, and re-validate the result with Zod before it is
 * trusted. The caller (real SDK or a test fake) is injected.
 */
export async function extractScorecard(
  payload: TranscriptPayload,
  callModel: ModelCaller,
): Promise<Scorecard> {
  const { system, user } = buildPrompts(payload);

  const blocks = await callModel({
    system,
    user,
    toolName: SCORECARD_TOOL.name,
    toolDescription: SCORECARD_TOOL.description,
    toolInputSchema: SCORECARD_TOOL.inputSchema,
  });

  const toolBlock = findToolUseBlock(blocks, SCORECARD_TOOL.name);
  if (!toolBlock) {
    throw new ExtractionError(
      'model response contained no tool_use block',
      blocks.map((block) => block.type),
    );
  }

  const parsed = Scorecard.safeParse(toolBlock.input);
  if (!parsed.success) {
    throw new ExtractionError(
      'model tool output failed scorecard schema validation',
      parsed.error.flatten(),
    );
  }

  return parsed.data;
}

/**
 * Transport-agnostic seam between the coaching extractor and whatever produces
 * model output. The real implementation wraps the Anthropic SDK; tests inject a
 * deterministic fake. This is what keeps the test suite offline and keyless.
 */

/** A single content block from a model response (text, thinking, or tool_use). */
export interface ContentBlock {
  type: string;
  /** Present on tool_use blocks: the structured tool input. */
  input?: unknown;
  /** Present on tool_use blocks: the tool name. */
  name?: string;
  /** Present on text blocks. */
  text?: string;
  [key: string]: unknown;
}

export interface ModelCallParams {
  system: string;
  user: string;
  toolName: string;
  toolDescription: string;
  toolInputSchema: Record<string, unknown>;
}

/** Returns the raw content blocks from the model so the extractor can locate the tool_use block itself. */
export type ModelCaller = (params: ModelCallParams) => Promise<ContentBlock[]>;

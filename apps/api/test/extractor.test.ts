import { describe, expect, it } from 'vitest';
import { evalCases, fixtureScorecards } from '@repsignal/evals';
import { computeTalkListenRatio } from '@repsignal/schema';
import {
  ExtractionError,
  extractScorecard,
  findToolUseBlock,
} from '../src/coaching/extractor.js';
import type { ContentBlock, ModelCaller } from '../src/coaching/modelCaller.js';

const samplePayload = evalCases[0].payload;
// LLM-shaped fixture: judgment fields only, no talkListenRatio.
const sampleScorecard = fixtureScorecards['call-0001'];

describe('findToolUseBlock', () => {
  it('finds the tool_use block even when a thinking block comes first', () => {
    const blocks: ContentBlock[] = [
      { type: 'thinking', thinking: 'let me reason...' },
      { type: 'text', text: 'Here is the scorecard.' },
      { type: 'tool_use', name: 'record_scorecard', input: sampleScorecard },
    ];
    const found = findToolUseBlock(blocks, 'record_scorecard');
    expect(found?.type).toBe('tool_use');
    expect(found?.name).toBe('record_scorecard');
  });

  it('prefers the named tool_use block over an unrelated one', () => {
    const blocks: ContentBlock[] = [
      { type: 'tool_use', name: 'some_other_tool', input: { a: 1 } },
      { type: 'tool_use', name: 'record_scorecard', input: sampleScorecard },
    ];
    const found = findToolUseBlock(blocks, 'record_scorecard');
    expect(found?.name).toBe('record_scorecard');
  });

  it('returns undefined when there is no tool_use block', () => {
    const blocks: ContentBlock[] = [{ type: 'text', text: 'no tools here' }];
    expect(findToolUseBlock(blocks, 'record_scorecard')).toBeUndefined();
  });
});

describe('extractScorecard', () => {
  it('returns a Zod-validated scorecard from a thinking-first response', async () => {
    const caller: ModelCaller = async () => [
      { type: 'thinking', thinking: 'analyzing the call' },
      { type: 'tool_use', name: 'record_scorecard', input: sampleScorecard },
    ];
    const result = await extractScorecard(samplePayload, caller);
    expect(result.nextStepSecured.secured).toBe(true);
    expect(result.discoveryQuestionsAsked.count).toBeGreaterThan(0);
  });

  it('computes talkListenRatio in code, not from the model output', async () => {
    // The model output (fixture) contains no talkListenRatio at all.
    expect('talkListenRatio' in sampleScorecard).toBe(false);
    const caller: ModelCaller = async () => [
      { type: 'tool_use', name: 'record_scorecard', input: sampleScorecard },
    ];
    const result = await extractScorecard(samplePayload, caller);
    // The served ratio equals the deterministic function over the transcript.
    expect(result.talkListenRatio).toBe(
      computeTalkListenRatio(samplePayload.transcript),
    );
  });

  it('throws ExtractionError when no tool_use block is returned', async () => {
    const caller: ModelCaller = async () => [{ type: 'text', text: 'sorry, cannot help' }];
    await expect(extractScorecard(samplePayload, caller)).rejects.toBeInstanceOf(
      ExtractionError,
    );
  });

  it('throws ExtractionError when the tool output fails schema validation', async () => {
    const caller: ModelCaller = async () => [
      { type: 'tool_use', name: 'record_scorecard', input: { discoveryQuestionsAsked: { count: -1, examples: [] } } },
    ];
    await expect(extractScorecard(samplePayload, caller)).rejects.toBeInstanceOf(
      ExtractionError,
    );
  });

  it('rejects tool output that includes talkListenRatio (not in the model schema)', async () => {
    const caller: ModelCaller = async () => [
      { type: 'tool_use', name: 'record_scorecard', input: { ...sampleScorecard, talkListenRatio: 0.5 } },
    ];
    await expect(extractScorecard(samplePayload, caller)).rejects.toBeInstanceOf(
      ExtractionError,
    );
  });

  it('passes the tool name and a JSON schema to the caller', async () => {
    let capturedToolName = '';
    let capturedSchema: Record<string, unknown> = {};
    const caller: ModelCaller = async (params) => {
      capturedToolName = params.toolName;
      capturedSchema = params.toolInputSchema;
      return [{ type: 'tool_use', name: 'record_scorecard', input: sampleScorecard }];
    };
    await extractScorecard(samplePayload, caller);
    expect(capturedToolName).toBe('record_scorecard');
    expect(capturedSchema.type).toBe('object');
  });
});

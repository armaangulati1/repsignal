import type { ScorecardRecord, TranscriptPayload } from '@repsignal/schema';

const API_BASE: string =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8787';

export interface ApiError {
  error: string;
  issues?: unknown;
  message?: string;
}

/** POST a transcript payload to the webhook and return the scorecard record. */
export async function scoreTranscript(
  payload: TranscriptPayload,
): Promise<ScorecardRecord> {
  const response = await fetch(`${API_BASE}/webhooks/transcripts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiError;
    const detail = body.message ?? body.error ?? `request failed (${response.status})`;
    throw new Error(detail);
  }

  return (await response.json()) as ScorecardRecord;
}

import { useState } from 'react';
import type { ScorecardRecord } from '@repsignal/schema';
import { scoreTranscript } from './api.js';
import { buildPayload, SAMPLE_TRANSCRIPT } from './transcript.js';
import { ScorecardView } from './ScorecardView.js';
import { DEMO_MODE, DEMO_RECORD, DEMO_TRANSCRIPT, DEMO_REP_NAME, DEMO_PROSPECT_NAME } from './demo.js';

type Status = 'idle' | 'loading' | 'error' | 'done';

export function App() {
  const [repName, setRepName] = useState(DEMO_MODE ? DEMO_REP_NAME : 'Dana');
  const [prospectName, setProspectName] = useState(DEMO_MODE ? DEMO_PROSPECT_NAME : 'Priya');
  const [raw, setRaw] = useState(DEMO_MODE ? DEMO_TRANSCRIPT : SAMPLE_TRANSCRIPT);
  const [status, setStatus] = useState<Status>(DEMO_MODE ? 'done' : 'idle');
  const [error, setError] = useState('');
  const [record, setRecord] = useState<ScorecardRecord | null>(DEMO_MODE ? DEMO_RECORD : null);

  async function handleScore() {
    // In demo mode the app never touches the network. It re-displays the real
    // self-authored sample scorecard from the eval set instead of calling any API.
    if (DEMO_MODE) {
      setRecord(DEMO_RECORD);
      setStatus('done');
      setError('');
      return;
    }

    const payload = buildPayload({ raw, repName, prospectName });
    if (!payload) {
      setStatus('error');
      setError('Paste a transcript with at least one line, prefixed "Rep:" or "Prospect:".');
      return;
    }
    setStatus('loading');
    setError('');
    try {
      const result = await scoreTranscript(payload);
      setRecord(result);
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>
          Rep<span className="accent">Signal</span>
        </h1>
        <p className="tagline">
          Paste a sales-call transcript. Get a schema-validated coaching scorecard.
        </p>
        <p className="disclaimer">
          Demo on synthetic data. Not a real integration and not connected to any real call source.
        </p>
      </header>

      {DEMO_MODE && (
        <div className="demo-banner" role="note">
          <strong>Demo mode:</strong> a sample synthetic, self-authored transcript and scorecard
          from this project&rsquo;s own eval set. This hosted page does not call any API or use real
          data. The talk/listen ratio is computed in code; the other fields are the self-authored
          reference scorecard. Run it locally against the API for live scoring (see the README).
        </div>
      )}

      <main className="layout">
        <section className="panel">
          <div className="field-row">
            <label className="field">
              <span>Rep name</span>
              <input value={repName} onChange={(e) => setRepName(e.target.value)} />
            </label>
            <label className="field">
              <span>Prospect name</span>
              <input value={prospectName} onChange={(e) => setProspectName(e.target.value)} />
            </label>
          </div>

          <label className="field">
            <span>Transcript</span>
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              rows={16}
              spellCheck={false}
            />
          </label>

          <div className="actions">
            <button className="primary" onClick={handleScore} disabled={status === 'loading'}>
              {status === 'loading'
                ? 'Scoring...'
                : DEMO_MODE
                  ? 'Show sample scorecard'
                  : 'Score this call'}
            </button>
            <button
              className="ghost"
              onClick={() => setRaw(DEMO_MODE ? DEMO_TRANSCRIPT : SAMPLE_TRANSCRIPT)}
            >
              Load sample
            </button>
          </div>

          {status === 'error' && <p className="error">{error}</p>}
        </section>

        <section className="panel result">
          {record ? (
            <ScorecardView record={record} />
          ) : (
            <div className="empty">
              <p>The scorecard will appear here after you score a call.</p>
              <p className="muted">
                {DEMO_MODE
                  ? 'This hosted page renders a saved sample scorecard and makes no network calls. Click "Show sample scorecard" to display it.'
                  : 'The API runs the transcript through Claude and validates the result against a Zod schema before returning it.'}
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

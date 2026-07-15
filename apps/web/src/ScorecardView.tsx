import type { ScorecardRecord } from '@repsignal/schema';

function Pill({ label, tone }: { label: string; tone: 'good' | 'bad' | 'neutral' }) {
  return <span className={`pill pill-${tone}`}>{label}</span>;
}

export function ScorecardView({ record }: { record: ScorecardRecord }) {
  const { scorecard } = record;
  const repPercent = Math.round(scorecard.talkListenRatio * 100);
  const prospectPercent = 100 - repPercent;

  return (
    <div className="scorecard">
      <div className="scorecard-head">
        <h2>Coaching scorecard</h2>
        <span className="scorecard-id">id: {record.id.slice(0, 8)}</span>
      </div>

      <section className="metric-row">
        <div className="metric">
          <span className="metric-label">Talk / listen ratio</span>
          <div className="ratio-bar">
            <div className="ratio-rep" style={{ width: `${repPercent}%` }}>
              rep {repPercent}%
            </div>
            <div className="ratio-prospect" style={{ width: `${prospectPercent}%` }}>
              prospect {prospectPercent}%
            </div>
          </div>
        </div>
        <div className="metric">
          <span className="metric-label">Discovery questions</span>
          <span className="metric-big">{scorecard.discoveryQuestionsAsked.count}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Next step secured</span>
          <Pill
            label={scorecard.nextStepSecured.secured ? 'Yes' : 'No'}
            tone={scorecard.nextStepSecured.secured ? 'good' : 'bad'}
          />
        </div>
      </section>

      {scorecard.discoveryQuestionsAsked.examples.length > 0 && (
        <section className="block">
          <h3>Discovery question examples</h3>
          <ul>
            {scorecard.discoveryQuestionsAsked.examples.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </section>
      )}

      {scorecard.nextStepSecured.evidence && (
        <section className="block">
          <h3>Next-step evidence</h3>
          <blockquote>{scorecard.nextStepSecured.evidence}</blockquote>
        </section>
      )}

      <section className="block">
        <h3>Objections ({scorecard.objections.length})</h3>
        {scorecard.objections.length === 0 ? (
          <p className="muted">None detected.</p>
        ) : (
          <ul className="objection-list">
            {scorecard.objections.map((o, i) => (
              <li key={i}>
                <Pill label={o.category} tone="neutral" />
                <Pill label={o.handled ? 'handled' : 'unhandled'} tone={o.handled ? 'good' : 'bad'} />
                <span className="objection-quote">&ldquo;{o.quote}&rdquo;</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {scorecard.riskFlags.length > 0 && (
        <section className="block">
          <h3>Risk flags</h3>
          <ul className="risk-list">
            {scorecard.riskFlags.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="block">
        <h3>Coaching tips</h3>
        <ul className="tip-list">
          {scorecard.coachingTips.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

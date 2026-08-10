import type { ReactNode } from 'react';

export type DecisionContextState = 'verified' | 'manual' | 'unavailable';

interface DecisionContextProps {
  title: string;
  state: DecisionContextState;
  source: string;
  observedAt?: string;
  description: string;
  children?: ReactNode;
}

const STATE_LABELS: Record<DecisionContextState, string> = {
  verified: 'Verified context',
  manual: 'Manual context',
  unavailable: 'Context unavailable',
};

export function DecisionContext({ title, state, source, observedAt, description, children }: DecisionContextProps) {
  const headingId = `decision-context-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;
  return (
    <section className={`decision-context is-${state}`} aria-labelledby={headingId}>
      <div className="decision-context-heading">
        <div>
          <p className="decision-context-kicker">Decision context</p>
          <h3 id={headingId}>{title}</h3>
        </div>
        <span className="decision-context-state"><span aria-hidden="true" />{STATE_LABELS[state]}</span>
      </div>
      <p className="decision-context-description">{description}</p>
      <dl className="decision-context-details">
        <div><dt>Source</dt><dd>{source}</dd></div>
        {observedAt && <div><dt>Observed</dt><dd>{observedAt}</dd></div>}
      </dl>
      {children}
    </section>
  );
}

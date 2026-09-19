import { Link } from 'react-router-dom';
import type { ZoneSummary } from '../types';

interface ActionListProps {
  zones: ZoneSummary[];
}

export function ActionList({ zones }: ActionListProps) {
  const actions = zones
    .flatMap((zone) => zone.faults.map((fault) => ({ zone, fault })))
    .sort((a, b) => b.fault.estimatedCostPerMonth - a.fault.estimatedCostPerMonth);

  return (
    <section className="action-list" aria-labelledby="action-list-heading">
      <h2 id="action-list-heading">Priority actions</h2>
      {actions.length === 0 ? (
        <p className="empty-state">No active faults - every zone is healthy.</p>
      ) : (
        <ol>
          {actions.map(({ zone, fault }) => (
            <li key={fault.id + zone.id} className={`action-item action-item--${fault.severity}`}>
              <Link to={`/zones/${zone.id}`} className="action-item__link">
                <span className="action-item__cost">${fault.estimatedCostPerMonth}/mo</span>
                <span className="action-item__body">
                  <strong>
                    {zone.buildingName} - {zone.name}
                  </strong>
                  <span>{fault.summary}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

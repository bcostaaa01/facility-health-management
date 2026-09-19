import { Link } from 'react-router-dom';
import type { ZoneSummary } from '../types';
import { HealthBadge } from './HealthBadge';

export function ZoneList({ zones }: { zones: ZoneSummary[] }) {
  return (
    <section className="zone-list" aria-labelledby="zone-list-heading">
      <h2 id="zone-list-heading">All zones</h2>
      <ul>
        {zones.map((zone) => (
          <li key={zone.id}>
            <Link to={`/zones/${zone.id}`} className="zone-row">
              <span className="zone-row__name">
                <strong>{zone.name}</strong>
                <span className="zone-row__building">{zone.buildingName}</span>
              </span>
              <HealthBadge status={zone.healthStatus} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

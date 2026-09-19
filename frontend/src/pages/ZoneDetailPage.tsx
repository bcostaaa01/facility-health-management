import { Link, useParams } from 'react-router-dom';
import { HealthBadge } from '../components/HealthBadge';
import { SensorTrendChart } from '../components/SensorTrendChart';
import { useZoneDetail } from '../hooks/useZoneDetail';

export function ZoneDetailPage() {
  const { zoneId } = useParams<{ zoneId: string }>();
  const zone = useZoneDetail(zoneId);

  if (zone === null) {
    return <p className="loading">Loading zone...</p>;
  }

  if (!zone) {
    return (
      <div className="zone-detail-page">
        <p>Zone not found.</p>
        <Link to="/">Back to dashboard</Link>
      </div>
    );
  }

  return (
    <div className="zone-detail-page">
      <Link to="/" className="back-link">
        &larr; Back to dashboard
      </Link>

      <header className="zone-detail-header">
        <div>
          <h1>{zone.name}</h1>
          <p className="zone-detail-header__building">{zone.buildingName}</p>
        </div>
        <HealthBadge status={zone.healthStatus} />
      </header>

      <SensorTrendChart readings={zone.sensorTrend} />

      <section className="fault-explanations" aria-labelledby="fault-explanations-heading">
        <h2 id="fault-explanations-heading">Flagged issues</h2>
        {zone.faults.length === 0 ? (
          <p className="empty-state">No faults detected in this zone.</p>
        ) : (
          zone.faults.map((fault) => (
            <article key={fault.id} className="fault-card">
              <div className="fault-card__head">
                <h3>{fault.summary}</h3>
                <span className={`pill pill--${fault.severity}`}>{fault.severity}</span>
              </div>
              <p>{fault.explanation}</p>
              <p className="fault-card__cost">Est. cost impact: ${fault.estimatedCostPerMonth}/mo</p>
            </article>
          ))
        )}
      </section>
    </div>
  );
}

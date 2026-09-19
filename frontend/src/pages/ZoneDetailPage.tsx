import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchZoneDetail } from '../api/facilityApi';
import { HealthBadge } from '../components/HealthBadge';
import { SensorTrendChart } from '../components/SensorTrendChart';
import type { ZoneDetail } from '../types';

export function ZoneDetailPage() {
  const { zoneId } = useParams<{ zoneId: string }>();
  const [zone, setZone] = useState<ZoneDetail | null | undefined>(null);

  useEffect(() => {
    if (!zoneId) return;
    let cancelled = false;
    setZone(null);
    fetchZoneDetail(zoneId).then((result) => {
      if (!cancelled) setZone(result);
    });
    return () => {
      cancelled = true;
    };
  }, [zoneId]);

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
            <article key={fault.id} className={`fault-card fault-card--${fault.severity}`}>
              <h3>{fault.summary}</h3>
              <p>{fault.explanation}</p>
              <dl>
                <div>
                  <dt>Severity</dt>
                  <dd>{fault.severity}</dd>
                </div>
                <div>
                  <dt>Estimated cost impact</dt>
                  <dd>${fault.estimatedCostPerMonth}/mo</dd>
                </div>
              </dl>
            </article>
          ))
        )}
      </section>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { fetchZones } from '../api/facilityApi';
import { ActionList } from '../components/ActionList';
import { ZoneList } from '../components/ZoneList';
import type { ZoneSummary } from '../types';

export function DashboardPage() {
  const [zones, setZones] = useState<ZoneSummary[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchZones().then((result) => {
      if (!cancelled) setZones(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!zones) {
    return <p className="loading">Loading zones...</p>;
  }

  return (
    <div className="dashboard-page">
      <ActionList zones={zones} />
      <ZoneList zones={zones} />
    </div>
  );
}

import { ActionList } from '../components/ActionList';
import { StatTiles } from '../components/StatTiles';
import { ZoneList } from '../components/ZoneList';
import { useZones } from '../hooks/useZones';

export function DashboardPage() {
  const zones = useZones();

  if (!zones) {
    return <p className="loading">Loading zones...</p>;
  }

  return (
    <div className="dashboard-page">
      <h1 className="page-title">Dashboard</h1>
      <StatTiles zones={zones} />
      <ActionList zones={zones} />
      <ZoneList zones={zones} />
    </div>
  );
}

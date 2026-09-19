import type { ZoneSummary } from '../types';

export function StatTiles({ zones }: { zones: ZoneSummary[] }) {
  const activeFaults = zones.reduce((sum, zone) => sum + zone.faults.length, 0);
  const monthlyCost = zones.reduce(
    (sum, zone) => sum + zone.faults.reduce((zoneSum, fault) => zoneSum + fault.estimatedCostPerMonth, 0),
    0,
  );

  const tiles = [
    { label: 'Zones monitored', value: zones.length.toString() },
    { label: 'Active faults', value: activeFaults.toString() },
    { label: 'Est. cost of open faults', value: `$${monthlyCost.toLocaleString()}/mo` },
  ];

  return (
    <div className="stat-tiles">
      {tiles.map((tile) => (
        <div key={tile.label} className="stat-tile">
          <span className="stat-tile__label">{tile.label}</span>
          <span className="stat-tile__value">{tile.value}</span>
        </div>
      ))}
    </div>
  );
}

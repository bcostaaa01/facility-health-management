// Stand-in for the CSV-derived dataset the real backend will serve.
// The generator below fabricates a 48-hour hourly trend per zone, with a
// normal diurnal temperature curve and, for zones that have a fault, an
// injected anomaly in the most recent hours - the same shape a rule-based
// detector would later flag in real sensor data.

import type {
  Fault,
  FaultSeverity,
  FaultType,
  HvacMode,
  SensorReading,
  ZoneDetail,
} from '../types';

interface ZoneSeed {
  id: string;
  name: string;
  buildingId: string;
  buildingName: string;
  fault?: FaultType;
}

const ZONE_SEEDS: ZoneSeed[] = [
  {
    id: 'riv-101',
    name: 'Zone 101 - Lobby',
    buildingId: 'riverside',
    buildingName: 'Riverside Office Park',
    fault: 'stuck_damper',
  },
  {
    id: 'riv-204',
    name: 'Zone 204 - East Wing Offices',
    buildingId: 'riverside',
    buildingName: 'Riverside Office Park',
  },
  {
    id: 'riv-310',
    name: 'Zone 310 - Server Room',
    buildingId: 'riverside',
    buildingName: 'Riverside Office Park',
    fault: 'simultaneous_heating_cooling',
  },
  {
    id: 'lake-a',
    name: 'Zone A - ICU Wing',
    buildingId: 'lakeside',
    buildingName: 'Lakeside Medical Center',
    fault: 'valve_leak_by',
  },
  {
    id: 'lake-b',
    name: 'Zone B - Admin Offices',
    buildingId: 'lakeside',
    buildingName: 'Lakeside Medical Center',
  },
];

const FAULT_INFO: Record<
  FaultType,
  { severity: FaultSeverity; summary: string; explanation: string; costPerMonth: number }
> = {
  stuck_damper: {
    severity: 'high',
    summary: 'Damper stuck near fully open',
    explanation:
      "The outside-air damper has held near 95% open for the last 18 hours regardless of the temperature setpoint. It isn't responding to the control signal, so the zone is pulling in far more outside air than it needs, which is why the room temperature is tracking the weather instead of the setpoint.",
    costPerMonth: 410,
  },
  valve_leak_by: {
    severity: 'medium',
    summary: 'Heating valve leaking by when it should be shut',
    explanation:
      "The heating valve is reading ~15% open even while the system is idle and no heating is called for. A small amount of hot water is still passing through, quietly overheating the zone and wasting energy while the equipment appears off.",
    costPerMonth: 180,
  },
  simultaneous_heating_cooling: {
    severity: 'high',
    summary: 'Heating and cooling active at the same time',
    explanation:
      'The cooling coil is actively running while the heating valve is also holding around 60% open. The two systems are fighting each other, which wastes a large amount of energy and adds unnecessary wear on both the boiler and the chiller.',
    costPerMonth: 560,
  },
  sensor_drift: {
    severity: 'low',
    summary: 'Temperature sensor reading appears to be drifting',
    explanation:
      'The zone temperature sensor has drifted about 2°F away from its expected baseline over the last few days. On its own this is a minor comfort issue, but it can also cause the controller to over- or under-heat the room without anyone noticing.',
    costPerMonth: 90,
  },
};

function buildFault(type: FaultType, hoursAgoDetected: number): Fault {
  const info = FAULT_INFO[type];
  return {
    id: `${type}`,
    type,
    severity: info.severity,
    summary: info.summary,
    explanation: info.explanation,
    detectedAt: new Date(Date.now() - hoursAgoDetected * 60 * 60 * 1000).toISOString(),
    estimatedCostPerMonth: info.costPerMonth,
  };
}

function healthFromFaults(faults: Fault[]): ZoneDetail['healthStatus'] {
  if (faults.some((fault) => fault.severity === 'high')) return 'critical';
  if (faults.length > 0) return 'warning';
  return 'healthy';
}

const TREND_HOURS = 48;
const FAULT_WINDOW_HOURS = 18;
const SETPOINT_F = 72;

function buildTrend(fault?: FaultType): SensorReading[] {
  const readings: SensorReading[] = [];
  const now = Date.now();

  for (let hoursAgo = TREND_HOURS; hoursAgo >= 0; hoursAgo -= 1) {
    const timestamp = new Date(now - hoursAgo * 60 * 60 * 1000);
    // Rough day/night curve: warmest mid-afternoon, coolest before dawn.
    const diurnal = Math.sin(((timestamp.getHours() - 6) / 24) * Math.PI * 2);
    const jitter = () => (Math.random() - 0.5);

    let zoneTempF = SETPOINT_F + diurnal * 1.5 + jitter();
    let damperPositionPct = 30 + diurnal * 10 + jitter() * 5;
    let valveOpenPct = Math.max(0, 15 - diurnal * 12 + jitter() * 4);
    let mode: HvacMode = valveOpenPct > 8 ? 'heating' : diurnal > 0.3 ? 'cooling' : 'idle';

    const inFaultWindow = fault && hoursAgo <= FAULT_WINDOW_HOURS;
    if (inFaultWindow) {
      switch (fault) {
        case 'stuck_damper':
          damperPositionPct = 95 + jitter();
          zoneTempF = SETPOINT_F + diurnal * 4.5 + jitter(); // swings more since damper won't correct
          break;
        case 'simultaneous_heating_cooling':
          valveOpenPct = 60 + jitter() * 4;
          mode = 'cooling'; // actively cooling while heating valve stays open
          zoneTempF = SETPOINT_F - 1 + jitter();
          break;
        case 'valve_leak_by':
          valveOpenPct = 15 + jitter() * 3;
          mode = 'idle';
          zoneTempF = SETPOINT_F + 1.8 + jitter();
          break;
        case 'sensor_drift':
          zoneTempF = SETPOINT_F + 2 + jitter() * 0.5;
          break;
      }
    }

    readings.push({
      timestamp: timestamp.toISOString(),
      zoneTempF: Number(zoneTempF.toFixed(1)),
      setpointF: SETPOINT_F,
      damperPositionPct: Number(Math.min(100, Math.max(0, damperPositionPct)).toFixed(0)),
      valveOpenPct: Number(Math.min(100, Math.max(0, valveOpenPct)).toFixed(0)),
      mode,
    });
  }

  return readings;
}

export const MOCK_ZONES: ZoneDetail[] = ZONE_SEEDS.map((seed) => {
  const faults = seed.fault ? [buildFault(seed.fault, 6)] : [];
  return {
    id: seed.id,
    name: seed.name,
    buildingId: seed.buildingId,
    buildingName: seed.buildingName,
    healthStatus: healthFromFaults(faults),
    faults,
    sensorTrend: buildTrend(seed.fault),
  };
});

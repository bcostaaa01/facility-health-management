// Shapes mirror what the future FastAPI backend will return, so the mock
// data layer in src/data and src/api can be swapped for real HTTP calls
// later without touching any component.

export type HealthStatus = 'healthy' | 'warning' | 'critical';

export type FaultSeverity = 'low' | 'medium' | 'high';

export type FaultType =
  | 'stuck_damper'
  | 'valve_leak_by'
  | 'simultaneous_heating_cooling'
  | 'sensor_drift';

export interface Fault {
  id: string;
  type: FaultType;
  severity: FaultSeverity;
  /** Short label for lists ("Damper stuck near fully open"). */
  summary: string;
  /** Plain-language explanation for a non-technical facility manager. */
  explanation: string;
  detectedAt: string;
  /** Rough $/month cost of leaving this fault unaddressed (energy waste, comfort risk, equipment wear). */
  estimatedCostPerMonth: number;
}

export interface ZoneSummary {
  id: string;
  name: string;
  buildingId: string;
  buildingName: string;
  healthStatus: HealthStatus;
  faults: Fault[];
}

export type HvacMode = 'heating' | 'cooling' | 'idle';

export interface SensorReading {
  timestamp: string;
  zoneTempF: number;
  setpointF: number;
  damperPositionPct: number;
  valveOpenPct: number;
  mode: HvacMode;
}

export interface ZoneDetail extends ZoneSummary {
  sensorTrend: SensorReading[];
}

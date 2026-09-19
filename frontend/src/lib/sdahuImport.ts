// Client-side port of data/build_zones.py's threshold rules, so a CSV can
// be imported and scored in the browser without a backend. Keep the two
// in sync if the rules change - this is a preview of what a real
// fault_detection.py will do server-side later, not a replacement for it.

import type { Fault, FaultSeverity, FaultType, SensorReading, ZoneDetail } from '../types';

const ZONE_COLUMNS = ['ZONE_TEMP_1', 'ZONE_TEMP_2', 'ZONE_TEMP_3', 'ZONE_TEMP_4', 'ZONE_TEMP_5'];

const REQUIRED_COLUMNS = [
  'Datetime',
  'OA_DMPR',
  'OA_DMPR_DM',
  'CHWC_VLV',
  'CHWC_VLV_DM',
  'SA_TEMPSPT',
  ...ZONE_COLUMNS,
];

const TARGET_TREND_POINTS = 48;

export class CsvImportError extends Error {}

export interface SdahuRow {
  [column: string]: string;
}

interface FaultDefinition {
  severity: FaultSeverity;
  summary: string;
  explanation: string;
  costPerMonth: number;
}

const FAULT_INFO: Record<FaultType, FaultDefinition> = {
  stuck_damper: {
    severity: 'high',
    summary: 'Outside-air damper not tracking its command',
    explanation:
      "OA_DMPR (actual damper position) is holding well away from OA_DMPR_DM (the commanded position) across this file. The damper isn't responding to the control signal.",
    costPerMonth: 410,
  },
  valve_leak_by: {
    severity: 'medium',
    summary: 'Chilled water valve leaking by when it should be shut',
    explanation:
      'CHWC_VLV (actual valve position) stays open while CHWC_VLV_DM (commanded position) calls for fully closed. Water keeps passing through a valve that should be sealed.',
    costPerMonth: 180,
  },
  simultaneous_heating_cooling: {
    severity: 'high',
    summary: 'Heating and cooling active at the same time',
    explanation: 'Heating and cooling equipment both appear active at once, wasting energy fighting each other.',
    costPerMonth: 560,
  },
  sensor_drift: {
    severity: 'low',
    summary: 'A sensor reading appears to be drifting',
    explanation: 'A sensor reading has drifted away from its expected baseline.',
    costPerMonth: 90,
  },
};

function assertRequiredColumns(fields: string[]): void {
  const missing = REQUIRED_COLUMNS.filter((column) => !fields.includes(column));
  if (missing.length > 0) {
    throw new CsvImportError(
      `This doesn't look like a single-duct AHU export (see data/README.md for the expected schema). Missing column${
        missing.length > 1 ? 's' : ''
      }: ${missing.join(', ')}`,
    );
  }
}

function normalizeTimestamp(raw: string): string {
  const trimmed = raw.trim();
  const isoLike = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T');
  const hasTimezone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(isoLike);
  return hasTimezone ? isoLike : `${isoLike}Z`;
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function detectFault(rows: SdahuRow[]): FaultType | null {
  const damperGap = mean(rows.map((row) => Math.abs(Number(row.OA_DMPR) - Number(row.OA_DMPR_DM))));
  if (damperGap > 0.2) return 'stuck_damper';

  // Compare actual vs. commanded only in the moments demand calls for fully
  // closed - averaging over the whole window dilutes the signal whenever
  // demand legitimately opens the valve elsewhere in the file.
  const closedRows = rows.filter((row) => Number(row.CHWC_VLV_DM) < 0.02);
  if (closedRows.length > rows.length * 0.2) {
    const actualWhenClosed = mean(closedRows.map((row) => Number(row.CHWC_VLV)));
    if (actualWhenClosed > 0.03) return 'valve_leak_by';
  }

  return null;
}

function buildFault(type: FaultType, detectedAt: string): Fault {
  const info = FAULT_INFO[type];
  return {
    id: type,
    type,
    severity: info.severity,
    summary: info.summary,
    explanation: info.explanation,
    detectedAt,
    estimatedCostPerMonth: info.costPerMonth,
  };
}

function sampleEvenly<T>(rows: T[], targetCount: number): T[] {
  if (rows.length <= targetCount) return rows;
  const stride = Math.max(1, Math.floor(rows.length / targetCount));
  return rows.filter((_, index) => index % stride === 0);
}

function toReading(row: SdahuRow, zoneColumn: string): SensorReading {
  const valvePct = Math.max(0, Number(row.CHWC_VLV)) * 100;
  const damperPct = Math.max(0, Number(row.OA_DMPR)) * 100;
  return {
    timestamp: normalizeTimestamp(row.Datetime),
    zoneTempF: Math.round(Number(row[zoneColumn]) * 10) / 10,
    setpointF: Math.round(Number(row.SA_TEMPSPT) * 10) / 10,
    damperPositionPct: Math.round(Math.min(100, damperPct)),
    valveOpenPct: Math.round(Math.min(100, valvePct)),
    mode: valvePct > 5 ? 'cooling' : 'idle',
  };
}

export interface ImportTarget {
  buildingId: string;
  buildingName: string;
}

export function buildZonesFromSdahuRows(rows: SdahuRow[], target: ImportTarget): ZoneDetail[] {
  if (rows.length === 0) {
    throw new CsvImportError('That file has no data rows.');
  }
  assertRequiredColumns(Object.keys(rows[0]));

  const faultType = detectFault(rows);
  const sampled = sampleEvenly(rows, TARGET_TREND_POINTS);
  const trend = (zoneColumn: string) => sampled.map((row) => toReading(row, zoneColumn));

  return ZONE_COLUMNS.map((zoneColumn, index) => {
    const sensorTrend = trend(zoneColumn);
    const faults = faultType ? [buildFault(faultType, sensorTrend[sensorTrend.length - 1].timestamp)] : [];
    return {
      id: `${target.buildingId}-zone-${index + 1}`,
      name: `Zone ${index + 1}`,
      buildingId: target.buildingId,
      buildingName: target.buildingName,
      healthStatus: faults.length === 0 ? 'healthy' : faults[0].severity === 'high' ? 'critical' : 'warning',
      faults,
      sensorTrend,
    };
  });
}

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SensorReading } from '../types';

function formatHour(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric' });
}

function formatFullTimestamp(label: React.ReactNode) {
  if (typeof label !== 'string' && typeof label !== 'number') return '';
  return new Date(label).toLocaleString([], {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const tooltipStyle = {
  background: 'var(--chart-surface)',
  border: '1px solid var(--text-primary)',
  borderRadius: 0,
  color: 'var(--text-primary)',
  fontSize: 12,
  fontFamily: 'var(--mono)',
};

// Two charts instead of one dual-axis chart: temperature (degrees F) and
// actuator position (%) are different units on different scales, so they
// get separate y-axes rather than sharing one chart with two scales.
export function SensorTrendChart({ readings }: { readings: SensorReading[] }) {
  return (
    <div className="trend-chart">
      <div className="trend-chart__panel">
        <h3 className="trend-chart__title">Zone temperature</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={readings} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--gridline)" vertical={false} />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatHour}
              minTickGap={40}
              stroke="var(--muted)"
              tick={{ fill: 'var(--muted)', fontSize: 12 }}
            />
            <YAxis
              width={40}
              unit="°F"
              stroke="var(--muted)"
              tick={{ fill: 'var(--muted)', fontSize: 12 }}
            />
            <Tooltip labelFormatter={formatFullTimestamp} contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 13, color: 'var(--text-secondary)' }} />
            <Line
              type="monotone"
              dataKey="zoneTempF"
              name="Zone temp"
              stroke="var(--series-1)"
              dot={false}
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="setpointF"
              name="Setpoint"
              stroke="var(--muted)"
              strokeDasharray="4 4"
              dot={false}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="trend-chart__panel">
        <h3 className="trend-chart__title">Actuator response</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={readings} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--gridline)" vertical={false} />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatHour}
              minTickGap={40}
              stroke="var(--muted)"
              tick={{ fill: 'var(--muted)', fontSize: 12 }}
            />
            <YAxis
              width={40}
              unit="%"
              domain={[0, 100]}
              stroke="var(--muted)"
              tick={{ fill: 'var(--muted)', fontSize: 12 }}
            />
            <Tooltip labelFormatter={formatFullTimestamp} contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 13, color: 'var(--text-secondary)' }} />
            <Line
              type="monotone"
              dataKey="damperPositionPct"
              name="Damper position"
              stroke="var(--series-2)"
              dot={false}
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="valveOpenPct"
              name="Valve open"
              stroke="var(--series-3)"
              dot={false}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

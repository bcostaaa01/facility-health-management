import type { HealthStatus } from '../types';

const LABEL: Record<HealthStatus, string> = {
  healthy: 'Healthy',
  warning: 'Needs attention',
  critical: 'Critical',
};

export function HealthBadge({ status }: { status: HealthStatus }) {
  return <span className={`pill pill--${status}`}>{LABEL[status]}</span>;
}

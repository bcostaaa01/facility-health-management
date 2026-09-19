import type { HealthStatus } from '../types';

const LABEL: Record<HealthStatus, string> = {
  healthy: 'Healthy',
  warning: 'Needs attention',
  critical: 'Critical',
};

export function HealthBadge({ status }: { status: HealthStatus }) {
  return (
    <span className={`health-badge health-badge--${status}`}>
      <span className="health-badge__dot" aria-hidden="true" />
      {LABEL[status]}
    </span>
  );
}

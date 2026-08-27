const STATUS_MAP: Record<string, string> = {
  // Success
  'open': 'success', 'active': 'success', 'issued': 'success', 'approved': 'success', 'passed': 'success',
  // Warning
  'pending': 'warning', 'in review': 'warning', 'in progress': 'warning', 'scheduled': 'warning',
  // Error
  'closed': 'error', 'denied': 'error', 'failed': 'error', 'rejected': 'error', 'expired': 'error',
  // Info
  'new': 'info', 'submitted': 'info',
};

function getVariant(status: string): string {
  const key = status.toLowerCase().trim();
  return STATUS_MAP[key] || 'muted';
}

export function StatusBadge({ status }: { status: string }) {
  const variant = getVariant(status);
  return (
    <span className={`radish-badge radish-badge--${variant}`}>
      {status}
    </span>
  );
}

/** Formatting helpers shared across the dashboard. */

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Parse an API date. A date-only value ("2026-09-11", e.g. birth_date) is a
 * calendar day, not an instant: `new Date("2026-09-11")` would read it as
 * UTC midnight and show the previous day in any timezone behind UTC. Build
 * it as local midnight instead; full timestamps are parsed as usual.
 */
export function parseApiDate(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(iso);
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return parseApiDate(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

export function ageFromBirthDate(birthDate: string): string {
  const birth = parseApiDate(birthDate);
  const now = new Date();
  const days = Math.floor((now.getTime() - birth.getTime()) / 86_400_000);
  if (days < 0) return '—';
  if (days < 60) return `${days} day${days === 1 ? '' : 's'}`;
  const months = Math.floor(days / 30.44);
  return `${months} month${months === 1 ? '' : 's'}`;
}

export function fmtNumber(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined) return '—';
  return v.toFixed(digits);
}

export const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  warning: 'bg-amber-100 text-amber-800 border-amber-200',
  info: 'bg-blue-100 text-blue-800 border-blue-200',
};

export const ALERT_TYPE_LABELS: Record<string, string> = {
  high_temp: 'High temperature',
  low_temp: 'Low temperature',
  high_hr: 'High heart rate',
  low_hr: 'Low heart rate',
  high_resp: 'High respiratory rate',
  low_resp: 'Low respiratory rate',
  belt_removed: 'belt removed',
  battery_low: 'Low battery',
  ble_lost: 'Bluetooth connection lost',
  no_data: 'No data received',
};

export function alertTypeLabel(type: string): string {
  return ALERT_TYPE_LABELS[type] ?? type;
}

export const ENROLLMENT_REASON_LABELS: Record<string, string> = {
  prematurity: 'Prematurity',
  clinical_sign: 'Clinical sign',
  congenital_condition: 'Congenital condition',
  other: 'Other',
};

export function enrollmentReasonLabel(reason: string): string {
  return ENROLLMENT_REASON_LABELS[reason] ?? reason;
}

/** Parent column/label: babies enrolled before the parent accepted have no parent yet. */
export function parentLabel(baby: { parent: number | null; parent_name: string }): string {
  if (baby.parent === null) return 'No parent linked — invitation pending';
  return baby.parent_name || '—';
}

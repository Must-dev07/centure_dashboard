'use client';

/** Small shared UI primitives: badges, stat cards, loading/error/empty states. */

import { Icon, type IconName } from '@/components/icons';

/**
 * Severity look. Rule: NEVER colour alone — every level has an icon AND a text label,
 * so it is readable by colour-blind users and in a quick glance.
 * Unknown severities fall back to a neutral badge (nothing is ever hidden).
 */
const SEVERITY: Record<string, { cls: string; icon: IconName }> = {
  critical: { cls: 'bg-danger-soft text-danger-ink border-danger/30', icon: 'alert' },
  high: { cls: 'bg-danger-soft text-danger-ink border-danger/30', icon: 'alert' },
  warning: { cls: 'bg-warn-soft text-warn-ink border-warn-line', icon: 'alert-circle' },
  medium: { cls: 'bg-warn-soft text-warn-ink border-warn-line', icon: 'alert-circle' },
  low: { cls: 'bg-surface-high text-brand-800 border-brand-200', icon: 'info' },
  info: { cls: 'bg-surface-high text-brand-800 border-brand-200', icon: 'info' },
};
const SEVERITY_FALLBACK = { cls: 'bg-slate-100 text-slate-700 border-slate-200', icon: 'info' as IconName };

export function SeverityBadge({ severity }: { severity: string }) {
  const s = SEVERITY[severity?.toLowerCase()] ?? SEVERITY_FALLBACK;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.6px] ${s.cls}`}
    >
      <Icon name={s.icon} className="h-3 w-3" />
      {severity}
    </span>
  );
}

export function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${active ? 'bg-ok' : 'bg-slate-300'}`}
      role="img"
      aria-label={active ? 'active' : 'inactive'}
    />
  );
}

const ACCENT: Record<string, { value: string; iconBox: string }> = {
  red: { value: 'text-danger', iconBox: 'bg-danger-soft text-danger' },
  amber: { value: 'text-warn', iconBox: 'bg-warn-soft text-warn' },
  emerald: { value: 'text-ok', iconBox: 'bg-ok-soft text-ok' },
  brand: { value: 'text-ink', iconBox: 'bg-surface-high text-brand-600' },
};

/** KPI card (Figma "Telemetry Operational Key Metric Counters"). */
export function StatCard({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'red' | 'amber' | 'emerald' | 'brand';
  icon?: IconName;
}) {
  const a = ACCENT[accent ?? 'brand'];
  return (
    <article className="card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">{label}</p>
          <p className={`mt-1 text-[32px] font-bold leading-9 tracking-tight ${a.value}`}>{value}</p>
        </div>
        {icon ? (
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded ${a.iconBox}`}>
            <Icon name={icon} className="h-5 w-5" />
          </span>
        ) : null}
      </div>
      {sub ? <p className="mt-3 border-t border-surface-low pt-3 text-xs text-ink-muted">{sub}</p> : null}
    </article>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-ink-faint">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-surface-high border-t-brand-600" />
      {label}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger-ink"
    >
      <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function Empty({ message }: { message: string }) {
  return <div className="py-12 text-center text-sm text-ink-faint">{message}</div>;
}

export function PageTitle({ title, sub, actions }: { title: string; sub?: string; actions?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {sub ? <p className="mt-1 text-sm text-ink-muted">{sub}</p> : null}
      </div>
      {actions}
    </header>
  );
}

'use client';

/**
 * Authenticated app shell: sidebar navigation + top bar + disclaimer.
 * Redirects to /login when no session is present. Admin-only links are
 * hidden for doctors (backend enforces authorization regardless).
 *
 * Layout follows the Figma "Clinical Doctor Dashboard" frame:
 * grouped sidebar (MAIN CLINICAL / CLINICAL TRIAGE / SYSTEM ADMINISTRATION),
 * top bar with safety pill + primary action + profile.
 */

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon, type IconName } from '@/components/icons';
import { getStoredUser, isLoggedIn, logout } from '@/lib/api';
import { MEDICAL_DISCLAIMER, type UserSummary } from '@/lib/types';

type NavItem = { href: string; label: string; icon: IconName };
type NavGroup = { title: string; items: NavItem[]; adminOnly?: boolean };

const GROUPS: NavGroup[] = [
  {
    title: 'Main clinical',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
      { href: '/patients', label: 'Patients', icon: 'patients' },
      { href: '/enroll', label: 'Enroll newborn', icon: 'enroll' },
      { href: '/pending-enrollments', label: 'Pending enrollments', icon: 'pending' },
    ],
  },
  {
    title: 'Clinical triage',
    items: [
      { href: '/alerts', label: 'Alerts & triage', icon: 'alert' },
      { href: '/notifications', label: 'Notifications', icon: 'bell' },
      { href: '/statistics', label: 'Clinical statistics', icon: 'chart' },
      { href: '/reports', label: 'Patient reports', icon: 'file' },
    ],
  },
  {
    title: 'System',
    items: [{ href: '/settings', label: 'Settings', icon: 'settings' }],
  },
];

const ADMIN_ITEMS: NavItem[] = [{ href: '/users', label: 'User management', icon: 'users' }];

function initials(u: UserSummary | null) {
  if (!u) return '';
  return `${u.first_name?.[0] ?? ''}${u.last_name?.[0] ?? ''}`.toUpperCase();
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserSummary | null>(null);
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace('/login');
      return;
    }
    setUser(getStoredUser());
    setReady(true);
  }, [router]);

  // Close the mobile drawer whenever the page changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-ink-faint">Loading…</div>
    );
  }

  // Admin sees the extra "User management" link inside the System group.
  const groups = GROUPS.map((g) =>
    g.title === 'System' && user?.role === 'admin' ? { ...g, items: [...g.items, ...ADMIN_ITEMS] } : g,
  );

  const sidebar = (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-16 items-center gap-3 px-6">
        <span className="flex h-8 w-8 items-center justify-center rounded bg-brand-600 text-white">
          <Icon name="pulse" className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[18px] font-semibold leading-[18px] text-ink">Centure MD</p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.5px] text-ink-muted">
            Neonatal telemetry
          </p>
        </div>
      </div>

      <nav id="main-nav" aria-label="Main" className="flex-1 space-y-4 overflow-y-auto p-3">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="eyebrow px-3 pb-2 pt-1">{group.title}</p>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={`flex items-center gap-3 rounded px-3 py-2 text-sm transition ${
                        active
                          ? 'bg-brand-500 text-white'
                          : 'text-ink-muted hover:bg-surface-low hover:text-ink'
                      }`}
                    >
                      <Icon name={item.icon} className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Safety notice stays visible on every page (prototype, not a medical device). */}
      <div className="space-y-2 p-3">
        <div className="rounded bg-surface-low p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-ink">
            <Icon name="shield" className="h-3.5 w-3.5 text-brand-600" />
            Clinical protocol disclaimer
          </p>
          <p className="mt-1 text-[11px] leading-snug text-ink-muted">{MEDICAL_DISCLAIMER}</p>
        </div>
        <button
          id="logout-button"
          className="flex w-full items-center gap-3 rounded px-3 py-2 text-sm text-ink-muted transition hover:bg-surface-low hover:text-ink"
          onClick={async () => {
            await logout();
            router.replace('/login');
          }}
        >
          <Icon name="logout" className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 shadow-[1px_0_4px_rgba(0,0,0,0.04)] md:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {menuOpen ? (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64 shadow-xl">{sidebar}</div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-surface-mid bg-white/90 px-4 backdrop-blur md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="rounded p-2 text-ink-muted hover:bg-surface-low md:hidden"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
            >
              <Icon name="menu" className="h-5 w-5" />
            </button>
            <span className="hidden items-center gap-1.5 rounded bg-surface-high px-2.5 py-1 text-[11px] font-medium text-brand-800 sm:inline-flex">
              <Icon name="info" className="h-3.5 w-3.5" />
              Non-diagnostic prototype — not a medical device
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/enroll" className="btn-primary hidden sm:inline-flex">
              <Icon name="enroll" className="h-4 w-4" />
              Enroll newborn
            </Link>
            <Link
              href="/notifications"
              aria-label="Notifications"
              className="rounded p-2 text-ink-muted hover:bg-surface-low"
            >
              <Icon name="bell" className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700"
              >
                {initials(user)}
              </span>
              <div className="hidden leading-tight sm:block">
                <p className="text-sm font-semibold text-ink">
                  {user ? `${user.first_name} ${user.last_name}` : ''}
                </p>
                <p className="text-[11px] capitalize text-ink-muted">{user?.role}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

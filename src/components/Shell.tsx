'use client';

/**
 * Authenticated app shell: sidebar navigation + top bar + disclaimer.
 * Redirects to /login when no session is present. Admin-only links are
 * hidden for doctors (backend enforces authorization regardless).
 *
 * Responsive behaviour of the sidebar (ONE <aside>, so ids stay unique):
 *  - Phone / tablet (< 1024px): hidden off-screen; the ☰ button slides it in as a drawer.
 *    Closes on: backdrop click, ✕ button, Escape key, or choosing a page.
 *  - Desktop (>= 1024px): always visible; the toggle button collapses it to an
 *    icon-only rail (and back). The choice is remembered in localStorage.
 */

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon, type IconName } from '@/components/icons';
import { getStoredUser, isLoggedIn, logout } from '@/lib/api';
import { MEDICAL_DISCLAIMER, type UserSummary } from '@/lib/types';

type NavItem = { href: string; label: string; icon: IconName };
type NavGroup = { title: string; items: NavItem[] };

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
      { href: '/alerts', label: 'Alerts', icon: 'alert' },
      { href: '/notifications', label: 'Notifications', icon: 'bell' },
      { href: '/statistics', label: 'Statistics', icon: 'chart' },
      { href: '/reports', label: 'Reports', icon: 'file' },
    ],
  },
  {
    title: 'System',
    items: [{ href: '/settings', label: 'Settings', icon: 'settings' }],
  },
];

const ADMIN_ITEMS: NavItem[] = [{ href: '/users', label: 'Users', icon: 'users' }];

const COLLAPSE_KEY = 'sb_sidebar_collapsed';

function initials(u: UserSummary | null) {
  if (!u) return '';
  return `${u.first_name?.[0] ?? ''}${u.last_name?.[0] ?? ''}`.toUpperCase();
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserSummary | null>(null);
  const [ready, setReady] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false); // drawer (< lg)
  const [collapsed, setCollapsed] = useState(false); // icon rail (>= lg)

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace('/login');
      return;
    }
    setUser(getStoredUser());
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1');
    } catch {
      /* localStorage can be blocked: just use the default */
    }
    setReady(true);
  }, [router]);

  // Close the drawer whenever the page changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // While the drawer is open: Escape closes it, and the page behind does not scroll.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  function toggleCollapsed() {
    setCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center text-ink-faint">Loading…</div>;
  }

  // Admin sees the extra "Users" link inside the System group.
  const groups = GROUPS.map((g) =>
    g.title === 'System' && user?.role === 'admin' ? { ...g, items: [...g.items, ...ADMIN_ITEMS] } : g,
  );

  // Helper: classes that only apply on desktop when the rail is collapsed.
  const hideWhenCollapsed = collapsed ? 'lg:hidden' : '';

  return (
    <div className="flex min-h-screen">
      {/* Dark backdrop behind the drawer (phone / tablet only) */}
      <div
        aria-hidden
        onClick={() => setMobileOpen(false)}
        className={`fixed inset-0 z-40 bg-slate-900/40 transition-opacity duration-200 lg:hidden ${
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        aria-label="Sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white shadow-xl transition-[transform,visibility,width] duration-200 ease-out
          lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0 lg:shadow-[1px_0_4px_rgba(0,0,0,0.04)] lg:visible
          ${collapsed ? 'lg:w-[72px]' : 'lg:w-64'}
          ${mobileOpen ? 'translate-x-0 visible' : '-translate-x-full invisible'}`}
      >
        {/* Brand */}
        <div className={`flex h-16 shrink-0 items-center gap-3 px-5 ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Icon name="pulse" className="h-5 w-5" />
          </span>
          <div className={`min-w-0 flex-1 ${hideWhenCollapsed}`}>
            <p className="truncate text-base font-bold leading-tight text-ink">Smart belt</p>
            <p className="truncate text-[11px] text-ink-muted">Doctor Dashboard</p>
          </div>
          <button
            className="rounded p-1.5 text-ink-muted hover:bg-surface-low lg:hidden"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav id="main-nav" aria-label="Main" className="flex-1 space-y-3 overflow-y-auto overflow-x-hidden p-3">
          {groups.map((group) => (
            <div key={group.title}>
              <p className={`eyebrow px-3 pb-2 pt-1 ${hideWhenCollapsed}`}>{group.title}</p>
              {/* thin divider replaces the title in the collapsed rail */}
              <div aria-hidden className={`mx-2 mb-2 hidden h-px bg-surface-mid ${collapsed ? 'lg:block' : ''}`} />
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const active = pathname.startsWith(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        aria-current={active ? 'page' : undefined}
                        className={`flex items-center gap-3 rounded px-3 py-2 text-sm transition ${
                          collapsed ? 'lg:justify-center lg:px-0' : ''
                        } ${
                          active
                            ? 'bg-brand-500 text-white'
                            : 'text-ink-muted hover:bg-surface-low hover:text-ink'
                        }`}
                      >
                        <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
                        <span className={`truncate ${hideWhenCollapsed}`}>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer: disclaimer + sign out */}
        <div className="shrink-0 space-y-2 p-3">
          <div className={`rounded bg-surface-low p-3 ${hideWhenCollapsed}`}>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-ink">
              <Icon name="shield" className="h-3.5 w-3.5 text-brand-600" />
              Clinical disclaimer
            </p>
            <p className="mt-1 text-[11px] leading-snug text-ink-muted">{MEDICAL_DISCLAIMER}</p>
          </div>
          {/* In the collapsed rail the disclaimer shrinks to an icon (full text on hover) */}
          <div
            title={MEDICAL_DISCLAIMER}
            className={`hidden justify-center rounded bg-surface-low p-2 text-brand-600 ${collapsed ? 'lg:flex' : ''}`}
          >
            <Icon name="shield" className="h-[18px] w-[18px]" />
            <span className="sr-only">{MEDICAL_DISCLAIMER}</span>
          </div>

          <button
            id="logout-button"
            title={collapsed ? 'Sign out' : undefined}
            className={`flex w-full items-center gap-3 rounded px-3 py-2 text-sm text-ink-muted transition hover:bg-surface-low hover:text-ink ${
              collapsed ? 'lg:justify-center lg:px-0' : ''
            }`}
            onClick={async () => {
              await logout();
              router.replace('/login');
            }}
          >
            <Icon name="logout" className="h-[18px] w-[18px] shrink-0" />
            <span className={hideWhenCollapsed}>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b border-surface-mid bg-white/90 px-3 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            {/* < lg: open the drawer */}
            <button
              className="rounded p-2 text-ink-muted hover:bg-surface-low lg:hidden"
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              aria-controls="main-nav"
              onClick={() => setMobileOpen(true)}
            >
              <Icon name="menu" className="h-5 w-5" />
            </button>
            {/* >= lg: collapse / expand the rail */}
            <button
              className="hidden rounded p-2 text-ink-muted hover:bg-surface-low lg:inline-flex"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-pressed={collapsed}
              onClick={toggleCollapsed}
            >
              <Icon name="menu" className="h-5 w-5" />
            </button>

            <span className="hidden min-w-0 items-center gap-1.5 truncate rounded bg-surface-high px-2.5 py-1 text-[11px] font-medium text-brand-800 md:inline-flex">
              <Icon name="info" className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                Non-diagnostic prototype<span className="hidden xl:inline"> — not a medical device</span>
              </span>
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            <Link href="/enroll" aria-label="Enroll newborn" className="btn-primary px-2.5 sm:px-3.5">
              <Icon name="enroll" className="h-4 w-4" />
              <span className="hidden sm:inline">Enroll newborn</span>
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
              <div className="hidden leading-tight md:block">
                <p className="text-sm font-semibold text-ink">
                  {user ? `${user.first_name} ${user.last_name}` : ''}
                </p>
                <p className="text-[11px] capitalize text-ink-muted">{user?.role}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Small screens: the safety notice moves to a slim bar (the pill above is md+) */}
        <p
          role="note"
          className="flex items-center justify-center gap-1.5 bg-surface-high px-3 py-1.5 text-center text-[11px] font-medium text-brand-800 md:hidden"
        >
          <Icon name="info" className="h-3.5 w-3.5 shrink-0" />
          Non-diagnostic prototype — not a medical device
        </p>

        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

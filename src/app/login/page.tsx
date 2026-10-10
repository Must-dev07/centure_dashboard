'use client';

/**
 * Login page — design follows the Figma "Sign In" frame:
 * safety notice on top, dark info panel on the left, white form on the right.
 * Login logic (login(), parent check, error handling) is unchanged.
 */

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icon } from '@/components/icons';
import { ApiError, login } from '@/lib/api';
import { MEDICAL_DISCLAIMER } from '@/lib/types';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const pair = await login(email, password);
      if (pair.user.role === 'parent') {
        setError('This dashboard is for doctors and administrators. Parents should use the mobile app.');
        return;
      }
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to sign in. Check your connection.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      {/* Safety notice: always visible, same wording idea as the Figma banner */}
      <aside
        role="note"
        className="flex items-start gap-2.5 border-b border-warn-line/80 bg-warn-soft/90 px-4 py-2.5 text-xs text-warn-ink"
      >
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-[11px] font-bold text-amber-900">
          !
        </span>
        <p>
          <strong className="mr-1 text-[11px] uppercase tracking-[0.3px] text-amber-950">Clinical notice:</strong>
          Centure is a <span className="font-medium underline">prototype, not a diagnostic device</span>. In an
          emergency, follow your hospital bedside protocol.
        </p>
      </aside>

      <main className="flex flex-1 items-center justify-center p-4 md:p-8">
        <section
          id="login-card"
          className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-pop md:grid-cols-12"
        >
          {/* Left: dark info panel (hidden on small screens) */}
          <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-10 md:col-span-5 md:flex">
            <div aria-hidden className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />
            <div aria-hidden className="absolute bottom-0 left-1/3 h-64 w-1/2 rounded-full bg-teal-500/10 blur-3xl" />

            <div className="relative">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-white shadow-lg">
                  <Icon name="pulse" className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-base font-bold tracking-tight text-white">Centure MD</p>
                  <p className="text-[11px] font-medium uppercase tracking-[0.55px] text-sky-400">
                    Neonatal telemetry
                  </p>
                </div>
              </div>

              <h2 className="mt-12 text-2xl font-bold leading-snug tracking-tight text-white">
                Newborn monitoring and alerts, in one place
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                Follow the vitals sent by the smart belt, review alerts and manage enrollments for your
                patients.
              </p>
            </div>

            <div className="relative mt-10 rounded-xl border border-sky-500/20 bg-slate-800/40 p-4">
              <div className="flex items-start gap-2.5">
                <Icon name="users" className="mt-0.5 h-5 w-5 shrink-0 text-sky-400" />
                <p className="text-xs leading-relaxed text-slate-300">
                  <span className="font-semibold text-white">Parents &amp; caregivers: </span>
                  this portal is for doctors and administrators only. To follow your newborn, please use the
                  Centure mobile app.
                </p>
              </div>
            </div>
          </div>

          {/* Right: form */}
          <div className="flex flex-col justify-between p-6 sm:p-10 md:col-span-7">
            <div>
              {/* Mobile-only logo (left panel is hidden there) */}
              <div className="mb-6 flex items-center gap-2.5 md:hidden">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
                  <Icon name="pulse" className="h-5 w-5" />
                </span>
                <p className="text-base font-bold text-ink">Centure MD</p>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-ink">Doctor &amp; administrator access</h1>
              <p className="mt-1 text-sm text-slate-500">Sign in to view your patients and their alerts.</p>

              <form onSubmit={onSubmit} className="mt-8 space-y-4">
                <div>
                  <label htmlFor="login-email" className="label">
                    Email
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    className="input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label htmlFor="login-password" className="label">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      className="input pr-16"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-pressed={showPassword}
                      className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-slate-500 hover:text-ink"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                {error ? (
                  <p
                    role="alert"
                    className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger-ink"
                  >
                    <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
                    {error}
                  </p>
                ) : null}

                <button
                  id="login-submit"
                  type="submit"
                  className="btn-primary w-full py-2.5 text-sm"
                  disabled={busy}
                >
                  {busy ? 'Signing in…' : 'Sign in'}
                </button>
              </form>
            </div>

            <footer className="mt-8 border-t border-slate-100 pt-4">
              <p className="text-[11px] leading-snug text-slate-500">{MEDICAL_DISCLAIMER}</p>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
}

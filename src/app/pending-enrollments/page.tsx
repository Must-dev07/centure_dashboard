'use client';

/**
 * "Enrôlements en attente": invitations whose parent has not accepted yet
 * (GET /api/v1/invitations/?status=pending|expired). The list never contains
 * tokens or links. "Renvoyer l'invitation" (POST /api/v1/invitations/{id}/resend/)
 * issues a new link — valid 7 days, the previous one stops working — which is
 * shown once so the doctor/admin can send it to the parent themselves.
 */

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import InvitationLinkBox from '@/components/InvitationLinkBox';
import { Empty, ErrorBox, Loading, PageTitle } from '@/components/ui';
import { ApiError, apiFetch, fetchAllPages, getStoredUser } from '@/lib/api';
import { fmtDateTime } from '@/lib/format';
import type { Invitation, InvitationResendResponse, UserSummary } from '@/lib/types';

type StatusFilter = 'pending' | 'expired';

function expiryLabel(inv: Invitation): string {
  const ms = new Date(inv.expires_at).getTime() - Date.now();
  if (inv.status === 'expired' || ms <= 0) return `Expired ${fmtDateTime(inv.expires_at)}`;
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  return `Expires ${fmtDateTime(inv.expires_at)} (${days > 0 ? `${days} d ` : ''}${hours} h left)`;
}

function resendErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 409) return 'This invitation has already been accepted.';
    if (e.status === 403 || e.status === 404) return 'You are not allowed to resend this invitation.';
    return e.message;
  }
  return e instanceof Error ? e.message : 'Resend failed.';
}

export default function PendingEnrollmentsPage() {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [status, setStatus] = useState<StatusFilter>('pending');
  const [invitations, setInvitations] = useState<Invitation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [resendingId, setResendingId] = useState<number | null>(null);
  const [resendError, setResendError] = useState<{ id: number; message: string } | null>(null);
  const [resent, setResent] = useState<InvitationResendResponse | null>(null);

  const load = useCallback(async (filter: StatusFilter) => {
    setInvitations(null);
    setError(null);
    try {
      setInvitations(await fetchAllPages<Invitation>(`/api/v1/invitations/?status=${filter}`));
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 403
          ? 'This page is restricted to doctors and administrators.'
          : e instanceof Error
            ? e.message
            : 'Failed to load invitations.',
      );
    }
  }, []);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  useEffect(() => {
    load(status);
  }, [load, status]);

  async function resend(inv: Invitation) {
    if (resendingId !== null) return;
    setResendingId(inv.id);
    setResendError(null);
    setResent(null);
    try {
      const res = await apiFetch<InvitationResendResponse>(`/api/v1/invitations/${inv.id}/resend/`, {
        method: 'POST',
      });
      setResent(res);
      await load(status);
    } catch (e) {
      setResendError({ id: inv.id, message: resendErrorMessage(e) });
    } finally {
      setResendingId(null);
    }
  }

  function createdByLabel(id: number): string {
    return user && user.id === id ? 'You' : `User #${id}`;
  }

  return (
    <Shell>
      <PageTitle
        title="Pending enrollments"
        sub="Babies whose parent has not accepted the invitation yet. Doctors see invitations they created or for their assigned patients."
        actions={
          <Link href="/enroll" className="btn-primary">
            Enroll a newborn
          </Link>
        }
      />

      <nav className="mb-4 flex gap-2" aria-label="Invitation status">
        {(['pending', 'expired'] as StatusFilter[]).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={status === s}
            className={status === s ? 'btn-primary' : 'btn-secondary'}
            onClick={() => {
              setResent(null);
              setResendError(null);
              setStatus(s);
            }}
          >
            {s === 'pending' ? 'Pending' : 'Expired'}
          </button>
        ))}
      </nav>

      {resent ? (
        <section id="resent-invitation" className="card mb-6 max-w-2xl space-y-3" aria-live="polite">
          <h2 className="text-base font-semibold text-slate-900">
            New invitation link for {resent.email}
          </h2>
          <p className="text-sm text-slate-600">
            The previous link no longer works. This new link is valid until{' '}
            {fmtDateTime(resent.expires_at)}.
          </p>
          <InvitationLinkBox link={resent.invitation_link} />
          <button type="button" className="btn-secondary" onClick={() => setResent(null)}>
            Done
          </button>
        </section>
      ) : null}

      {error ? <ErrorBox message={error} /> : null}
      {!invitations && !error ? <Loading /> : null}
      {invitations ? (
        invitations.length === 0 ? (
          <Empty message={status === 'pending' ? 'No pending enrollments.' : 'No expired invitations.'} />
        ) : (
          <section className="card overflow-x-auto p-0">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Parent email</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Babies</th>
                  <th>Created</th>
                  <th>Validity</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((inv) => (
                  <tr key={inv.id}>
                    <td className="font-medium">{inv.email}</td>
                    <td className="text-slate-600">
                      {`${inv.first_name} ${inv.last_name}`.trim() || '—'}
                    </td>
                    <td className="text-slate-600">{inv.phone || '—'}</td>
                    <td>
                      {inv.babies.length === 0 ? (
                        '—'
                      ) : (
                        <ul className="space-y-0.5">
                          {inv.babies.map((b) => (
                            <li key={b.id}>
                              <Link href={`/patients/${b.id}`} className="text-brand-600 hover:underline">
                                {b.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="text-slate-600">
                      {fmtDateTime(inv.created_at)}
                      <span className="block text-xs text-slate-400">by {createdByLabel(inv.created_by)}</span>
                    </td>
                    <td className={inv.status === 'expired' ? 'text-red-600' : 'text-slate-600'}>
                      {expiryLabel(inv)}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-secondary !px-3 !py-1 text-xs"
                        disabled={resendingId !== null}
                        onClick={() => resend(inv)}
                      >
                        {resendingId === inv.id ? 'Resending…' : 'Resend invitation'}
                      </button>
                      {resendError?.id === inv.id ? (
                        <p className="mt-1 text-xs text-red-600">{resendError.message}</p>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )
      ) : null}
    </Shell>
  );
}

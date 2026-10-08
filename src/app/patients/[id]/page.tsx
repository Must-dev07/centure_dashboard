'use client';

/**
 * Patient detail: identity card, enrollment information (editable by an admin
 * or the assigned doctor), latest reading, vitals charts, medical history
 * (doctor can add entries), and the patient's alert history.
 */

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import VitalsCharts from '@/components/VitalsCharts';
import BabyEditForm from '@/components/BabyEditForm';
import { Empty, ErrorBox, Loading, PageTitle, SeverityBadge } from '@/components/ui';
import { ApiError, apiFetch, getStoredUser } from '@/lib/api';
import { fetchDoctors, fetchMyDoctorId } from '@/lib/doctors';
import {
  ageFromBirthDate,
  alertTypeLabel,
  enrollmentReasonLabel,
  fmtDate,
  fmtDateTime,
  fmtNumber,
  parentLabel,
} from '@/lib/format';
import type {
  Alert,
  Baby,
  Doctor,
  Measurement,
  MeasurementQueryRaw,
  Paginated,
  UserSummary,
} from '@/lib/types';

export default function PatientDetailPage() {
  const params = useParams<{ id: string }>();
  const babyId = Number(params.id);

  const [baby, setBaby] = useState<Baby | null>(null);
  const [latest, setLatest] = useState<Measurement | null>(null);
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // enrollment edit (admin, or the doctor assigned to this baby)
  const [user, setUser] = useState<UserSummary | null>(null);
  const [myDoctorId, setMyDoctorId] = useState<number | null>(null);
  const [doctors, setDoctors] = useState<Doctor[] | null>(null);
  const [editing, setEditing] = useState(false);
  const [editNotice, setEditNotice] = useState<string | null>(null);

  // medical-history form state
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [savingEntry, setSavingEntry] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [b, alertPage] = await Promise.all([
        apiFetch<Baby>(`/api/v1/babies/${babyId}/`),
        apiFetch<Paginated<Alert>>(`/api/v1/alerts/?baby_id=${babyId}`),
      ]);
      setBaby(b);
      setAlerts(alertPage.results);
      const to = new Date();
      const from = new Date(to.getTime() - 3_600_000);
      const meas = await apiFetch<MeasurementQueryRaw>(
        `/api/v1/measurements/?baby_id=${babyId}&from=${from.toISOString()}&to=${to.toISOString()}&granularity=raw`,
      );
      setLatest(meas.results.length ? meas.results[meas.results.length - 1] : null);
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 404
          ? 'Patient not found or not assigned to you.'
          : e instanceof Error
            ? e.message
            : 'Failed to load patient.',
      );
    }
  }, [babyId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const me = getStoredUser();
    setUser(me);
    if (me?.role === 'doctor') {
      fetchMyDoctorId(me).then(setMyDoctorId).catch(() => setMyDoctorId(null));
    } else if (me?.role === 'admin') {
      fetchDoctors().then(setDoctors).catch(() => setDoctors([]));
    }
  }, []);

  // UI gating only — the backend enforces who may PATCH (assigned doctor or admin).
  const canEdit =
    !!baby &&
    (user?.role === 'admin' ||
      (user?.role === 'doctor' && myDoctorId !== null && baby.assigned_doctor === myDoctorId));

  async function addHistoryEntry(e: React.FormEvent) {
    e.preventDefault();
    setSavingEntry(true);
    setEntryError(null);
    try {
      await apiFetch(`/api/v1/babies/${babyId}/medical-history/`, {
        method: 'POST',
        body: JSON.stringify({ title, details }),
      });
      setTitle('');
      setDetails('');
      await load();
    } catch (err) {
      setEntryError(err instanceof Error ? err.message : 'Failed to save entry.');
    } finally {
      setSavingEntry(false);
    }
  }

  return (
    <Shell>
      {error ? <ErrorBox message={error} /> : null}
      {!baby && !error ? <Loading /> : null}
      {baby ? (
        <>
          <PageTitle
            title={baby.name}
            sub={`${ageFromBirthDate(baby.birth_date)} old · born ${fmtDate(baby.birth_date)} · ${baby.weight_grams} g · parent: ${parentLabel(baby)}`}
            actions={
              <Link href={`/reports?baby_id=${baby.id}`} className="btn-primary">
                Generate PDF report
              </Link>
            }
          />

          <section id="latest-reading" className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <article className="card text-center">
              <p className="text-xs font-semibold uppercase text-slate-500">Heart rate</p>
              <p className="mt-1 text-2xl font-bold text-rose-600">
                {latest ? `${fmtNumber(latest.heart_rate, 0)} bpm` : '—'}
              </p>
            </article>
            <article className="card text-center">
              <p className="text-xs font-semibold uppercase text-slate-500">Temperature</p>
              <p className="mt-1 text-2xl font-bold text-amber-600">
                {latest ? `${fmtNumber(latest.temperature)} °C` : '—'}
              </p>
            </article>
            <article className="card text-center">
              <p className="text-xs font-semibold uppercase text-slate-500">Respiration</p>
              <p className="mt-1 text-2xl font-bold text-blue-600">
                {latest ? `${fmtNumber(latest.respiratory_rate, 0)} br/min` : '—'}
              </p>
            </article>
            <article className="card text-center">
              <p className="text-xs font-semibold uppercase text-slate-500">Last reading</p>
              <p className="mt-1 text-sm font-medium text-slate-700">
                {latest ? fmtDateTime(latest.recorded_at) : 'No data in the last hour'}
              </p>
            </article>
          </section>

          <section id="enrollment" className="card mb-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-900">Enrollment</h2>
              {canEdit && !editing ? (
                <button
                  type="button"
                  className="btn-secondary !px-3 !py-1 text-xs"
                  onClick={() => {
                    setEditNotice(null);
                    setEditing(true);
                  }}
                >
                  Edit
                </button>
              ) : null}
            </div>
            {editNotice ? (
              <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {editNotice}
              </p>
            ) : null}
            {editing ? (
              <BabyEditForm
                baby={baby}
                isAdmin={user?.role === 'admin'}
                doctors={doctors}
                onCancel={() => setEditing(false)}
                onSaved={(updated) => {
                  setBaby(updated);
                  setEditing(false);
                  setEditNotice('Changes saved.');
                }}
              />
            ) : (
              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Reason</dt>
                  <dd className="font-medium text-slate-800">{enrollmentReasonLabel(baby.enrollment_reason)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Gestational age</dt>
                  <dd className="font-medium text-slate-800">
                    {baby.gestational_age_weeks === null ? '—' : `${baby.gestational_age_weeks} weeks`}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-slate-500">Notes</dt>
                  <dd className="whitespace-pre-wrap text-slate-800">{baby.enrollment_notes || '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Parent</dt>
                  <dd className={baby.parent === null ? 'font-medium text-amber-700' : 'font-medium text-slate-800'}>
                    {parentLabel(baby)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Enrolled by</dt>
                  <dd className="font-medium text-slate-800">
                    {user && baby.enrolled_by === user.id ? 'You' : `User #${baby.enrolled_by}`}
                  </dd>
                </div>
              </dl>
            )}
          </section>

          <VitalsCharts babyId={baby.id} />

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section id="medical-history" className="card">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Medical history</h2>
              {baby.medical_history.length === 0 ? (
                <Empty message="No history entries yet." />
              ) : (
                <ul className="space-y-3">
                  {baby.medical_history.map((h) => (
                    <li key={h.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <p className="text-sm font-semibold text-slate-800">{h.title}</p>
                      <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-600">{h.details}</p>
                      <p className="mt-1 text-xs text-slate-400">{fmtDateTime(h.created_at)}</p>
                    </li>
                  ))}
                </ul>
              )}
              <form onSubmit={addHistoryEntry} className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                <p className="text-sm font-medium text-slate-700">Add entry</p>
                <input
                  className="input"
                  placeholder="Title (e.g. Vaccination — Hep B)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Details…"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  required
                />
                {entryError ? <p className="text-sm text-red-600">{entryError}</p> : null}
                <button type="submit" className="btn-primary" disabled={savingEntry}>
                  {savingEntry ? 'Saving…' : 'Save entry'}
                </button>
              </form>
            </section>

            <section id="patient-alerts" className="card">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Alert history</h2>
              {!alerts || alerts.length === 0 ? (
                <Empty message="No alerts for this patient." />
              ) : (
                <ul className="space-y-3">
                  {alerts.map((a) => (
                    <li key={a.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 p-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <SeverityBadge severity={a.severity} />
                          <span className="text-sm font-semibold text-slate-800">{alertTypeLabel(a.type)}</span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{a.message}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {fmtDateTime(a.triggered_at)}
                          {a.resolved_at ? ` · resolved ${fmtDateTime(a.resolved_at)}` : ' · active'}
                        </p>
                      </div>
                      <Link href={`/alerts?baby_id=${a.baby}`} className="shrink-0 text-xs font-medium text-brand-600 hover:underline">
                        Manage
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      ) : null}
    </Shell>
  );
}

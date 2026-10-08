'use client';

/**
 * "Enrôler un nouveau-né": doctors and admins enroll a newborn with the
 * parent's email (POST /api/v1/babies/). The backend links an existing parent
 * account by email, or creates a pending invitation and returns its
 * shareable link, which the staff member sends to the parent themselves.
 */

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import Shell from '@/components/Shell';
import InvitationLinkBox from '@/components/InvitationLinkBox';
import { ErrorBox, PageTitle } from '@/components/ui';
import { ApiError, apiFetch, getStoredUser } from '@/lib/api';
import { doctorLabel, fetchDoctors } from '@/lib/doctors';
import {
  ENROLLMENT_REASONS,
  GENDERS,
  checkCoreFields,
  checkGestationalAge,
  checkReasonNotes,
  gestationalAgeOrNull,
  isValidEmail,
  type FieldErrors,
} from '@/lib/enrollment';
import { apiFormErrors } from '@/lib/errors';
import { enrollmentReasonLabel } from '@/lib/format';
import type {
  BabyCreateRequest,
  BabyCreateResponse,
  Doctor,
  Paginated,
  Parent,
  UserSummary,
} from '@/lib/types';

const EMPTY_FORM = {
  name: '',
  birth_date: '',
  weight_grams: '',
  gender: '',
  assigned_doctor: '',
  enrollment_reason: '',
  enrollment_notes: '',
  gestational_age_weeks: '',
  parent_email: '',
};

type FormState = typeof EMPTY_FORM;

function parentName(p: Parent): string {
  return `${p.user.first_name} ${p.user.last_name}`.trim() || p.user.email;
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-xs text-red-600">{message}</p> : null;
}

export default function EnrollPage() {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BabyCreateResponse | null>(null);

  const [doctors, setDoctors] = useState<Doctor[] | null>(null);
  const [doctorsError, setDoctorsError] = useState<string | null>(null);

  // Parent search (GET /api/v1/parents/?search=)
  const [parentQuery, setParentQuery] = useState('');
  const [parentResults, setParentResults] = useState<Parent[] | null>(null);
  const [parentSearching, setParentSearching] = useState(false);
  const [parentSearchError, setParentSearchError] = useState<string | null>(null);
  const [selectedParent, setSelectedParent] = useState<Parent | null>(null);
  const searchSeq = useRef(0);

  const canEnroll = user?.role === 'doctor' || user?.role === 'admin';
  // Only an admin assigns a doctor; a doctor-enrolled baby waits for an admin.
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const me = getStoredUser();
    setUser(me);
    if (me?.role !== 'admin') return;
    fetchDoctors()
      .then(setDoctors)
      .catch((e) => setDoctorsError(e instanceof Error ? e.message : 'Failed to load doctors.'));
  }, []);

  useEffect(() => {
    const q = parentQuery.trim();
    if (q.length < 2) {
      setParentResults(null);
      setParentSearchError(null);
      setParentSearching(false);
      return;
    }
    const seq = ++searchSeq.current;
    setParentSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch<Paginated<Parent>>(
          `/api/v1/parents/?search=${encodeURIComponent(q)}`,
        );
        if (seq !== searchSeq.current) return;
        setParentResults(res.results);
        setParentSearchError(null);
      } catch (e) {
        if (seq !== searchSeq.current) return;
        setParentResults(null);
        setParentSearchError(
          e instanceof ApiError && e.status === 403
            ? 'You are not allowed to search parents.'
            : e instanceof Error
              ? e.message
              : 'Parent search failed.',
        );
      } finally {
        if (seq === searchSeq.current) setParentSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [parentQuery]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  }

  function onParentQueryChange(value: string) {
    setParentQuery(value);
    setSelectedParent(null);
    update('parent_email', value.trim());
  }

  function selectParent(p: Parent) {
    setSelectedParent(p);
    setParentQuery(p.user.email);
    update('parent_email', p.user.email);
    setParentResults(null);
  }

  function validate(): FieldErrors {
    const e: FieldErrors = {};
    checkCoreFields(form, e);
    checkReasonNotes(form.enrollment_reason, form.enrollment_notes, e);
    checkGestationalAge(form.gestational_age_weeks, e);
    if (!form.parent_email) e.parent_email = "The parent's email is required.";
    else if (!isValidEmail(form.parent_email)) e.parent_email = 'Enter a valid email address.';
    return e;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setFormError(null);
    const clientErrors = validate();
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length) return;

    const payload: BabyCreateRequest = {
      name: form.name.trim(),
      birth_date: form.birth_date,
      weight_grams: Number(form.weight_grams),
      gender: form.gender as BabyCreateRequest['gender'],
      assigned_doctor: isAdmin && form.assigned_doctor ? Number(form.assigned_doctor) : null,
      enrollment_reason: form.enrollment_reason as BabyCreateRequest['enrollment_reason'],
      enrollment_notes: form.enrollment_notes.trim(),
      gestational_age_weeks: gestationalAgeOrNull(form.gestational_age_weeks),
      parent_email: form.parent_email.trim(),
    };

    setSubmitting(true);
    try {
      const created = await apiFetch<BabyCreateResponse>('/api/v1/babies/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setResult(created);
    } catch (err) {
      const { fields, general } = apiFormErrors(err, 'Enrollment failed.');
      setErrors(fields);
      setFormError(general);
    } finally {
      setSubmitting(false);
    }
  }

  function enrollAnother() {
    setResult(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setFormError(null);
    setParentQuery('');
    setParentResults(null);
    setSelectedParent(null);
  }

  return (
    <Shell>
      <PageTitle
        title="Enroll a newborn"
        sub="Enrollment is done by the medical team. The parent is linked by email, or invited if they have no account yet."
      />

      {user && !canEnroll ? (
        <ErrorBox message="Only doctors and administrators can enroll a baby." />
      ) : null}

      {canEnroll && result ? (
        <section id="enrollment-result" className="card max-w-2xl space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">{result.name} has been enrolled</h2>
          {result.parent_status === 'linked' ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Linked to the existing parent account{result.parent_name ? ` (${result.parent_name})` : ''}.
              The baby appears in the parent&apos;s app automatically.
            </p>
          ) : result.parent_status === 'invitation_pending' ? (
            <>
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                No parent account exists for this email yet. The baby was created without a parent
                and an invitation is pending.
              </p>
              {result.invitation_link ? <InvitationLinkBox link={result.invitation_link} /> : null}
            </>
          ) : (
            <p className="text-sm text-slate-600">Enrollment saved.</p>
          )}
          <div className="flex flex-wrap gap-2 pt-2">
            {isAdmin ? (
              <Link href={`/patients/${result.id}`} className="btn-secondary">
                Open patient record
              </Link>
            ) : null}
            {result.parent_status === 'invitation_pending' ? (
              <Link href="/pending-enrollments" className="btn-secondary">
                Pending enrollments
              </Link>
            ) : null}
            <button type="button" className="btn-primary" onClick={enrollAnother}>
              Enroll another newborn
            </button>
          </div>
        </section>
      ) : null}

      {canEnroll && !result ? (
        <form id="enroll-form" onSubmit={submit} noValidate className="card max-w-2xl space-y-5">
          <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <legend className="mb-2 text-sm font-semibold text-slate-900">Newborn</legend>
            <div className="sm:col-span-2">
              <label htmlFor="baby-name" className="label">Name *</label>
              <input id="baby-name" className="input" value={form.name} maxLength={100}
                onChange={(e) => update('name', e.target.value)} />
              <FieldError message={errors.name} />
            </div>
            <div>
              <label htmlFor="baby-birth-date" className="label">Birth date *</label>
              <input id="baby-birth-date" type="date" className="input" value={form.birth_date}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => update('birth_date', e.target.value)} />
              <FieldError message={errors.birth_date} />
            </div>
            <div>
              <label htmlFor="baby-weight" className="label">Weight (g) *</label>
              <input id="baby-weight" type="number" inputMode="numeric" min={300} max={8000} className="input"
                value={form.weight_grams} onChange={(e) => update('weight_grams', e.target.value)} />
              <FieldError message={errors.weight_grams} />
            </div>
            <div>
              <label htmlFor="baby-gender" className="label">Gender *</label>
              <select id="baby-gender" className="input" value={form.gender}
                onChange={(e) => update('gender', e.target.value)}>
                <option value="">Select…</option>
                {GENDERS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
              <FieldError message={errors.gender} />
            </div>
            {isAdmin ? (
            <div>
              <label htmlFor="baby-doctor" className="label">Assigned doctor (optional)</label>
              <select id="baby-doctor" className="input" value={form.assigned_doctor}
                disabled={!doctors} onChange={(e) => update('assigned_doctor', e.target.value)}>
                <option value="">{doctors ? 'Not assigned' : 'Loading doctors…'}</option>
                {(doctors ?? []).map((d) => (
                  <option key={d.id} value={d.id}>{doctorLabel(d)}</option>
                ))}
              </select>
              {doctorsError ? <p className="mt-1 text-xs text-red-600">{doctorsError}</p> : null}
              <FieldError message={errors.assigned_doctor} />
            </div>
            ) : (
              <p className="self-end text-xs text-slate-500 sm:pb-3">
                An administrator will assign a doctor to this baby after enrollment.
              </p>
            )}
          </fieldset>

          <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <legend className="mb-2 text-sm font-semibold text-slate-900">Enrollment</legend>
            <div>
              <label htmlFor="enrollment-reason" className="label">Enrollment reason *</label>
              <select id="enrollment-reason" className="input" value={form.enrollment_reason}
                onChange={(e) => update('enrollment_reason', e.target.value)}>
                <option value="">Select…</option>
                {ENROLLMENT_REASONS.map((r) => (
                  <option key={r} value={r}>{enrollmentReasonLabel(r)}</option>
                ))}
              </select>
              <FieldError message={errors.enrollment_reason} />
            </div>
            <div>
              <label htmlFor="gestational-age" className="label">Gestational age (weeks)</label>
              <input id="gestational-age" type="number" inputMode="numeric" min={0} className="input"
                value={form.gestational_age_weeks}
                onChange={(e) => update('gestational_age_weeks', e.target.value)} />
              <FieldError message={errors.gestational_age_weeks} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="enrollment-notes" className="label">
                Enrollment notes{form.enrollment_reason === 'other' ? ' *' : ''}
              </label>
              <textarea id="enrollment-notes" rows={3} className="input" value={form.enrollment_notes}
                placeholder="Clinical sign observed, context…"
                onChange={(e) => update('enrollment_notes', e.target.value)} />
              <FieldError message={errors.enrollment_notes} />
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-semibold text-slate-900">Parent</legend>
            <label htmlFor="parent-email" className="label">Parent email *</label>
            <input id="parent-email" type="email" autoComplete="off" className="input"
              placeholder="Search an existing parent or type their email"
              value={parentQuery} onChange={(e) => onParentQueryChange(e.target.value)}
              aria-describedby="parent-search-status" />
            <FieldError message={errors.parent_email} />
            <div id="parent-search-status" aria-live="polite" className="text-xs">
              {selectedParent ? (
                <p className="text-emerald-700">
                  Existing parent selected: {parentName(selectedParent)} ({selectedParent.user.email}).
                  The baby will be linked directly.
                </p>
              ) : parentSearching ? (
                <p className="text-slate-400">Searching parents…</p>
              ) : parentSearchError ? (
                <p className="text-red-600">{parentSearchError}</p>
              ) : parentResults && parentResults.length === 0 ? (
                <p className="text-amber-700">
                  No existing parent matches — an invitation will be created for this email.
                </p>
              ) : null}
            </div>
            {!selectedParent && parentResults && parentResults.length > 0 ? (
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200" aria-label="Matching parents">
                {parentResults.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => selectParent(p)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50">
                      <span className="font-medium text-slate-800">{parentName(p)}</span>
                      <span className="text-slate-500">{p.user.email}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="text-xs text-slate-500">
              The backend decides by email: an existing parent account is linked; otherwise an
              invitation is created.
            </p>
          </fieldset>

          {formError ? <ErrorBox message={formError} /> : null}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Enrolling…' : 'Enroll newborn'}
            </button>
            <Link href="/patients" className="btn-secondary">Cancel</Link>
          </div>
        </form>
      ) : null}
    </Shell>
  );
}

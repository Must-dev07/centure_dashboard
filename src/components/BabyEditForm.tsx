'use client';

/**
 * Edit form for a baby record (PATCH /api/v1/babies/{id}/). Rendered only for
 * an admin or the doctor assigned to the baby; the backend stays authoritative:
 * - admin: all editable fields;
 * - assigned doctor: enrollment fields only (the backend refuses core
 *   registration fields and doctor reassignment from doctors).
 * Only changed fields are sent.
 */

import { useState } from 'react';
import { ErrorBox } from '@/components/ui';
import { apiFetch } from '@/lib/api';
import { doctorLabel } from '@/lib/doctors';
import {
  ENROLLMENT_REASONS,
  GENDERS,
  checkCoreFields,
  checkGestationalAge,
  checkReasonNotes,
  gestationalAgeOrNull,
  type FieldErrors,
} from '@/lib/enrollment';
import { apiFormErrors } from '@/lib/errors';
import { enrollmentReasonLabel } from '@/lib/format';
import type { Baby, Doctor } from '@/lib/types';

function initialForm(baby: Baby) {
  return {
    name: baby.name,
    birth_date: baby.birth_date,
    weight_grams: String(baby.weight_grams),
    gender: baby.gender as string,
    assigned_doctor: baby.assigned_doctor === null ? '' : String(baby.assigned_doctor),
    enrollment_reason: baby.enrollment_reason as string,
    enrollment_notes: baby.enrollment_notes,
    gestational_age_weeks: baby.gestational_age_weeks === null ? '' : String(baby.gestational_age_weeks),
  };
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-xs text-red-600">{message}</p> : null;
}

export default function BabyEditForm({
  baby,
  isAdmin,
  doctors,
  onSaved,
  onCancel,
}: {
  baby: Baby;
  isAdmin: boolean;
  doctors: Doctor[] | null;
  onSaved: (updated: Baby) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(() => initialForm(baby));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function changedFields(): Record<string, unknown> {
    const initial = initialForm(baby);
    const patch: Record<string, unknown> = {};
    if (form.enrollment_reason !== initial.enrollment_reason) patch.enrollment_reason = form.enrollment_reason;
    if (form.enrollment_notes !== initial.enrollment_notes) patch.enrollment_notes = form.enrollment_notes.trim();
    if (form.gestational_age_weeks !== initial.gestational_age_weeks) {
      patch.gestational_age_weeks = gestationalAgeOrNull(form.gestational_age_weeks);
    }
    if (isAdmin) {
      if (form.name !== initial.name) patch.name = form.name.trim();
      if (form.birth_date !== initial.birth_date) patch.birth_date = form.birth_date;
      if (form.weight_grams !== initial.weight_grams) patch.weight_grams = Number(form.weight_grams);
      if (form.gender !== initial.gender) patch.gender = form.gender;
      if (form.assigned_doctor !== initial.assigned_doctor) {
        patch.assigned_doctor = form.assigned_doctor ? Number(form.assigned_doctor) : null;
      }
    }
    return patch;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setFormError(null);
    const clientErrors: FieldErrors = {};
    if (isAdmin) checkCoreFields(form, clientErrors);
    checkReasonNotes(form.enrollment_reason, form.enrollment_notes, clientErrors);
    checkGestationalAge(form.gestational_age_weeks, clientErrors);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length) return;

    const patch = changedFields();
    if (Object.keys(patch).length === 0) {
      onCancel();
      return;
    }
    setSaving(true);
    try {
      const updated = await apiFetch<Baby>(`/api/v1/babies/${baby.id}/`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      onSaved(updated);
    } catch (err) {
      const { fields, general } = apiFormErrors(err, 'Failed to save changes.');
      setErrors(fields);
      setFormError(general);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form id="baby-edit-form" onSubmit={save} noValidate className="space-y-4">
      {isAdmin ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="edit-name" className="label">Name</label>
            <input id="edit-name" className="input" value={form.name} maxLength={100}
              onChange={(e) => update('name', e.target.value)} />
            <FieldError message={errors.name} />
          </div>
          <div>
            <label htmlFor="edit-birth-date" className="label">Birth date</label>
            <input id="edit-birth-date" type="date" className="input" value={form.birth_date}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => update('birth_date', e.target.value)} />
            <FieldError message={errors.birth_date} />
          </div>
          <div>
            <label htmlFor="edit-weight" className="label">Weight (g)</label>
            <input id="edit-weight" type="number" inputMode="numeric" min={300} max={8000} className="input"
              value={form.weight_grams} onChange={(e) => update('weight_grams', e.target.value)} />
            <FieldError message={errors.weight_grams} />
          </div>
          <div>
            <label htmlFor="edit-gender" className="label">Gender</label>
            <select id="edit-gender" className="input" value={form.gender}
              onChange={(e) => update('gender', e.target.value)}>
              {GENDERS.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
            <FieldError message={errors.gender} />
          </div>
          <div>
            <label htmlFor="edit-doctor" className="label">Assigned doctor</label>
            <select id="edit-doctor" className="input" value={form.assigned_doctor} disabled={!doctors}
              onChange={(e) => update('assigned_doctor', e.target.value)}>
              <option value="">Not assigned</option>
              {(doctors ?? []).map((d) => (
                <option key={d.id} value={d.id}>{doctorLabel(d)}</option>
              ))}
            </select>
            <FieldError message={errors.assigned_doctor} />
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-500">
          As the assigned doctor you can update the enrollment information. Registration details
          (name, birth date, weight, gender) are managed by an administrator.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="edit-reason" className="label">Enrollment reason</label>
          <select id="edit-reason" className="input" value={form.enrollment_reason}
            onChange={(e) => update('enrollment_reason', e.target.value)}>
            {ENROLLMENT_REASONS.map((r) => (
              <option key={r} value={r}>{enrollmentReasonLabel(r)}</option>
            ))}
          </select>
          <FieldError message={errors.enrollment_reason} />
        </div>
        <div>
          <label htmlFor="edit-gestational-age" className="label">Gestational age (weeks)</label>
          <input id="edit-gestational-age" type="number" inputMode="numeric" min={0} className="input"
            value={form.gestational_age_weeks}
            onChange={(e) => update('gestational_age_weeks', e.target.value)} />
          <FieldError message={errors.gestational_age_weeks} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="edit-notes" className="label">
            Enrollment notes{form.enrollment_reason === 'other' ? ' *' : ''}
          </label>
          <textarea id="edit-notes" rows={3} className="input" value={form.enrollment_notes}
            onChange={(e) => update('enrollment_notes', e.target.value)} />
          <FieldError message={errors.enrollment_notes} />
        </div>
      </div>

      {formError ? <ErrorBox message={formError} /> : null}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}

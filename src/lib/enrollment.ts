/**
 * Client-side checks that mirror the backend's enrollment rules (the backend
 * stays authoritative and its 400 field errors are always displayed too).
 */

import type { EnrollmentReason, Gender } from './types';

export const ENROLLMENT_REASONS: EnrollmentReason[] = [
  'prematurity',
  'clinical_sign',
  'congenital_condition',
  'other',
];

export const GENDERS: { value: Gender; label: string }[] = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'unspecified', label: 'Unspecified' },
];

export type FieldErrors = Record<string, string>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

/** "other" requires a description (REFONTE §2.1). */
export function checkReasonNotes(reason: string, notes: string, errors: FieldErrors) {
  if (!reason) errors.enrollment_reason = 'Select an enrollment reason.';
  if (reason === 'other' && !notes.trim()) {
    errors.enrollment_notes = 'A description is required when the reason is "Other".';
  }
}

export function checkGestationalAge(value: string, errors: FieldErrors) {
  if (value.trim() === '') return;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 32767) {
    errors.gestational_age_weeks = 'Enter a whole number of weeks.';
  }
}

export function checkCoreFields(
  values: { name: string; birth_date: string; weight_grams: string; gender: string },
  errors: FieldErrors,
) {
  if (!values.name.trim()) errors.name = 'Name is required.';
  else if (values.name.trim().length > 100) errors.name = 'Name must be at most 100 characters.';

  if (!values.birth_date) errors.birth_date = 'Birth date is required.';
  else if (values.birth_date > new Date().toISOString().slice(0, 10)) {
    errors.birth_date = 'Birth date cannot be in the future.';
  }

  const w = Number(values.weight_grams);
  if (values.weight_grams.trim() === '') errors.weight_grams = 'Weight is required.';
  else if (!Number.isInteger(w) || w < 300 || w > 8000) {
    errors.weight_grams = 'Weight must be a whole number between 300 g and 8000 g.';
  }

  if (!values.gender) errors.gender = 'Select a gender.';
}

export function gestationalAgeOrNull(value: string): number | null {
  return value.trim() === '' ? null : Number(value);
}

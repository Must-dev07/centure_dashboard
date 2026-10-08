/** Doctor directory helpers (GET /api/v1/doctors/). */

import { fetchAllPages } from './api';
import type { Doctor, UserSummary } from './types';

export function fetchDoctors(): Promise<Doctor[]> {
  return fetchAllPages<Doctor>('/api/v1/doctors/');
}

/** The signed-in doctor's Doctor profile id (same lookup as the Settings page), or null. */
export async function fetchMyDoctorId(user: UserSummary | null): Promise<number | null> {
  if (!user || user.role !== 'doctor') return null;
  const doctors = await fetchDoctors();
  return doctors.find((d) => d.user.id === user.id)?.id ?? null;
}

export function doctorLabel(d: Doctor): string {
  const name = `${d.user.first_name} ${d.user.last_name}`.trim() || d.user.email;
  return d.specialty ? `Dr. ${name} — ${d.specialty}` : `Dr. ${name}`;
}

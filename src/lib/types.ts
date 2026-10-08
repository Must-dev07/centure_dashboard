/** API types mirroring the Django backend serializers (api/v1). */

export type Role = 'parent' | 'doctor' | 'admin';

export interface UserSummary {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  phone: string;
  created_at: string;
}

export interface Doctor {
  id: number;
  user: UserSummary;
  license_number: string;
  specialty: string;
}

export interface Parent {
  id: number;
  user: UserSummary;
  address: string;
  emergency_contact: string;
}

export interface MedicalHistoryEntry {
  id: number;
  title: string;
  details: string;
  recorded_by: number | null;
  supersedes: number | null;
  created_at: string;
}

export type Gender = 'male' | 'female' | 'unspecified';

export type EnrollmentReason = 'prematurity' | 'clinical_sign' | 'congenital_condition' | 'other';

export interface Baby {
  id: number;
  name: string;
  birth_date: string;
  weight_grams: number;
  gender: Gender;
  /** null until the parent accepts their invitation (baby enrolled by staff first). */
  parent: number | null;
  parent_name: string;
  assigned_doctor: number | null;
  enrollment_reason: EnrollmentReason;
  enrollment_notes: string;
  gestational_age_weeks: number | null;
  /** User id of the doctor/admin who enrolled the baby (audit). */
  enrolled_by: number;
  medical_history: MedicalHistoryEntry[];
  created_at: string;
}

/** POST /api/v1/babies/ payload (doctor/admin enrollment). */
export interface BabyCreateRequest {
  name: string;
  birth_date: string;
  weight_grams: number;
  gender: Gender;
  assigned_doctor?: number | null;
  enrollment_reason: EnrollmentReason;
  enrollment_notes: string;
  gestational_age_weeks: number | null;
  parent_email: string;
}

export type ParentStatus = 'linked' | 'invitation_pending';

/** POST /api/v1/babies/ response: `invitation_link` is set only when an invitation is pending. */
export type BabyCreateResponse = Baby & {
  parent_status: ParentStatus;
  invitation_link: string | null;
};

export type InvitationStatus = 'pending' | 'accepted' | 'expired';

export interface InvitationBaby {
  id: number;
  name: string;
}

/** GET /api/v1/invitations/ item. The backend never exposes the token here. */
export interface Invitation {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  status: InvitationStatus;
  created_by: number;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  babies: InvitationBaby[];
}

/** POST /api/v1/invitations/{id}/resend/ response: the invitation plus its new link. */
export type InvitationResendResponse = Invitation & { invitation_link: string };

export interface belt {
  id: number;
  serial_number: string;
  firmware_version: string;
  baby: number | null;
  baby_name: string | null;
  battery_level: number | null;
  last_seen_at: string | null;
  status: string;
  created_at: string;
}

export interface Measurement {
  id: number;
  baby: number;
  belt: number;
  heart_rate: number | null;
  temperature: number | null;
  respiratory_rate: number | null;
  battery: number | null;
  skin_contact: boolean | null;
  recorded_at: string;
  received_at: string;
}

export interface MeasurementBucket {
  bucket: string;
  heart_rate_avg: number | null;
  temperature_avg: number | null;
  respiratory_rate_avg: number | null;
  heart_rate_min: number | null;
  heart_rate_max: number | null;
  count: number;
}

export type Granularity = 'raw' | 'minute' | 'hour' | 'day';

export interface MeasurementQueryRaw {
  granularity: 'raw';
  results: Measurement[];
}

export interface MeasurementQueryBuckets {
  granularity: Exclude<Granularity, 'raw'>;
  results: MeasurementBucket[];
}

export type MeasurementQueryResponse = MeasurementQueryRaw | MeasurementQueryBuckets;

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface Alert {
  id: number;
  baby: number;
  baby_name: string;
  belt: number | null;
  type: string;
  severity: AlertSeverity;
  message: string;
  value: number | null;
  triggered_at: string;
  resolved_at: string | null;
  resolved_by: number | null;
  resolved_by_name: string | null;
  acknowledged_by: number | null;
  acknowledged_by_name: string | null;
  acknowledged_at: string | null;
  auto_resolves_on_acknowledge: boolean;
  disclaimer: string;
}

export type NotificationCategory = 'alert' | 'belt' | 'medical' | 'system';

export interface AppNotification {
  id: number;
  alert: number | null;
  category: NotificationCategory;
  channel: string;
  title: string;
  body: string;
  status: string;
  sent_at: string | null;
  read_at: string | null;
  created_at: string;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface TokenPair {
  access: string;
  refresh: string;
  user: UserSummary;
}

/** Non-diagnostic disclaimer — shown wherever alerts/measurements guide decisions. */
export const MEDICAL_DISCLAIMER =
  'This system flags abnormal readings for caregiver or medical follow-up. It is not a medical diagnosis device.';

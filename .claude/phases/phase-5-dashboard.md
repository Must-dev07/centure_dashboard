# Refonte — Phase 5: Dashboard (Next.js)

## Target phase

This is **Phase 5** of the enrollment refonte, as defined in `REFONTE_system.md` §8, step 5:
"Dashboard (section 5)."

Prerequisite: backend Phases 1–4 are complete and validated by the owner. Their end-of-phase
summaries (serializer fields, setting names, reported discrepancies) are inputs to this phase.

Sources of truth, in order:

1. `REFONTE_system.md` (`webapp/REFONTE_system.md`), §5 and the API described in §2–§4.
2. The **finalized backend behavior** from `centure_backend/.claude/phases/phase-1-…`, `phase-2-…`,
   `phase-3-…` (including the owner decisions recorded there) and the validated phase summaries. The
   backend is authoritative for API behavior. Do not contradict it.
3. This repository's `CLAUDE.md` (architecture, stack compatibility, phase workflow and stop rule).

Do not reinterpret the source, add requirements, remove requirements, or invent workflows or
endpoints.

## Cross-phase decisions this phase must respect

- New babies are enrolled by a **doctor or admin** only. Parents never create or modify babies.
- `Baby.enrolled_by` is the audit field. Doctor enrollment → the "Enrôlement" history entry has that
  doctor as `recorded_by`. Admin enrollment → `recorded_by` is `null`; never display or imply a
  doctor for it.
- Legacy babies have `enrollment_reason="other"` and
  `enrollment_notes="Legacy enrollment — original enrollment reason was not recorded."`. Display
  as-is.
- **Invitation delivery without email:** `POST /babies/` (when an invitation is created or reused) and
  the resend endpoint return `invitation_link` (`app://invite/{token}`). The dashboard shows it with
  a copy action so the doctor/admin sends it to the parent themselves.
- **Tokens and links never appear in the invitation list** (`GET /invitations/`). The dashboard must
  not store invitation links (no `localStorage`, no logs); show them only in the response view.
- Invitations are valid for **7 days**; expired invitations can be renewed with resend.
- `Baby.parent` can be `null` (a valid state until the parent accepts).
- Parents cannot delete babies (backend). Parent self-registration is forbidden; doctor
  self-registration is unchanged (no dashboard work).

## Current dashboard state (verified)

- Next.js 14.2 App Router, React 18.3, TypeScript strict, Tailwind; fully client-side (`'use client'`
  pages and components, root `layout.tsx` excepted).
- All backend calls go through `src/lib/api.ts`: `apiFetch<T>()`, `fetchAllPages<T>()`, `ApiError`,
  `getStoredUser()`. Types live in `src/lib/types.ts` (`Baby`, `Parent`, `Doctor`, `UserSummary`,
  `MedicalHistoryEntry`, `Paginated<T>`).
- Shared UI in `src/components/ui.tsx`: `PageTitle`, `Loading`, `ErrorBox`, `Empty`, `StatCard`,
  `StatusDot`, `SeverityBadge`. Layout and navigation in `src/components/Shell.tsx` (`NAV` for all
  roles, `ADMIN_NAV` for admins).
- Patients: `src/app/patients/page.tsx` (list via `/api/v1/babies/`) and
  `src/app/patients/[id]/page.tsx` (details, charts, medical-history form).
- **There is no baby creation form, no baby edit form, and no delete action in the dashboard today.**
- The login page rejects `parent` accounts, so only doctors and admins use the dashboard.
- The current doctor's `Doctor` profile id is resolved in `src/app/settings/page.tsx` via
  `GET /api/v1/doctors/`. Reuse that approach.

## 1. Existing UI to reuse or extend

- `Shell.tsx` navigation: add the new entries using the existing `NAV` pattern.
- `ui.tsx` primitives for titles, loading, error, and empty states; existing form and table styling
  from `patients/[id]/page.tsx` and `patients/page.tsx` / `users/page.tsx`.
- `src/app/patients/[id]/page.tsx`: extend with enrollment information and the gated edit form.
- `src/app/patients/page.tsx`: keep the list; handle babies without a linked parent.
- `src/app/reports/page.tsx` and `src/lib/pdf.ts`: render an empty parent cleanly (the existing `'—'`
  fallback in `pdf.ts` is acceptable).

## 2. UI, components, and pages to add

### 2.1 "Enrôler un nouveau-né" — enrollment page (§5)

A new client page (for example `src/app/patients/enroll/page.tsx`), reachable from Patients and the
navigation, for **doctors and admins**.

| Field | Input | Required | Notes |
|---|---|---|---|
| `name` | text | yes | |
| `birth_date` | date | yes | |
| `weight_grams` | number | yes | positive integer |
| `gender` | select | yes | `male`, `female`, `unspecified` |
| `assigned_doctor` | select | no | options from `GET /api/v1/doctors/` (`fetchAllPages`) |
| `enrollment_reason` | select | yes | `prematurity`, `clinical_sign`, `congenital_condition`, `other` |
| `enrollment_notes` | textarea | required when reason is `other` | mirrors the backend rule |
| `gestational_age_weeks` | number | no | positive integer |
| `parent_email` | email + parent search | yes | see 2.2 |

- Client-side validation mirrors the backend rules only; the backend is authoritative (show 400 field
  errors from `ApiError` next to fields).
- Submit with `POST /api/v1/babies/`; disable the submit button while submitting.

### 2.2 Existing-parent vs unknown-parent workflow (§5)

- Parent search inside the form: `GET /api/v1/parents/?search=<text>` (debounced). Show matching
  parents (name + email); selecting one fills `parent_email`.
- No result: show "no existing parent — an invitation will be created" and keep the typed email. The
  backend decides linkage by email; the dashboard never creates parents or invitations itself.
- Loading, empty, error, and 403 states for the search.

### 2.3 Enrollment result: `parent_status` and invitation link (§3.1)

- `"linked"` → confirmation that the baby is linked to the existing parent; link to the baby page.
- `"invitation_pending"` → confirmation that the baby was created without a parent and an invitation
  is pending, with:
  - the `invitation_link` value (`app://invite/{token}`) in a read-only field;
  - a **Copy link** action (`navigator.clipboard.writeText`, with a visible fallback of selecting the
    text if clipboard access is unavailable) and a short instruction that the doctor/admin must send
    this link to the parent themselves (valid 7 days);
  - a link to the pending-enrollments page.
- Missing or unknown values → neutral message; do not guess.
- The link exists only in this response view: do not persist it or put it in URLs or logs.

### 2.4 "Enrôlements en attente" — pending enrollments (§5)

- A new client page (for example `src/app/enrollments/page.tsx`) for **doctors and admins**, using
  `GET /api/v1/invitations/?status=pending` via `apiFetch` / `fetchAllPages`.
- Columns from the Phase 3 contract: email, names, phone, created by, created at, expires at, and
  the linked babies. There is **no token and no link** in this data.
- Optional status filter (`pending` / `expired`) using the same `status` query parameter, so expired
  invitations can be found and renewed.
- **Resend action ("Renvoyer l'invitation")** per row, for `pending` and `expired` invitations:
  `POST /api/v1/invitations/{id}/resend/`. On success, show the returned **new** `invitation_link`
  with the same copy UI as 2.3, and explain that the previous link no longer works and the new one is
  valid for 7 days. Refresh the row. Handle 409 (already accepted), 403/404 (outside the caller's
  scope), and network errors. Disable the button while the request is running.

### 2.5 Baby record: enrollment display and gated edit form (§3.6, §5)

- On `patients/[id]`, display `enrollment_reason`, `enrollment_notes`, `gestational_age_weeks`, the
  parent state (linked parent name, or "no parent linked — invitation pending"), and the enrolling
  user only if the backend exposes it (check the validated serializer fields).
- Add an edit form using `PATCH /api/v1/babies/{id}/`, **visible only** to an admin or to the doctor
  assigned to the baby (see §4 below). Respect the backend's existing field-level rules:
  - admin: all fields the serializer accepts;
  - assigned doctor: no core registration fields (`name`, `birth_date`, `weight_grams`, `gender`) and
    no `assigned_doctor` changes, except removing themselves if the existing UI flow needs it.
    Enrollment fields (`enrollment_reason`, `enrollment_notes`, `gestational_age_weeks`) stay
    editable for the assigned doctor.
- Handle 400 and 403 from the backend even when the form is shown.
- Do not add a delete action (not required by the source).

### 2.6 Parent listing

§5 only requires the parent search inside the enrollment form. Do not add a separate parent
management page. The existing admin `Users` page stays as is.

## 3. API calls and types to add or modify

Types (`src/lib/types.ts`), aligned with the validated backend serializers:

- `Baby`: `parent: number | null` (was `number`); add `enrollment_reason`, `enrollment_notes`,
  `gestational_age_weeks: number | null`, and `enrolled_by` if exposed. Add `EnrollmentReason =
  'prematurity' | 'clinical_sign' | 'congenital_condition' | 'other'`.
- `BabyCreateRequest` (the §3.1 payload) and `BabyCreateResponse = Baby & { parent_status: 'linked' |
  'invitation_pending'; invitation_link: string | null }`.
- `Invitation`: `id`, `email`, `first_name`, `last_name`, `phone`, `status: 'pending' | 'accepted' |
  'expired'`, `created_by`, `created_at`, `expires_at`, `accepted_at`, `babies` (as returned by Phase
  3). **No `token`.**
- `InvitationResendResponse = Invitation & { invitation_link: string }`.

API calls (all through `apiFetch` / `fetchAllPages`; no raw `fetch`):

| Call | Method | Used by |
|---|---|---|
| `/api/v1/babies/` | POST | enrollment page |
| `/api/v1/babies/{id}/` | PATCH | gated edit form |
| `/api/v1/parents/?search=` | GET | parent search |
| `/api/v1/doctors/` | GET | assigned-doctor select (existing) |
| `/api/v1/invitations/?status=pending` (or `expired`) | GET | pending enrollments page |
| `/api/v1/invitations/{id}/resend/` | POST | resend action |

Audit existing code that assumes `baby.parent` is set (patients list, details, reports, PDF) and
render an explicit "no parent linked / invitation pending" state.

## 4. Authorization and visibility

- Dashboard users are doctors and admins (parents are rejected at login; unchanged).
- Enrollment and pending-enrollments pages: visible to **doctor and admin** (`NAV`, not `ADMIN_NAV`).
  Doctors see only the invitations the backend returns for them (their own or their assigned
  babies'). Handle 401 (existing refresh/redirect) and 403 with an `ErrorBox`.
- Baby edit form: visible only if `role === 'admin'`, or `role === 'doctor'` **and**
  `baby.assigned_doctor` equals the current doctor's `Doctor` id. UI gating is convenience only; the
  backend is the security boundary.
- Keep only the existing `sb_access` / `sb_refresh` / `sb_user` keys in `localStorage`. Never store
  invitation links, tokens, or parent personal data.

## 5. States to cover on every new screen

Loading (`Loading`), empty (`Empty`), errors (`ErrorBox`, `ApiError` messages and field errors),
inline validation errors, authorization (403; 401 via existing refresh and redirect), and
disabled/submitting states for forms and the resend and copy actions.

## OUT of scope

- Any backend, mobile, or firmware change; any new backend endpoint.
- A parent management page, parent creation, or invitation creation from the dashboard (the backend
  creates invitations during enrollment).
- A delete-baby action.
- Email/SMS sending.
- Doctor self-registration changes or any doctor verification/approval workflow.
- React 19, Next.js 15+, Server Components beyond the existing root layout, Server Actions, route
  handlers, middleware, SWR/React Query, a new state-management library, or new dependencies.
- Unrelated refactors.

## Rules

- Follow `CLAUDE.md`, including "Stack compatibility for `react-best-practices`".
- Preserve the existing API client, token handling, and UI patterns.
- Do not change `package.json` or dependencies.
- Preserve existing unrelated Git changes (currently `package.json` / `package-lock.json` are
  modified by the language-server setup; leave them). No push, pull, or remote changes.
- Respect `.claude/settings.json` (never read `.env*` or `.next/`).

## Tests and checks

The dashboard has no automated test framework; do not add one.

- `npx --no-install tsc --noEmit`
- `npm run build`
- `npm run lint` only if the lint setup is usable (currently it is not; report it as skipped).
- Use the `dashboard-tester` agent for the checks and the `dashboard-reviewer` agent for the review.
- Manual validation plan against a backend with Phases 1–4 applied:
  1. Doctor enrolls with an existing parent's email → `linked`; no link shown; baby shows the parent.
  2. Doctor enrolls with an unknown email → `invitation_pending`; `app://invite/…` link shown and
     copyable; the invitation appears on the pending page **without** any token or link.
  3. Same unknown email again → the same link is returned; one pending invitation lists both babies.
  4. `other` without notes → blocked client-side and rejected by the backend (400 shown).
  5. Admin enrollment → history entry shows no doctor as recorder.
  6. Resend a pending invitation → new link shown; the old link is rejected by the backend (404) when
     tried from the mobile app; the expiry moves to +7 days.
  7. Resend an expired invitation → back to pending with a new link. An accepted invitation → 409
     message.
  8. Assigned doctor sees the edit form without core fields; admin sees all fields; another doctor
     does not see it (403 if forced).
  9. Legacy baby displays reason `other` with the legacy note.
  10. Parent search: results, no results, error.
  11. A baby without a parent renders correctly in Patients, details, Reports, and the PDF.

## Completion — STOP

When Phase 5 is complete:

1. List every file changed.
2. Summarize functional changes (pages, components, types, API calls).
3. Report the checks performed (tsc, build, lint status) and the manual validation results.
4. Report warnings, failures, and unresolved issues (including any backend field that was missing).
5. **STOP.** Do not begin Phase 6. Wait for explicit validation from the owner.

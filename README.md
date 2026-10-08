# Smart belt — Doctor Dashboard (Next.js)

Web dashboard for doctors and administrators of the newborn smart-belt
monitoring ecosystem. Talks to the Django backend REST API (`/api/v1/`,
source in `../../centure_backend/`).

> **Disclaimer** — This system flags abnormal readings for caregiver or
> medical follow-up. It is **not** a medical diagnosis device.

## Workflow in one paragraph

Newborns are **enrolled here** by a doctor or admin when a clinical risk is
identified. The enrollment form takes the parent's email: an existing parent
account is linked at once; otherwise the baby is created without a parent and
the dashboard shows an `app://invite/{token}` link to send to the parent
(nothing is emailed). The parent accepts it in the mobile app, which creates
or links their account. Unaccepted invitations are followed up in *Pending
enrollments*. Parents never use this dashboard.

## Stack
- Next.js 14 (App Router, fully client-side pages) + React 18 + TypeScript (strict)
- Tailwind CSS
- Chart.js via react-chartjs-2 (vitals, statistics)
- jsPDF + jspdf-autotable (real client-side PDF reports)
- JWT auth against the backend, with silent refresh + session rotation

## Pages
| Route | Access | Purpose |
|---|---|---|
| `/login` | public | Doctor/admin sign-in (parents are told to use the mobile app) |
| `/dashboard` | doctor/admin | Stats cards, latest active alerts, belt fleet (auto-refresh 30 s) |
| `/enroll` | doctor/admin | **Enroll newborn**: baby fields, enrollment reason (+ notes, required for *other*), gestational age, assigned doctor, parent email with live lookup (`GET /parents/?search=`). Result: *linked* or *invitation pending* with a copyable invitation link |
| `/pending-enrollments` | doctor/admin | Invitations not yet accepted (`pending` / `expired` filter). **Resend invitation** issues a new link valid 7 days — the previous link stops working. Doctors see invitations they created or that concern their assigned patients |
| `/patients` | doctor/admin | Patients list with search (doctors: assigned babies only) |
| `/patients/[id]` | doctor/admin | Enrollment info, latest reading, vitals charts (6 h/24 h/7 d/30 d, adaptive granularity), medical history (add entries), alert history. **Edit** is shown only to the assigned doctor or an admin; a doctor can update weight/height and enrollment fields but not name/birth date/gender |
| `/alerts` | doctor/admin | Triage: filter by status/severity/search, **Acknowledge** and **Resolve** (auto-refresh 20 s) |
| `/notifications` | doctor/admin | Notification inbox: category/unread filters, mark read, mark all read, delete |
| `/statistics` | doctor/admin | Alerts by type (bar), severity (doughnut), 14-day trend (line) |
| `/reports` | doctor/admin | Per-patient PDF report: identity, vitals min/avg/max, alert log, disclaimer on every page |
| `/settings` | doctor/admin | Doctor profile editing (name, phone, specialty), environment info |
| `/users` | **admin only** | Full user listing with role filter (backend returns 403 for others) |

Role gating: the sidebar hides admin links for doctors, and edit controls are
hidden when the user may not use them — but authorization is always enforced
server-side (doctors only see their assigned babies; foreign objects return
404; forbidden writes return 403).

> **Doctors only see babies assigned to them.** When a doctor enrolls a baby,
> they should select themselves as *Assigned doctor* (the form reminds them),
> otherwise the new patient will not appear in their list.

## Setup
```bash
echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:8080" > .env.local   # backend URL
npm install
npm run dev                          # http://localhost:3100
```
`NEXT_PUBLIC_API_BASE_URL` defaults to `http://localhost:8080` when unset.

Production:
```bash
npm run build && npm run start       # :3100
```

The backend must allow this origin via `CORS_ALLOWED_ORIGINS`
(see `centure_backend/.env.example`; `http://localhost:3100` is the default).

## Notes
- All list fetches walk DRF pagination (`?page=N`) to completion.
- Measurement queries use the backend granularity buckets
  (`raw`/`minute`/`hour`/`day`) chosen automatically from the period length.
- Invitation tokens are never listed by the API; a link is only visible right
  after enrollment or after a resend. Treat it as a credential.
- Tokens are stored in `localStorage`; refresh rotation on the backend
  revokes superseded sessions, and logout revokes the current one.
- Contributor rules (stack constraints, phase workflow) are in `CLAUDE.md`.

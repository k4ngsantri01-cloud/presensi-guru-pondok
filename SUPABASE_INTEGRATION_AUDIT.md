# Supabase Integration Audit for Presensi Guru Pondok

## 1. Audit Existing System

### Frontend
- UI is split between Guru and Admin flows in [src/App.tsx](src/App.tsx), [src/components/GuruDashboard.tsx](src/components/GuruDashboard.tsx), and [src/components/AdminDashboard.tsx](src/components/AdminDashboard.tsx).
- Authentication is handled through a local session stored in browser localStorage.
- The frontend calls REST endpoints such as `/api/login`, `/api/teachers`, `/api/attendance`, `/api/settings`, `/api/stats`.
- Existing flow should remain intact; the Supabase integration should be introduced behind the current API layer if possible.

### Backend Logic
- The current backend is implemented in [server.ts](server.ts).
- Business logic for auth, CRUD, attendance validation, schedules, admin stats, and AI assistance is handled server-side.
- Data persistence is currently local JSON-based through [src/db/db-store.ts](src/db/db-store.ts).
- The safest integration approach is to preserve the existing `/api/*` contract and swap the data layer to Supabase internally.

### Database / Data Model
The current domain model already maps well to relational tables:
- `users`
- `teachers`
- `subjects`
- `classes`
- `academic_years`
- `cawus`
- `hissohs`
- `schedule`
- `attendance`
- `attendance_validation`
- `attendance_merge`
- `settings`
- `attendance_logs`

The present model uses soft delete via `deleted_at` and string-based IDs. This is compatible with Supabase and should be preserved.

### Supabase Readiness
- No Supabase client or configuration exists in the current project.
- There is no existing auth provider, RLS policy, storage bucket, or realtime subscription in the current codebase.
- The project is therefore not yet integrated with Supabase and should be migrated carefully in phases.

---

## 2. Database Mapping

| Existing Concept | Current Shape | Supabase Table | Notes |
|---|---|---|---|
| Admin / Guru login user | `users` | `users` | Keep same table name and fields for compatibility |
| Teacher profile | `teachers` | `teachers` | Preserve `user_id`, `nip`, `status`, and soft delete |
| Subjects | `subjects` | `subjects` | Straight mapping |
| Classes | `classes` | `classes` | Preserve GPS and radius fields |
| Academic year | `academic_years` | `academic_years` | Straight mapping |
| Cawu | `cawus` | `cawus` | Straight mapping |
| Hissoh | `hissohs` | `hissohs` | Straight mapping |
| Schedule | `schedule` | `schedules` | Keep same semantics, but table name in plural is cleaner |
| Attendance | `attendance` | `attendance` | Preserve current field names |
| Attendance validation | `attendance_validation` | `attendance_validation` | Straight mapping |
| Attendance merge | `attendance_merge` | `attendance_merge` | Straight mapping |
| Settings | `settings` | `settings` | Keep as single-row table |
| Attendance logs | `attendance_logs` | `attendance_logs` | Straight mapping |

### Important Compatibility Notes
- Keep the current `deleted_at` soft-delete pattern.
- Preserve string IDs like `teacher-1`, `sched-1`, `att-1` for compatibility with the existing front-end and server logic.
- Preserve current status values such as `aktif`, `nonaktif`, `Hadir`, `Izin`, `Alfa`, `Pending`.
- Do not rename the API routes or change the frontend flow.

---

## 3. Final Database Structure

### Tables
1. `users`
2. `teachers`
3. `subjects`
4. `classes`
5. `academic_years`
6. `cawus`
7. `hissohs`
8. `schedules`
9. `attendance`
10. `attendance_validation`
11. `attendance_merge`
12. `settings`
13. `attendance_logs`

### Core Relationships
- `teachers.user_id -> users.id`
- `schedules.teacher_id -> teachers.id`
- `schedules.subject_id -> subjects.id`
- `schedules.class_id -> classes.id`
- `schedules.academic_year_id -> academic_years.id`
- `attendance.schedule_id -> schedules.id`
- `attendance.teacher_id -> teachers.id`
- `attendance_validation.attendance_id -> attendance.id`
- `attendance_merge.attendance_id -> attendance.id`
- `attendance_logs.attendance_id -> attendance.id`

---

## 4. Proposed SQL Schema

The following schema is proposed for implementation in Supabase. It is a design plan only and should be applied through a controlled migration later.

```sql
-- Enable extensions if needed
create extension if not exists pgcrypto;

create table if not exists public.users (
  id text primary key,
  auth_user_id uuid references auth.users(id) on delete set null,
  email text not null unique,
  password_hash text not null,
  role text not null check (role in ('admin','guru')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.teachers (
  id text primary key,
  user_id text not null references public.users(id) on delete restrict,
  nama text not null,
  nip text not null unique,
  email text not null unique,
  no_hp text not null default '',
  foto text not null default '',
  status text not null check (status in ('aktif','nonaktif')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.subjects (
  id text primary key,
  nama_mapel text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.classes (
  id text primary key,
  nama_kelas text not null,
  tingkat text not null,
  gedung text not null default '',
  lokasi text not null default '',
  latitude double precision default -7.29135,
  longitude double precision default 110.18341,
  radius integer default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.academic_years (
  id text primary key,
  tahun text not null,
  status text not null check (status in ('aktif','tidak_aktif')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.cawus (
  id text primary key,
  nama text not null,
  status text not null check (status in ('aktif','tidak_aktif')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.hissohs (
  id text primary key,
  nama text not null,
  jam_mulai_wib text not null,
  jam_selesai_wib text not null,
  jam_mulai_istw text not null,
  jam_selesai_istw text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.schedules (
  id text primary key,
  teacher_id text not null references public.teachers(id) on delete restrict,
  subject_id text not null references public.subjects(id) on delete restrict,
  class_id text not null references public.classes(id) on delete restrict,
  academic_year_id text not null references public.academic_years(id) on delete restrict,
  hissoh_id text references public.hissohs(id) on delete set null,
  cawu_id text references public.cawus(id) on delete set null,
  hari text not null,
  jam_mulai text not null,
  jam_selesai text not null,
  latitude double precision not null default -7.29135,
  longitude double precision not null default 110.18341,
  radius integer not null default 100,
  status text not null check (status in ('aktif','nonaktif')),
  merged_with_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.attendance (
  id text primary key,
  schedule_id text not null references public.schedules(id) on delete restrict,
  teacher_id text not null references public.teachers(id) on delete restrict,
  tanggal date not null,
  status text not null check (status in ('Hadir','Izin','Alfa','Pending')),
  catatan text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.attendance_validation (
  id text primary key,
  attendance_id text not null references public.attendance(id) on delete cascade,
  foto_url text,
  latitude double precision,
  longitude double precision,
  ip text,
  jarak integer,
  gps_valid boolean not null default false,
  ip_valid boolean not null default false,
  selfie_valid boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.attendance_merge (
  id text primary key,
  attendance_id text not null references public.attendance(id) on delete cascade,
  schedule_target text not null references public.schedules(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.settings (
  id text primary key,
  nama_pondok text not null,
  logo text,
  alamat text not null default '',
  radius_default integer not null default 100,
  jam_toleransi integer not null default 15,
  batas_keterlambatan integer not null default 30,
  password_minimum integer not null default 8,
  session_timeout integer not null default 168,
  izin_kamera_wajib boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.attendance_logs (
  id text primary key,
  attendance_id text not null references public.attendance(id) on delete cascade,
  aktivitas text not null,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
```

---

## 5. RLS Policy

### Policy Principles
- Guru may only access their own data.
- Admin may access all relevant data.
- Teachers may read their own schedules and attendance records.
- Admin may read and write everything.

### Suggested Policies

```sql
-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.teachers enable row level security;
alter table public.subjects enable row level security;
alter table public.classes enable row level security;
alter table public.academic_years enable row level security;
alter table public.cawus enable row level security;
alter table public.hissohs enable row level security;
alter table public.schedules enable row level security;
alter table public.attendance enable row level security;
alter table public.attendance_validation enable row level security;
alter table public.attendance_merge enable row level security;
alter table public.settings enable row level security;
alter table public.attendance_logs enable row level security;
```

```sql
-- Users: admin full access, teacher own profile only
create policy "users_admin_all" on public.users
for all using (
  exists (
    select 1 from public.users u
    where u.id = public.users.id and u.role = 'admin' and u.auth_user_id = auth.uid()
  )
);

create policy "users_self_read" on public.users
for select using (auth.uid() = auth_user_id);
```

```sql
-- Teachers: admin full, teacher own row only
create policy "teachers_admin_all" on public.teachers
for all using (
  exists (
    select 1 from public.users u
    where u.id = public.teachers.user_id and u.role = 'admin' and u.auth_user_id = auth.uid()
  )
);

create policy "teachers_self_read" on public.teachers
for select using (
  exists (
    select 1 from public.users u
    where u.id = public.teachers.user_id and u.auth_user_id = auth.uid()
  )
);
```

```sql
-- Schedules: admin all, teacher own schedules only
create policy "schedules_admin_all" on public.schedules
for all using (
  exists (
    select 1 from public.teachers t
    join public.users u on u.id = t.user_id
    where t.id = public.schedules.teacher_id and u.role = 'admin' and u.auth_user_id = auth.uid()
  )
);

create policy "schedules_self_read" on public.schedules
for select using (
  exists (
    select 1 from public.teachers t
    join public.users u on u.id = t.user_id
    where t.id = public.schedules.teacher_id and u.auth_user_id = auth.uid()
  )
);
```

```sql
-- Attendance: admin full, teacher own attendance only
create policy "attendance_admin_all" on public.attendance
for all using (
  exists (
    select 1 from public.teachers t
    join public.users u on u.id = t.user_id
    where t.id = public.attendance.teacher_id and u.role = 'admin' and u.auth_user_id = auth.uid()
  )
);

create policy "attendance_self_read" on public.attendance
for select using (
  exists (
    select 1 from public.teachers t
    join public.users u on u.id = t.user_id
    where t.id = public.attendance.teacher_id and u.auth_user_id = auth.uid()
  )
);
```

```sql
-- Settings and reference data: admin only for writes, read for all authenticated users
create policy "settings_admin_all" on public.settings for all using (
  exists (
    select 1 from public.users u where u.auth_user_id = auth.uid() and u.role = 'admin'
  )
);

create policy "settings_read_authenticated" on public.settings for select using (auth.role() = 'authenticated');
```

---

## 6. Storage Configuration

### Buckets
- `teacher-photo`
- `logo`
- `attendance-photo`

### Recommended Policy Behavior
- `teacher-photo`: authenticated users may upload/update their own file; admin may manage any file; public read.
- `logo`: admin-only upload and update; public read.
- `attendance-photo`: teacher can upload for their own attendance submission; admin can view; private read.

### Example Storage Policy Direction
- Public read for `logo` and `teacher-photo` if needed by the UI.
- Private read for `attendance-photo` to prevent exposure of personal images.

---

## 7. Auth Configuration

### Recommended Approach
- Use Supabase Auth as the primary authentication layer.
- Preserve the current role model: `admin` and `guru`.
- Keep the existing app flow unchanged by continuing to use the same frontend login fields, but map them to Supabase Auth internally.

### Mapping Plan
- Create auth users in Supabase Auth for each existing admin and teacher.
- Store the Supabase auth user ID in `users.auth_user_id`.
- Keep `users.role` and `teachers` profile row intact.
- For existing users, use a temporary password reset or import flow.
- Do not attempt to directly migrate plaintext password hashes into Supabase Auth.

### Why This Is Safer
- It preserves the current user experience while improving security.
- It avoids forcing a UI rewrite.

---

## 8. Index Strategy

### Critical Indexes
```sql
create index if not exists idx_users_email_role on public.users (email, role);
create index if not exists idx_teachers_nip on public.teachers (nip);
create index if not exists idx_teachers_status_deleted on public.teachers (status, deleted_at);
create index if not exists idx_schedules_teacher_day on public.schedules (teacher_id, hari, deleted_at);
create index if not exists idx_schedules_class on public.schedules (class_id, deleted_at);
create index if not exists idx_attendance_date_teacher on public.attendance (tanggal, teacher_id, deleted_at);
create index if not exists idx_attendance_schedule_date on public.attendance (schedule_id, tanggal, deleted_at);
create index if not exists idx_attendance_logs_attendance_created on public.attendance_logs (attendance_id, created_at);
create index if not exists idx_attendance_validation_attendance on public.attendance_validation (attendance_id);
```

### Why These Matter
- They support the exact queries used by the current frontend and admin dashboard.
- They reduce the chance of slow queries on attendance and stats views.

---

## 9. Migration Plan

### Phase 1 — Preparation
- Create a backup of the current JSON data store.
- Keep the existing API routes unchanged.
- Introduce a repository layer that can switch between local JSON and Supabase without changing the frontend.

### Phase 2 — Infrastructure
- Create Supabase project.
- Create tables, constraints, indexes, and storage buckets.
- Configure RLS policies.
- Enable realtime only for `attendance` and `attendance_logs`.

### Phase 3 — Data Import
- Import existing users, teachers, subjects, classes, schedules, and attendance data from the current JSON store.
- Preserve IDs and statuses.
- Keep soft-delete semantics.

### Phase 4 — Auth Migration
- Create Supabase Auth users for existing admins and teachers.
- Link them to `public.users.auth_user_id`.
- Keep password reset workflow for existing accounts.

### Phase 5 — Application Switch
- Replace the server-side repository implementation with Supabase-backed queries.
- Preserve the current `/api/*` contract.
- Verify that Guru and Admin flows still behave the same.

---

## 10. Risk Analysis

| Area | Risk | Level | Notes |
|---|---|---|---|
| Auth migration | Password compatibility | High | Existing system uses custom password handling; must be handled carefully |
| Data import | Broken relations | Medium | Must preserve existing IDs and soft-delete semantics |
| RLS misconfiguration | Data leak | High | Must be validated carefully |
| Realtime overuse | Performance overhead | Medium | Only enable for admin presence dashboard and daily status |
| Storage policy | Unauthorized image access | Medium | Bucket policies must be restrictive |

### Recommended Mitigation
- Do the migration behind the current API layer.
- Test with a copy of production-like data before switching live.
- Use soft delete and preserve existing IDs to reduce breakage.

---

## 11. Validation Checklist

### Functional Validation
- [ ] Admin login still works.
- [ ] Guru login still works.
- [ ] Teacher profile editing still works.
- [ ] Attendance submission still works.
- [ ] Admin dashboard stats still load.
- [ ] Existing API routes continue to work.

### Data Validation
- [ ] No duplicate teacher NIPs.
- [ ] No orphan attendance rows.
- [ ] No broken schedule references.
- [ ] No missing class or subject references.

### Security Validation
- [ ] Guru can only read their own attendance.
- [ ] Admin can read all data.
- [ ] RLS policies do not conflict.
- [ ] Storage files are not exposed unintentionally.

### Performance Validation
- [ ] Attendance list queries are fast.
- [ ] Stats endpoint performs well.
- [ ] Realtime is limited to attendance updates only.

---

## Final Recommendation

The current system is a good fit for a Supabase migration, but the migration should be done gradually and compatibly. The best approach is to preserve the current application flow and API surface, then replace the backend data layer with Supabase while keeping the same frontend behavior.

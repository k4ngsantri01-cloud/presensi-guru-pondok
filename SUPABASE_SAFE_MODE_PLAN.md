# Supabase Safe Mode Plan

## 1. Mapping Entity

### Auth & User
- Admin login
- Guru login
- Session persistence
- Logout
- Role checking

### Core entities used by current app
- users
- teachers
- subjects
- classes
- academic_years
- cawus
- hissohs
- schedules
- attendance
- attendance_validation
- attendance_merge
- settings
- attendance_logs

### Pages / features mapped to entities
- Login page: users, teachers
- Guru dashboard: teachers, schedules, attendance, classes, subjects, settings
- Admin dashboard: all entities including stats and logs
- AI assistant: uses data from schedules, teachers, subjects, classes

---

## 2. Database Design

### Principles
- Preserve existing entity names and semantics where possible.
- Use soft delete via `deleted_at`.
- Keep string identifiers for compatibility with the existing server and UI flow.
- Avoid introducing unnecessary tables.

### Recommended tables
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

### Relationships
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

## 3. SQL Schema

```sql
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
  gps_valid boolean default false,
  ip_valid boolean default false,
  selfie_valid boolean default false,
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

### Recommended indexes
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

---

## 4. RLS Policy

```sql
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
create policy "settings_admin_all" on public.settings for all using (
  exists (
    select 1 from public.users u where u.auth_user_id = auth.uid() and u.role = 'admin'
  )
);

create policy "settings_read_authenticated" on public.settings for select using (auth.role() = 'authenticated');
```

---

## 5. Auth Design

### Goal
- Keep current login UX unchanged.
- Use Supabase Auth under the hood.
- Preserve role-based routing (`guru` / `admin`).

### Authentication flow
1. Frontend sends username/NIP and password to existing endpoint.
2. Server or service layer checks Supabase Auth and role mapping.
3. On success, app continues to use the same session object and localStorage flow.
4. Logout clears local session and signs out from Supabase Auth.

### Compatibility note
- The current UI expects `session.role`, `session.teacherId`, `session.nama`, and `session.teacher`.
- These values should continue to be produced by the service layer.

---

## 6. Storage Design

### Buckets
- `teacher-photo`
- `logo`
- `attendance-photo`

### Usage
- `teacher-photo`: avatar/profile image
- `logo`: pondok logo
- `attendance-photo`: attendance selfie (if still used)

### Security
- `logo` can be public-read.
- `teacher-photo` can be public-read or restricted depending on policy.
- `attendance-photo` should be restricted to authenticated owner/admin.

---

## 7. Realtime Design

### Scope
Use realtime only for:
- admin dashboard stats
- daily attendance status

### Suggested channels
- `attendance_updates`
- `attendance_logs`

### Avoid
- full history export
- long report pages
- master data CRUD streams

---

## 8. Service Layer Plan

Keep UI components unchanged and route all data access through services:
- `authService`
- `teacherService`
- `attendanceService`
- `classService`
- `scheduleService`

This preserves the current app structure while allowing Supabase integration underneath.

---

## 9. Risk Analysis

### Low risk
- environment and dependency setup
- adding service layer without altering UI

### Medium risk
- auth migration from local custom auth to Supabase Auth
- storage file paths change

### High risk
- direct replacement of current data flow without a compatibility layer

### Mitigation
- Do not change the UI or existing route structure.
- Preserve existing API contract where possible.
- Introduce Supabase support behind a service layer first.

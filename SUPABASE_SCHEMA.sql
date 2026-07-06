-- ============================================================================
-- SUPABASE SQL SCHEMA: Presensi Guru Pondok
-- ============================================================================
-- This schema is designed for PostgreSQL/Supabase and includes:
-- - Core tables (users, teachers, classes, subjects, schedules, attendance)
-- - Support tables (attendance_validation, attendance_merge, attendance_logs)
-- - Master data (academic_years, cawus, hissohs, settings)
-- - Soft delete pattern (deleted_at column)
-- - String IDs for compatibility with existing frontend
-- - Comprehensive indexes for performance
-- - RLS policies for security (guru can only see own data, admin sees all)
--
-- EXECUTION ORDER:
-- 1. Enums (if any)
-- 2. Tables
-- 3. Indexes
-- 4. Trigger functions
-- 5. RLS policies
-- ============================================================================

-- ============================================================================
-- ENUMS (if needed)
-- ============================================================================
-- Currently using text columns with CHECK constraints for flexibility

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Users: Both admin and guru roles
create table if not exists public.users (
  id text primary key,
  auth_user_id uuid references auth.users(id) on delete set null,
  email text not null unique,
  password_hash text,
  role text not null check (role in ('admin', 'guru')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Teachers: Guru profile data
create table if not exists public.teachers (
  id text primary key,
  user_id text not null references public.users(id) on delete restrict,
  nama text not null,
  nip text not null unique,
  email text not null unique,
  no_hp text not null default '',
  foto text not null default '',
  status text not null check (status in ('aktif', 'nonaktif')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Subjects: Mata Pelajaran
create table if not exists public.subjects (
  id text primary key,
  nama_mapel text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Classes: Ruangan/Kelas
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

-- Academic Years: Tahun Ajaran
create table if not exists public.academic_years (
  id text primary key,
  tahun text not null unique,
  status text not null check (status in ('aktif', 'tidak_aktif')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Cawu: Period (Cawu 1, 2, 3)
create table if not exists public.cawus (
  id text primary key,
  nama text not null unique,
  status text not null check (status in ('aktif', 'tidak_aktif')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Hissoh: Daily schedule (HISSOH 01, 02, etc.)
create table if not exists public.hissohs (
  id text primary key,
  nama text not null unique,
  jam_mulai_wib text not null,
  jam_selesai_wib text not null,
  jam_mulai_istw text not null default '',
  jam_selesai_istw text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Schedules: Jadwal Mengajar
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
  status text not null check (status in ('aktif', 'nonaktif')),
  merged_with_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Attendance: Presensi
create table if not exists public.attendance (
  id text primary key,
  schedule_id text not null references public.schedules(id) on delete restrict,
  teacher_id text not null references public.teachers(id) on delete restrict,
  tanggal date not null,
  status text not null check (status in ('Hadir', 'Izin', 'Alfa', 'Pending')),
  catatan text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ============================================================================
-- SUPPORT TABLES
-- ============================================================================

-- Attendance Validation: Validasi foto, GPS, IP
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

-- Attendance Merge: Merge jadwal
create table if not exists public.attendance_merge (
  id text primary key,
  attendance_id text not null references public.attendance(id) on delete cascade,
  schedule_target text not null references public.schedules(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Attendance Logs: Log aktivitas
create table if not exists public.attendance_logs (
  id text primary key,
  attendance_id text not null references public.attendance(id) on delete cascade,
  aktivitas text not null,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ============================================================================
-- MASTER DATA TABLE
-- ============================================================================

-- Settings: Pengaturan sistem
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

-- ============================================================================
-- TRIGGERS FOR updated_at
-- ============================================================================

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_users_updated_at before update on public.users
  for each row execute function public.update_updated_at_column();

create trigger update_teachers_updated_at before update on public.teachers
  for each row execute function public.update_updated_at_column();

create trigger update_subjects_updated_at before update on public.subjects
  for each row execute function public.update_updated_at_column();

create trigger update_classes_updated_at before update on public.classes
  for each row execute function public.update_updated_at_column();

create trigger update_academic_years_updated_at before update on public.academic_years
  for each row execute function public.update_updated_at_column();

create trigger update_cawus_updated_at before update on public.cawus
  for each row execute function public.update_updated_at_column();

create trigger update_hissohs_updated_at before update on public.hissohs
  for each row execute function public.update_updated_at_column();

create trigger update_schedules_updated_at before update on public.schedules
  for each row execute function public.update_updated_at_column();

create trigger update_attendance_updated_at before update on public.attendance
  for each row execute function public.update_updated_at_column();

create trigger update_attendance_validation_updated_at before update on public.attendance_validation
  for each row execute function public.update_updated_at_column();

create trigger update_attendance_merge_updated_at before update on public.attendance_merge
  for each row execute function public.update_updated_at_column();

create trigger update_attendance_logs_updated_at before update on public.attendance_logs
  for each row execute function public.update_updated_at_column();

create trigger update_settings_updated_at before update on public.settings
  for each row execute function public.update_updated_at_column();

-- ============================================================================
-- INDEXES: Performance & Query optimization
-- ============================================================================

-- Users indexes
create index if not exists idx_users_email_role on public.users (email, role) where deleted_at is null;
create index if not exists idx_users_auth_user_id on public.users (auth_user_id) where deleted_at is null;

-- Teachers indexes
create index if not exists idx_teachers_nip on public.teachers (nip) where deleted_at is null;
create index if not exists idx_teachers_user_id on public.teachers (user_id) where deleted_at is null;
create index if not exists idx_teachers_status on public.teachers (status) where deleted_at is null;

-- Classes indexes
create index if not exists idx_classes_nama on public.classes (nama_kelas) where deleted_at is null;
create index if not exists idx_classes_tingkat on public.classes (tingkat) where deleted_at is null;

-- Schedules indexes (critical for queries)
create index if not exists idx_schedules_teacher_id on public.schedules (teacher_id) where deleted_at is null;
create index if not exists idx_schedules_class_id on public.schedules (class_id) where deleted_at is null;
create index if not exists idx_schedules_academic_year on public.schedules (academic_year_id) where deleted_at is null;
create index if not exists idx_schedules_teacher_hari on public.schedules (teacher_id, hari) where deleted_at is null;
create index if not exists idx_schedules_status on public.schedules (status) where deleted_at is null;

-- Attendance indexes (critical for performance)
create index if not exists idx_attendance_schedule_id on public.attendance (schedule_id) where deleted_at is null;
create index if not exists idx_attendance_teacher_id on public.attendance (teacher_id) where deleted_at is null;
create index if not exists idx_attendance_tanggal on public.attendance (tanggal) where deleted_at is null;
create index if not exists idx_attendance_teacher_tanggal on public.attendance (teacher_id, tanggal) where deleted_at is null;
create index if not exists idx_attendance_schedule_tanggal on public.attendance (schedule_id, tanggal) where deleted_at is null;
create index if not exists idx_attendance_status on public.attendance (status) where deleted_at is null;

-- Attendance validation indexes
create index if not exists idx_attendance_validation_attendance_id on public.attendance_validation (attendance_id) where deleted_at is null;

-- Attendance logs indexes
create index if not exists idx_attendance_logs_attendance_id on public.attendance_logs (attendance_id) where deleted_at is null;
create index if not exists idx_attendance_logs_created_at on public.attendance_logs (created_at) where deleted_at is null;

-- Subjects indexes
create index if not exists idx_subjects_nama on public.subjects (nama_mapel) where deleted_at is null;

-- Academic years indexes
create index if not exists idx_academic_years_status on public.academic_years (status) where deleted_at is null;

-- Cawus indexes
create index if not exists idx_cawus_status on public.cawus (status) where deleted_at is null;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
alter table if exists public.users enable row level security;
alter table if exists public.teachers enable row level security;
alter table if exists public.subjects enable row level security;
alter table if exists public.classes enable row level security;
alter table if exists public.academic_years enable row level security;
alter table if exists public.cawus enable row level security;
alter table if exists public.hissohs enable row level security;
alter table if exists public.schedules enable row level security;
alter table if exists public.attendance enable row level security;
alter table if exists public.attendance_validation enable row level security;
alter table if exists public.attendance_merge enable row level security;
alter table if exists public.attendance_logs enable row level security;
alter table if exists public.settings enable row level security;

-- ============================================================================
-- USERS TABLE RLS
-- ============================================================================

-- Admin can see all users
create policy "users_admin_all" on public.users
for all using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()::text and u.role = 'admin' and u.deleted_at is null
  )
);

-- Guru can only see their own user record
create policy "users_self_read" on public.users
for select using (
  auth.uid()::text = id and deleted_at is null
);

-- ============================================================================
-- TEACHERS TABLE RLS
-- ============================================================================

-- Admin can do all operations on teachers
create policy "teachers_admin_all" on public.teachers
for all using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()::text and u.role = 'admin' and u.deleted_at is null
  )
);

-- Guru can only read their own teacher profile
create policy "teachers_self_read" on public.teachers
for select using (
  user_id = auth.uid()::text and deleted_at is null
);

-- Guru can update their own profile (limited fields)
create policy "teachers_self_update" on public.teachers
for update using (
  user_id = auth.uid()::text and deleted_at is null
)
with check (
  user_id = auth.uid()::text and deleted_at is null
);

-- ============================================================================
-- SUBJECTS, CLASSES, ACADEMIC_YEARS, CAWUS, HISSOHS TABLE RLS
-- ============================================================================

-- Master data: Admin can do all, authenticated users can read
create policy "subjects_admin_all" on public.subjects
for all using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()::text and u.role = 'admin' and u.deleted_at is null
  )
);

create policy "subjects_read_authenticated" on public.subjects
for select using (auth.role() = 'authenticated' and deleted_at is null);

create policy "classes_admin_all" on public.classes
for all using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()::text and u.role = 'admin' and u.deleted_at is null
  )
);

create policy "classes_read_authenticated" on public.classes
for select using (auth.role() = 'authenticated' and deleted_at is null);

create policy "academic_years_admin_all" on public.academic_years
for all using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()::text and u.role = 'admin' and u.deleted_at is null
  )
);

create policy "academic_years_read_authenticated" on public.academic_years
for select using (auth.role() = 'authenticated' and deleted_at is null);

create policy "cawus_admin_all" on public.cawus
for all using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()::text and u.role = 'admin' and u.deleted_at is null
  )
);

create policy "cawus_read_authenticated" on public.cawus
for select using (auth.role() = 'authenticated' and deleted_at is null);

create policy "hissohs_admin_all" on public.hissohs
for all using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()::text and u.role = 'admin' and u.deleted_at is null
  )
);

create policy "hissohs_read_authenticated" on public.hissohs
for select using (auth.role() = 'authenticated' and deleted_at is null);

-- ============================================================================
-- SCHEDULES TABLE RLS
-- ============================================================================

-- Admin can do all operations
create policy "schedules_admin_all" on public.schedules
for all using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()::text and u.role = 'admin' and u.deleted_at is null
  )
);

-- Guru can only read their own schedules
create policy "schedules_self_read" on public.schedules
for select using (
  teacher_id in (
    select id from public.teachers
    where user_id = auth.uid()::text and deleted_at is null
  )
  and deleted_at is null
);

-- ============================================================================
-- ATTENDANCE TABLE RLS
-- ============================================================================

-- Admin can do all operations
create policy "attendance_admin_all" on public.attendance
for all using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()::text and u.role = 'admin' and u.deleted_at is null
  )
);

-- Guru can read their own attendance
create policy "attendance_self_read" on public.attendance
for select using (
  teacher_id in (
    select id from public.teachers
    where user_id = auth.uid()::text and deleted_at is null
  )
  and deleted_at is null
);

-- Guru can insert their own attendance (for presensi submission)
create policy "attendance_self_insert" on public.attendance
for insert with check (
  teacher_id in (
    select id from public.teachers
    where user_id = auth.uid()::text and deleted_at is null
  )
);

-- Guru can update their own attendance (limited)
create policy "attendance_self_update" on public.attendance
for update using (
  teacher_id in (
    select id from public.teachers
    where user_id = auth.uid()::text and deleted_at is null
  )
  and deleted_at is null
)
with check (
  teacher_id in (
    select id from public.teachers
    where user_id = auth.uid()::text and deleted_at is null
  )
);

-- ============================================================================
-- ATTENDANCE_VALIDATION TABLE RLS
-- ============================================================================

-- Admin can do all
create policy "attendance_validation_admin_all" on public.attendance_validation
for all using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()::text and u.role = 'admin' and u.deleted_at is null
  )
);

-- Guru can read validation for their own attendance
create policy "attendance_validation_self_read" on public.attendance_validation
for select using (
  attendance_id in (
    select id from public.attendance
    where teacher_id in (
      select id from public.teachers
      where user_id = auth.uid()::text and deleted_at is null
    )
    and deleted_at is null
  )
  and deleted_at is null
);

-- ============================================================================
-- ATTENDANCE_MERGE TABLE RLS
-- ============================================================================

-- Admin can do all
create policy "attendance_merge_admin_all" on public.attendance_merge
for all using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()::text and u.role = 'admin' and u.deleted_at is null
  )
);

-- Guru can read merge for their own attendance
create policy "attendance_merge_self_read" on public.attendance_merge
for select using (
  attendance_id in (
    select id from public.attendance
    where teacher_id in (
      select id from public.teachers
      where user_id = auth.uid()::text and deleted_at is null
    )
    and deleted_at is null
  )
  and deleted_at is null
);

-- ============================================================================
-- ATTENDANCE_LOGS TABLE RLS
-- ============================================================================

-- Admin can do all
create policy "attendance_logs_admin_all" on public.attendance_logs
for all using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()::text and u.role = 'admin' and u.deleted_at is null
  )
);

-- Guru can read logs for their own attendance
create policy "attendance_logs_self_read" on public.attendance_logs
for select using (
  attendance_id in (
    select id from public.attendance
    where teacher_id in (
      select id from public.teachers
      where user_id = auth.uid()::text and deleted_at is null
    )
    and deleted_at is null
  )
  and deleted_at is null
);

-- ============================================================================
-- SETTINGS TABLE RLS
-- ============================================================================

-- Admin can do all
create policy "settings_admin_all" on public.settings
for all using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid()::text and u.role = 'admin' and u.deleted_at is null
  )
);

-- Authenticated users can read settings
create policy "settings_read_authenticated" on public.settings
for select using (auth.role() = 'authenticated' and deleted_at is null);

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================

# Supabase Schema Documentation

## Entity Relationship Diagram (ERD)

```
                        ┌─────────────────┐
                        │     users       │
                        │  (admin/guru)   │
                        └────────┬────────┘
                                 │
                     ┌───────────┼───────────┐
                     │                       │
                     ▼                       ▼
            ┌─────────────────┐    ┌──────────────────────┐
            │   teachers      │    │ (auth_user_id link)  │
            │ (guru profile)  │    │ Supabase Auth users  │
            └────────┬────────┘    └──────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
   ┌─────────┐  ┌──────────┐  ┌──────────────┐
   │schedules│  │attendance│  │ academic_years
   └────┬────┘  └────┬─────┘  └──────────────┘
        │            │
        │            ▼
        │      ┌──────────────────┐
        │      │attendance_logs   │
        │      │validation        │
        │      │merge             │
        │      └──────────────────┘
        │
        ├──→ teachers
        ├──→ subjects
        ├──→ classes
        ├──→ hissohs (time periods)
        └──→ cawus (grade periods)

┌──────────┐  ┌──────────┐  ┌──────────────┐
│ subjects │  │ classes  │  │ settings     │
└──────────┘  └──────────┘  └──────────────┘
```

## Table Structure

### Core Auth & Profile Tables

#### users
- `id` (text, PK): User identifier
- `auth_user_id` (uuid, FK): Link to Supabase Auth
- `email` (text, UNIQUE): Email address
- `password_hash` (text): Stored password (optional if using Supabase Auth)
- `role` (text): 'admin' or 'guru'
- `created_at` (timestamptz): Record creation timestamp
- `updated_at` (timestamptz): Last update timestamp (auto-updated by trigger)
- `deleted_at` (timestamptz): Soft delete marker

**Indexes:**
- `(email, role)` where deleted_at is null
- `(auth_user_id)` where deleted_at is null

---

#### teachers
- `id` (text, PK): Teacher identifier
- `user_id` (text, FK): Reference to users table
- `nama` (text): Teacher name
- `nip` (text, UNIQUE): Teacher ID number
- `email` (text, UNIQUE): Teacher email
- `no_hp` (text): Phone number
- `foto` (text): Profile photo URL
- `status` (text): 'aktif' or 'nonaktif'
- `created_at` (timestamptz)
- `updated_at` (timestamptz): Auto-updated by trigger
- `deleted_at` (timestamptz)

**Indexes:**
- `(nip)` where deleted_at is null
- `(user_id)` where deleted_at is null
- `(status)` where deleted_at is null

---

### Master Data Tables

#### subjects
- `id` (text, PK): Subject identifier
- `nama_mapel` (text, UNIQUE): Subject name
- `created_at` (timestamptz)
- `updated_at` (timestamptz): Auto-updated by trigger
- `deleted_at` (timestamptz)

**Indexes:**
- `(nama_mapel)` where deleted_at is null

---

#### classes
- `id` (text, PK): Class identifier
- `nama_kelas` (text): Class name
- `tingkat` (text): Grade level
- `gedung` (text): Building
- `lokasi` (text): Location
- `latitude` (double precision): GPS latitude
- `longitude` (double precision): GPS longitude
- `radius` (integer): Geofence radius in meters
- `created_at` (timestamptz)
- `updated_at` (timestamptz): Auto-updated by trigger
- `deleted_at` (timestamptz)

**Indexes:**
- `(nama_kelas)` where deleted_at is null
- `(tingkat)` where deleted_at is null

---

#### academic_years
- `id` (text, PK): Academic year identifier
- `tahun` (text, UNIQUE): Year string (e.g., "2026-2027")
- `status` (text): 'aktif' or 'tidak_aktif'
- `created_at` (timestamptz)
- `updated_at` (timestamptz): Auto-updated by trigger
- `deleted_at` (timestamptz)

**Indexes:**
- `(status)` where deleted_at is null

---

#### cawus
- `id` (text, PK): Cawu identifier
- `nama` (text, UNIQUE): Cawu name (e.g., "Cawu 1")
- `status` (text): 'aktif' or 'tidak_aktif'
- `created_at` (timestamptz)
- `updated_at` (timestamptz): Auto-updated by trigger
- `deleted_at` (timestamptz)

**Indexes:**
- `(status)` where deleted_at is null

---

#### hissohs
- `id` (text, PK): Hissoh identifier
- `nama` (text, UNIQUE): Hissoh name (e.g., "HISSOH 01")
- `jam_mulai_wib` (text): Start time WIB
- `jam_selesai_wib` (text): End time WIB
- `jam_mulai_istw` (text): Start time Istiwa
- `jam_selesai_istw` (text): End time Istiwa
- `created_at` (timestamptz)
- `updated_at` (timestamptz): Auto-updated by trigger
- `deleted_at` (timestamptz)

---

### Schedule & Attendance Tables

#### schedules
- `id` (text, PK): Schedule identifier
- `teacher_id` (text, FK): Reference to teachers
- `subject_id` (text, FK): Reference to subjects
- `class_id` (text, FK): Reference to classes
- `academic_year_id` (text, FK): Reference to academic_years
- `hissoh_id` (text, FK, nullable): Reference to hissohs
- `cawu_id` (text, FK, nullable): Reference to cawus
- `hari` (text): Day name (Senin, Selasa, etc.)
- `jam_mulai` (text): Start time
- `jam_selesai` (text): End time
- `latitude` (double precision): GPS location
- `longitude` (double precision): GPS location
- `radius` (integer): Geofence radius in meters
- `status` (text): 'aktif' or 'nonaktif'
- `merged_with_id` (text, nullable): For merged schedules
- `created_at` (timestamptz)
- `updated_at` (timestamptz): Auto-updated by trigger
- `deleted_at` (timestamptz)

**Indexes (Critical for performance):**
- `(teacher_id)` where deleted_at is null
- `(class_id)` where deleted_at is null
- `(academic_year_id)` where deleted_at is null
- `(teacher_id, hari)` where deleted_at is null ← For daily schedule queries
- `(status)` where deleted_at is null

---

#### attendance
- `id` (text, PK): Attendance identifier
- `schedule_id` (text, FK): Reference to schedules
- `teacher_id` (text, FK): Reference to teachers
- `tanggal` (date): Attendance date
- `status` (text): 'Hadir', 'Izin', 'Alfa', or 'Pending'
- `catatan` (text): Notes
- `created_at` (timestamptz)
- `updated_at` (timestamptz): Auto-updated by trigger
- `deleted_at` (timestamptz)

**Indexes (Critical for performance):**
- `(schedule_id)` where deleted_at is null
- `(teacher_id)` where deleted_at is null
- `(tanggal)` where deleted_at is null
- `(teacher_id, tanggal)` where deleted_at is null ← For daily attendance queries
- `(schedule_id, tanggal)` where deleted_at is null ← For schedule-specific attendance
- `(status)` where deleted_at is null

---

### Support Tables

#### attendance_validation
- `id` (text, PK): Validation identifier
- `attendance_id` (text, FK): Reference to attendance
- `foto_url` (text): Selfie photo URL
- `latitude` (double precision): GPS location captured
- `longitude` (double precision): GPS location captured
- `ip` (text): IP address reported
- `jarak` (integer): Distance from class in meters
- `gps_valid` (boolean): GPS validation result
- `ip_valid` (boolean): IP validation result
- `selfie_valid` (boolean): Selfie validation result
- `created_at` (timestamptz)
- `updated_at` (timestamptz): Auto-updated by trigger
- `deleted_at` (timestamptz)

**Indexes:**
- `(attendance_id)` where deleted_at is null

---

#### attendance_merge
- `id` (text, PK): Merge identifier
- `attendance_id` (text, FK): Reference to attendance
- `schedule_target` (text, FK): Reference to target schedule
- `created_at` (timestamptz)
- `updated_at` (timestamptz): Auto-updated by trigger
- `deleted_at` (timestamptz)

---

#### attendance_logs
- `id` (text, PK): Log identifier
- `attendance_id` (text, FK): Reference to attendance
- `aktivitas` (text): Activity description
- `status` (text): Log status
- `created_at` (timestamptz)
- `updated_at` (timestamptz): Auto-updated by trigger
- `deleted_at` (timestamptz)

**Indexes:**
- `(attendance_id)` where deleted_at is null
- `(created_at)` where deleted_at is null

---

#### settings
- `id` (text, PK): Settings identifier (typically single row)
- `nama_pondok` (text): Institution name
- `logo` (text): Logo URL
- `alamat` (text): Address
- `radius_default` (integer): Default geofence radius
- `jam_toleransi` (integer): Time tolerance in minutes
- `batas_keterlambatan` (integer): Late threshold in minutes
- `password_minimum` (integer): Minimum password length
- `session_timeout` (integer): Session timeout in hours
- `izin_kamera_wajib` (boolean): Require camera permission
- `created_at` (timestamptz)
- `updated_at` (timestamptz): Auto-updated by trigger
- `deleted_at` (timestamptz)

---

## RLS Policy Strategy

### Philosophy
- **Guru (Teachers):** Can only see and modify their own data (schedules, attendance)
- **Admin:** Has full access to all data
- **Master Data:** Readable by authenticated users; writable only by admin

### Guru Restrictions
1. Can read only their own:
   - Teacher profile
   - Schedules
   - Attendance records
   - Attendance validation
   - Attendance logs

2. Can insert/update:
   - Their own attendance records
   - Their own profile (limited fields)

3. Cannot access:
   - Other teachers' data
   - Admin settings
   - User management

### Admin Access
1. Full CRUD on all tables
2. Can view all teacher and attendance data
3. Can manage master data (subjects, classes, schedules)
4. Can adjust settings and logs

### Implementation Details
- RLS checks the `auth.uid()` against the user's ID in the users table
- For guru access to attendance/schedules, policies traverse: `auth.uid()` → `users.id` → `teachers.user_id`
- Soft-delete support: All RLS policies filter `deleted_at is null`

---

## Index Strategy

### High-Priority Indexes (Query Performance)
**Attendance queries** (most common operations):
- `(teacher_id, tanggal)`: Daily attendance for a guru
- `(schedule_id, tanggal)`: Attendance for a specific schedule
- `(tanggal)`: Attendance for a date range

**Schedule queries**:
- `(teacher_id, hari)`: Guru's schedule for a specific day
- `(class_id)`: Schedule for a class
- `(academic_year_id)`: Active schedules

**Master data queries**:
- Status-based filters: `(status)` on teachers, schedules, academic_years, cawus

### Index Design
- All indexes use `where deleted_at is null` predicate to optimize for active records
- Composite indexes ordered by most-selective columns first
- Avoid indexing low-cardinality columns alone

---

## Scalability Considerations

### Data Volume
- This schema supports:
  - 1000+ teachers
  - 100+ classes
  - 5000+ schedules per academic year
  - 500K+ attendance records per year (scales with teacher count and days)

### Query Performance
- Indexes ensure attendance/schedule lookups complete in milliseconds
- Soft-delete approach avoids table rebuilds during historical data cleanup

### Storage Optimization
- String IDs (text type) maintain compatibility but consume more space than UUIDs
- Photos stored as URLs in Supabase Storage, not in DB

---

## Migration Notes

### Compatibility with Existing Frontend
- Table names match existing project structure
- Column names preserved for easy mapping
- String IDs compatible with existing `generateUUID()` function
- Soft-delete semantics maintained

### Data Import Strategy
1. Export from existing JSON data store
2. Map to new schema fields
3. Preserve existing IDs to prevent UI breakage
4. Populate `deleted_at` based on existing delete flags

---

## Testing Recommendations

### RLS Policy Testing
- Admin login: Verify access to all tables
- Guru login: Verify isolation of own data
- Cross-user access: Ensure guru cannot access other guru's data

### Performance Testing
- Query attendance for a day: < 100ms
- Query schedules for a teacher: < 50ms
- Bulk attendance insert: < 1s for 100 records

### Data Integrity
- Foreign key constraints prevent orphan records
- Triggers maintain updated_at accuracy
- Soft-delete preserves historical data


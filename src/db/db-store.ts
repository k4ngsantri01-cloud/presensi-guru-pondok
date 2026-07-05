import fs from "fs";
import path from "path";

// Define Interfaces based on the Blueprint
export interface User {
  id: string;
  email: string; // also serves as username for admin
  password_hash: string;
  role: "admin" | "guru";
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Teacher {
  id: string;
  user_id: string;
  nama: string;
  nip: string;
  email: string;
  no_hp: string;
  foto: string;
  status: "aktif" | "nonaktif";
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Subject {
  id: string;
  nama_mapel: string;
  deleted_at: string | null;
}

export interface ClassRoom {
  id: string;
  nama_kelas: string;
  tingkat: string;
  gedung: string;
  lokasi: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  deleted_at: string | null;
}

export interface AcademicYear {
  id: string;
  tahun: string;
  status: "aktif" | "tidak_aktif";
  deleted_at: string | null;
}

export interface Cawu {
  id: string;
  nama: string; // e.g. "Cawu 1", "Cawu 2", "Cawu 3"
  status: "aktif" | "tidak_aktif";
  deleted_at: string | null;
}

export interface Hissoh {
  id: string;
  nama: string; // e.g. "HISSOH 01"
  jam_mulai_wib: string; // HH:MM
  jam_selesai_wib: string; // HH:MM
  jam_mulai_istw: string; // HH:MM
  jam_selesai_istw: string; // HH:MM
  deleted_at: string | null;
}

export interface Schedule {
  id: string;
  teacher_id: string;
  subject_id: string;
  class_id: string;
  academic_year_id: string;
  hissoh_id?: string; // Optional reference to Hissoh
  cawu_id?: string; // Optional reference to Cawu
  hari: string; // Senin, Selasa, Rabu, Kamis, Sabtu, Minggu (Jumat libur)
  jam_mulai: string; // HH:MM
  jam_selesai: string; // HH:MM
  latitude: number;
  longitude: number;
  radius: number;
  status: "aktif" | "nonaktif";
  created_at: string;
  deleted_at: string | null;
  // helper properties for merges
  merged_with_id?: string | null;
}

export interface Attendance {
  id: string;
  schedule_id: string;
  teacher_id: string;
  tanggal: string; // YYYY-MM-DD
  status: "Hadir" | "Izin" | "Alfa" | "Pending";
  catatan: string;
  created_at: string;
  deleted_at: string | null;
}

export interface AttendanceValidation {
  id: string;
  attendance_id: string;
  foto_url: string;
  latitude: number;
  longitude: number;
  ip: string;
  jarak: number; // meters from schedule lat/lng
  gps_valid: boolean;
  ip_valid: boolean;
  selfie_valid: boolean;
  deleted_at: string | null;
}

export interface AttendanceMerge {
  id: string;
  attendance_id: string;
  schedule_target: string; // schedule_id
  deleted_at: string | null;
}

export interface Settings {
  id: string;
  nama_pondok: string;
  logo: string;
  alamat: string;
  radius_default: number;
  jam_toleransi: number; // minutes
  batas_keterlambatan: number; // minutes
  password_minimum: number;
  session_timeout: number; // hours (e.g. 24 for admin, 168 for teacher)
  izin_kamera_wajib: boolean;
  deleted_at: string | null;
}

export interface AttendanceLog {
  id: string;
  attendance_id: string;
  aktivitas: string;
  status: string;
  created_at: string;
  deleted_at: string | null;
}

export interface DBState {
  users: User[];
  teachers: Teacher[];
  subjects: Subject[];
  classes: ClassRoom[];
  academic_years: AcademicYear[];
  cawus: Cawu[];
  hissohs: Hissoh[];
  schedule: Schedule[];
  attendance: Attendance[];
  attendance_validation: AttendanceValidation[];
  attendance_merge: AttendanceMerge[];
  settings: Settings;
  attendance_logs: AttendanceLog[];
}

const DB_FILE = path.join(process.cwd(), "data-store.json");

// Helper to generate IDs
export function generateUUID(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Initial Seeding
const initialSettings: Settings = {
  id: "settings-1",
  nama_pondok: "Pondok Pesantren Al-Huda Kaloran",
  logo: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=120&auto=format&fit=crop&q=60", // clean emblem
  alamat: "Jl. KH. Wahid Hasyim No. 45, Kaloran, Temanggung, Jawa Tengah",
  radius_default: 100, // 100 meters
  jam_toleransi: 15, // 15 minutes before & after
  batas_keterlambatan: 30, // 30 minutes after jam_mulai status can change or be restricted
  password_minimum: 8,
  session_timeout: 168, // 7 days (168h) for teacher, 24h for admin
  izin_kamera_wajib: true,
  deleted_at: null
};

function getSeedData(): DBState {
  const adminUserId = "user-admin-1";
  const teacherUserId1 = "user-teacher-1";
  const teacherUserId2 = "user-teacher-2";
  const teacherUserId3 = "user-teacher-3";
  const teacherUserId4 = "user-teacher-4";

  const teacherId1 = "teacher-1";
  const teacherId2 = "teacher-2";
  const teacherId3 = "teacher-3";
  const teacherId4 = "teacher-4";

  const subjectId1 = "subject-1";
  const subjectId2 = "subject-2";
  const subjectId3 = "subject-3";
  const subjectId4 = "subject-4";
  const subjectId5 = "subject-5";

  const classId1 = "class-1";
  const classId2 = "class-2";
  const classId3 = "class-3";
  const classId4 = "class-4";

  const ayId = "ay-1";

  const users: User[] = [
    {
      id: adminUserId,
      email: "admin@pondok.com", // Admin logs in using email
      password_hash: "admin@pondok1820", // Plain text or hash
      role: "admin",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null
    },
    {
      id: teacherUserId1,
      email: "hizbullah@pondok.com",
      password_hash: "Hizbullah123", // Meets requirements (8 chars, 1 uppercase, 1 number)
      role: "guru",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null
    },
    {
      id: teacherUserId2,
      email: "fauzi@pondok.com",
      password_hash: "Fauzi1234",
      role: "guru",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null
    },
    {
      id: teacherUserId3,
      email: "karim@pondok.com",
      password_hash: "Karim1234",
      role: "guru",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null
    },
    {
      id: teacherUserId4,
      email: "hasan@pondok.com",
      password_hash: "muhammadhasan",
      role: "guru",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null
    }
  ];

  const teachers: Teacher[] = [
    {
      id: teacherId1,
      user_id: teacherUserId1,
      nama: "Muhammad Hizbullah",
      nip: "19920101",
      email: "hizbullah@pondok.com",
      no_hp: "081234567890",
      foto: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
      status: "aktif",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null
    },
    {
      id: teacherId2,
      user_id: teacherUserId2,
      nama: "Ahmad Fauzi",
      nip: "19950505",
      email: "fauzi@pondok.com",
      no_hp: "081234567891",
      foto: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&auto=format&fit=crop&q=80",
      status: "aktif",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null
    },
    {
      id: teacherId3,
      user_id: teacherUserId3,
      nama: "Abdul Karim",
      nip: "19900808",
      email: "karim@pondok.com",
      no_hp: "081234567892",
      foto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      status: "aktif",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null
    },
    {
      id: teacherId4,
      user_id: teacherUserId4,
      nama: "Muhammad Hasan",
      nip: "19881212",
      email: "hasan@pondok.com",
      no_hp: "081234567893",
      foto: "https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=150&auto=format&fit=crop&q=80",
      status: "aktif",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null
    }
  ];

  const subjects: Subject[] = [
    { id: subjectId1, nama_mapel: "Tarikh Islam", deleted_at: null },
    { id: subjectId2, nama_mapel: "Al-Qur'an", deleted_at: null },
    { id: subjectId3, nama_mapel: "Fiqih", deleted_at: null },
    { id: subjectId4, nama_mapel: "Aqidah Akhlak", deleted_at: null },
    { id: subjectId5, nama_mapel: "Bahasa Arab", deleted_at: null }
  ];

  const classes: ClassRoom[] = [
    { id: classId1, nama_kelas: "MTs 2 PA A", tingkat: "MTs", gedung: "Gedung Abu Bakar", lokasi: "Madrasah Kaloran lt. 1", latitude: -7.29135, longitude: 110.18341, deleted_at: null },
    { id: classId2, nama_kelas: "MTs 2 PA B", tingkat: "MTs", gedung: "Gedung Abu Bakar", lokasi: "Madrasah Kaloran lt. 1", latitude: -7.29135, longitude: 110.18341, deleted_at: null },
    { id: classId3, nama_kelas: "MA 1 PA A", tingkat: "MA", gedung: "Gedung Umar Bin Khattab", lokasi: "Madrasah Kaloran lt. 2", latitude: -7.29135, longitude: 110.18341, deleted_at: null },
    { id: classId4, nama_kelas: "MTs 1 PI A", tingkat: "MTs", gedung: "Gedung Aisyah (Putri)", lokasi: "Komp. Putri Kaloran lt. 1", latitude: -7.29135, longitude: 110.18341, deleted_at: null }
  ];

  const academic_years: AcademicYear[] = [
    { id: ayId, tahun: "2026-2027", status: "aktif", deleted_at: null }
  ];

  // Coordinates for Pondok (Centered around Temanggung / Yogyakarta area as default)
  // Default coordinate: Lat -7.29135, Lng 110.18341 (Temanggung Kaloran area)
  const defaultLat = -7.29135;
  const defaultLng = 110.18341;
  const radius = 100;

  // Let's create a solid schedule for the week.
  // Days: Senin, Selasa, Rabu, Kamis, Sabtu, Minggu (Jumat Libur)
  const schedule: Schedule[] = [
    // Hizbullah (Teacher 1)
    {
      id: "sched-1",
      teacher_id: teacherId1,
      subject_id: subjectId1, // Tarikh Islam
      class_id: classId2, // MTs 2 PA B
      academic_year_id: ayId,
      hari: "Senin",
      jam_mulai: "07:00",
      jam_selesai: "07:45",
      latitude: defaultLat,
      longitude: defaultLng,
      radius: radius,
      status: "aktif",
      created_at: new Date().toISOString(),
      deleted_at: null
    },
    {
      id: "sched-2",
      teacher_id: teacherId1,
      subject_id: subjectId2, // Al-Qur'an
      class_id: classId1, // MTs 2 PA A
      academic_year_id: ayId,
      hari: "Senin",
      jam_mulai: "08:00",
      jam_selesai: "08:45",
      latitude: defaultLat,
      longitude: defaultLng,
      radius: radius,
      status: "aktif",
      created_at: new Date().toISOString(),
      deleted_at: null
    },
    {
      id: "sched-3",
      teacher_id: teacherId1,
      subject_id: subjectId2, // Al-Qur'an
      class_id: classId2, // MTs 2 PA B
      academic_year_id: ayId,
      hari: "Senin",
      jam_mulai: "09:00",
      jam_selesai: "09:45",
      latitude: defaultLat,
      longitude: defaultLng,
      radius: radius,
      status: "aktif",
      created_at: new Date().toISOString(),
      deleted_at: null
    },
    {
      id: "sched-4",
      teacher_id: teacherId1,
      subject_id: subjectId3, // Fiqih
      class_id: classId3, // MA 1 PA A
      academic_year_id: ayId,
      hari: "Selasa",
      jam_mulai: "07:45",
      jam_selesai: "08:30",
      latitude: defaultLat,
      longitude: defaultLng,
      radius: radius,
      status: "aktif",
      created_at: new Date().toISOString(),
      deleted_at: null
    },

    // Fauzi (Teacher 2)
    {
      id: "sched-5",
      teacher_id: teacherId2,
      subject_id: subjectId3, // Fiqih
      class_id: classId1,
      academic_year_id: ayId,
      hari: "Senin",
      jam_mulai: "07:00",
      jam_selesai: "07:45",
      latitude: defaultLat,
      longitude: defaultLng,
      radius: radius,
      status: "aktif",
      created_at: new Date().toISOString(),
      deleted_at: null
    },
    {
      id: "sched-6",
      teacher_id: teacherId2,
      subject_id: subjectId4, // Aqidah Akhlak
      class_id: classId4,
      academic_year_id: ayId,
      hari: "Senin",
      jam_mulai: "08:45",
      jam_selesai: "09:30",
      latitude: defaultLat,
      longitude: defaultLng,
      radius: radius,
      status: "aktif",
      created_at: new Date().toISOString(),
      deleted_at: null
    },

    // Abdul Karim (Teacher 3)
    {
      id: "sched-7",
      teacher_id: teacherId3,
      subject_id: subjectId5, // Bahasa Arab
      class_id: classId2,
      academic_year_id: ayId,
      hari: "Senin",
      jam_mulai: "07:45",
      jam_selesai: "08:30",
      latitude: defaultLat,
      longitude: defaultLng,
      radius: radius,
      status: "aktif",
      created_at: new Date().toISOString(),
      deleted_at: null
    }
  ];

  // Seed some historic attendance
  const attendance: Attendance[] = [
    {
      id: "att-1",
      schedule_id: "sched-1",
      teacher_id: teacherId1,
      tanggal: "2026-06-29", // Prev Monday
      status: "Hadir",
      catatan: "Presensi tepat waktu",
      created_at: "2026-06-29T07:02:15.000Z",
      deleted_at: null
    },
    {
      id: "att-2",
      schedule_id: "sched-2",
      teacher_id: teacherId1,
      tanggal: "2026-06-29",
      status: "Hadir",
      catatan: "Materi Al-Quran Juz 30",
      created_at: "2026-06-29T08:01:40.000Z",
      deleted_at: null
    },
    {
      id: "att-3",
      schedule_id: "sched-5",
      teacher_id: teacherId2,
      tanggal: "2026-06-29",
      status: "Hadir",
      catatan: "Presensi lancar",
      created_at: "2026-06-29T07:05:33.000Z",
      deleted_at: null
    },
    {
      id: "att-4",
      schedule_id: "sched-7",
      teacher_id: teacherId3,
      tanggal: "2026-06-29",
      status: "Izin",
      catatan: "Ada keperluan keluarga di luar kota, tugas sudah dititipkan",
      created_at: "2026-06-29T07:09:12.000Z",
      deleted_at: null
    }
  ];

  const attendance_validation: AttendanceValidation[] = [
    {
      id: "val-1",
      attendance_id: "att-1",
      foto_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=60", // dummy selfie
      latitude: defaultLat + 0.0001,
      longitude: defaultLng - 0.0001,
      ip: "192.168.1.100",
      jarak: 15,
      gps_valid: true,
      ip_valid: true,
      selfie_valid: true,
      deleted_at: null
    },
    {
      id: "val-2",
      attendance_id: "att-2",
      foto_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=60",
      latitude: defaultLat - 0.00005,
      longitude: defaultLng + 0.00005,
      ip: "192.168.1.100",
      jarak: 8,
      gps_valid: true,
      ip_valid: true,
      selfie_valid: true,
      deleted_at: null
    },
    {
      id: "val-3",
      attendance_id: "att-3",
      foto_url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=60",
      latitude: defaultLat + 0.0002,
      longitude: defaultLng + 0.0001,
      ip: "192.168.1.102",
      jarak: 24,
      gps_valid: true,
      ip_valid: true,
      selfie_valid: true,
      deleted_at: null
    }
  ];

  const attendance_merge: AttendanceMerge[] = [];
  const attendance_logs: AttendanceLog[] = [
    {
      id: "log-1",
      attendance_id: "att-1",
      aktivitas: "Melakukan presensi kehadiran di kelas MTs 2 PA B",
      status: "success",
      created_at: "2026-06-29T07:02:15.000Z",
      deleted_at: null
    },
    {
      id: "log-2",
      attendance_id: "att-2",
      aktivitas: "Melakukan presensi kehadiran di kelas MTs 2 PA A",
      status: "success",
      created_at: "2026-06-29T08:01:40.000Z",
      deleted_at: null
    },
    {
      id: "log-3",
      attendance_id: "att-3",
      aktivitas: "Melakukan presensi kehadiran di kelas MTs 2 PA A",
      status: "success",
      created_at: "2026-06-29T07:05:33.000Z",
      deleted_at: null
    },
    {
      id: "log-4",
      attendance_id: "att-4",
      aktivitas: "Mengajukan izin sakit/keperluan keluarga",
      status: "pending_verification",
      created_at: "2026-06-29T07:09:12.000Z",
      deleted_at: null
    }
  ];

  const cawus: Cawu[] = [
    { id: "cawu-1", nama: "Cawu 1", status: "aktif", deleted_at: null },
    { id: "cawu-2", nama: "Cawu 2", status: "tidak_aktif", deleted_at: null },
    { id: "cawu-3", nama: "Cawu 3", status: "tidak_aktif", deleted_at: null }
  ];

  const hissohs: Hissoh[] = [
    { id: "hissoh-1", nama: "HISSOH 01", jam_mulai_wib: "07:00", jam_selesai_wib: "07:45", jam_mulai_istw: "07:00", jam_selesai_istw: "07:45", deleted_at: null },
    { id: "hissoh-2", nama: "HISSOH 02", jam_mulai_wib: "08:00", jam_selesai_wib: "08:45", jam_mulai_istw: "08:15", jam_selesai_istw: "09:00", deleted_at: null },
    { id: "hissoh-3", nama: "HISSOH 03", jam_mulai_wib: "09:00", jam_selesai_wib: "09:45", jam_mulai_istw: "09:30", jam_selesai_istw: "10:15", deleted_at: null },
    { id: "hissoh-4", nama: "HISSOH 04", jam_mulai_wib: "10:00", jam_selesai_wib: "10:45", jam_mulai_istw: "10:45", jam_selesai_istw: "11:30", deleted_at: null }
  ];

  return {
    users,
    teachers,
    subjects,
    classes,
    academic_years,
    cawus,
    hissohs,
    schedule,
    attendance,
    attendance_validation,
    attendance_merge,
    settings: initialSettings,
    attendance_logs
  };
}

// Memory Cache
let dbInstance: DBState | null = null;

export function loadDB(): DBState {
  if (dbInstance) return dbInstance;

  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      dbInstance = JSON.parse(data);
      // Make sure all properties are initialized
      if (dbInstance) {
        if (!dbInstance.users) dbInstance.users = [];
        if (!dbInstance.teachers) dbInstance.teachers = [];
        if (!dbInstance.subjects) dbInstance.subjects = [];
        if (!dbInstance.classes) dbInstance.classes = [];
        if (!dbInstance.academic_years) dbInstance.academic_years = [];
        if (!dbInstance.cawus) dbInstance.cawus = [
          { id: "cawu-1", nama: "Cawu 1", status: "aktif", deleted_at: null },
          { id: "cawu-2", nama: "Cawu 2", status: "tidak_aktif", deleted_at: null },
          { id: "cawu-3", nama: "Cawu 3", status: "tidak_aktif", deleted_at: null }
        ];
        if (!dbInstance.hissohs) dbInstance.hissohs = [
          { id: "hissoh-1", nama: "HISSOH 01", jam_mulai_wib: "07:00", jam_selesai_wib: "07:45", jam_mulai_istw: "07:00", jam_selesai_istw: "07:45", deleted_at: null },
          { id: "hissoh-2", nama: "HISSOH 02", jam_mulai_wib: "08:00", jam_selesai_wib: "08:45", jam_mulai_istw: "08:15", jam_selesai_istw: "09:00", deleted_at: null },
          { id: "hissoh-3", nama: "HISSOH 03", jam_mulai_wib: "09:00", jam_selesai_wib: "09:45", jam_mulai_istw: "09:30", jam_selesai_istw: "10:15", deleted_at: null },
          { id: "hissoh-4", nama: "HISSOH 04", jam_mulai_wib: "10:00", jam_selesai_wib: "10:45", jam_mulai_istw: "10:45", jam_selesai_istw: "11:30", deleted_at: null }
        ];
        if (!dbInstance.schedule) dbInstance.schedule = [];
        if (!dbInstance.attendance) dbInstance.attendance = [];
        if (!dbInstance.attendance_validation) dbInstance.attendance_validation = [];
        if (!dbInstance.attendance_merge) dbInstance.attendance_merge = [];
        if (!dbInstance.settings) dbInstance.settings = initialSettings;
        if (!dbInstance.attendance_logs) dbInstance.attendance_logs = [];
        return dbInstance;
      }
    }
  } catch (error) {
    console.error("Failed to read database file, seeding instead.", error);
  }

  // Seeding
  dbInstance = getSeedData();
  saveDB(dbInstance);
  return dbInstance;
}

export function saveDB(state: DBState): void {
  dbInstance = state;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to write to database file", error);
  }
}

export interface User {
  id: string;
  email: string;
  role: "admin" | "guru";
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
}

export interface Subject {
  id: string;
  nama_mapel: string;
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
  deleted_at?: string | null;
}

export interface AcademicYear {
  id: string;
  tahun: string;
  status: "aktif" | "tidak_aktif";
}

export interface Schedule {
  id: string;
  teacher_id: string;
  subject_id: string;
  class_id: string;
  academic_year_id: string;
  hari: string;
  jam_mulai: string;
  jam_selesai: string;
  latitude: number;
  longitude: number;
  radius: number;
  status: "aktif" | "nonaktif";
  // helper fields joined from server
  subject_name?: string;
  class_name?: string;
  teacher_name?: string;
  building?: string;
  location_desc?: string;
  merged_with_id?: string | null;
}

export interface Attendance {
  id: string;
  schedule_id: string;
  teacher_id: string;
  tanggal: string;
  status: "Hadir" | "Izin" | "Alfa" | "Pending";
  catatan: string;
  created_at: string;
  schedule?: Schedule | null;
  teacher?: { id: string; nama: string; nip: string; foto: string } | null;
  validation?: AttendanceValidation | null;
}

export interface AttendanceValidation {
  id: string;
  attendance_id: string;
  foto_url: string;
  latitude: number;
  longitude: number;
  ip: string;
  jarak: number;
  gps_valid: boolean;
  ip_valid: boolean;
  selfie_valid: boolean;
}

export interface Settings {
  id: string;
  nama_pondok: string;
  logo: string;
  alamat: string;
  radius_default: number;
  jam_toleransi: number;
  batas_keterlambatan: number;
  password_minimum: number;
  session_timeout: number;
  izin_kamera_wajib: boolean;
}

export interface Cawu {
  id: string;
  nama: string; // e.g., "Cawu 1", "Cawu 2", "Cawu 3"
  status: "aktif" | "tidak_aktif";
}

export interface Hissoh {
  id: string;
  nama: string; // e.g., "HISSOH 01"
  jam_mulai_wib: string;
  jam_selesai_wib: string;
  jam_mulai_istw: string;
  jam_selesai_istw: string;
}

export interface StatsData {
  total_teachers: number;
  active_teachers_today: number;
  total_presensi_today: number;
  belum_presensi_today: number;
  izin_today: number;
  izin_pending_notifications: number;
  latest_logs: ActivityLog[];
  schedules_today_count: number;
  total_presensi_hari_ini: number; // semua mata pelajaran pada hari masuk sekolah
  input_presensi_hari_ini: number; // semua presensi yang telah dilakukan
}

export interface ActivityLog {
  id: string;
  attendance_id: string;
  aktivitas: string;
  status: string;
  teacher_name: string;
  timestamp: string;
}

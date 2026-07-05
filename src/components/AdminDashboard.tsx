import React, { useState, useEffect } from "react";
import {
  Users,
  BookOpen,
  School,
  Calendar as CalendarIcon,
  CheckSquare,
  FileSpreadsheet,
  Settings as SettingsIcon,
  Activity,
  Plus,
  Edit,
  Trash2,
  Search,
  Check,
  AlertTriangle,
  Upload,
  User,
  MapPin,
  Camera,
  Layers,
  HelpCircle,
  FileText,
  Download,
  ShieldAlert,
  Sparkles,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Teacher, Subject, ClassRoom, Schedule, Attendance, Settings, AcademicYear, StatsData, Cawu, Hissoh } from "../types";
import AIChatThinking from "./AIChatThinking";

interface AdminDashboardProps {
  onLogout: () => void;
}

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  // Navigation
  const [activeTab, setActiveTab] = useState<
    | "dashboard"
    | "guru"
    | "mapel"
    | "kelas"
    | "jadwal"
    | "presensi"
    | "laporan"
    | "tahun_ajaran"
    | "cawu"
    | "hissoh"
    | "pengaturan"
  >("dashboard");

  // Dynamic States
  const [stats, setStats] = useState<StatsData | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [cawus, setCawus] = useState<Cawu[]>([]);
  const [hissohs, setHissohs] = useState<Hissoh[]>([]);
  const [appSettings, setAppSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Search and Filters
  const [guruSearch, setGuruSearch] = useState("");
  const [mapelSearch, setMapelSearch] = useState("");
  const [kelasSearch, setKelasSearch] = useState("");
  const [jadwalSearch, setJadwalSearch] = useState("");
  const [presensiFilter, setPresensiFilter] = useState({
    date: new Date().toLocaleDateString("en-CA"),
    status: "",
    teacherId: ""
  });
  const [reportFilter, setReportFilter] = useState({
    startDate: new Date().toLocaleDateString("en-CA"),
    endDate: new Date().toLocaleDateString("en-CA"),
    teacherId: "",
    classId: ""
  });

  // Modal forms states
  const [showFormModal, setShowFormModal] = useState<"guru" | "mapel" | "kelas" | "jadwal" | "tahun_ajaran" | "cawu" | "hissoh" | "import_excel" | "presensi_detail" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  // Form input states
  const [guruForm, setGuruForm] = useState({
    nama: "",
    nip: "",
    email: "",
    no_hp: "",
    password: "",
    status: "aktif" as "aktif" | "nonaktif",
    foto: ""
  });
  const [mapelForm, setMapelForm] = useState({ nama_mapel: "" });
  const [kelasForm, setKelasForm] = useState({
    nama_kelas: "",
    tingkat: "MTs",
    gedung: "",
    lokasi: "",
    latitude: -7.29135,
    longitude: 110.18341,
    radius: 100
  });
  const [jadwalForm, setJadwalForm] = useState({
    teacher_id: "",
    subject_id: "",
    class_id: "",
    hari: "Senin",
    jam_mulai: "07:00",
    jam_selesai: "07:45",
    latitude: -7.29135,
    longitude: 110.18341,
    radius: 100
  });
  const [ayForm, setAyForm] = useState({
    tahun: "",
    status: "tidak_aktif" as "aktif" | "tidak_aktif"
  });
  const [cawuForm, setCawuForm] = useState({
    nama: "",
    status: "tidak_aktif" as "aktif" | "tidak_aktif"
  });
  const [hissohForm, setHissohForm] = useState({
    nama: "",
    jam_mulai_wib: "07:00",
    jam_selesai_wib: "07:45",
    jam_mulai_istw: "07:00",
    jam_selesai_istw: "07:45"
  });

  // Bulk Import state
  const [importType, setImportType] = useState<"guru" | "kelas" | "jadwal">("guru");
  const [csvText, setCsvText] = useState("");
  const [importStatusMsg, setImportStatusMsg] = useState("");

  // GPS Auto Detection state
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

  const detectGpsLocation = (overwriteLokasi = false) => {
    if (!navigator.geolocation) {
      alert("Fitur GPS tidak didukung oleh browser Anda.");
      return;
    }
    setIsDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const accuracy = Math.round(pos.coords.accuracy);
        setGpsAccuracy(accuracy);
        setIsDetectingGps(false);
        
        setKelasForm((prev) => {
          const updated = {
            ...prev,
            latitude: lat,
            longitude: lng,
          };
          if (!prev.lokasi || overwriteLokasi) {
            updated.lokasi = `Lokasi GPS (${lat}, ${lng})`;
          }
          if (!prev.gedung || overwriteLokasi) {
            updated.gedung = `Gedung/Area Sekitar (Akurasi ~${accuracy}m)`;
          }
          return updated;
        });
      },
      (err) => {
        setIsDetectingGps(false);
        console.warn("Auto GPS detection failed:", err.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (showFormModal === "kelas" && !editId) {
      detectGpsLocation(true);
    } else {
      setGpsAccuracy(null);
    }
  }, [showFormModal, editId]);

  // Inspected presence details
  const [inspectedAttendance, setInspectedAttendance] = useState<Attendance | null>(null);

  // Load All Admin Data
  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [
        resStats,
        resTeachers,
        resSubjects,
        resClasses,
        resSchedules,
        resAttendance,
        resAYs,
        resCawus,
        resHissohs,
        resSettings
      ] = await Promise.all([
        fetch("/api/stats"),
        fetch("/api/teachers"),
        fetch("/api/subjects"),
        fetch("/api/classes"),
        fetch("/api/schedules"),
        fetch("/api/attendance"),
        fetch("/api/academic-years"),
        fetch("/api/cawus"),
        fetch("/api/hissohs"),
        fetch("/api/settings")
      ]);

      setStats(await resStats.json());
      setTeachers(await resTeachers.json());
      setSubjects(await resSubjects.json());
      setClasses(await resClasses.json());
      setSchedules(await resSchedules.json());
      setAttendanceRecords(await resAttendance.json());
      setAcademicYears(await resAYs.json());
      setCawus(await resCawus.json());
      setHissohs(await resHissohs.json());
      setAppSettings(await resSettings.json());
    } catch (error) {
      console.error("Gagal mengambil data admin:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Update System Settings
  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appSettings) return;

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appSettings)
      });
      if (res.ok) {
        alert("Pengaturan sistem berhasil disimpan!");
        loadAdminData();
      } else {
        alert("Gagal memperbarui pengaturan.");
      }
    } catch (err) {
      alert("Masalah jaringan.");
    }
  };

  // CRUD GURU
  const handleSaveGuru = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let res;
      if (editId) {
        res = await fetch(`/api/teachers/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(guruForm)
        });
      } else {
        res = await fetch("/api/teachers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(guruForm)
        });
      }

      if (res.ok) {
        setShowFormModal(null);
        setEditId(null);
        setGuruForm({ nama: "", nip: "", email: "", no_hp: "", password: "", status: "aktif", foto: "" });
        loadAdminData();
      } else {
        const err = await res.json();
        alert(err.error || "Gagal menyimpan data guru.");
      }
    } catch (error) {
      alert("Terjadi kesalahan.");
    }
  };

  const handleEditGuru = (t: Teacher) => {
    setEditId(t.id);
    setGuruForm({
      nama: t.nama,
      nip: t.nip,
      email: t.email,
      no_hp: t.no_hp,
      password: "", // leave empty unless updating
      status: t.status,
      foto: t.foto
    });
    setShowFormModal("guru");
  };

  const handleDeleteGuru = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus guru ini beserta akun penggunanya secara permanen?")) return;
    try {
      const res = await fetch(`/api/teachers/${id}`, { method: "DELETE" });
      if (res.ok) {
        loadAdminData();
      } else {
        alert("Gagal menghapus.");
      }
    } catch (err) {
      alert("Masalah koneksi.");
    }
  };

  // CRUD MAPEL
  const handleSaveMapel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let res;
      if (editId) {
        res = await fetch(`/api/subjects/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mapelForm)
        });
      } else {
        res = await fetch("/api/subjects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mapelForm)
        });
      }
      if (res.ok) {
        setShowFormModal(null);
        setEditId(null);
        setMapelForm({ nama_mapel: "" });
        loadAdminData();
      } else {
        const err = await res.json();
        alert(err.error || "Gagal menyimpan.");
      }
    } catch (err) {
      alert("Koneksi gagal.");
    }
  };

  const handleDeleteMapel = async (id: string) => {
    if (!confirm("Hapus mata pelajaran ini?")) return;
    try {
      const res = await fetch(`/api/subjects/${id}`, { method: "DELETE" });
      if (res.ok) loadAdminData();
    } catch (error) {
      alert("Gagal.");
    }
  };

  // CRUD KELAS
  const handleSaveKelas = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let res;
      if (editId) {
        res = await fetch(`/api/classes/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(kelasForm)
        });
      } else {
        res = await fetch("/api/classes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(kelasForm)
        });
      }
      if (res.ok) {
        setShowFormModal(null);
        setEditId(null);
        setKelasForm({
          nama_kelas: "",
          tingkat: "MTs",
          gedung: "",
          lokasi: "",
          latitude: -7.29135,
          longitude: 110.18341,
          radius: 100
        });
        loadAdminData();
      } else {
        alert("Gagal menyimpan kelas.");
      }
    } catch (err) {
      alert("Koneksi gagal.");
    }
  };

  const handleDeleteKelas = async (id: string) => {
    if (!confirm("Hapus kelas ini?")) return;
    try {
      const res = await fetch(`/api/classes/${id}`, { method: "DELETE" });
      if (res.ok) loadAdminData();
    } catch (error) {
      alert("Gagal.");
    }
  };

  // CRUD JADWAL
  const handleSaveJadwal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let res;
      if (editId) {
        res = await fetch(`/api/schedules/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(jadwalForm)
        });
      } else {
        res = await fetch("/api/schedules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(jadwalForm)
        });
      }
      if (res.ok) {
        setShowFormModal(null);
        setEditId(null);
        setJadwalForm({
          teacher_id: "",
          subject_id: "",
          class_id: "",
          hari: "Senin",
          jam_mulai: "07:00",
          jam_selesai: "07:45",
          latitude: -7.29135,
          longitude: 110.18341,
          radius: 100
        });
        loadAdminData();
      } else {
        const err = await res.json();
        alert(err.error || "Gagal menyimpan jadwal.");
      }
    } catch (err) {
      alert("Masalah koneksi.");
    }
  };

  const handleDeleteJadwal = async (id: string) => {
    if (!confirm("Hapus jadwal mengajar ini?")) return;
    try {
      const res = await fetch(`/api/schedules/${id}`, { method: "DELETE" });
      if (res.ok) loadAdminData();
    } catch (error) {
      alert("Gagal.");
    }
  };

  // CRUD TAHUN AJARAN
  const handleSaveAY = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let res;
      if (editId) {
        res = await fetch(`/api/academic-years/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ayForm)
        });
      } else {
        res = await fetch("/api/academic-years", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ayForm)
        });
      }
      if (res.ok) {
        setShowFormModal(null);
        setEditId(null);
        setAyForm({ tahun: "", status: "tidak_aktif" });
        loadAdminData();
      } else {
        alert("Gagal.");
      }
    } catch (err) {
      alert("Koneksi gagal.");
    }
  };

  const handleSetAYActive = async (ay: AcademicYear) => {
    try {
      const res = await fetch(`/api/academic-years/${ay.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "aktif" })
      });
      if (res.ok) loadAdminData();
    } catch (err) {
      alert("Gagal mengaktifkan.");
    }
  };

  const handleEditAY = (ay: AcademicYear) => {
    setEditId(ay.id);
    setAyForm({ tahun: ay.tahun, status: ay.status });
    setShowFormModal("tahun_ajaran");
  };

  const handleDeleteAY = async (id: string) => {
    if (!confirm("Hapus tahun ajaran ini?")) return;
    try {
      const res = await fetch(`/api/academic-years/${id}`, { method: "DELETE" });
      if (res.ok) loadAdminData();
    } catch (err) {
      alert("Gagal.");
    }
  };

  // CSV BULK IMPORT HANDLER
  const handleImportCSV = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) {
      alert("Silakan masukkan data CSV atau teks terlebih dahulu.");
      return;
    }

    try {
      const lines = csvText.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        alert("Data CSV harus memiliki baris header dan minimal satu baris data.");
        return;
      }

      const firstLine = lines[0];
      let sep = ",";
      if (firstLine.includes(";")) sep = ";";
      else if (firstLine.includes("\t")) sep = "\t";

      const headers = firstLine.split(sep).map(h => h.replace(/^["']|["']$/g, "").trim().toLowerCase());
      
      const parsedRows: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(sep).map(c => c.replace(/^["']|["']$/g, "").trim());
        if (cols.length === 0) continue;

        const obj: any = {};
        headers.forEach((header, idx) => {
          const val = cols[idx] || "";
          
          if (importType === "guru") {
            if (header.includes("nama") || header.includes("lengkap")) obj.nama = val;
            else if (header.includes("nip")) obj.nip = val;
            else if (header.includes("email")) obj.email = val;
            else if (header.includes("hp") || header.includes("telepon") || header.includes("phone") || header.includes("wa")) obj.no_hp = val;
          } 
          else if (importType === "kelas") {
            if (header.includes("nama") || header.includes("kelas") || header === "kelas") obj.nama_kelas = val;
            else if (header.includes("tingkat")) obj.tingkat = val;
            else if (header.includes("gedung")) obj.gedung = val;
            else if (header.includes("lokasi") || header.includes("gps")) obj.lokasi = val;
            else if (header.includes("lat")) obj.latitude = parseFloat(val);
            else if (header.includes("lng") || header.includes("lon")) obj.longitude = parseFloat(val);
            else if (header.includes("radius") || header.includes("rad")) obj.radius = parseInt(val);
          } 
          else if (importType === "jadwal") {
            if (header.includes("guru") || header.includes("nama")) obj.nama_guru = val;
            else if (header.includes("pelajaran") || header.includes("mapel") || header.includes("mata")) obj.mata_pelajaran = val;
            else if (header.includes("hari")) obj.hari = val;
            else if (header.includes("kelas") || header.includes("ruangan")) obj.kelas = val;
            else if (header.includes("hissoh") || header.includes("jam")) obj.hissoh = val;
          }
        });

        if (importType === "guru") {
          if (!obj.nama) obj.nama = cols[0];
          if (!obj.nip) obj.nip = cols[1];
          if (!obj.email && cols[4]) obj.email = cols[4];
          if (!obj.no_hp && cols[5]) obj.no_hp = cols[5];
        } 
        else if (importType === "kelas") {
          if (!obj.nama_kelas) obj.nama_kelas = cols[0];
          if (!obj.tingkat) obj.tingkat = cols[1];
          if (!obj.gedung) obj.gedung = cols[2];
          if (!obj.lokasi) obj.lokasi = cols[3];
          if (obj.latitude === undefined && cols[4]) obj.latitude = parseFloat(cols[4]);
          if (obj.longitude === undefined && cols[5]) obj.longitude = parseFloat(cols[5]);
          if (obj.radius === undefined && cols[6]) obj.radius = parseInt(cols[6]);
        } 
        else if (importType === "jadwal") {
          if (!obj.nama_guru) obj.nama_guru = cols[0];
          if (!obj.mata_pelajaran) obj.mata_pelajaran = cols[1];
          if (!obj.hari) obj.hari = cols[2];
          if (!obj.kelas) obj.kelas = cols[3];
          if (!obj.hissoh) obj.hissoh = cols[4];
        }

        parsedRows.push(obj);
      }

      let endpoint = "/api/teachers/import";
      if (importType === "kelas") endpoint = "/api/classes/import";
      else if (importType === "jadwal") endpoint = "/api/schedules/import";

      setImportStatusMsg("Sedang memproses impor data...");
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: parsedRows })
      });

      if (res.ok) {
        const result = await res.json();
        setImportStatusMsg(`Sukses mengimpor ${result.count || 0} data! (Dilewati: ${result.skipped || 0} karena duplikat/invalid)`);
        loadAdminData();
        setCsvText("");
      } else {
        const err = await res.json();
        setImportStatusMsg(`Gagal impor: ${err.error || "Kesalahan server"}`);
      }
    } catch (err: any) {
      setImportStatusMsg(`Terjadi kesalahan parser: ${err.message || "format tidak didukung"}`);
    }
  };

  // CRUD CAWU
  const handleSaveCawu = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let res;
      if (editId) {
        res = await fetch(`/api/cawus/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cawuForm)
        });
      } else {
        res = await fetch("/api/cawus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cawuForm)
        });
      }
      if (res.ok) {
        setShowFormModal(null);
        setEditId(null);
        setCawuForm({ nama: "", status: "tidak_aktif" });
        loadAdminData();
      } else {
        alert("Gagal.");
      }
    } catch (err) {
      alert("Masalah koneksi.");
    }
  };

  const handleEditCawu = (c: Cawu) => {
    setEditId(c.id);
    setCawuForm({ nama: c.nama, status: c.status });
    setShowFormModal("cawu");
  };

  const handleDeleteCawu = async (id: string) => {
    if (!confirm("Hapus Cawu ini?")) return;
    try {
      const res = await fetch(`/api/cawus/${id}`, { method: "DELETE" });
      if (res.ok) loadAdminData();
    } catch (err) {
      alert("Gagal.");
    }
  };

  const handleSetCawuActive = async (c: Cawu) => {
    try {
      const res = await fetch(`/api/cawus/${c.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "aktif" })
      });
      if (res.ok) loadAdminData();
    } catch (err) {
      alert("Gagal.");
    }
  };

  // CRUD HISSOH
  const handleSaveHissoh = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let res;
      if (editId) {
        res = await fetch(`/api/hissohs/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(hissohForm)
        });
      } else {
        res = await fetch("/api/hissohs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(hissohForm)
        });
      }
      if (res.ok) {
        setShowFormModal(null);
        setEditId(null);
        setHissohForm({
          nama: "",
          jam_mulai_wib: "07:00",
          jam_selesai_wib: "07:45",
          jam_mulai_istw: "07:00",
          jam_selesai_istw: "07:45"
        });
        loadAdminData();
      } else {
        alert("Gagal.");
      }
    } catch (err) {
      alert("Masalah koneksi.");
    }
  };

  const handleEditHissoh = (h: Hissoh) => {
    setEditId(h.id);
    setHissohForm({
      nama: h.nama,
      jam_mulai_wib: h.jam_mulai_wib,
      jam_selesai_wib: h.jam_selesai_wib,
      jam_mulai_istw: h.jam_mulai_istw,
      jam_selesai_istw: h.jam_selesai_istw
    });
    setShowFormModal("hissoh");
  };

  const handleDeleteHissoh = async (id: string) => {
    if (!confirm("Hapus Hissoh ini?")) return;
    try {
      const res = await fetch(`/api/hissohs/${id}`, { method: "DELETE" });
      if (res.ok) loadAdminData();
    } catch (err) {
      alert("Gagal.");
    }
  };

  // Verification Override (e.g. approve an Izin or correct an Alfa)
  const handleUpdatePresenceStatus = async (attendanceId: string, newStatus: "Hadir" | "Izin" | "Alfa") => {
    try {
      const res = await fetch(`/api/attendance/${attendanceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        alert("Status presensi berhasil diupdate!");
        setShowFormModal(null);
        setInspectedAttendance(null);
        loadAdminData();
      } else {
        alert("Gagal mengupdate.");
      }
    } catch (err) {
      alert("Gangguan jaringan.");
    }
  };

  // REAL REPORT EXPORTERS
  const handleExportExcel = () => {
    const filtered = attendanceRecords.filter((a) => {
      const matchStart = !reportFilter.startDate || a.tanggal >= reportFilter.startDate;
      const matchEnd = !reportFilter.endDate || a.tanggal <= reportFilter.endDate;
      const matchTeacher = !reportFilter.teacherId || a.teacher_id === reportFilter.teacherId;
      const matchClass = !reportFilter.classId || a.class_id === reportFilter.classId;
      return matchStart && matchEnd && matchTeacher && matchClass;
    });

    if (filtered.length === 0) {
      alert("Tidak ada data presensi yang sesuai dengan filter saat ini.");
      return;
    }

    const headers = ["Nama Guru", "NIP", "Mata Pelajaran", "Kelas", "Tanggal", "Hari", "Jam Masuk (WIB)", "Status GPS/Radius", "Jarak (Meter)", "Status Presensi", "Catatan"];
    const csvRows = [headers.join(",")];

    filtered.forEach((a) => {
      const row = [
        `"${a.teacher?.nama || ""}"`,
        `"${a.teacher?.nip || ""}"`,
        `"${a.schedule?.subject_name || ""}"`,
        `"${a.schedule?.class_name || ""}"`,
        `"${a.tanggal || ""}"`,
        `"${a.hari || ""}"`,
        `"${a.jam_masuk_wib || ""}"`,
        `"${a.validation?.gps_valid ? "Valid" : "Luar Radius"}"`,
        `"${a.validation?.jarak || 0}"`,
        `"${a.status || ""}"`,
        `"${a.catatan || ""}"`
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Presensi_Guru_Pondok_${reportFilter.startDate}_ke_${reportFilter.endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const filtered = attendanceRecords.filter((a) => {
      const matchStart = !reportFilter.startDate || a.tanggal >= reportFilter.startDate;
      const matchEnd = !reportFilter.endDate || a.tanggal <= reportFilter.endDate;
      const matchTeacher = !reportFilter.teacherId || a.teacher_id === reportFilter.teacherId;
      const matchClass = !reportFilter.classId || a.class_id === reportFilter.classId;
      return matchStart && matchEnd && matchTeacher && matchClass;
    });

    if (filtered.length === 0) {
      alert("Tidak ada data presensi yang sesuai dengan filter saat ini.");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Pop-up diblokir oleh browser. Silakan izinkan pop-up untuk mengunduh PDF.");
      return;
    }

    const rowsHTML = filtered.map((a, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px; font-size: 11px;">${idx + 1}</td>
        <td style="padding: 10px; font-size: 11px; font-weight: bold;">${a.teacher?.nama || ""}</td>
        <td style="padding: 10px; font-size: 11px;">${a.teacher?.nip || ""}</td>
        <td style="padding: 10px; font-size: 11px;">${a.schedule?.subject_name || ""}</td>
        <td style="padding: 10px; font-size: 11px;">${a.schedule?.class_name || ""}</td>
        <td style="padding: 10px; font-size: 11px;">${a.tanggal || ""}</td>
        <td style="padding: 10px; font-size: 11px; font-family: monospace;">${a.jam_masuk_wib || "-"}</td>
        <td style="padding: 10px; font-size: 11px;">${a.validation?.gps_valid ? "Valid" : "Luar Radius"} (${a.validation?.jarak || 0}m)</td>
        <td style="padding: 10px; font-size: 11px; font-weight: bold; color: ${a.status === "Hadir" ? "#15803d" : "#b45309"}">${a.status || ""}</td>
      </tr>
    `).join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Laporan Presensi Guru Pondok</title>
          <style>
            body { font-family: sans-serif; color: #1e293b; padding: 30px; }
            h1 { font-size: 20px; text-align: center; margin-bottom: 5px; }
            p { font-size: 12px; text-align: center; color: #64748b; margin-top: 0; margin-bottom: 25px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background-color: #f8fafc; padding: 12px 10px; text-align: left; font-size: 11px; text-transform: uppercase; color: #475569; border-bottom: 2px solid #cbd5e1; }
            .footer { margin-top: 40px; text-align: right; font-size: 11px; color: #64748b; }
          </style>
        </head>
        <body>
          <h1>LAPORAN REKAPITULASI PRESENSI MENGAJAR GURU</h1>
          <p>Periode: \${reportFilter.startDate} s/d \${reportFilter.endDate}</p>
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Nama Guru</th>
                <th>NIP</th>
                <th>Mata Pelajaran</th>
                <th>Kelas</th>
                <th>Tanggal</th>
                <th>Jam Masuk</th>
                <th>Validasi GPS</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              \${rowsHTML}
            </tbody>
          </table>
          <div class="footer">
            <p style="text-align: right;">Dicetak secara otomatis oleh Sistem Presensi Pondok Pesantren - \${new Date().toLocaleDateString("id-ID")}</p>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Filter schedules and tables helpers
  const getSubjectName = (subId: string) => {
    const s = subjects.find((sub) => sub.id === subId);
    return s ? s.nama_mapel : "Mata Pelajaran";
  };

  const getClassName = (clsId: string) => {
    const c = classes.find((cl) => cl.id === clsId);
    return c ? c.nama_kelas : "Kelas";
  };

  const getTeacherName = (tId: string) => {
    const t = teachers.find((g) => g.id === tId);
    return t ? t.nama : "Sistem";
  };

  return (
    <div className="min-h-screen bg-[#F7F8F5] pb-24 md:pb-6 flex flex-col md:flex-row text-gray-800" id="admin-viewport">
      
      {/* SIDEBAR ON DESKTOP */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white shrink-0 p-5 shadow-lg border-r border-slate-950">
        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-800">
          <img
            src={appSettings?.logo || "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=120&auto=format&fit=crop"}
            alt="Logo Pondok"
            className="w-10 h-10 rounded-lg object-cover border border-slate-800"
          />
          <div>
            <h1 className="text-sm font-bold tracking-tight leading-tight">Ponpes Al-Huda</h1>
            <p className="text-[10px] text-emerald-400">ADMIN CONTROL CENTER</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "dashboard" ? "bg-emerald-700 text-white shadow-sm" : "text-slate-300 hover:bg-slate-800/60"
            }`}
          >
            <Activity className="w-4 h-4" /> Beranda Dashboard
          </button>
          <button
            onClick={() => setActiveTab("guru")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "guru" ? "bg-emerald-700 text-white shadow-sm" : "text-slate-300 hover:bg-slate-800/60"
            }`}
          >
            <Users className="w-4 h-4" /> Kelola Guru Pondok
          </button>
          <button
            onClick={() => setActiveTab("mapel")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "mapel" ? "bg-emerald-700 text-white shadow-sm" : "text-slate-300 hover:bg-slate-800/60"
            }`}
          >
            <BookOpen className="w-4 h-4" /> Mata Pelajaran
          </button>
          <button
            onClick={() => setActiveTab("kelas")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "kelas" ? "bg-emerald-700 text-white shadow-sm" : "text-slate-300 hover:bg-slate-800/60"
            }`}
          >
            <School className="w-4 h-4" /> Manajemen Kelas
          </button>
          <button
            onClick={() => setActiveTab("jadwal")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "jadwal" ? "bg-emerald-700 text-white shadow-sm" : "text-slate-300 hover:bg-slate-800/60"
            }`}
          >
            <CalendarIcon className="w-4 h-4" /> Jadwal Mengajar
          </button>
          <button
            onClick={() => setActiveTab("presensi")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "presensi" ? "bg-emerald-700 text-white shadow-sm" : "text-slate-300 hover:bg-slate-800/60"
            }`}
          >
            <CheckSquare className="w-4 h-4" /> Monitoring Absensi
          </button>
          <button
            onClick={() => setActiveTab("laporan")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "laporan" ? "bg-emerald-700 text-white shadow-sm" : "text-slate-300 hover:bg-slate-800/60"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" /> Rekap & Laporan
          </button>
          <button
            onClick={() => setActiveTab("tahun_ajaran")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "tahun_ajaran" ? "bg-emerald-700 text-white shadow-sm" : "text-slate-300 hover:bg-slate-800/60"
            }`}
          >
            <Layers className="w-4 h-4" /> Tahun Ajaran
          </button>
          <button
            onClick={() => setActiveTab("cawu")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "cawu" ? "bg-emerald-700 text-white shadow-sm" : "text-slate-300 hover:bg-slate-800/60"
            }`}
          >
            <Layers className="w-4 h-4" /> Cawu (Triwulan)
          </button>
          <button
            onClick={() => setActiveTab("hissoh")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "hissoh" ? "bg-emerald-700 text-white shadow-sm" : "text-slate-300 hover:bg-slate-800/60"
            }`}
          >
            <Clock className="w-4 h-4" /> Jam Hissoh
          </button>
          <button
            onClick={() => setActiveTab("pengaturan")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "pengaturan" ? "bg-emerald-700 text-white shadow-sm" : "text-slate-300 hover:bg-slate-800/60"
            }`}
          >
            <SettingsIcon className="w-4 h-4" /> Pengaturan Sistem
          </button>
        </nav>

        <button
          onClick={onLogout}
          className="mt-auto pt-4 border-t border-slate-800 w-full text-left text-xs font-medium text-slate-400 hover:text-white px-4 py-2"
        >
          Keluar Admin
        </button>
      </aside>

      {/* MOBILE TOP BAR */}
      <header className="md:hidden flex flex-col bg-slate-900 text-white shadow-sm shrink-0">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <img
              src={appSettings?.logo || "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=120&auto=format&fit=crop"}
              alt="Logo"
              className="w-8 h-8 rounded-lg object-cover"
            />
            <h2 className="text-xs font-bold">Admin Al-Huda</h2>
          </div>
          <button onClick={onLogout} className="text-xs text-slate-300 hover:text-white font-medium">
            Keluar
          </button>
        </div>
        {/* Horizontal scroll tabs for mobile */}
        <div className="flex gap-2 overflow-x-auto px-4 py-2 bg-slate-850 scrollbar-none border-b border-slate-800">
          {[
            { id: "dashboard", label: "Dashboard" },
            { id: "guru", label: "Guru" },
            { id: "mapel", label: "Mapel" },
            { id: "kelas", label: "Kelas" },
            { id: "jadwal", label: "Jadwal" },
            { id: "presensi", label: "Absensi" },
            { id: "laporan", label: "Rekap" },
            { id: "tahun_ajaran", label: "TA" },
            { id: "cawu", label: "Cawu" },
            { id: "hissoh", label: "Hissoh" },
            { id: "pengaturan", label: "Set" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`text-[10px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                activeTab === tab.id ? "bg-emerald-700 text-white" : "text-slate-400 bg-slate-800 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* MAIN LAYOUT WRAPPER */}
      <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-10 bg-gray-200 rounded-xl animate-pulse w-1/4"></div>
            <div className="h-40 bg-gray-200 rounded-2xl animate-pulse"></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="h-28 bg-gray-200 rounded-xl animate-pulse"></div>
              <div className="h-28 bg-gray-200 rounded-xl animate-pulse"></div>
              <div className="h-28 bg-gray-200 rounded-xl animate-pulse"></div>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* 1. DASHBOARD OVERVIEW */}
            {activeTab === "dashboard" && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Greeting & Header */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Dashboard Utama Pesantren</h2>
                    <p className="text-xs text-gray-500">Kondisi kehadiran, aktivitas mengajar, dan rekam absen terbaru.</p>
                  </div>
                  <div className="text-xs bg-slate-900 text-white px-4 py-2 rounded-xl font-mono shrink-0 font-bold">
                    TA: {academicYears.find((y) => y.status === "aktif")?.tahun || "2026-2027"} (AKTIF)
                  </div>
                </div>

                {/* Grid Stat Cards */}
                {stats && (
                  <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                    <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Total Guru</span>
                      <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.total_teachers}</h3>
                    </div>
                    <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Guru Aktif Hari Ini</span>
                      <h3 className="text-2xl font-bold text-emerald-800 mt-1">{stats.active_teachers_today}</h3>
                    </div>
                    <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm animate-pulse">
                      <span className="text-[10px] text-emerald-700 font-bold uppercase block">Presensi Sukses</span>
                      <h3 className="text-2xl font-bold text-emerald-700 mt-1">{stats.total_presensi_today}</h3>
                    </div>
                    <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Total Presensi Hari Ini</span>
                      <h3 className="text-2xl font-bold text-blue-800 mt-1">{stats.total_presensi_hari_ini || 0}</h3>
                    </div>
                    <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Input Presensi</span>
                      <h3 className="text-2xl font-bold text-purple-800 mt-1">{stats.input_presensi_hari_ini || 0}</h3>
                    </div>
                    <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
                      <span className="text-[10px] text-amber-600 font-bold uppercase block">Belum Presensi</span>
                      <h3 className="text-2xl font-bold text-amber-600 mt-1">{stats.belum_presensi_today}</h3>
                    </div>
                  </div>
                )}

                {/* System Notifications Block */}
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex items-center justify-between gap-4">
                  <div className="flex gap-2.5 items-center">
                    <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <h5 className="text-xs font-bold">Notifikasi Sistem Kehadiran</h5>
                      <p className="text-[10px] text-amber-700 mt-0.5">
                        Ditemukan {stats?.belum_presensi_today || 0} guru terlambat presensi dan {stats?.izin_pending_notifications || 0} izin menunggu keputusan konfirmasi admin.
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setActiveTab("presensi")} className="text-xs bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold px-3 py-1.5 rounded-lg shrink-0">
                    Selesaikan
                  </button>
                </div>

                {/* Bottom Row split: 10 Recent activities + Daily Attendance */}
                <div className="grid lg:grid-cols-12 gap-6">
                  {/* Latest 10 Activites */}
                  <div className="bg-white border border-gray-100 p-4.5 rounded-xl shadow-sm lg:col-span-4 space-y-3">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-gray-400 font-mono flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-700" /> 10 Aktivitas Terakhir
                    </h3>
                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                      {stats?.latest_logs.map((l) => (
                        <div key={l.id} className="border-b border-gray-50 pb-2 text-[11px] space-y-1">
                          <div className="flex justify-between text-[10px] text-gray-400">
                            <span className="font-bold text-emerald-800">{l.teacher_name}</span>
                            <span className="font-mono">{new Date(l.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                          <p className="text-gray-600 font-medium leading-relaxed">{l.aktivitas}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Daily Table list */}
                  <div className="bg-white border border-gray-100 p-4.5 rounded-xl shadow-sm lg:col-span-8 space-y-3">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-gray-400 font-mono">
                      Presensi Mengajar Hari Ini
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-gray-50 text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-100">
                            <th className="p-2.5">Nama Guru</th>
                            <th className="p-2.5">Mata Pelajaran</th>
                            <th className="p-2.5">Kelas</th>
                            <th className="p-2.5">Jam</th>
                            <th className="p-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {attendanceRecords
                            .filter((a) => a.tanggal === new Date().toLocaleDateString("en-CA"))
                            .slice(0, 10)
                            .map((a) => (
                              <tr key={a.id} className="hover:bg-gray-50/50">
                                <td className="p-2.5 font-bold">{a.teacher?.nama || "Guru"}</td>
                                <td className="p-2.5">{a.schedule?.subject_name}</td>
                                <td className="p-2.5">{a.schedule?.class_name}</td>
                                <td className="p-2.5 font-mono text-emerald-800 font-bold">{a.schedule?.jam_mulai} WIB</td>
                                <td className="p-2.5">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    a.status === "Hadir"
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : "bg-amber-50 text-amber-700 border border-amber-200"
                                  }`}>
                                    {a.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          {attendanceRecords.filter((a) => a.tanggal === new Date().toLocaleDateString("en-CA")).length === 0 && (
                            <tr>
                              <td colSpan={5} className="p-4 text-center text-gray-400 italic">
                                Belum ada presensi tersimpan hari ini.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 2. GURU CRUD */}
            {activeTab === "guru" && (
              <motion.div
                key="guru"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Kelola Data Guru Pondok</h2>
                    <p className="text-xs text-gray-500">CRUD data pengajar serta monitoring status kepegawaian.</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setImportType("guru");
                        setImportStatusMsg("");
                        setCsvText("");
                        setShowFormModal("import_excel");
                      }}
                      className="border border-slate-300 hover:bg-slate-100 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-4 h-4" /> Import Guru (CSV)
                    </button>
                    <button
                      onClick={() => {
                        setEditId(null);
                        setGuruForm({ nama: "", nip: "", email: "", no_hp: "", password: "", status: "aktif", foto: "" });
                        setShowFormModal("guru");
                      }}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Tambah Guru
                    </button>
                  </div>
                </div>

                {/* Search control */}
                <div className="relative max-w-sm">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    value={guruSearch}
                    onChange={(e) => setGuruSearch(e.target.value)}
                    placeholder="Cari guru berdasarkan nama atau NIP..."
                    className="w-full bg-white border border-gray-200 pl-9 pr-4 py-2.5 rounded-xl text-xs outline-none"
                  />
                </div>

                {/* Grid List */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teachers
                    .filter((t) => t.nama.toLowerCase().includes(guruSearch.toLowerCase()) || t.nip.includes(guruSearch))
                    .map((t) => (
                      <div key={t.id} className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm space-y-3.5 hover:border-gray-200 transition-all">
                        <div className="flex gap-3">
                          <img src={t.foto} alt={t.nama} className="w-12 h-12 rounded-full object-cover border border-gray-200 shrink-0" />
                          <div>
                            <h4 className="font-bold text-xs text-gray-900 truncate max-w-[150px]">{t.nama}</h4>
                            <p className="text-[10px] text-emerald-800 font-bold font-mono">NIP: {t.nip}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[160px]">{t.email}</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                          <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            t.status === "aktif" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-400"
                          }`}>
                            {t.status}
                          </span>
                          <div className="flex gap-1.5">
                            <button onClick={() => handleEditGuru(t)} className="p-1.5 hover:bg-gray-50 border border-gray-200 text-gray-500 rounded-lg" title="Edit">
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteGuru(t.id)} className="p-1.5 hover:bg-red-50 border border-red-100 text-red-500 rounded-lg" title="Hapus">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </motion.div>
            )}

            {/* 3. MAPEL CRUD */}
            {activeTab === "mapel" && (
              <motion.div
                key="mapel"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Mata Pelajaran (Subject)</h2>
                    <p className="text-xs text-gray-500">Daftar muatan pelajaran kurikulum pesantren.</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditId(null);
                      setMapelForm({ nama_mapel: "" });
                      setShowFormModal("mapel");
                    }}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Tambah Mapel
                  </button>
                </div>

                <div className="bg-white border border-gray-100 rounded-xl shadow-sm divide-y divide-gray-50 max-w-xl">
                  {subjects.map((s) => (
                    <div key={s.id} className="p-3.5 flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-900">{s.nama_mapel}</span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => {
                            setEditId(s.id);
                            setMapelForm({ nama_mapel: s.nama_mapel });
                            setShowFormModal("mapel");
                          }}
                          className="p-1.5 border border-gray-150 rounded-lg text-gray-500 hover:bg-gray-50"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteMapel(s.id)}
                          className="p-1.5 border border-red-100 rounded-lg text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 4. KELAS CRUD */}
            {activeTab === "kelas" && (
              <motion.div
                key="kelas"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Manajemen Kelas & Gedung</h2>
                    <p className="text-xs text-gray-500">Mengatur lokasi ruangan kelas belajar mengajar.</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setImportType("kelas");
                        setImportStatusMsg("");
                        setCsvText("");
                        setShowFormModal("import_excel");
                      }}
                      className="border border-slate-300 hover:bg-slate-100 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-4 h-4" /> Import Kelas (CSV)
                    </button>
                    <button
                      onClick={() => {
                        setEditId(null);
                        setKelasForm({
                          nama_kelas: "",
                          tingkat: "MTs",
                          gedung: "",
                          lokasi: "",
                          latitude: -7.29135,
                          longitude: 110.18341,
                          radius: 100
                        });
                        setShowFormModal("kelas");
                      }}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Tambah Kelas
                    </button>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {classes.map((c) => (
                    <div key={c.id} className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm space-y-3">
                      <div>
                        <span className="text-[9px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                          {c.tingkat}
                        </span>
                        <h4 className="font-bold text-xs text-gray-900 mt-1">{c.nama_kelas}</h4>
                        <p className="text-[10px] text-gray-500 font-semibold">{c.gedung}</p>
                        <p className="text-[9px] text-gray-400">{c.lokasi}</p>
                        
                        {(c.latitude !== undefined && c.longitude !== undefined) ? (
                          <div className="mt-2 text-[9px] font-mono text-emerald-800 bg-emerald-50/70 border border-emerald-150 px-2 py-1 rounded-lg inline-flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5 text-emerald-600" />
                            {c.latitude.toFixed(5)}, {c.longitude.toFixed(5)} ({c.radius || 100}m)
                          </div>
                        ) : (
                          <div className="mt-2 text-[9px] font-mono text-amber-800 bg-amber-50 border border-amber-100 px-2 py-1 rounded-lg inline-flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5 text-amber-500" />
                            GPS Belum Diset
                          </div>
                        )}
                      </div>
                      <div className="pt-2 border-t border-gray-50 flex justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditId(c.id);
                            setKelasForm({
                              nama_kelas: c.nama_kelas,
                              tingkat: c.tingkat,
                              gedung: c.gedung,
                              lokasi: c.lokasi,
                              latitude: c.latitude !== undefined ? c.latitude : -7.29135,
                              longitude: c.longitude !== undefined ? c.longitude : 110.18341,
                              radius: c.radius !== undefined ? c.radius : 100
                            });
                            setShowFormModal("kelas");
                          }}
                          className="p-1.5 border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteKelas(c.id)}
                          className="p-1.5 border border-red-100 text-red-500 rounded-lg hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 5. JADWAL CRUD */}
            {activeTab === "jadwal" && (
              <motion.div
                key="jadwal"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Jadwal Mengajar Guru</h2>
                    <p className="text-xs text-gray-500">Pengaturan slot jam mengajar harian guru pondok.</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setImportType("jadwal");
                        setImportStatusMsg("");
                        setCsvText("");
                        setShowFormModal("import_excel");
                      }}
                      className="border border-slate-300 hover:bg-slate-100 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-4 h-4" /> Import Jadwal (CSV)
                    </button>
                    <button
                      onClick={() => {
                        setEditId(null);
                        setJadwalForm({
                          teacher_id: teachers[0]?.id || "",
                          subject_id: subjects[0]?.id || "",
                          class_id: classes[0]?.id || "",
                          hari: "Senin",
                          jam_mulai: "07:00",
                          jam_selesai: "07:45",
                          latitude: -7.29135,
                          longitude: 110.18341,
                          radius: 100
                        });
                        setShowFormModal("jadwal");
                      }}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Tambah Jadwal
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-50 text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-100">
                          <th className="p-3">Guru</th>
                          <th className="p-3">Mapel</th>
                          <th className="p-3">Kelas</th>
                          <th className="p-3">Hari & Jam</th>
                          <th className="p-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {schedules.map((s) => (
                          <tr key={s.id} className="hover:bg-gray-50/50">
                            <td className="p-3 font-bold">{getTeacherName(s.teacher_id)}</td>
                            <td className="p-3">{getSubjectName(s.subject_id)}</td>
                            <td className="p-3">{getClassName(s.class_id)}</td>
                            <td className="p-3">
                              <span className="font-bold">{s.hari}</span> •{" "}
                              <span className="font-mono text-emerald-800 font-bold">
                                {s.jam_mulai}-{s.jam_selesai} WIB
                              </span>
                            </td>
                            <td className="p-3 text-right flex gap-1.5 justify-end">
                              <button
                                onClick={() => {
                                  setEditId(s.id);
                                  setJadwalForm({
                                    teacher_id: s.teacher_id,
                                    subject_id: s.subject_id,
                                    class_id: s.class_id,
                                    hari: s.hari,
                                    jam_mulai: s.jam_mulai,
                                    jam_selesai: s.jam_selesai,
                                    latitude: s.latitude,
                                    longitude: s.longitude,
                                    radius: s.radius
                                  });
                                  setShowFormModal("jadwal");
                                }}
                                className="p-1.5 border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteJadwal(s.id)}
                                className="p-1.5 border border-red-100 text-red-500 rounded-lg hover:bg-red-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 6. PRESENSI MONITORING */}
            {activeTab === "presensi" && (
              <motion.div
                key="presensi"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Monitoring Absensi Guru</h2>
                  <p className="text-xs text-gray-500">Melihat detail selfie, IP, koordinat, serta validasi GPS kehadiran.</p>
                </div>

                {/* Filter bar */}
                <div className="flex flex-wrap gap-3 bg-white p-4 rounded-xl border border-gray-100 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tanggal</label>
                    <input
                      type="date"
                      value={presensiFilter.date}
                      onChange={(e) => setPresensiFilter({ ...presensiFilter, date: e.target.value })}
                      className="bg-gray-50 border border-gray-200 p-2 rounded-lg outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Status</label>
                    <select
                      value={presensiFilter.status}
                      onChange={(e) => setPresensiFilter({ ...presensiFilter, status: e.target.value })}
                      className="bg-gray-50 border border-gray-200 p-2 rounded-lg outline-none"
                    >
                      <option value="">Semua Status</option>
                      <option value="Hadir">Hadir</option>
                      <option value="Izin">Izin</option>
                      <option value="Alfa">Alfa</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Guru</label>
                    <select
                      value={presensiFilter.teacherId}
                      onChange={(e) => setPresensiFilter({ ...presensiFilter, teacherId: e.target.value })}
                      className="bg-gray-50 border border-gray-200 p-2 rounded-lg outline-none"
                    >
                      <option value="">Semua Guru</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nama}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Table */}
                <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-50 text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-100">
                          <th className="p-3">Foto</th>
                          <th className="p-3">Nama Guru</th>
                          <th className="p-3">Mata Pelajaran</th>
                          <th className="p-3">Kelas</th>
                          <th className="p-3">Status GPS / Jarak</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {attendanceRecords
                          .filter((a) => !presensiFilter.date || a.tanggal === presensiFilter.date)
                          .filter((a) => !presensiFilter.status || a.status === presensiFilter.status)
                          .filter((a) => !presensiFilter.teacherId || a.teacher_id === presensiFilter.teacherId)
                          .map((a) => (
                            <tr key={a.id} className="hover:bg-gray-50/50">
                              <td className="p-3">
                                <img
                                  src={a.validation?.foto_url || a.teacher?.foto}
                                  alt="Selfie"
                                  className="w-9 h-9 rounded-lg object-cover border border-gray-200 shrink-0"
                                />
                              </td>
                              <td className="p-3">
                                <div className="font-bold">{a.teacher?.nama}</div>
                                <span className="text-[10px] text-gray-400">NIP: {a.teacher?.nip}</span>
                              </td>
                              <td className="p-3">{a.schedule?.subject_name}</td>
                              <td className="p-3">{a.schedule?.class_name}</td>
                              <td className="p-3 font-mono">
                                {a.validation ? (
                                  <span className={a.validation.gps_valid ? "text-emerald-700" : "text-amber-600"}>
                                    {a.validation.gps_valid ? "✓ Valid" : "✗ Luar Radius"}{" "}
                                    <span className="text-[9px] text-gray-400">({a.validation.jarak}m)</span>
                                  </span>
                                ) : (
                                  "N/A"
                                )}
                              </td>
                              <td className="p-3">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                  a.status === "Hadir"
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                    : "bg-amber-50 border-amber-200 text-amber-800"
                                }`}>
                                  {a.status}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => {
                                    setInspectedAttendance(a);
                                    setShowFormModal("presensi_detail");
                                  }}
                                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-2.5 py-1.5 rounded-lg font-bold"
                                >
                                  Detail
                                </button>
                              </td>
                            </tr>
                          ))}
                        {attendanceRecords.length === 0 && (
                          <tr>
                            <td colSpan={7} className="p-4 text-center text-gray-400 italic">
                              Tidak ada rekaman presensi pada filter ini.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 7. REKAP & LAPORAN */}
            {activeTab === "laporan" && (
              <motion.div
                key="laporan"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Rekapitulasi & Laporan Bulanan</h2>
                  <p className="text-xs text-gray-500">Mengekspor laporan mengajar guru ke dokumen cetak PDF atau Excel.</p>
                </div>

                {/* Report filter bar */}
                <div className="flex flex-wrap gap-4 bg-white p-5 rounded-2xl border border-gray-100 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Mulai Tanggal</label>
                    <input
                      type="date"
                      value={reportFilter.startDate}
                      onChange={(e) => setReportFilter({ ...reportFilter, startDate: e.target.value })}
                      className="bg-gray-50 border border-gray-200 p-2.5 rounded-xl outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Sampai Tanggal</label>
                    <input
                      type="date"
                      value={reportFilter.endDate}
                      onChange={(e) => setReportFilter({ ...reportFilter, endDate: e.target.value })}
                      className="bg-gray-50 border border-gray-200 p-2.5 rounded-xl outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Guru</label>
                    <select
                      value={reportFilter.teacherId}
                      onChange={(e) => setReportFilter({ ...reportFilter, teacherId: e.target.value })}
                      className="bg-gray-50 border border-gray-200 p-2.5 rounded-xl outline-none"
                    >
                      <option value="">Semua Guru</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nama}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Kelas</label>
                    <select
                      value={reportFilter.classId}
                      onChange={(e) => setReportFilter({ ...reportFilter, classId: e.target.value })}
                      className="bg-gray-50 border border-gray-200 p-2.5 rounded-xl outline-none"
                    >
                      <option value="">Semua Kelas</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nama_kelas}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Simulated Download panel */}
                <div className="bg-white border border-gray-150 p-6 rounded-2xl shadow-sm text-center space-y-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 mx-auto">
                    <FileSpreadsheet className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-gray-900">Dokumen Laporan Siap Diekspor</h3>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 leading-normal">
                      Laporan mencakup persentase kehadiran guru, log catatan diluar radius, dan akumulasi jam mengajar.
                    </p>
                  </div>
                  <div className="flex gap-2 justify-center max-w-xs mx-auto">
                    <button
                      onClick={handleExportPDF}
                      className="flex-1 bg-red-750 text-white font-bold text-xs py-2.5 rounded-xl shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Download className="w-4 h-4" /> Cetak PDF
                    </button>
                    <button
                      onClick={handleExportExcel}
                      className="flex-1 bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4" /> Ekspor Excel
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 8. TAHUN AJARAN */}
            {activeTab === "tahun_ajaran" && (
              <motion.div
                key="tahun_ajaran"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Tahun Ajaran Pesantren</h2>
                    <p className="text-xs text-gray-500">Menyeting tahun kepengurusan aktif pendidikan.</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditId(null);
                      setAyForm({ tahun: "", status: "tidak_aktif" });
                      setShowFormModal("tahun_ajaran");
                    }}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Tambah Tahun Ajaran
                  </button>
                </div>

                <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100 max-w-xl text-xs">
                  {academicYears.map((ay) => (
                    <div key={ay.id} className="p-4 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-gray-900">{ay.tahun}</h4>
                        <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded ${
                          ay.status === "aktif" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-400"
                        }`}>
                          {ay.status === "aktif" ? "Aktif (Primary)" : "Tidak Aktif"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {ay.status !== "aktif" && (
                          <button
                            onClick={() => handleSetAYActive(ay)}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg cursor-pointer mr-1"
                          >
                            Set Aktif
                          </button>
                        )}
                        <button
                          onClick={() => handleEditAY(ay)}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-1.5 rounded-lg cursor-pointer"
                          title="Edit Tahun Ajaran"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteAY(ay.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-650 p-1.5 rounded-lg cursor-pointer"
                          title="Hapus Tahun Ajaran"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* CAWU */}
            {activeTab === "cawu" && (
              <motion.div
                key="cawu"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Manajemen Cawu (Catur Wulan)</h2>
                    <p className="text-xs text-gray-500">Mengelola termin triwulan aktif pembelajaran pesantren.</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditId(null);
                      setCawuForm({ nama: "", status: "tidak_aktif" });
                      setShowFormModal("cawu");
                    }}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Tambah Cawu
                  </button>
                </div>

                <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100 max-w-xl text-xs">
                  {cawus.map((c) => (
                    <div key={c.id} className="p-4 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-gray-900">{c.nama}</h4>
                        <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded ${
                          c.status === "aktif" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-400"
                        }`}>
                          {c.status === "aktif" ? "Aktif (Primary)" : "Tidak Aktif"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {c.status !== "aktif" && (
                          <button
                            onClick={() => handleSetCawuActive(c)}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg cursor-pointer mr-1"
                          >
                            Set Aktif
                          </button>
                        )}
                        <button
                          onClick={() => handleEditCawu(c)}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-1.5 rounded-lg cursor-pointer"
                          title="Edit Cawu"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCawu(c.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-650 p-1.5 rounded-lg cursor-pointer"
                          title="Hapus Cawu"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {cawus.length === 0 && (
                    <p className="p-4 text-center text-gray-400 italic">Belum ada data Cawu.</p>
                  )}
                </div>
              </motion.div>
            )}

            {/* HISSOH */}
            {activeTab === "hissoh" && (
              <motion.div
                key="hissoh"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Manajemen Hissoh (Jam Pelajaran)</h2>
                    <p className="text-xs text-gray-500">Konfigurasi jam pelajaran yang berlaku untuk seluruh jadwal mengajar.</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditId(null);
                      setHissohForm({
                        nama: "",
                        jam_mulai_wib: "07:00",
                        jam_selesai_wib: "07:45",
                        jam_mulai_istw: "07:00",
                        jam_selesai_istw: "07:45"
                      });
                      setShowFormModal("hissoh");
                    }}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Tambah Hissoh
                  </button>
                </div>

                <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-400 uppercase text-[10px] font-bold border-b border-gray-100">
                      <tr>
                        <th className="p-4">Nama Hissoh</th>
                        <th className="p-4">Waktu WIB</th>
                        <th className="p-4">Waktu ISTW (Istiwa')</th>
                        <th className="p-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {hissohs.map((h) => (
                        <tr key={h.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="p-4 font-bold text-slate-800">{h.nama}</td>
                          <td className="p-4 font-mono text-slate-600">{h.jam_mulai_wib} - {h.jam_selesai_wib} WIB</td>
                          <td className="p-4 font-mono text-slate-500">{h.jam_mulai_istw} - {h.jam_selesai_istw} ISTW</td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEditHissoh(h)}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-1.5 rounded-lg cursor-pointer"
                                title="Edit Hissoh"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteHissoh(h.id)}
                                className="bg-red-50 hover:bg-red-100 text-red-650 p-1.5 rounded-lg cursor-pointer"
                                title="Hapus Hissoh"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {hissohs.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-gray-400 italic">Belum ada data Hissoh.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* 9. PENGATURAN SYSTEM */}
            {activeTab === "pengaturan" && appSettings && (
              <motion.div
                key="pengaturan"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Pengaturan Sistem Presensi</h2>
                  <p className="text-xs text-gray-500">Konfigurasi radius GPS, jam toleransi, nama pondok, dan logo pesantren.</p>
                </div>

                <form onSubmit={handleUpdateSettings} className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm space-y-6 text-xs max-w-2xl">
                  {/* Bagian 1: Identitas Pondok */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-[10px] uppercase text-gray-400 font-mono tracking-wider pb-1.5 border-b border-gray-50">
                      Identitas Pesantren
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Nama Pondok</label>
                        <input
                          type="text"
                          value={appSettings.nama_pondok}
                          onChange={(e) => setAppSettings({ ...appSettings, nama_pondok: e.target.value })}
                          required
                          className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Logo URL</label>
                        <input
                          type="text"
                          value={appSettings.logo}
                          onChange={(e) => setAppSettings({ ...appSettings, logo: e.target.value })}
                          required
                          className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl outline-none"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Alamat Pondok</label>
                        <input
                          type="text"
                          value={appSettings.alamat}
                          onChange={(e) => setAppSettings({ ...appSettings, alamat: e.target.value })}
                          required
                          className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bagian 2: Presensi */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-[10px] uppercase text-gray-400 font-mono tracking-wider pb-1.5 border-b border-gray-50">
                      Aturan Presensi & Toleransi
                    </h3>
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Radius Default (Meter)</label>
                        <input
                          type="number"
                          value={appSettings.radius_default}
                          onChange={(e) => setAppSettings({ ...appSettings, radius_default: Number(e.target.value) })}
                          required
                          className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Jam Toleransi (Menit)</label>
                        <input
                          type="number"
                          value={appSettings.jam_toleransi}
                          onChange={(e) => setAppSettings({ ...appSettings, jam_toleransi: Number(e.target.value) })}
                          required
                          className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Batas Keterlambatan (Menit)</label>
                        <input
                          type="number"
                          value={appSettings.batas_keterlambatan}
                          onChange={(e) => setAppSettings({ ...appSettings, batas_keterlambatan: Number(e.target.value) })}
                          required
                          className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bagian 3: Keamanan */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-[10px] uppercase text-gray-400 font-mono tracking-wider pb-1.5 border-b border-gray-50">
                      Keamanan & Sensor
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Password Minimum Karakter</label>
                        <input
                          type="number"
                          value={appSettings.password_minimum}
                          onChange={(e) => setAppSettings({ ...appSettings, password_minimum: Number(e.target.value) })}
                          required
                          className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-6">
                        <input
                          type="checkbox"
                          id="izin_kamera_wajib"
                          checked={appSettings.izin_kamera_wajib}
                          onChange={(e) => setAppSettings({ ...appSettings, izin_kamera_wajib: e.target.checked })}
                          className="w-4 h-4 accent-emerald-700"
                        />
                        <label htmlFor="izin_kamera_wajib" className="text-xs font-bold text-gray-600">
                          Wajibkan Sensor Kamera Selfie
                        </label>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition-colors cursor-pointer"
                  >
                    Simpan Semua Pengaturan
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      {/* MOBILE LOWER NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-150 py-2.5 px-4 flex justify-around shadow-lg z-40 text-[9px] font-bold">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex flex-col items-center gap-1 ${activeTab === "dashboard" ? "text-emerald-700" : "text-gray-450"}`}
        >
          <Activity className="w-5 h-5 shrink-0" />
          <span>Dashboard</span>
        </button>
        <button
          onClick={() => setActiveTab("presensi")}
          className={`flex flex-col items-center gap-1 ${activeTab === "presensi" ? "text-emerald-700" : "text-gray-450"}`}
        >
          <CheckSquare className="w-5 h-5 shrink-0" />
          <span>Monitoring</span>
        </button>
        <button
          onClick={() => setActiveTab("laporan")}
          className={`flex flex-col items-center gap-1 ${activeTab === "laporan" ? "text-emerald-700" : "text-gray-450"}`}
        >
          <FileSpreadsheet className="w-5 h-5 shrink-0" />
          <span>Laporan</span>
        </button>
        <button
          onClick={() => {
            const next = prompt("Menu Cepat Admin:\n1. Guru\n2. Mapel\n3. Kelas\n4. Jadwal\n5. Tahun Ajaran\n6. Pengaturan\nMasukkan angka (1-6):");
            if (next === "1") setActiveTab("guru");
            if (next === "2") setActiveTab("mapel");
            if (next === "3") setActiveTab("kelas");
            if (next === "4") setActiveTab("jadwal");
            if (next === "5") setActiveTab("tahun_ajaran");
            if (next === "6") setActiveTab("pengaturan");
          }}
          className="flex flex-col items-center gap-1 text-gray-450"
        >
          <SettingsIcon className="w-5 h-5 shrink-0" />
          <span>Menu</span>
        </button>
      </nav>

      {/* FORM MODALS OVERLAY */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-gray-100"
          >
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider font-mono">
                {editId ? "Ubah Data" : "Tambah Data"} {showFormModal}
              </h3>
              <button
                onClick={() => {
                  setShowFormModal(null);
                  setEditId(null);
                }}
                className="text-white hover:text-slate-300 text-xs font-bold"
              >
                Tutup
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 text-xs">
              
              {/* GURU FORM */}
              {showFormModal === "guru" && (
                <form onSubmit={handleSaveGuru} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nama Lengkap</label>
                    <input
                      type="text"
                      value={guruForm.nama}
                      onChange={(e) => setGuruForm({ ...guruForm, nama: e.target.value })}
                      required
                      className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">NIP (Unique)</label>
                    <input
                      type="text"
                      value={guruForm.nip}
                      onChange={(e) => setGuruForm({ ...guruForm, nip: e.target.value })}
                      required
                      className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Email</label>
                      <input
                        type="email"
                        value={guruForm.email}
                        onChange={(e) => setGuruForm({ ...guruForm, email: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">No HP</label>
                      <input
                        type="text"
                        value={guruForm.no_hp}
                        onChange={(e) => setGuruForm({ ...guruForm, no_hp: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                      Password Akun Guru {editId ? "(Kosongkan jika tidak diubah)" : ""}
                    </label>
                    <input
                      type="password"
                      value={guruForm.password}
                      onChange={(e) => setGuruForm({ ...guruForm, password: e.target.value })}
                      required={!editId}
                      placeholder="Min 8 karakter, 1 huruf besar, 1 angka"
                      className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-xl hover:bg-slate-850 cursor-pointer"
                  >
                    Simpan Guru
                  </button>
                </form>
              )}

              {/* MAPEL FORM */}
              {showFormModal === "mapel" && (
                <form onSubmit={handleSaveMapel} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nama Mata Pelajaran</label>
                    <input
                      type="text"
                      value={mapelForm.nama_mapel}
                      onChange={(e) => setMapelForm({ nama_mapel: e.target.value })}
                      required
                      placeholder="Contoh: Nahwu, Shorof, Fiqih"
                      className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-xl hover:bg-slate-850 cursor-pointer"
                  >
                    Simpan Mapel
                  </button>
                </form>
              )}

              {/* KELAS FORM */}
              {showFormModal === "kelas" && (
                <form onSubmit={handleSaveKelas} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nama Kelas</label>
                      <input
                        type="text"
                        value={kelasForm.nama_kelas}
                        onChange={(e) => setKelasForm({ ...kelasForm, nama_kelas: e.target.value })}
                        required
                        placeholder="MTs 2 PA A"
                        className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Tingkat</label>
                      <select
                        value={kelasForm.tingkat}
                        onChange={(e) => setKelasForm({ ...kelasForm, tingkat: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl outline-none h-10"
                      >
                        <option value="MTs">MTs</option>
                        <option value="MA">MA</option>
                        <option value="Tahfidz">Tahfidz</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Gedung / Kampus</label>
                    <input
                      type="text"
                      value={kelasForm.gedung}
                      onChange={(e) => setKelasForm({ ...kelasForm, gedung: e.target.value })}
                      placeholder="Gedung Abu Bakar"
                      className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Keterangan Lokasi</label>
                    <input
                      type="text"
                      value={kelasForm.lokasi}
                      onChange={(e) => setKelasForm({ ...kelasForm, lokasi: e.target.value })}
                      placeholder="Madrasah lt. 1"
                      className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl outline-none"
                    />
                  </div>
                  
                  <div className="border-t border-gray-150 pt-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-emerald-600" /> Set GPS & Radius Presensi Kelas
                      </h5>
                      <span className="text-[9px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Otomatis Aktif</span>
                    </div>

                    {isDetectingGps ? (
                      <div className="bg-slate-50 border border-slate-250/60 text-slate-700 p-3 rounded-xl flex items-center gap-3 text-xs">
                        <span className="relative flex h-3 w-3 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                        <span className="font-medium animate-pulse">Menghubungkan GPS... Mendeteksi koordinat otomatis</span>
                      </div>
                    ) : gpsAccuracy ? (
                      <div className="bg-emerald-50 border border-emerald-150 text-emerald-850 p-2.5 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                          <span className="font-semibold text-[10px]">Auto-Detect OK (Akurasi: ~{gpsAccuracy}m)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => detectGpsLocation(true)}
                          className="text-[9px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                        >
                          Deteksi Ulang
                        </button>
                      </div>
                    ) : null}
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Latitude</label>
                        <input
                          type="number"
                          step="any"
                          value={kelasForm.latitude ?? -7.29135}
                          onChange={(e) => setKelasForm({ ...kelasForm, latitude: Number(e.target.value) })}
                          required
                          placeholder="-7.29135"
                          className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl outline-none text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Longitude</label>
                        <input
                          type="number"
                          step="any"
                          value={kelasForm.longitude ?? 110.18341}
                          onChange={(e) => setKelasForm({ ...kelasForm, longitude: Number(e.target.value) })}
                          required
                          placeholder="110.18341"
                          className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl outline-none text-xs font-mono"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 items-center">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Radius Absensi (Meter)</label>
                        <input
                          type="number"
                          value={kelasForm.radius ?? 100}
                          onChange={(e) => setKelasForm({ ...kelasForm, radius: Number(e.target.value) })}
                          required
                          placeholder="100"
                          className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl outline-none text-xs"
                        />
                      </div>
                      <div className="pt-4 flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => detectGpsLocation(true)}
                          disabled={isDetectingGps}
                          className="text-[9px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 py-1.5 px-2.5 rounded-lg border border-emerald-150 flex items-center justify-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                        >
                          <MapPin className="w-3 h-3 text-emerald-600" /> {isDetectingGps ? "Mencari..." : "Deteksi GPS Browser"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setKelasForm((prev) => ({
                              ...prev,
                              latitude: -7.29135,
                              longitude: 110.18341
                            }));
                          }}
                          className="text-[9px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 py-1 px-2.5 rounded-lg border border-slate-200 text-center cursor-pointer transition-colors"
                        >
                          Gunakan Default Al-Huda
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-xl hover:bg-slate-850 cursor-pointer"
                  >
                    Simpan Kelas
                  </button>
                </form>
              )}

              {/* JADWAL FORM */}
              {showFormModal === "jadwal" && (
                <form onSubmit={handleSaveJadwal} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Pilih Guru</label>
                      <select
                        value={jadwalForm.teacher_id}
                        onChange={(e) => setJadwalForm({ ...jadwalForm, teacher_id: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 p-2 rounded-xl outline-none h-10"
                      >
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.nama}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Mata Pelajaran</label>
                      <select
                        value={jadwalForm.subject_id}
                        onChange={(e) => setJadwalForm({ ...jadwalForm, subject_id: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 p-2 rounded-xl outline-none h-10"
                      >
                        {subjects.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.nama_mapel}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Hari</label>
                      <select
                        value={jadwalForm.hari}
                        onChange={(e) => setJadwalForm({ ...jadwalForm, hari: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 p-2 rounded-xl outline-none h-10"
                      >
                        <option value="Senin">Senin</option>
                        <option value="Selasa">Selasa</option>
                        <option value="Rabu">Rabu</option>
                        <option value="Kamis">Kamis</option>
                        <option value="Sabtu">Sabtu</option>
                        <option value="Minggu">Minggu (Ahad)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Kelas Ruangan</label>
                      <select
                        value={jadwalForm.class_id}
                        onChange={(e) => {
                          const classId = e.target.value;
                          const selectedClass = classes.find((c) => c.id === classId);
                          setJadwalForm((prev) => ({
                            ...prev,
                            class_id: classId,
                            latitude: selectedClass?.latitude !== undefined ? selectedClass.latitude : prev.latitude,
                            longitude: selectedClass?.longitude !== undefined ? selectedClass.longitude : prev.longitude,
                            radius: selectedClass?.radius !== undefined ? selectedClass.radius : prev.radius
                          }));
                        }}
                        className="w-full bg-gray-50 border border-gray-200 p-2 rounded-xl outline-none h-10"
                      >
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nama_kelas}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Jam Mulai (WIB)</label>
                      <input
                        type="text"
                        value={jadwalForm.jam_mulai}
                        onChange={(e) => setJadwalForm({ ...jadwalForm, jam_mulai: e.target.value })}
                        placeholder="HH:MM"
                        required
                        className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Jam Selesai (WIB)</label>
                      <input
                        type="text"
                        value={jadwalForm.jam_selesai}
                        onChange={(e) => setJadwalForm({ ...jadwalForm, jam_selesai: e.target.value })}
                        placeholder="HH:MM"
                        required
                        className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-50">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase">Jangkauan Geofence Absen</label>
                    <div className="grid grid-cols-3 gap-2 mt-1.5">
                      <div>
                        <span className="text-[8px] text-gray-400">Lat Pondok</span>
                        <input
                          type="number"
                          step="0.00001"
                          value={jadwalForm.latitude}
                          onChange={(e) => setJadwalForm({ ...jadwalForm, latitude: Number(e.target.value) })}
                          className="w-full bg-gray-50 border border-gray-200 p-1.5 rounded-lg"
                        />
                      </div>
                      <div>
                        <span className="text-[8px] text-gray-400">Lng Pondok</span>
                        <input
                          type="number"
                          step="0.00001"
                          value={jadwalForm.longitude}
                          onChange={(e) => setJadwalForm({ ...jadwalForm, longitude: Number(e.target.value) })}
                          className="w-full bg-gray-50 border border-gray-200 p-1.5 rounded-lg"
                        />
                      </div>
                      <div>
                        <span className="text-[8px] text-gray-400">Radius (Meter)</span>
                        <input
                          type="number"
                          value={jadwalForm.radius}
                          onChange={(e) => setJadwalForm({ ...jadwalForm, radius: Number(e.target.value) })}
                          className="w-full bg-gray-50 border border-gray-200 p-1.5 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-xl hover:bg-slate-850 cursor-pointer"
                  >
                    Simpan Jadwal
                  </button>
                </form>
              )}

              {/* TAHUN AJARAN FORM */}
              {showFormModal === "tahun_ajaran" && (
                <form onSubmit={handleSaveAY} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Tahun Ajaran</label>
                    <input
                      type="text"
                      value={ayForm.tahun}
                      onChange={(e) => setAyForm({ ...ayForm, tahun: e.target.value })}
                      required
                      placeholder="Contoh: 2026-2027"
                      className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-xl hover:bg-slate-850 cursor-pointer"
                  >
                    Simpan
                  </button>
                </form>
              )}

              {/* CAWU FORM */}
              {showFormModal === "cawu" && (
                <form onSubmit={handleSaveCawu} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nama Cawu</label>
                    <input
                      type="text"
                      value={cawuForm.nama}
                      onChange={(e) => setCawuForm({ ...cawuForm, nama: e.target.value })}
                      required
                      placeholder="Contoh: Cawu 1"
                      className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-xl hover:bg-slate-850 cursor-pointer"
                  >
                    Simpan Cawu
                  </button>
                </form>
              )}

              {/* HISSOH FORM */}
              {showFormModal === "hissoh" && (
                <form onSubmit={handleSaveHissoh} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nama Hissoh</label>
                    <input
                      type="text"
                      value={hissohForm.nama}
                      onChange={(e) => setHissohForm({ ...hissohForm, nama: e.target.value })}
                      required
                      placeholder="Contoh: HISSOH 01"
                      className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Mulai (WIB)</label>
                      <input
                        type="text"
                        value={hissohForm.jam_mulai_wib}
                        onChange={(e) => setHissohForm({ ...hissohForm, jam_mulai_wib: e.target.value })}
                        required
                        className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Selesai (WIB)</label>
                      <input
                        type="text"
                        value={hissohForm.jam_selesai_wib}
                        onChange={(e) => setHissohForm({ ...hissohForm, jam_selesai_wib: e.target.value })}
                        required
                        className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 border-t border-gray-50 pt-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Mulai (ISTW)</label>
                      <input
                        type="text"
                        value={hissohForm.jam_mulai_istw}
                        onChange={(e) => setHissohForm({ ...hissohForm, jam_mulai_istw: e.target.value })}
                        required
                        className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl outline-none text-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Selesai (ISTW)</label>
                      <input
                        type="text"
                        value={hissohForm.jam_selesai_istw}
                        onChange={(e) => setHissohForm({ ...hissohForm, jam_selesai_istw: e.target.value })}
                        required
                        className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl outline-none text-gray-500"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-xl hover:bg-slate-850 cursor-pointer"
                  >
                    Simpan Hissoh
                  </button>
                </form>
              )}

              {/* IMPORT EXCEL/CSV MODAL */}
              {showFormModal === "import_excel" && (
                <div className="space-y-4 py-2">
                  <div className="flex items-center gap-3 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                    <Upload className="w-8 h-8 text-emerald-700 shrink-0" />
                    <div>
                      <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                        Bulk Impor Data {importType === "guru" ? "Guru" : importType === "kelas" ? "Kelas" : "Jadwal"}
                      </h4>
                      <p className="text-[10px] text-gray-500 mt-0.5 leading-normal">
                        Mendukung unggahan file CSV atau salin-tempel baris data teks secara langsung.
                      </p>
                    </div>
                  </div>

                  {/* Template description */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-gray-150 space-y-1.5 text-slate-700">
                    <p className="font-bold text-[10px] uppercase text-slate-500">Format Kolom Header Wajib:</p>
                    {importType === "guru" && (
                      <div className="space-y-1">
                        <code className="text-[10px] block font-mono font-bold bg-white border border-gray-200 p-1 rounded">
                          nama, nip, email, no_hp
                        </code>
                        <p className="text-[9px] text-gray-400">
                          * Password guru akan otomatis dibuat dari nama kecil tanpa spasi & tanda baca.
                        </p>
                      </div>
                    )}
                    {importType === "kelas" && (
                      <div className="space-y-1">
                        <code className="text-[10px] block font-mono font-bold bg-white border border-gray-200 p-1 rounded">
                          nama_kelas, tingkat, gedung, lokasi
                        </code>
                        <p className="text-[9px] text-gray-400">
                          * Tingkat diisi "MTs" atau "MA". Lokasi adalah titik GPS (contoh: -7.2913,110.183).
                        </p>
                      </div>
                    )}
                    {importType === "jadwal" && (
                      <div className="space-y-1">
                        <code className="text-[10px] block font-mono font-bold bg-white border border-gray-200 p-1 rounded">
                          nama_guru, mata_pelajaran, hari, kelas, hissoh
                        </code>
                        <p className="text-[9px] text-gray-400">
                          * Kolom hissoh diisi nama hissoh (contoh: "Hissoh Ke-1" atau "H1").
                        </p>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        if (importType === "guru") {
                          setCsvText("nama, nip, email, no_hp\nUstadz Yusuf, 199001, yusuf@pondok.id, 08123456781\nUstadzah Fatimah, 199002, fatimah@pondok.id, 08123456782");
                        } else if (importType === "kelas") {
                          setCsvText("nama_kelas, tingkat, gedung, lokasi\nKelas VII-A, MTs, Gedung Utama Barat, -7.29135,110.18341\nKelas X-B, MA, Gedung Utama Timur, -7.29135,110.18341");
                        } else if (importType === "jadwal") {
                          setCsvText("nama_guru, mata_pelajaran, hari, kelas, hissoh\nMuhammad Hasan, Fiqih, Senin, Kelas VII-A, Hissoh Ke-1\nUstadz Yusuf, Nahwu, Selasa, Kelas X-B, Hissoh Ke-2");
                        }
                        setImportStatusMsg("Template contoh berhasil dimasukkan!");
                      }}
                      className="text-[10px] text-emerald-800 font-bold hover:underline flex items-center gap-1 mt-1 cursor-pointer"
                    >
                      💡 Tempel Contoh Data
                    </button>
                  </div>

                  <form onSubmit={handleImportCSV} className="space-y-3">
                    {/* Real file upload */}
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Unggah File CSV</label>
                      <input
                        type="file"
                        accept=".csv,.txt"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            setCsvText(evt.target?.result as string);
                            setImportStatusMsg(`File "${file.name}" berhasil dibaca.`);
                          };
                          reader.readAsText(file);
                        }}
                        className="w-full text-[10px] bg-gray-50 border border-gray-200 p-2 rounded-xl outline-none"
                      />
                    </div>

                    {/* Copy-paste input */}
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Atau Tempel Teks CSV</label>
                      <textarea
                        rows={5}
                        placeholder="Tempel baris data CSV di sini..."
                        value={csvText}
                        onChange={(e) => setCsvText(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl outline-none font-mono text-[10px] leading-relaxed"
                      />
                    </div>

                    {importStatusMsg && (
                      <div className="bg-emerald-50 text-emerald-800 p-2.5 rounded-xl text-[10px] font-bold leading-normal border border-emerald-100">
                        {importStatusMsg}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowFormModal(null);
                          setCsvText("");
                          setImportStatusMsg("");
                        }}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-2.5 rounded-xl cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="flex-1 bg-slate-900 text-white font-bold py-2.5 rounded-xl hover:bg-slate-850 shadow-md cursor-pointer"
                      >
                        Impor Sekarang
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* PRESENSI DETAIL MODAL */}
              {showFormModal === "presensi_detail" && inspectedAttendance && (
                <div className="space-y-4">
                  {/* Selfie frame */}
                  <div className="flex gap-3 items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <img
                      src={inspectedAttendance.validation?.foto_url || inspectedAttendance.teacher?.foto}
                      alt="Selfie"
                      className="w-16 h-16 rounded-xl object-cover border border-gray-200"
                    />
                    <div>
                      <h4 className="font-bold text-xs text-gray-900">{inspectedAttendance.teacher?.nama}</h4>
                      <p className="text-[10px] text-slate-500">NIP: {inspectedAttendance.teacher?.nip}</p>
                      <p className="text-[10px] text-emerald-700 font-bold mt-1">✓ Validasi Selfie Sukses</p>
                    </div>
                  </div>

                  {/* Geofence verification lists */}
                  <div className="space-y-2 text-[11px]">
                    <div className="flex justify-between border-b border-gray-50 py-1.5">
                      <span className="text-gray-400">Mata Pelajaran:</span>
                      <span className="font-bold text-gray-800">{inspectedAttendance.schedule?.subject_name}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-50 py-1.5">
                      <span className="text-gray-400">Kelas:</span>
                      <span className="font-bold text-gray-800">{inspectedAttendance.schedule?.class_name}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-50 py-1.5">
                      <span className="text-gray-400">Tanggal Kehadiran:</span>
                      <span className="font-bold text-gray-800">{inspectedAttendance.tanggal}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-50 py-1.5">
                      <span className="text-gray-400">Jarak Dari Kelas:</span>
                      <span className="font-mono font-bold text-gray-850">
                        {inspectedAttendance.validation?.jarak} Meter{" "}
                        <span className={inspectedAttendance.validation?.gps_valid ? "text-emerald-700" : "text-amber-600"}>
                          ({inspectedAttendance.validation?.gps_valid ? "Valid" : "Luar Radius"})
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-gray-50 py-1.5">
                      <span className="text-gray-400">IP address:</span>
                      <span className="font-mono text-gray-700">{inspectedAttendance.validation?.ip}</span>
                    </div>
                    {inspectedAttendance.catatan && (
                      <div className="p-2.5 bg-gray-50 rounded-xl italic leading-relaxed text-gray-500 border border-gray-100">
                        Catatan: {inspectedAttendance.catatan}
                      </div>
                    )}
                  </div>

                  {/* Override Presensi Actions */}
                  <div className="pt-3 border-t border-gray-50 flex gap-2">
                    <button
                      onClick={() => handleUpdatePresenceStatus(inspectedAttendance.id, "Izin")}
                      className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 rounded-xl shadow-sm transition-colors cursor-pointer"
                    >
                      Set Izin
                    </button>
                    <button
                      onClick={() => handleUpdatePresenceStatus(inspectedAttendance.id, "Hadir")}
                      className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2 rounded-xl shadow-sm transition-colors cursor-pointer"
                    >
                      Set Hadir (Approve)
                    </button>
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}

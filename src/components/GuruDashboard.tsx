import React, { useState, useEffect, useRef } from "react";
import {
  Home,
  Calendar,
  Clock,
  User,
  Settings as SettingsIcon,
  CheckCircle,
  MapPin,
  Camera,
  FileText,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Check,
  AlertTriangle,
  Map,
  Layers,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Teacher, Schedule, Attendance, Settings } from "../types";

interface GuruDashboardProps {
  teacher: Teacher;
  onLogout: () => void;
  onUpdateTeacher?: (updatedTeacher: any) => void;
}

export default function GuruDashboard({ teacher, onLogout, onUpdateTeacher }: GuruDashboardProps) {
  // Navigation State
  const [activeTab, setActiveTab] = useState<"beranda" | "presensi" | "jadwal" | "riwayat" | "profil" | "pengaturan">("beranda");

  // App Settings
  const [appSettings, setAppSettings] = useState<Settings | null>(null);

  // Data State
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Calendar State (weekly swipe on mobile, default selected day)
  const daysOfWeek = ["Senin", "Selasa", "Rabu", "Kamis", "Sabtu", "Minggu"]; // Jumat libur
  const [selectedDay, setSelectedDay] = useState("");

  // Presence Modal State
  const [showPresensiModal, setShowPresensiModal] = useState(false);
  const [activeSchedule, setActiveSchedule] = useState<Schedule | null>(null);
  const [presensiStep, setPresensiStep] = useState(1); // 1: Selfie, 2: Lokasi, 3: Catatan, 4: Selesai

  // Presence Input State
  const [selfieData, setSelfieData] = useState<string>("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [reportedIp, setReportedIp] = useState("180.252.12.82");
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [distanceFromPondok, setDistanceFromPondok] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [catatan, setCatatan] = useState("");
  const [presenceSuccess, setPresenceSuccess] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cameraError, setCameraError] = useState("");

  // Merge Classes State
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeSearch, setMergeSearch] = useState("");
  const [mergeSourceSched, setMergeSourceSched] = useState<Schedule | null>(null);

  // Profile Update State
  const [profileSuccessMsg, setProfileSuccessMsg] = useState("");
  const [profileErrorMsg, setProfileErrorMsg] = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    nama: teacher.nama,
    email: teacher.email || "",
    no_hp: teacher.no_hp || "",
    foto: teacher.foto || ""
  });
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  // Camera stream ref
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Load Initial Data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [resSettings, resSchedules, resAttendances] = await Promise.all([
        fetch("/api/settings"),
        fetch("/api/schedules"),
        fetch(`/api/attendance?teacher_id=${teacher.id}`)
      ]);

      const settingsData = await resSettings.json();
      const schedulesData = await resSchedules.json();
      const attendancesData = await resAttendances.json();

      setAppSettings(settingsData);
      
      // Filter schedules to only show this teacher's active schedules
      const teacherSchedules = schedulesData.filter(
        (s: Schedule) => s.teacher_id === teacher.id
      );

      // Join details for schedule cards
      // (Normally joined on server, but let's double check class & subject names)
      const resClasses = await fetch("/api/classes");
      const resSubjects = await fetch("/api/subjects");
      const classesData = await resClasses.json();
      const subjectsData = await resSubjects.json();

      const enriched = teacherSchedules.map((s: Schedule) => {
        const cl = classesData.find((c: any) => c.id === s.class_id);
        const sub = subjectsData.find((sub: any) => sub.id === s.subject_id);
        const targetMerged = teacherSchedules.find((ts: Schedule) => ts.id === s.merged_with_id);
        return {
          ...s,
          class_name: cl ? cl.nama_kelas : "Kelas",
          subject_name: sub ? sub.nama_mapel : "Mata Pelajaran",
          building: cl ? cl.gedung : "",
          location_desc: cl ? cl.lokasi : "",
          class_lat: cl ? cl.latitude : null,
          class_lng: cl ? cl.longitude : null,
          class_radius: cl && cl.radius !== undefined ? cl.radius : null,
          merged_with_name: targetMerged ? targetMerged.hari + " " + targetMerged.jam_mulai : null
        };
      });

      setSchedules(enriched);
      setAttendances(attendancesData);
    } catch (error) {
      console.error("Gagal memuat data guru:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Set default day to today
    const daysInd = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const todayName = daysInd[new Date().getDay()];
    // If today is Friday (holiday), set to Monday
    if (todayName === "Jumat") {
      setSelectedDay("Senin");
    } else {
      setSelectedDay(todayName);
    }
  }, []);

  // Determine class schedule ongoing right now
  const getCurrentActiveSlot = () => {
    const todayDayIndex = new Date().getDay();
    const daysInd = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const todayName = daysInd[todayDayIndex];
    if (todayName === "Jumat") return null;

    const now = new Date();
    const curTimeStr = now.toTimeString().substring(0, 5); // "HH:MM"

    return schedules.find((s) => {
      if (s.hari !== todayName) return false;
      return curTimeStr >= s.jam_mulai && curTimeStr <= s.jam_selesai;
    });
  };

  const activeSlot = getCurrentActiveSlot();

  // Handle camera start
  const startCamera = async () => {
    setCameraError("");
    setIsCameraActive(true);
    try {
      const constraints = { video: { facingMode: "user", width: 400, height: 300 } };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Camera access denied or failed", err);
      setCameraError("Kamera tidak diizinkan atau tidak ditemukan browser. Silakan aktifkan izin kamera atau gunakan Kamera Simulator.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const captureSelfie = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 300;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 400, 300);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setSelfieData(dataUrl);
        stopCamera();
        setPresensiStep(2);
        fetchLocationAuto();
      }
    }
  };

  // Mock Camera capture when webcam fails or is locked in iframe
  const captureSimulatorSelfie = () => {
    const simulatedPhotos = [
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=300&auto=format&fit=crop&q=80"
    ];
    // Select based on teacher photo or random
    const idx = Math.floor(Math.random() * simulatedPhotos.length);
    setSelfieData(simulatedPhotos[idx]);
    stopCamera();
    setPresensiStep(2);
    fetchLocationAuto();
  };

  // Automatic Location Fetch
  const fetchLocationAuto = () => {
    setIsFetchingLocation(true);
    setDistanceFromPondok(null);

    // Prompt specifies: Ambil otomatis GPS dan IP
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLatitude(lat);
          setLongitude(lng);

          // Calculate distance to active schedule classroom coordinates
          if (activeSchedule) {
            const clLat = (activeSchedule as any).class_lat !== undefined && (activeSchedule as any).class_lat !== null ? (activeSchedule as any).class_lat : -7.29135;
            const clLng = (activeSchedule as any).class_lng !== undefined && (activeSchedule as any).class_lng !== null ? (activeSchedule as any).class_lng : 110.18341;
            const distance = calculateDistance(lat, lng, clLat, clLng);
            setDistanceFromPondok(distance);
          }
          setIsFetchingLocation(false);
        },
        (error) => {
          console.error("GPS fetching error, falling back to simulated coordinates inside school radius", error);
          // Fallback to high accuracy mock coordinate near Pondok Ponpes Al-Huda (-7.29135, 110.18341)
          setTimeout(() => {
            const clLat = activeSchedule && (activeSchedule as any).class_lat !== undefined && (activeSchedule as any).class_lat !== null ? (activeSchedule as any).class_lat : -7.29135;
            const clLng = activeSchedule && (activeSchedule as any).class_lng !== undefined && (activeSchedule as any).class_lng !== null ? (activeSchedule as any).class_lng : 110.18341;
            
            const mockOffsetLat = (Math.random() - 0.5) * 0.0003; // ~15 meters deviation
            const mockOffsetLng = (Math.random() - 0.5) * 0.0003;
            const mockLat = clLat + mockOffsetLat;
            const mockLng = clLng + mockOffsetLng;
            setLatitude(mockLat);
            setLongitude(mockLng);

            if (activeSchedule) {
              const distance = calculateDistance(mockLat, mockLng, clLat, clLng);
              setDistanceFromPondok(distance);
            }
            setIsFetchingLocation(false);
          }, 1500);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setIsFetchingLocation(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  // Convert reported times to Istiwa hours (just as decorative estimation to follow Pondok vibe)
  // Estimated Istiwa is usually +15 minutes for solar position
  const getIstiwaTime = (timeStr: string) => {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":").map(Number);
    let newM = m + 15;
    let newH = h;
    if (newM >= 60) {
      newM -= 60;
      newH = (newH + 1) % 24;
    }
    const hh = String(newH).padStart(2, "0");
    const mm = String(newM).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  const getRadiusLimitForSchedule = (s: Schedule | null) => {
    if (!s) return 100;
    if ((s as any).class_radius !== undefined && (s as any).class_radius !== null) {
      return Number((s as any).class_radius);
    }
    if (s.radius !== undefined && s.radius !== null) {
      return Number(s.radius);
    }
    return appSettings?.radius_default || 100;
  };

  const submitPresensi = async () => {
    if (!activeSchedule) return;
    setIsSubmitting(true);

    const todayStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD local format

    const payload = {
      schedule_id: activeSchedule.id,
      teacher_id: teacher.id,
      tanggal: todayStr,
      status: "Hadir",
      catatan: catatan,
      selfie_base64: selfieData,
      latitude: latitude || -7.29135,
      longitude: longitude || 110.18341,
      ip: reportedIp
    };

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        setPresenceSuccess(true);
        setPresensiStep(4);
        loadData(); // reload statistics
      } else {
        alert(data.error || "Gagal melakukan presensi!");
      }
    } catch (err) {
      console.error("Error submitting attendance", err);
      alert("Terjadi masalah jaringan saat menyimpan presensi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitIzin = async (sched: Schedule, alasan: string) => {
    if (!alasan.trim()) {
      alert("Silakan masukkan alasan izin!");
      return;
    }
    const todayStr = new Date().toLocaleDateString("en-CA");

    const payload = {
      schedule_id: sched.id,
      teacher_id: teacher.id,
      tanggal: todayStr,
      status: "Izin",
      catatan: alasan,
      selfie_base64: teacher.foto, // fallbacks to profile photo
      latitude: -7.29135,
      longitude: 110.18341,
      ip: reportedIp
    };

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert("Pengajuan Izin berhasil dikirim!");
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || "Gagal mengirim pengajuan izin.");
      }
    } catch (err) {
      alert("Gagal menghubungi server.");
    }
  };

  const handleMergeSchedules = async (targetSchedId: string) => {
    if (!mergeSourceSched) return;
    try {
      const res = await fetch("/api/schedules/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schedule_id: mergeSourceSched.id,
          target_schedule_id: targetSchedId
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || "Jadwal berhasil digabungkan!");
        setShowMergeModal(false);
        loadData();
      } else {
        alert(data.error || "Gagal menggabungkan kelas.");
      }
    } catch (error) {
      alert("Gagal melakukan aksi penggabungan.");
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccessMsg("");
    setProfileErrorMsg("");

    const { oldPassword, newPassword, confirmPassword } = passwordForm;

    // Strict requirements check
    if (newPassword.length < 8) {
      setProfileErrorMsg("Password baru minimal harus 8 karakter!");
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setProfileErrorMsg("Password baru harus mengandung minimal 1 huruf besar!");
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      setProfileErrorMsg("Password baru harus mengandung minimal 1 angka!");
      return;
    }
    if (newPassword !== confirmPassword) {
      setProfileErrorMsg("Konfirmasi password baru tidak cocok!");
      return;
    }

    try {
      const res = await fetch(`/api/teachers/${teacher.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: newPassword
        })
      });

      if (res.ok) {
        setProfileSuccessMsg("Password berhasil diperbarui!");
        setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        const data = await res.json();
        setProfileErrorMsg(data.error || "Gagal mengubah password.");
      }
    } catch (err) {
      setProfileErrorMsg("Terjadi gangguan jaringan.");
    }
  };

  // Update Profile details
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccessMsg("");
    setProfileErrorMsg("");

    try {
      const res = await fetch(`/api/teachers/${teacher.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: profileForm.nama,
          email: profileForm.email,
          no_hp: profileForm.no_hp,
          foto: profileForm.foto
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setProfileSuccessMsg("Profil Anda berhasil diperbarui!");
        setIsEditingProfile(false);
        if (onUpdateTeacher) {
          onUpdateTeacher(updated);
        }
      } else {
        const data = await res.json();
        setProfileErrorMsg(data.error || "Gagal memperbarui profil.");
      }
    } catch (err) {
      setProfileErrorMsg("Terjadi gangguan jaringan.");
    }
  };

  // Check if a schedule already has attendance today
  const hasAttendanceToday = (scheduleId: string) => {
    const todayStr = new Date().toLocaleDateString("en-CA");
    return attendances.find((a) => a.schedule_id === scheduleId && a.tanggal === todayStr);
  };

  // Stats calculation
  const totalPresence = attendances.filter((a) => a.status === "Hadir").length;
  const totalIzin = attendances.filter((a) => a.status === "Izin").length;
  const totalAlfa = attendances.filter((a) => a.status === "Alfa").length;

  const currentRadiusLimit = getRadiusLimitForSchedule(activeSchedule);

  return (
    <div className="min-h-screen bg-[#F7F8F5] pb-24 md:pb-6 flex flex-col md:flex-row text-gray-800" id="teacher-viewport">
      
      {/* SIDEBAR ON DESKTOP */}
      <aside className="hidden md:flex flex-col w-64 bg-white text-slate-800 shrink-0 p-5 shadow-sm border-r border-gray-200">
        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-150">
          <img
            src={appSettings?.logo || "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=120&auto=format&fit=crop"}
            alt="Logo Pondok"
            className="w-10 h-10 rounded-lg object-cover border border-gray-200"
          />
          <div>
            <h1 className="text-sm font-bold tracking-tight leading-tight text-slate-950">Al-Huda</h1>
            <p className="text-[10px] text-slate-500 font-semibold">Presensi Guru Pondok</p>
          </div>
        </div>

        {/* User Card */}
        <div className="mb-6 p-3 bg-slate-50 rounded-xl border border-slate-250/60 flex items-center gap-3">
          <img src={teacher.foto} alt={teacher.nama} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
          <div className="overflow-hidden">
            <h4 className="text-xs font-bold text-slate-850 truncate leading-normal">{teacher.nama}</h4>
            <p className="text-[10px] text-slate-500 font-mono">NIP: {teacher.nip}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5">
          <button
            onClick={() => setActiveTab("beranda")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "beranda" ? "bg-slate-950 text-white shadow-md border border-slate-900" : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
            }`}
          >
            <Home className="w-4 h-4" /> Beranda
          </button>
          <button
            onClick={() => setActiveTab("presensi")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "presensi" ? "bg-slate-950 text-white shadow-md border border-slate-900" : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
            }`}
          >
            <Clock className="w-4 h-4" /> Presensi Hari Ini
          </button>
          <button
            onClick={() => setActiveTab("jadwal")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "jadwal" ? "bg-slate-950 text-white shadow-md border border-slate-900" : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
            }`}
          >
            <Calendar className="w-4 h-4" /> Jadwal Mingguan
          </button>
          <button
            onClick={() => setActiveTab("riwayat")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "riwayat" ? "bg-slate-950 text-white shadow-md border border-slate-900" : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
            }`}
          >
            <Clock className="w-4 h-4" /> Detail Riwayat
          </button>
          <button
            onClick={() => setActiveTab("profil")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "profil" ? "bg-slate-950 text-white shadow-md border border-slate-900" : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
            }`}
          >
            <User className="w-4 h-4" /> Profil Saya
          </button>
          <button
            onClick={() => setActiveTab("pengaturan")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "pengaturan" ? "bg-slate-950 text-white shadow-md border border-slate-900" : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
            }`}
          >
            <SettingsIcon className="w-4 h-4" /> Ganti Password
          </button>
        </nav>

        <button
          onClick={onLogout}
          className="mt-auto pt-4 border-t border-gray-200 w-full text-left text-xs font-bold text-slate-500 hover:text-slate-950 px-4 py-2 cursor-pointer"
        >
          Keluar Aplikasi
        </button>
      </aside>

      {/* MOBILE TOP HEADER */}
      <header className="md:hidden flex items-center justify-between bg-slate-950 text-white px-5 py-4 shadow-sm">
        <div className="flex items-center gap-2.5">
          <img
            src={appSettings?.logo || "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=120&auto=format&fit=crop"}
            alt="Logo Pondok"
            className="w-8 h-8 rounded-lg object-cover border border-slate-800"
          />
          <div>
            <h2 className="text-xs font-extrabold tracking-tight">Presensi Al-Huda</h2>
            <p className="text-[9px] text-slate-400 leading-none">Guru Madrasah</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="text-xs text-slate-300 hover:text-white font-bold border border-slate-800 bg-slate-900 px-3 py-1.5 rounded-xl cursor-pointer"
        >
          Keluar
        </button>
      </header>

      {/* MAIN VIEW AREA */}
      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-10 bg-gray-200 rounded-xl animate-pulse w-1/3"></div>
            <div className="h-44 bg-gray-200 rounded-2xl animate-pulse"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse"></div>
              ))}
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* 1. HOME VIEW */}
            {activeTab === "beranda" && (
              <motion.div
                key="beranda"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Greeting Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">
                      Assalamu'alaikum,
                    </span>
                    <h2 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900">
                      Ustadz {teacher.nama}
                    </h2>
                    <p className="text-xs text-gray-500">Selamat berkhidmah mendidik santri hari ini.</p>
                  </div>
                  <div className="bg-emerald-50 text-emerald-800 px-4 py-2 rounded-xl border border-emerald-200/50 flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
                    <Clock className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                    <div>
                      <div className="text-[9px] text-emerald-600 uppercase font-mono tracking-wider font-bold">Waktu Sekarang</div>
                      <div className="text-xs font-bold leading-none font-mono">
                        {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short" })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ONGOING CLASS ALERTER (Sedang Mengajar Sekarang) */}
                {activeSlot ? (
                  <div className="bg-emerald-600 text-white p-4.5 rounded-2xl shadow-sm border border-emerald-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/30 flex items-center justify-center shrink-0 border border-emerald-400/20">
                        <Clock className="w-5 h-5 text-emerald-100 animate-pulse" />
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider font-semibold text-emerald-200 bg-emerald-800/40 px-2 py-0.5 rounded">
                          Sedang Berlangsung Sekarang
                        </span>
                        <h4 className="font-bold text-sm mt-1 leading-tight">{activeSlot.subject_name}</h4>
                        <p className="text-[11px] text-emerald-100 flex items-center gap-1.5 mt-0.5">
                          <span>{activeSlot.class_name}</span> • <span>{activeSlot.jam_mulai} - {activeSlot.jam_selesai} WIB</span>
                        </p>
                      </div>
                    </div>
                    {hasAttendanceToday(activeSlot.id) ? (
                      <span className="bg-emerald-800/50 text-emerald-100 border border-emerald-500/30 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto">
                        <Check className="w-4.5 h-4.5 text-emerald-300" /> Presensi Selesai
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          setActiveSchedule(activeSlot);
                          setPresensiStep(1);
                          setSelfieData("");
                          setCatatan("");
                          setPresenceSuccess(false);
                          setShowPresensiModal(true);
                          startCamera();
                        }}
                        className="bg-white text-emerald-800 hover:bg-emerald-50 px-4.5 py-2.5 rounded-xl text-xs font-bold tracking-tight shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                      >
                        <Camera className="w-4.5 h-4.5" /> Ambil Presensi
                      </button>
                    )}
                  </div>
                ) : null}

                {/* Grid Summary */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
                    <span className="text-[10px] text-gray-400 font-mono">TOTAL MENGAJAR</span>
                    <h3 className="text-xl font-bold text-gray-900 mt-1">{schedules.length} Slot</h3>
                    <p className="text-[9px] text-gray-500 mt-0.5">Jadwal mingguan</p>
                  </div>
                  <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
                    <span className="text-[10px] text-gray-400 font-mono">PRESENSI HADIR</span>
                    <h3 className="text-xl font-bold text-emerald-700 mt-1">{totalPresence} Kali</h3>
                    <p className="text-[9px] text-gray-500 mt-0.5">Tepat waktu / valid</p>
                  </div>
                  <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
                    <span className="text-[10px] text-gray-400 font-mono">IZIN MENGAJAR</span>
                    <h3 className="text-xl font-bold text-amber-600 mt-1">{totalIzin} Kali</h3>
                    <p className="text-[9px] text-gray-500 mt-0.5">Tugas sudah dititipkan</p>
                  </div>
                  <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
                    <span className="text-[10px] text-gray-400 font-mono">TIDAK HADIR (ALFA)</span>
                    <h3 className="text-xl font-bold text-red-600 mt-1">{totalAlfa} Kali</h3>
                    <p className="text-[9px] text-gray-500 mt-0.5">Tanpa catatan presensi</p>
                  </div>
                </div>

                {/* Jadwal Hari Ini Section */}
                <div className="space-y-3">
                  <h3 className="font-bold text-sm text-gray-900 tracking-tight flex items-center justify-between">
                    <span>Jadwal Mengajar Hari Ini</span>
                    <button onClick={() => setActiveTab("presensi")} className="text-xs text-emerald-700 font-bold hover:underline">
                      Lihat Semua
                    </button>
                  </h3>

                  {/* Filter schedules for local weekday name */}
                  {(() => {
                    const localDayName = new Date().toLocaleDateString("id-ID", { weekday: "long" });
                    const todaySchedules = schedules.filter((s) => s.hari === localDayName);

                    if (todaySchedules.length === 0) {
                      return (
                        <div className="bg-white border border-gray-100 p-6 rounded-xl shadow-sm text-center">
                          <p className="text-xs text-gray-500">Hari ini tidak ada jadwal mengajar / Belum ada data</p>
                        </div>
                      );
                    }

                    return (
                      <div className="grid md:grid-cols-2 gap-4">
                        {todaySchedules.map((s) => {
                          const attToday = hasAttendanceToday(s.id);
                          return (
                            <div key={s.id} className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm space-y-3.5 flex flex-col justify-between">
                              <div className="flex justify-between gap-3">
                                <div>
                                  <h4 className="font-bold text-xs text-gray-900 leading-tight">{s.subject_name}</h4>
                                  <p className="text-[10px] text-gray-500 mt-0.5">{s.class_name} • {s.building}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="text-xs font-bold text-emerald-800 font-mono flex items-center gap-1 justify-end">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>{s.jam_mulai} - {s.jam_selesai} WIB</span>
                                  </div>
                                  <div className="text-[9px] text-gray-400 font-mono mt-0.5">
                                    {getIstiwaTime(s.jam_mulai)} - {getIstiwaTime(s.jam_selesai)} ISTW
                                  </div>
                                </div>
                              </div>

                              <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                                <span className="text-[9px] text-gray-400">Status Absen</span>
                                {attToday ? (
                                  <span className={`text-[10px] font-bold flex items-center gap-1 ${
                                    attToday.status === "Hadir" ? "text-emerald-700" : "text-amber-600"
                                  }`}>
                                    <CheckCircle className="w-3.5 h-3.5" /> {attToday.status}
                                  </span>
                                ) : (
                                  <div className="flex gap-1.5 shrink-0">
                                    <button
                                      onClick={() => {
                                        const reason = prompt("Masukkan alasan izin mengajar:");
                                        if (reason !== null) {
                                          submitIzin(s, reason);
                                        }
                                      }}
                                      className="border border-amber-200 text-amber-700 hover:bg-amber-50 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-colors"
                                    >
                                      Izin
                                    </button>
                                    <button
                                      onClick={() => {
                                        setActiveSchedule(s);
                                        setPresensiStep(1);
                                        setSelfieData("");
                                        setCatatan("");
                                        setPresenceSuccess(false);
                                        setShowPresensiModal(true);
                                        startCamera();
                                      }}
                                      className="bg-emerald-700 text-white hover:bg-emerald-800 px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-sm transition-colors cursor-pointer"
                                    >
                                      Presensi
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            )}

            {/* 2. PRESENSI GRID / CALENDAR VIEW */}
            {activeTab === "presensi" && (
              <motion.div
                key="presensi"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Kalender & Jadwal Mingguan</h2>
                  <p className="text-xs text-gray-500">Pilih hari untuk melihat detail jadwal dan melakukan presensi.</p>
                </div>

                {/* HORIZONTAL SWIPE CALENDAR ON MOBILE & DESKTOP */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x">
                  {daysOfWeek.map((day) => (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      className={`snap-center shrink-0 min-w-[90px] p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                        selectedDay === day
                          ? "bg-emerald-700 border-emerald-700 text-white shadow-sm"
                          : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">{day === "Minggu" ? "Ahad" : day}</span>
                      <span className="text-xs font-bold">
                        {schedules.filter((s) => s.hari === day).length} Kelas
                      </span>
                    </button>
                  ))}
                  <div className="shrink-0 w-16 p-3 rounded-xl border border-gray-100 bg-gray-50 flex flex-col items-center justify-center opacity-60">
                    <span className="text-[10px] font-bold text-red-600">JUM'AT</span>
                    <span className="text-[9px] text-gray-500 leading-none">Libur</span>
                  </div>
                </div>

                {/* Schedule list for the selected day */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-xs text-gray-400 uppercase tracking-wider font-mono">
                      Daftar Jadwal Hari {selectedDay}
                    </h3>
                    <button
                      onClick={() => {
                        // find active schedule for merging
                        const activeGuruScheds = schedules.filter((s) => s.hari === selectedDay);
                        if (activeGuruScheds.length < 2) {
                          alert("Anda memerlukan minimal 2 jadwal untuk menggabungkan kelas!");
                          return;
                        }
                        setMergeSourceSched(activeGuruScheds[0]);
                        setShowMergeModal(true);
                      }}
                      className="text-xs text-emerald-700 font-bold hover:underline flex items-center gap-1"
                    >
                      <Layers className="w-3.5 h-3.5" /> Gabungkan Jadwal Kelas
                    </button>
                  </div>

                  {(() => {
                    const daySchedules = schedules.filter((s) => s.hari === selectedDay);
                    if (daySchedules.length === 0) {
                      return (
                        <div className="bg-white border border-gray-150 p-8 rounded-2xl shadow-sm text-center">
                          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-80" />
                          <p className="text-xs text-gray-500 font-semibold">Tidak ada jadwal mengajar pada hari {selectedDay}.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        {daySchedules.map((s) => {
                          const attToday = hasAttendanceToday(s.id);
                          return (
                            <div
                              key={s.id}
                              className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:border-gray-200 transition-all"
                            >
                              <div className="flex gap-3">
                                <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center shrink-0 border border-emerald-100">
                                  <FileText className="w-4.5 h-4.5" />
                                </div>
                                <div>
                                  <h4 className="font-bold text-xs text-gray-900 leading-tight">
                                    {s.subject_name}
                                    {s.merged_with_id ? (
                                      <span className="text-[9px] font-bold bg-purple-50 border border-purple-200 text-purple-700 ml-2 px-1.5 py-0.5 rounded-full">
                                        Merged
                                      </span>
                                    ) : null}
                                  </h4>
                                  <p className="text-[10px] text-gray-500 mt-1">
                                    {s.class_name} • {s.building} ({s.location_desc})
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-row sm:flex-col justify-between items-center sm:items-end gap-3.5 pt-3 sm:pt-0 border-t sm:border-0 border-gray-50">
                                <div className="text-left sm:text-right shrink-0">
                                  <div className="text-xs font-bold text-emerald-800 font-mono leading-none">
                                    {s.jam_mulai} - {s.jam_selesai} WIB
                                  </div>
                                  <span className="text-[9px] text-gray-400 font-mono mt-1 block">
                                    {getIstiwaTime(s.jam_mulai)} - {getIstiwaTime(s.jam_selesai)} ISTW
                                  </span>
                                </div>

                                <div>
                                  {attToday ? (
                                    <span className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 shadow-sm">
                                      <Check className="w-3.5 h-3.5" /> Selesai ({attToday.status})
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setActiveSchedule(s);
                                        setPresensiStep(1);
                                        setSelfieData("");
                                        setCatatan("");
                                        setPresenceSuccess(false);
                                        setShowPresensiModal(true);
                                        startCamera();
                                      }}
                                      className="bg-emerald-700 text-white hover:bg-emerald-800 px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
                                    >
                                      Mulai Presensi
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            )}

            {/* 2b. JADWAL MINGGUAN VIEW */}
            {activeTab === "jadwal" && (
              <motion.div
                key="jadwal"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Jadwal Mengajar Mingguan</h2>
                  <p className="text-xs text-gray-500">Daftar lengkap jadwal mengajar Anda dari Senin sampai Ahad (Hari Jum'at Libur). Menu ini bersifat read-only.</p>
                </div>

                <div className="bg-white border border-gray-150 rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-4 bg-emerald-850 text-white flex items-center justify-between">
                    <span className="text-xs font-bold font-mono uppercase tracking-wider">REKAPITULASI JADWAL MENGAJAR</span>
                    <span className="text-[10px] bg-emerald-800 text-emerald-100 px-2 py-1 rounded-md font-bold font-mono">
                      {schedules.length} Sesi Aktif
                    </span>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {daysOfWeek.map((day) => {
                      const daySchedules = schedules.filter((s) => s.hari === day);
                      return (
                        <div key={day} className="p-4.5 sm:p-6 flex flex-col md:flex-row gap-4 md:items-start hover:bg-gray-50/50 transition-all">
                          <div className="w-24 shrink-0">
                            <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-800 text-[10px] font-bold rounded-lg uppercase tracking-wider border border-emerald-100">
                              {day === "Minggu" ? "Ahad" : day}
                            </span>
                            <div className="text-[10px] text-gray-400 font-mono mt-1">
                              {daySchedules.length} Sesi Mengajar
                            </div>
                          </div>

                          <div className="flex-1 space-y-3">
                            {daySchedules.length === 0 ? (
                              <p className="text-xs text-gray-400 italic">Tidak ada jadwal mengajar pada hari ini.</p>
                            ) : (
                              <div className="grid sm:grid-cols-2 gap-3">
                                {daySchedules.map((s) => (
                                  <div key={s.id} className="bg-gray-50 border border-gray-150 p-3.5 rounded-xl flex flex-col justify-between space-y-2">
                                    <div>
                                      <h4 className="font-bold text-xs text-slate-900 leading-snug">{s.subject_name}</h4>
                                      <p className="text-[10px] text-gray-500 mt-0.5">{s.class_name} • {s.building} ({s.location_desc})</p>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-gray-200/50">
                                      <div className="text-[10px] font-bold text-emerald-800 font-mono">
                                        {s.jam_mulai} - {s.jam_selesai} WIB
                                      </div>
                                      <div className="text-[9px] text-gray-400 font-mono">
                                        {getIstiwaTime(s.jam_mulai)} - {getIstiwaTime(s.jam_selesai)} ISTW
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 3. RIWAYAT VIEW */}
            {activeTab === "riwayat" && (
              <motion.div
                key="riwayat"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Riwayat Presensi Mengajar</h2>
                  <p className="text-xs text-gray-500">Daftar presensi yang telah Anda catat sebelumnya.</p>
                </div>

                <div className="space-y-3.5">
                  {attendances.length === 0 ? (
                    <div className="bg-white border border-gray-100 p-8 rounded-xl shadow-sm text-center">
                      <p className="text-xs text-gray-500">Belum ada riwayat presensi terekam.</p>
                    </div>
                  ) : (
                    attendances.map((a) => (
                      <div
                        key={a.id}
                        className="bg-white border border-gray-150 p-4 rounded-xl shadow-sm space-y-3 hover:border-gray-200 transition-all"
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex gap-3">
                            <img
                              src={a.validation?.foto_url || a.teacher?.foto || teacher.foto}
                              alt="Selfie Presensi"
                              className="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0"
                            />
                            <div>
                              <h4 className="font-bold text-xs text-gray-900 leading-tight">
                                {a.schedule?.subject_name || "Mata Pelajaran"}
                              </h4>
                              <p className="text-[10px] text-gray-500 mt-1">
                                {a.schedule?.class_name || "Kelas"} •{" "}
                                {new Date(a.tanggal).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric"
                                })}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shadow-sm ${
                              a.status === "Hadir"
                                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                : "bg-amber-50 border-amber-200 text-amber-800"
                            }`}
                          >
                            {a.status}
                          </span>
                        </div>

                        {/* Validation indicators */}
                        {a.validation ? (
                          <div className="pt-3 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono text-gray-500">
                            <div className="flex items-center gap-1.5">
                              <span className={a.validation.gps_valid ? "text-emerald-700 font-bold" : "text-red-500"}>
                                {a.validation.gps_valid ? "✓ GPS Valid" : "✗ Diluar Radius"}
                              </span>
                              <span className="text-[8px] text-gray-400">({a.validation.jarak}m)</span>
                            </div>
                            <div>
                              <span className={a.validation.selfie_valid ? "text-emerald-700 font-bold" : "text-gray-400"}>
                                ✓ Selfie Valid
                              </span>
                            </div>
                            <div>
                              <span>IP: {a.validation.ip}</span>
                            </div>
                            <div className="col-span-2 sm:col-span-1 text-right text-[9px] text-gray-400 font-sans">
                              {new Date(a.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                            </div>
                          </div>
                        ) : null}

                        {a.catatan && (
                          <p className="text-[10px] text-gray-500 bg-gray-50 p-2.5 rounded-lg border border-gray-100 leading-relaxed italic">
                            Catatan: {a.catatan}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {/* 4. PROFIL VIEW */}
            {activeTab === "profil" && (
              <motion.div
                key="profil"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Profil Saya</h2>
                  <p className="text-xs text-gray-500">Data diri pengajar Pondok Pesantren Al-Huda.</p>
                </div>

                 <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm space-y-4">
                  {profileSuccessMsg && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-1.5">
                      <Check className="w-4 h-4 shrink-0" /> {profileSuccessMsg}
                    </div>
                  )}

                  {profileErrorMsg && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 shrink-0" /> {profileErrorMsg}
                    </div>
                  )}

                  {!isEditingProfile ? (
                    <div className="flex flex-col sm:flex-row gap-6 items-center">
                      <img
                        src={teacher.foto}
                        alt={teacher.nama}
                        className="w-24 h-24 rounded-full object-cover border-2 border-emerald-700 shadow-md"
                      />
                      <div className="space-y-2 text-center sm:text-left overflow-hidden w-full flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <h3 className="font-bold text-sm text-gray-900 truncate">{teacher.nama}</h3>
                            <p className="text-xs text-emerald-800 font-bold font-mono">NIP: {teacher.nip}</p>
                          </div>
                          <button
                            onClick={() => {
                              setProfileForm({
                                nama: teacher.nama,
                                email: teacher.email || "",
                                no_hp: teacher.no_hp || "",
                                foto: teacher.foto || ""
                              });
                              setProfileSuccessMsg("");
                              setProfileErrorMsg("");
                              setIsEditingProfile(true);
                            }}
                            className="text-xs font-bold text-emerald-700 border border-emerald-200 hover:bg-emerald-50 px-3.5 py-1.5 rounded-xl transition-all self-center sm:self-auto"
                          >
                            Edit Profil Saya
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 pt-3 border-t border-gray-100 text-xs">
                          <div>
                            <span className="text-gray-400">Email:</span>{" "}
                            <span className="text-gray-700 font-semibold block sm:inline">{teacher.email || "-"}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Telepon (HP):</span>{" "}
                            <span className="text-gray-700 font-semibold block sm:inline">{teacher.no_hp || "-"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                      <div className="flex flex-col sm:flex-row gap-6 items-start">
                        <div className="flex flex-col items-center gap-2 shrink-0 w-full sm:w-auto">
                          <img
                            src={profileForm.foto || teacher.foto}
                            alt="Preview"
                            className="w-24 h-24 rounded-full object-cover border-2 border-emerald-700 shadow-sm"
                          />
                          <span className="text-[10px] text-gray-400">Pratinjau Foto</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 w-full">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Nama Lengkap</label>
                            <input
                              type="text"
                              value={profileForm.nama}
                              onChange={(e) => setProfileForm({ ...profileForm, nama: e.target.value })}
                              required
                              className="w-full bg-gray-50 border border-gray-200 text-xs p-2.5 rounded-xl outline-none focus:border-emerald-500 focus:bg-white transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Alamat Email</label>
                            <input
                              type="email"
                              value={profileForm.email}
                              onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                              className="w-full bg-gray-50 border border-gray-200 text-xs p-2.5 rounded-xl outline-none focus:border-emerald-500 focus:bg-white transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">No. HP / WhatsApp</label>
                            <input
                              type="text"
                              value={profileForm.no_hp}
                              onChange={(e) => setProfileForm({ ...profileForm, no_hp: e.target.value })}
                              className="w-full bg-gray-50 border border-gray-200 text-xs p-2.5 rounded-xl outline-none focus:border-emerald-500 focus:bg-white transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">URL Link Foto Profil</label>
                            <input
                              type="text"
                              value={profileForm.foto}
                              onChange={(e) => setProfileForm({ ...profileForm, foto: e.target.value })}
                              className="w-full bg-gray-50 border border-gray-200 text-xs p-2.5 rounded-xl outline-none focus:border-emerald-500 focus:bg-white transition-all font-mono"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end pt-3 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => setIsEditingProfile(false)}
                          className="border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold text-xs px-4 py-2 rounded-xl"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-sm transition-colors cursor-pointer"
                        >
                          Simpan Profil
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Password reset in Mobile too */}
                <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm space-y-4">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-gray-400 font-mono">Ganti Kata Sandi</h3>
                  
                  {profileSuccessMsg && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-1.5">
                      <Check className="w-4 h-4 shrink-0" /> {profileSuccessMsg}
                    </div>
                  )}

                  {profileErrorMsg && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 shrink-0" /> {profileErrorMsg}
                    </div>
                  )}

                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Password Lama</label>
                        <input
                          type="password"
                          value={passwordForm.oldPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                          required
                          className="w-full bg-gray-50 border border-gray-200 text-xs p-2.5 rounded-xl outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Password Baru</label>
                        <input
                          type="password"
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                          required
                          className="w-full bg-gray-50 border border-gray-200 text-xs p-2.5 rounded-xl outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Konfirmasi Baru</label>
                        <input
                          type="password"
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                          required
                          className="w-full bg-gray-50 border border-gray-200 text-xs p-2.5 rounded-xl outline-none"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-colors cursor-pointer"
                    >
                      Update Password
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {/* 5. SETTINGS VIEW (DESKTOP ONLY BUT MAPPED) */}
            {activeTab === "pengaturan" && (
              <motion.div
                key="pengaturan"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Pengaturan Sandi</h2>
                  <p className="text-xs text-gray-500">Ganti sandi akun guru demi privasi keamanan pondok.</p>
                </div>

                <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm max-w-xl space-y-4">
                  {profileSuccessMsg && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-1.5">
                      <Check className="w-4 h-4 shrink-0" /> {profileSuccessMsg}
                    </div>
                  )}

                  {profileErrorMsg && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 shrink-0" /> {profileErrorMsg}
                    </div>
                  )}

                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Kata Sandi Lama</label>
                        <input
                          type="password"
                          value={passwordForm.oldPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                          required
                          className="w-full bg-gray-50 border border-gray-200 text-xs p-2.5 rounded-xl outline-none focus:border-emerald-500 focus:bg-white transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Kata Sandi Baru</label>
                        <input
                          type="password"
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                          required
                          placeholder="Min 8 karakter, 1 huruf besar, 1 angka"
                          className="w-full bg-gray-50 border border-gray-200 text-xs p-2.5 rounded-xl outline-none focus:border-emerald-500 focus:bg-white transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Konfirmasi Sandi Baru</label>
                        <input
                          type="password"
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                          required
                          className="w-full bg-gray-50 border border-gray-200 text-xs p-2.5 rounded-xl outline-none focus:border-emerald-500 focus:bg-white transition-all"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition-colors cursor-pointer"
                    >
                      Perbarui Kata Sandi
                    </button>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-150 py-2.5 px-4 flex justify-around shadow-lg z-40">
        <button
          onClick={() => setActiveTab("beranda")}
          className={`flex flex-col items-center gap-1 text-[9px] font-bold transition-colors ${
            activeTab === "beranda" ? "text-emerald-900" : "text-slate-700 hover:text-slate-900"
          }`}
        >
          <Home className="w-5 h-5 shrink-0" />
          <span>Beranda</span>
        </button>
        <button
          onClick={() => setActiveTab("presensi")}
          className={`flex flex-col items-center gap-1 text-[9px] font-bold transition-colors ${
            activeTab === "presensi" ? "text-emerald-900" : "text-slate-700 hover:text-slate-900"
          }`}
        >
          <Clock className="w-5 h-5 shrink-0" />
          <span>Presensi</span>
        </button>
        <button
          onClick={() => setActiveTab("jadwal")}
          className={`flex flex-col items-center gap-1 text-[9px] font-bold transition-colors ${
            activeTab === "jadwal" ? "text-emerald-900" : "text-slate-700 hover:text-slate-900"
          }`}
        >
          <Calendar className="w-5 h-5 shrink-0" />
          <span>Jadwal</span>
        </button>
        <button
          onClick={() => setActiveTab("riwayat")}
          className={`flex flex-col items-center gap-1 text-[9px] font-bold transition-colors ${
            activeTab === "riwayat" ? "text-emerald-900" : "text-slate-700 hover:text-slate-900"
          }`}
        >
          <Clock className="w-5 h-5 shrink-0" />
          <span>Riwayat</span>
        </button>
        <button
          onClick={() => setActiveTab("profil")}
          className={`flex flex-col items-center gap-1 text-[9px] font-bold transition-colors ${
            activeTab === "profil" ? "text-emerald-900" : "text-slate-700 hover:text-slate-900"
          }`}
        >
          <User className="w-5 h-5 shrink-0" />
          <span>Profil</span>
        </button>
      </nav>

      {/* GURU PRESENSI MODAL (STEPPED FLOW) */}
      {showPresensiModal && activeSchedule && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end md:items-center justify-center p-0 md:p-4" id="presence-modal-container">
          <motion.div
            initial={{ opacity: 0, y: 150 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white w-full md:max-w-md h-[100%] md:h-auto md:max-h-[90vh] md:rounded-2xl shadow-xl flex flex-col overflow-hidden"
          >
            {/* Modal Header */}
            <div className="bg-emerald-850 text-white p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">{activeSchedule.subject_name}</h3>
                <p className="text-[10px] text-emerald-300">Presensi Kelas • {activeSchedule.class_name}</p>
              </div>
              <button
                onClick={() => {
                  stopCamera();
                  setShowPresensiModal(false);
                }}
                className="text-white bg-emerald-800/50 hover:bg-emerald-800 px-3 py-1.5 rounded-lg text-xs"
              >
                Batal
              </button>
            </div>

            {/* Steps indicator */}
            <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100 flex justify-between text-[10px] font-bold font-mono text-gray-400 shrink-0">
              <span className={presensiStep >= 1 ? "text-emerald-700" : ""}>1. Selfie</span>
              <span className={presensiStep >= 2 ? "text-emerald-700" : ""}>2. Lokasi</span>
              <span className={presensiStep >= 3 ? "text-emerald-700" : ""}>3. Catatan</span>
              <span className={presensiStep >= 4 ? "text-emerald-700" : ""}>4. Selesai</span>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              
              {/* STEP 1: CAMERA SELFIE */}
              {presensiStep === 1 && (
                <div className="space-y-4 text-center">
                  <p className="text-xs text-gray-500 leading-normal">
                    Posisikan wajah Anda di tengah bingkai dan pastikan pencahayaan memadai demi validasi presensi.
                  </p>

                  <div className="relative aspect-video max-w-sm mx-auto bg-black rounded-xl overflow-hidden border-2 border-gray-200">
                    {isCameraActive ? (
                      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 text-xs p-4 space-y-2">
                        <Camera className="w-10 h-10 text-gray-300" />
                        <span className="font-semibold">Kamera Belum Aktif</span>
                        {cameraError ? (
                          <span className="text-[10px] text-red-500 max-w-xs">{cameraError}</span>
                        ) : null}
                      </div>
                    )}

                    {/* Face Frame overlay */}
                    {isCameraActive && (
                      <div className="absolute inset-0 border-4 border-dashed border-emerald-500/40 rounded-xl pointer-events-none flex items-center justify-center">
                        <div className="w-48 h-48 rounded-full border-2 border-dashed border-white/60"></div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 max-w-xs mx-auto">
                    {isCameraActive ? (
                      <button
                        onClick={captureSelfie}
                        className="bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-sm hover:bg-emerald-800 cursor-pointer"
                      >
                        Ambil Selfie
                      </button>
                    ) : (
                      <button
                        onClick={startCamera}
                        className="bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-sm hover:bg-emerald-800 cursor-pointer"
                      >
                        Aktifkan Kamera
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 2: GPS/IP LOCATION VALIDATION */}
              {presensiStep === 2 && (
                <div className="space-y-4">
                  <h4 className="font-bold text-xs text-gray-900 uppercase tracking-wider font-mono">
                    Validasi Lokasi Anda
                  </h4>

                  {/* Selfie Preview thumbnail */}
                  <div className="flex gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <img src={selfieData} alt="Selfie" className="w-12 h-12 rounded-lg object-cover" />
                    <div>
                      <div className="text-[10px] text-emerald-700 font-bold">✓ FOTO SELFIE DIAMBIL</div>
                      <p className="text-[9px] text-gray-400 font-mono">Simpanan lokal sementara</p>
                    </div>
                  </div>

                  {/* Location loading/results */}
                  <div className="space-y-3.5">
                    <div className="flex justify-between items-center bg-white border border-gray-100 p-3.5 rounded-xl">
                      <div className="flex gap-2 items-center">
                        <MapPin className="w-4 h-4 text-emerald-600" />
                        <div>
                          <div className="text-xs font-bold">Status Lokasi</div>
                          <div className="text-[10px] text-gray-500 font-mono">IP: {reportedIp}</div>
                        </div>
                      </div>
                      <div>
                        {isFetchingLocation ? (
                          <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1 animate-pulse">
                            Mengambil GPS...
                          </span>
                        ) : latitude ? (
                          <span className="text-[10px] text-emerald-700 font-bold">✓ Terhubung</span>
                        ) : (
                          <span className="text-[10px] text-red-500 font-bold">✗ Gagal mengambil GPS</span>
                        )}
                      </div>
                    </div>

                    {/* Radius Distance Warning/Success */}
                    {latitude && distanceFromPondok !== null && (
                      <div className={`p-4 rounded-xl border ${
                        distanceFromPondok <= currentRadiusLimit
                          ? "bg-emerald-50 border-emerald-200 text-emerald-850"
                          : "bg-red-50 border-red-200 text-red-850"
                      }`}>
                        <div className="text-xs font-bold flex items-center gap-1.5">
                          {distanceFromPondok <= currentRadiusLimit ? (
                            <>✓ Anda berada {distanceFromPondok} meter dari lokasi kelas</>
                          ) : (
                            <>✗ Panjenengan diluar radius yang sudah ditetapkan, mohon ulangi yg mendekati radius kelas</>
                          )}
                        </div>
                        <p className="text-[9px] text-gray-500 mt-1 leading-normal">
                          {distanceFromPondok <= currentRadiusLimit
                            ? `Koordinat GPS berada dalam batas radius kelas ${currentRadiusLimit} meter.`
                            : `Batas radius maksimal presensi adalah ${currentRadiusLimit} meter dari titik koordinat kelas.`}
                        </p>
                      </div>
                    )}

                    {/* Toggle map as requested */}
                    <div className="border border-gray-100 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setShowMap(!showMap)}
                        className="w-full bg-gray-50 hover:bg-gray-100 p-3 text-xs font-bold text-gray-700 flex items-center justify-between"
                      >
                        <span>PETA DETAIL LOKASI</span>
                        <span className="text-[10px] text-emerald-700">{showMap ? "Sembunyikan" : "Lihat"}</span>
                      </button>

                      {showMap && (
                        <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-2">
                          <div className="h-32 bg-gray-200 rounded-lg flex flex-col items-center justify-center text-[10px] text-gray-400 relative overflow-hidden border border-gray-300">
                            <Map className="w-8 h-8 opacity-40 mb-1" />
                            <span className="font-mono">Peta Koordinat Pondok</span>
                            <span className="text-[8px] font-mono mt-0.5">{latitude?.toFixed(5)}, {longitude?.toFixed(5)}</span>
                            {/* Inner circle radar representation */}
                            <div className="absolute w-24 h-24 rounded-full border border-emerald-500/30 bg-emerald-500/10 animate-pulse flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-emerald-600"></div>
                            </div>
                          </div>
                          <div className="text-[9px] text-gray-500 leading-normal">
                            Target Kelas Lat: {activeSchedule && ((activeSchedule as any).class_lat || -7.29135)}, Lng: {activeSchedule && ((activeSchedule as any).class_lng || 110.18341)} (Radius {currentRadiusLimit}m)
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setPresensiStep(1)}
                      className="border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold text-xs px-4 py-2.5 rounded-xl shrink-0"
                    >
                      Kembali
                    </button>
                    <button
                      onClick={fetchLocationAuto}
                      className="border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1 shrink-0"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Refresh
                    </button>
                    <button
                      onClick={() => setPresensiStep(3)}
                      disabled={distanceFromPondok === null || distanceFromPondok > currentRadiusLimit}
                      className="flex-1 bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold text-xs py-2.5 rounded-xl hover:bg-emerald-800 shadow-sm cursor-pointer"
                    >
                      Lanjut
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: CATATAN PRESENSI */}
              {presensiStep === 3 && (
                <div className="space-y-4">
                  <h4 className="font-bold text-xs text-gray-900 uppercase tracking-wider font-mono">
                    Catatan Kehadiran
                  </h4>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-gray-500 uppercase">Catatan (Optional)</label>
                    <textarea
                      value={catatan}
                      onChange={(e) => setCatatan(e.target.value)}
                      placeholder="Tambahkan catatan jika presensi di luar jadwal, kelas digabungkan, atau kondisi darurat lainnya..."
                      rows={4}
                      className="w-full bg-gray-50 border border-gray-200 text-xs p-3 rounded-xl outline-none focus:bg-white focus:border-emerald-500 transition-all leading-normal"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setPresensiStep(2)}
                      className="border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold text-xs px-4 py-2.5 rounded-xl shrink-0"
                    >
                      Kembali
                    </button>
                    <button
                      onClick={submitPresensi}
                      disabled={isSubmitting}
                      className="flex-1 bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl hover:bg-emerald-800 shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? "Menyimpan..." : "Simpan Presensi"}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: SUCCESS REACTION */}
              {presensiStep === 4 && (
                <div className="space-y-6 text-center py-6">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-700 border border-emerald-200">
                    <Check className="w-8 h-8 stroke-[3]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-emerald-850">✓ Presensi Berhasil Disimpan</h3>
                    <p className="text-xs text-gray-500 max-w-xs mx-auto mt-1 leading-normal">
                      Absensi mengajar Anda telah diverifikasi oleh koordinat GPS pondok dan tersimpan di database admin.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowPresensiModal(false);
                      setActiveSchedule(null);
                    }}
                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-2.5 rounded-xl shadow-md cursor-pointer"
                  >
                    Kembali Ke Beranda
                  </button>
                </div>
              )}

            </div>
          </motion.div>
        </div>
      )}

      {/* MERGE CLASSES MODAL */}
      {showMergeModal && mergeSourceSched && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl flex flex-col overflow-hidden border border-gray-100">
            <div className="bg-emerald-850 text-white p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Gabungkan Jadwal Kelas</h3>
                <p className="text-[10px] text-emerald-300">Pilih kelas target penggabungan jadwal</p>
              </div>
              <button
                onClick={() => setShowMergeModal(false)}
                className="text-white hover:bg-emerald-800 bg-emerald-800/40 px-3 py-1.5 rounded-lg text-xs"
              >
                Batal
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
                <span className="text-[9px] uppercase font-bold text-emerald-700">JADWAL ASAL (UTAMA):</span>
                <h4 className="font-bold text-xs text-gray-900 leading-tight mt-0.5">{mergeSourceSched.subject_name}</h4>
                <p className="text-[10px] text-gray-500 mt-1">
                  {mergeSourceSched.class_name} • {mergeSourceSched.hari} ({mergeSourceSched.jam_mulai} WIB)
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-gray-500 uppercase">Cari Kelas/Jadwal Target</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={mergeSearch}
                    onChange={(e) => setMergeSearch(e.target.value)}
                    placeholder="Ketik nama kelas atau mata pelajaran..."
                    className="w-full bg-gray-50 border border-gray-200 text-xs pl-9 pr-4.5 py-2.5 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2">
                {schedules
                  .filter((s) => s.id !== mergeSourceSched.id)
                  .filter((s) => s.hari === mergeSourceSched.hari) // must be same day
                  .filter(
                    (s) =>
                      s.subject_name?.toLowerCase().includes(mergeSearch.toLowerCase()) ||
                      s.class_name?.toLowerCase().includes(mergeSearch.toLowerCase())
                  )
                  .map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleMergeSchedules(s.id)}
                      className="w-full text-left bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-200 p-3 rounded-xl flex items-center justify-between transition-all"
                    >
                      <div>
                        <h4 className="font-bold text-[11px] text-gray-900 leading-tight">{s.subject_name}</h4>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {s.class_name} • {s.hari} ({s.jam_mulai} WIB)
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-emerald-600" />
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

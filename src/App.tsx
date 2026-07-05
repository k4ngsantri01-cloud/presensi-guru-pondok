import React, { useState, useEffect } from "react";
import { Shield, Sparkles, BookOpen, Key, User, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import GuruDashboard from "./components/GuruDashboard";
import AdminDashboard from "./components/AdminDashboard";

export default function App() {
  const [role, setRole] = useState<"guru" | "admin">("guru");
  const [nip, setNip] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active Session states
  const [session, setSession] = useState<{
    role: "guru" | "admin";
    teacherId?: string;
    nama?: string;
    token?: string;
    teacher?: any;
  } | null>(null);

  const [isResolvingTeacher, setIsResolvingTeacher] = useState(false);

  // Check existing session on load
  useEffect(() => {
    const saved = localStorage.getItem("presensi_session");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.role === "guru" && !parsed.teacher) {
          // If session exists but has no teacher object, fetch it
          setIsResolvingTeacher(true);
          fetch("/api/teachers")
            .then((r) => r.json())
            .then((teachers) => {
              const matched = teachers.find((t: any) => t.id === parsed.teacherId);
              if (matched) {
                const updatedSession = { ...parsed, teacher: matched };
                localStorage.setItem("presensi_session", JSON.stringify(updatedSession));
                setSession(updatedSession);
              } else {
                localStorage.removeItem("presensi_session");
              }
            })
            .catch(() => {
              localStorage.removeItem("presensi_session");
            })
            .finally(() => {
              setIsResolvingTeacher(false);
            });
        } else {
          setSession(parsed);
        }
      } catch (e) {
        localStorage.removeItem("presensi_session");
      }
    }
  }, []);

  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (role === "guru" && nip.trim().length >= 3) {
      const delayDebounceFn = setTimeout(() => {
        fetch(`/api/auth/search-teachers?q=${encodeURIComponent(nip)}`)
          .then((res) => res.json())
          .then((data) => {
            setSearchResults(data);
            setShowSuggestions(true);
          })
          .catch(() => setSearchResults([]));
      }, 300);

      return () => clearTimeout(delayDebounceFn);
    } else {
      setSearchResults([]);
      setShowSuggestions(false);
    }
  }, [nip, role]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsSubmitting(true);

    try {
      const payload =
        role === "guru"
          ? { role: "guru", nip, password }
          : { role: "admin", username, password };

      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        const activeSession = {
          role: data.role,
          teacherId: data.teacherId,
          nama: data.nama,
          token: "dummy-jwt-token-pondok-2026",
          teacher: data.teacher
        };
        localStorage.setItem("presensi_session", JSON.stringify(activeSession));
        setSession(activeSession);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "NIP, Username, atau Kata Sandi salah.");
      }
    } catch (err) {
      setErrorMsg("Gagal menghubungi server. Periksa jaringan Anda.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("presensi_session");
    setSession(null);
    setNip("");
    setUsername("");
    setPassword("");
    setErrorMsg("");
  };

  // If resolving, show a clean indicator
  if (isResolvingTeacher) {
    return (
      <div className="min-h-screen bg-[#F0F2EB] flex items-center justify-center text-xs font-mono text-emerald-800 animate-pulse">
        Menghubungkan Sesi Guru...
      </div>
    );
  }

  // If logged in, route to appropriate view
  if (session) {
    if (session.role === "admin") {
      return <AdminDashboard onLogout={handleLogout} />;
    } else if (session.teacher) {
      return (
        <GuruDashboard
          teacher={session.teacher}
          onLogout={handleLogout}
          onUpdateTeacher={(updatedTeacher: any) => {
            const updatedSession = { ...session, teacher: updatedTeacher };
            localStorage.setItem("presensi_session", JSON.stringify(updatedSession));
            setSession(updatedSession);
          }}
        />
      );
    }
  }

  return (
    <div className="min-h-screen bg-[#F0F2EB] flex items-center justify-center p-4 relative overflow-hidden text-gray-800" id="auth-portal">
      {/* Decorative Islamic Background Grid / Shapes */}
      <div className="absolute inset-0 bg-radial from-emerald-500/5 to-transparent pointer-events-none" />

      <div className="w-full max-w-md bg-white border border-gray-150/80 rounded-3xl shadow-xl p-6 md:p-8 space-y-6 relative z-10">
        
        {/* Logo / Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-emerald-700 rounded-2xl flex items-center justify-center text-white mx-auto shadow-md">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-950 tracking-tight">Presensi Guru Pondok</h1>
            <p className="text-xs text-gray-400 font-medium">Sistem Informasi Kehadiran Pengajar Terpadu</p>
          </div>
        </div>

        {/* Tab Role Switcher */}
        <div className="grid grid-cols-2 p-1 bg-[#F4F6F0] rounded-2xl border border-gray-100">
          <button
            onClick={() => {
              setRole("guru");
              setErrorMsg("");
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              role === "guru" ? "bg-white text-emerald-800 shadow-xs" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            Portal Guru
          </button>
          <button
            onClick={() => {
              setRole("admin");
              setErrorMsg("");
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              role === "admin" ? "bg-white text-emerald-800 shadow-xs" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            Portal Admin
          </button>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-100 text-red-600 text-xs p-3 rounded-xl font-medium"
            >
              {errorMsg}
            </motion.div>
          )}

          {role === "guru" ? (
            <div className="space-y-3">
              <div className="relative">
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Nama Guru / NIP Guru
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    onFocus={() => { if (searchResults.length > 0) setShowSuggestions(true); }}
                    required
                    placeholder="Ketik minimal 3 huruf nama / NIP..."
                    className="w-full bg-gray-50 border border-gray-150 pl-9 pr-4 py-3 rounded-xl text-xs outline-none focus:border-emerald-500 focus:bg-white transition-colors"
                  />
                  {showSuggestions && searchResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden max-h-60 overflow-y-auto">
                      {searchResults.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onMouseDown={() => {
                            setNip(t.nama);
                            setShowSuggestions(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs hover:bg-emerald-50 hover:text-emerald-800 transition-colors border-b last:border-b-0 border-gray-100 flex justify-between items-center"
                        >
                          <span className="font-semibold text-slate-800">{t.nama}</span>
                          <span className="text-[10px] text-gray-400 font-mono">NIP: {t.nip}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Email Admin
                </label>
                <div className="relative">
                  <Shield className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="admin@pondok.com"
                    className="w-full bg-gray-50 border border-gray-150 pl-9 pr-4 py-3 rounded-xl text-xs outline-none focus:border-emerald-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Common Password input */}
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Kata Sandi (Password)
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-gray-50 border border-gray-150 pl-9 pr-10 py-3 rounded-xl text-xs outline-none focus:border-emerald-500 focus:bg-white transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-800/60 text-white font-bold py-3.5 rounded-xl shadow-md transition-colors text-xs flex items-center justify-center gap-1 cursor-pointer"
          >
            {isSubmitting ? "Memproses..." : "Masuk Sistem"}
          </button>
        </form>

        {/* Demo Helper box */}
        <div className="bg-emerald-50/50 border border-emerald-100/50 p-4 rounded-2xl text-[11px] space-y-1.5 text-emerald-800">
          <div className="font-bold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Akun Demo Pengujian:
          </div>
          <div className="space-y-1">
            <div>• <strong className="font-semibold text-emerald-950">Guru</strong>: Muhammad Hasan | Password: <code className="bg-emerald-100/80 px-1 rounded text-emerald-950 font-mono text-[10px]">muhammadhasan</code></div>
            <div>• <strong className="font-semibold text-emerald-950">Admin</strong>: admin@pondok.com | Password: <code className="bg-emerald-100/80 px-1 rounded text-emerald-950 font-mono text-[10px]">Admin123</code></div>
          </div>
        </div>

      </div>
    </div>
  );
}

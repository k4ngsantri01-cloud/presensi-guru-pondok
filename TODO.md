# TODO - Fix Bug/Crash & Stabilitas

## Step 1: Audit cepat (selesai)
- [x] Identifikasi potensi bug utama dari server.ts: GPS check, status stats, selfie_valid, penggunaan db global di /api/diagnostic, dan ketiadaan global error handler.

## Step 2: Implement fix crash-proof (sedang dikerjakan)
- [x] Edit `server.ts`:
  - [x] Perbaiki `/api/attendance`: GPS check dari `latitude && longitude` menjadi `latitude !== undefined && longitude !== undefined`.
  - [x] Perbaiki `/api/attendance`: `selfie_valid` menjadi robust untuk tipe string (non-empty trimmed).
  - [x] Perbaiki `/api/stats`: normalisasi status (mis. `pending_verification` dihitung sebagai Pending).
  - [x] Perbaiki `/api/diagnostic`: hapus ketergantungan `db` global, gunakan `const state = loadDB()` di dalam handler.
  - [x] Tambah global Express error handler untuk menangkap error tak tertangkap.


## Step 3: Testing minimum (belum)
- [ ] Jalankan `npm run lint` (terkendala environment cmd/powershell; akan dilakukan setelah memastikan terminal command berjalan normal).
- [ ] Jalankan `npm run dev` dan cek endpoint-level sanity (diagnostic, attendance, stats).



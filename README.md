# MedMemory - Pengingat Terapi Peserta JKN

MedMemory adalah MVP mobile app untuk Healthkathon JKN yang membantu peserta terapi rutin (mis. Prolanis) menjaga kepatuhan minum obat, berbagi progres kepada keluarga, dan menyederhanakan integrasi dengan layanan JKN yang sudah ada. Aplikasi ini dibangun menggunakan Expo Router, React Native 0.81, MongoDB sebagai database, dan desain minimalis dengan dukungan mode terang/gelap.

## Fitur Utama

- Pengingat obat terjadwal dengan notifikasi sebelum, saat, dan setelah waktu minum obat.
- Pencatatan konsumsi obat harian, termasuk visualisasi grafik kepatuhan.
- Fitur Caregiver, memungkinkan keluarga menerima notifikasi jika pasien belum mengonfirmasi konsumsi obat.

## Struktur Proyek

- `app/` - Rute file-based (home, profile, settings, dan konfigurasi tabs/stack).
- `src/theme/` - Context theme dengan token warna, tipografi Geist, dan gradient biru-hijau yang disesuaikan.
- `src/components/` - Komponen UI tematik (Surface, SectionHeader, GradientChip, ProgressBar, shimmer loaders, dsb.).
- `src/services/` - MongoDB connection layer dan data fetching functions.

## Menjalankan Aplikasi

```bash
npm install
npm run lint   # opsional tapi direkomendasikan
npm start      # membuka Expo DevTools
```

Setelah `npm start`, Anda bisa membuka aplikasi via **Expo Go**, emulator Android/iOS, atau development build sesuai kebutuhan healthkathon.

## Database MongoDB

Aplikasi terhubung ke MongoDB Atlas cluster:
- **Connection String**: `mongodb+srv://s22210335_db_user:0hN3RhniEt26nNsD@medmemory-db.bgd0e16.mongodb.net/?appName=medmemory-db`
- **Database Name**: `medmemory`
- **Collections**: `reminders`, `users`, `caregivers`

Data ditarik secara real-time dengan shimmer loading states untuk pengalaman yang smooth.

## Catatan Pengembangan

- Tema default mengikuti mode sistem, tetapi pengguna dapat mengganti mode lewat layar Settings.
- Semua warna sekunder menggunakan gradient hijau → biru yang disesuaikan untuk light mode (#16A085 → #2874A6) agar tidak terlalu terang.
- Font Geist diload via expo-font dan diterapkan secara global melalui theme context.
- Untuk memperluas fitur (mis. push notifications atau offline sync), tambahkan service baru di `src/services/` dan injeksikan lewat hooks/context.

Selamat bereksperimen dan semoga sukses di Healthkathon JKN!

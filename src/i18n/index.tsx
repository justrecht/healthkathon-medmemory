import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export type Language = "id" | "en";

const LANGUAGE_KEY = "user-language";

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string, params?: { [key: string]: string | number }) => string;
};

type Translations = {
  [key in Language]: {
    [key: string]: string;
  };
};

const translations: Translations = {
  id: {
    settings: "Pengaturan",
    appearance: "Tampilan",
    chooseTheme: "Pilih tema aplikasi",
    themeMode: "Mode tema",
    darkModeActive: "Mode gelap aktif",
    lightModeActive: "Mode terang aktif",
    dark: "Gelap",
    light: "Terang",
    reminders: "Pengingat",
    reminderNotifications: "Notifikasi pengingat obat",
    notificationBefore: "Notifikasi sebelum jadwal",
    sent30MinBefore: "Dikirim 30 menit sebelumnya",
    clearCache: "Hapus Cache Notifikasi",
    fixDoubleNotif: "Perbaiki masalah notifikasi ganda",
    signOut: "Keluar",
    signOutDesc: "Keluar dari akun Anda",
    signOutTitle: "Keluar dari Akun",
    signOutConfirm: "Apakah Anda yakin ingin keluar? Anda akan keluar dari sesi ini dan perlu masuk kembali untuk mengakses aplikasi.",
    cancel: "Batal",
    signOutSuccessTitle: "Berhasil Keluar",
    signOutSuccessDesc: "Anda telah berhasil keluar dari akun. Sampai jumpa!",
    signOutFailTitle: "Gagal Keluar",
    signOutFailDesc: "Terjadi kesalahan saat keluar. Silakan coba lagi.",
    clearCacheTitle: "Hapus Cache Notifikasi",
    clearCacheConfirm: "Ini akan menghapus semua data notifikasi yang tersimpan di perangkat. Lanjutkan?",
    delete: "Hapus",
    success: "Sukses",
    cacheCleared: "Cache notifikasi berhasil dihapus",
    language: "Bahasa",
    chooseLanguage: "Pilih bahasa aplikasi",
    indonesian: "Bahasa Indonesia",
    english: "English",
    ok: "OK",
    // Login
    createAccount: "Buat Akun Baru",
    login: "Masuk",
    registerDesc: "Daftar untuk mulai memantau kesehatan.",
    loginDesc: "Masuk untuk mengakses akun Anda.",
    fullName: "Nama Lengkap",
    patient: "Pasien",
    caregiver: "Pendamping",
    email: "Email",
    password: "Kata Sandi",
    registerNow: "Daftar Sekarang",
    alreadyHaveAccount: "Sudah punya akun? ",
    dontHaveAccount: "Belum punya akun? ",
    register: "Daftar",
    passwordRequirement: "Password minimal 8 karakter, dengan huruf besar dan angka.",
    // Home
    home: "Beranda",
    confirmMedication: "Konfirmasi Minum Obat",
    haveYouTakenMeds: "Apakah Anda sudah minum obat?",
    notYet: "Belum",
    already: "Udah",
    requestSent: "Permintaan Terkirim",
    waitingConfirmation: "Menunggu konfirmasi dari pasien",
    failed: "Gagal",
    failedToSendRequest: "Gagal mengirim permintaan",
    error: "Error",
    errorOccurred: "Terjadi kesalahan",
    connected: "Terhubung",
    rejected: "Ditolak",
    connectedWithCaregiver: "Anda sekarang terhubung dengan caregiver",
    requestRejected: "Permintaan ditolak",
    failedProcessRequest: "Gagal memproses permintaan",
    fillRequiredFields: "Isi dulu semua field yang diperlukan ya",
    medicationAdded: "Pengingat obat udah berhasil ditambahkan!",
    failedToAdd: "Gagal menambahkan pengingat. Coba lagi ya!",
    saveChanges: "Simpan Perubahan?",
    confirmSaveChanges: "Yakin mau simpan perubahan jadwal obat ini?",
    save: "Simpan",
    changesSaved: "Perubahan pengingat sudah disimpan",
    failedToSave: "Gagal menyimpan perubahan",
    failedToLoadHistory: "Gagal memuat riwayat konsumsi nih",
    failedToConfirm: "Gagal konfirmasi konsumsi obat nih",
    reminderDeleted: "Pengingat sudah dihapus",
    failedToDelete: "Gagal menghapus pengingat",
    deleteReminder: "Hapus Pengingat",
    confirmDeleteReminder: "Yakin mau hapus jadwal {title}?",
    tooEarly: "Terlalu Cepat?",
    confirmTooEarly: "Jadwal obat ini jam {time}. Yakin udah diminum sekarang?",
    yesAlready: "Ya, Sudah",
    summary: "Ringkasan",
    caregiverMode: "Mode Caregiver",
    monitoringPatients: "Memantau {count} Pasien",
    connectedPatients: "Pasien Terhubung",
    add: "Tambah",
    noConnectedPatients: "Belum ada pasien terhubung",
    connectPatientsDesc: "Hubungkan pasien untuk memantau pengobatan mereka",
    connectPatient: "Hubungkan Pasien",
    todayAdherence: "Kepatuhan Hari Ini",
    keepConsistent: "Tetap konsisten ya!",
    achieved: "tercapai",
    doses: "{taken} dari {total} dosis",
    todaySchedule: "Jadwal Hari Ini",
    takenToday: "Diminum Hari Ini",
    connectionRequests: "Permintaan Koneksi",
    reject: "Tolak",
    accept: "Terima",
    nextDose: "Dosis Berikutnya",
    today: "hari ini",
    alreadyTakenMeds: "Udah minum obat",
    noReminders: "Belum ada pengingat",
    addReminderDesc: "Yuk, tambahin pengingat kamu untuk hari ini!",
    timeline: "Timeline",
    last7Days: "7 Hari Terakhir",
    noData: "Belum ada data",
    startTakingMeds: "Mulai minum obat buat lihat timeline",
    medicationSchedule: "Jadwal Obat",
    seeAll: "Lihat Semua",
    noSchedule: "Belum ada jadwal",
    addReminderToSee: "Tambahin pengingat obat buat lihat jadwal",
    active: "Aktif",
    noCaregiverConnected: "Belum ada caregiver terhubung",
    consumptionHistory: "Riwayat konsumsi",
    deleteAllHistory: "Hapus Semua Riwayat",
    confirmDeleteAllHistory: "Yakin mau hapus semua riwayat konsumsi obat? Tindakan ini tidak bisa dibatalkan.",
    deleteAll: "Hapus Semua",
    allHistoryDeleted: "Semua riwayat sudah dihapus",
    failedToDeleteHistory: "Gagal menghapus riwayat",
    // Profile
    profile: "Profil",
    notSignedIn: "Belum masuk",
    signInToViewProfile: "Silakan masuk untuk melihat profil Anda.",
    goToLogin: "Ke Halaman Login",
    patientInfo: "Informasi Pasien",
    consistency: "Konsistensi",
    activeMeds: "Obat aktif",
    scheduled: "Terjadwal",
    // Patient Detail
    patientDetail: "Detail Pasien",
    weeklySummary: "Ringkasan Mingguan",
    medsTaken: "Obat Diminum",
    missed: "Terlewat",
    activeReminders: "Pengingat aktif pasien",
    noDays: "Tidak ada hari",
    everyDay: "Setiap hari",
    shortDays: "Min,Sen,Sel,Rab,Kam,Jum,Sab",
    allReminders: "Semua Pengingat",
    remindersCount: "{{count}} pengingat",
    recentHistory: "Riwayat Terakhir",
    consumptionActivity: "Aktivitas konsumsi obat",
    noHistory: "Belum ada riwayat",
    taken: "Diminum",
    // Add Medication Modal
    editReminder: "Ubah Pengingat Obat",
    addReminder: "Tambah Pengingat Obat",
    medicationName: "Nama Obat",
    medicationNamePlaceholder: "Contoh: Metformin",
    dosage: "Dosis",
    dosagePlaceholder: "Contoh: 500",
    consumptionTime: "Waktu Minum Obat",
    setCustomTime: "Atur Waktu Kustom",
    selectedTime: "Waktu terpilih",
    changeTime: "Ubah Waktu",
    backToPresets: "Kembali ke Preset",
    repeatDays: "Ulangi Hari",
    notesOptional: "Catatan (Opsional)",
    notesPlaceholder: "Catatan tambahan...",
    saveReminder: "Simpan Pengingat",
    morning: "Pagi",
    breakfast: "Sarapan",
    noon: "Siang",
    afternoon: "Sore",
    evening: "Malam",
    bedtime: "Tidur",
    afterWakeUp: "Setelah bangun",
    atBreakfast: "Saat makan pagi",
    atLunch: "Saat makan siang",
    afternoonTime: "Sore hari",
    atDinner: "Saat makan malam",
    beforeSleep: "Sebelum tidur",
    // Confirm Medication Modal
    haveYouTakenMedicationName: "Apakah Anda sudah minum obat {medicationName}?",
    // Connect Patient Modal
    enterPatientEmail: "Masukkan email pasien untuk terhubung",
    patientEmail: "Email Pasien",
    emailPlaceholder: "contoh@email.com",
    sending: "Mengirim...",
    sendRequest: "Kirim Permintaan",
    // Medication History Modal
    late: "Terlambat",
    recordsCount: "{count} catatan",
    scheduledAt: "Dijadwalkan: {time}",
    takenAt: "Diminum: {time}",
    noHistoryTitle: "Belum ada riwayat",
    noHistorySubtitle: "Riwayat konsumsi obat akan muncul di sini setelah Anda mulai mengonfirmasi minum obat",
    
    // Notifications
    notifTimeTitle: "⏰ Waktunya Minum Obat!",
    notifTimeBody: "{title} - {dosage}",
    notifAfterTitle: "❗ Udah minum obat belum?",
    notifAfterBody: "Jangan lupa konfirmasi konsumsi {title} ya!",
    notifBeforeTitle: "🔔 Pengingat Obat",
    notifBeforeBody: "{title} ({dosage}) dalam 30 menit",
    
    // Caregiver Notifications
    caregiverMissedMessage: "{patientName} melewatkan jadwal minum obat {medicationName} pada {scheduledTime}",
    caregiverAlertTitle: "🚨 Pasien Melewatkan Obat",
    caregiverAlertBody: "{patientName} belum minum {medicationName} yang dijadwalkan jam {scheduledTime}",
    caregiverCheckTitle: "⚠️ Cek Status Pasien",
    caregiverCheckBody: "Waktu untuk cek apakah pasien {patientName} sudah minum {medicationName}",
    testNotifTitle: "✅ Notifikasi Berfungsi!",
    testNotifBody: "Ini adalah notifikasi test. Sistem notifikasi udah jalan dengan baik!",
    
    // Auth Errors
    authInvalidEmail: "Email tidak valid",
    authUserNotFound: "Email tidak ditemukan. Silakan daftar terlebih dahulu",
    authWrongPassword: "Password salah",
    authInvalidCredentials: "Email atau password salah",
    authUserDisabled: "Akun ini telah dinonaktifkan",
    authTooManyRequests: "Terlalu banyak percobaan login. Silakan coba lagi nanti",
    authEmailInUse: "Email sudah terdaftar",
    authWeakPassword: "Password terlalu lemah. Gunakan minimal 6 karakter",
    authOperationNotAllowed: "Operasi ini tidak diizinkan",
    authNetworkFailed: "Jaringan tidak stabil. Periksa koneksi internet Anda",
    authUnknownError: "Terjadi kesalahan. Silakan coba lagi",
    
    // Caregiver Service Errors
    caregiverUserNotFound: "Pengguna tidak ditemukan",
    caregiverNotPatient: "Pengguna bukan pasien",
    caregiverRequestPending: "Permintaan sudah terkirim",
    caregiverAlreadyConnected: "Sudah terhubung dengan pasien ini",
    caregiverRequestNotFound: "Permintaan tidak ditemukan",
  },
  en: {
    settings: "Settings",
    appearance: "Appearance",
    chooseTheme: "Choose app theme",
    themeMode: "Theme mode",
    darkModeActive: "Dark mode active",
    lightModeActive: "Light mode active",
    dark: "Dark",
    light: "Light",
    reminders: "Reminders",
    reminderNotifications: "Medication reminder notifications",
    notificationBefore: "Notification before schedule",
    sent30MinBefore: "Sent 30 minutes before",
    clearCache: "Clear Notification Cache",
    fixDoubleNotif: "Fix double notification issues",
    signOut: "Sign Out",
    signOutDesc: "Sign out from your account",
    signOutTitle: "Sign Out",
    signOutConfirm: "Are you sure you want to sign out? You will be signed out of this session and need to sign in again to access the app.",
    cancel: "Cancel",
    signOutSuccessTitle: "Signed Out Successfully",
    signOutSuccessDesc: "You have successfully signed out. See you!",
    signOutFailTitle: "Sign Out Failed",
    signOutFailDesc: "An error occurred while signing out. Please try again.",
    clearCacheTitle: "Clear Notification Cache",
    clearCacheConfirm: "This will clear all notification data stored on the device. Continue?",
    delete: "Clear",
    success: "Success",
    cacheCleared: "Notification cache successfully cleared",
    language: "Language",
    chooseLanguage: "Choose app language",
    indonesian: "Bahasa Indonesia",
    english: "English",
    ok: "OK",
    // Login
    createAccount: "Create New Account",
    login: "Login",
    registerDesc: "Register to start monitoring health.",
    loginDesc: "Login to access your account.",
    fullName: "Full Name",
    patient: "Patient",
    caregiver: "Caregiver",
    email: "Email",
    password: "Password",
    registerNow: "Register Now",
    alreadyHaveAccount: "Already have an account? ",
    dontHaveAccount: "Don't have an account? ",
    register: "Register",
    passwordRequirement: "Password must be at least 8 characters, with uppercase and number.",
    // Home
    home: "Home",
    confirmMedication: "Confirm Medication",
    haveYouTakenMeds: "Have you taken your medication?",
    notYet: "Not Yet",
    already: "Already",
    requestSent: "Request Sent",
    waitingConfirmation: "Waiting for patient confirmation",
    failed: "Failed",
    failedToSendRequest: "Failed to send request",
    error: "Error",
    errorOccurred: "An error occurred",
    connected: "Connected",
    rejected: "Rejected",
    connectedWithCaregiver: "You are now connected with caregiver",
    requestRejected: "Request rejected",
    failedProcessRequest: "Failed to process request",
    fillRequiredFields: "Please fill in all required fields",
    medicationAdded: "Medication reminder added successfully!",
    failedToAdd: "Failed to add reminder. Please try again!",
    saveChanges: "Save Changes?",
    confirmSaveChanges: "Are you sure you want to save changes to this medication schedule?",
    save: "Save",
    changesSaved: "Reminder changes saved",
    failedToSave: "Failed to save changes",
    failedToLoadHistory: "Failed to load consumption history",
    failedToConfirm: "Failed to confirm medication consumption",
    reminderDeleted: "Reminder deleted",
    failedToDelete: "Failed to delete reminder",
    deleteReminder: "Delete Reminder",
    confirmDeleteReminder: "Are you sure you want to delete schedule for {title}?",
    tooEarly: "Too Early?",
    confirmTooEarly: "This medication is scheduled for {time}. Are you sure you took it now?",
    yesAlready: "Yes, Already",
    summary: "Summary",
    caregiverMode: "Caregiver Mode",
    monitoringPatients: "Monitoring {count} Patients",
    connectedPatients: "Connected Patients",
    add: "Add",
    noConnectedPatients: "No connected patients yet",
    connectPatientsDesc: "Connect patients to monitor their medication",
    connectPatient: "Connect Patient",
    todayAdherence: "Today's Adherence",
    keepConsistent: "Keep it consistent!",
    achieved: "achieved",
    doses: "{taken} of {total} doses",
    todaySchedule: "Today's Schedule",
    takenToday: "Taken Today",
    connectionRequests: "Connection Requests",
    reject: "Reject",
    accept: "Accept",
    nextDose: "Next Dose",
    today: "today",
    alreadyTakenMeds: "Already took meds",
    noReminders: "No reminders yet",
    addReminderDesc: "Let's add your reminder for today!",
    timeline: "Timeline",
    last7Days: "Last 7 Days",
    noData: "No data yet",
    startTakingMeds: "Start taking meds to see timeline",
    medicationSchedule: "Medication Schedule",
    seeAll: "See All",
    noSchedule: "No schedule yet",
    addReminderToSee: "Add medication reminder to see schedule",
    active: "Active",
    noCaregiverConnected: "No caregiver connected yet",
    consumptionHistory: "Consumption history",
    deleteAllHistory: "Delete All History",
    confirmDeleteAllHistory: "Are you sure you want to delete all medication history? This action cannot be undone.",
    deleteAll: "Delete All",
    allHistoryDeleted: "All history deleted",
    failedToDeleteHistory: "Failed to delete history",
    // Profile
    profile: "Profile",
    notSignedIn: "Not signed in",
    signInToViewProfile: "Please sign in to view your profile.",
    goToLogin: "Go to Login Page",
    patientInfo: "Patient Information",
    consistency: "Consistency",
    activeMeds: "Active Meds",
    scheduled: "Scheduled",
    // Patient Detail
    patientDetail: "Patient Detail",
    weeklySummary: "Weekly Summary",
    medsTaken: "Meds Taken",
    missed: "Missed",
    activeReminders: "Patient's active reminders",
    noDays: "No days",
    everyDay: "Every day",
    shortDays: "Sun,Mon,Tue,Wed,Thu,Fri,Sat",
    allReminders: "All Reminders",
    remindersCount: "{{count}} reminders",
    recentHistory: "Recent History",
    consumptionActivity: "Medication consumption activity",
    noHistory: "No history yet",
    taken: "Taken",
    // Add Medication Modal
    editReminder: "Edit Medication Reminder",
    addReminder: "Add Medication Reminder",
    medicationName: "Medication Name",
    medicationNamePlaceholder: "Example: Metformin",
    dosage: "Dosage",
    dosagePlaceholder: "Example: 500",
    consumptionTime: "Consumption Time",
    setCustomTime: "Set Custom Time",
    selectedTime: "Selected time",
    changeTime: "Change Time",
    backToPresets: "Back to Presets",
    repeatDays: "Repeat Days",
    notesOptional: "Notes (Optional)",
    notesPlaceholder: "Additional notes...",
    saveReminder: "Save Reminder",
    morning: "Morning",
    breakfast: "Breakfast",
    noon: "Noon",
    afternoon: "Afternoon",
    evening: "Evening",
    bedtime: "Bedtime",
    afterWakeUp: "After waking up",
    atBreakfast: "At breakfast",
    atLunch: "At lunch",
    afternoonTime: "In the afternoon",
    atDinner: "At dinner",
    beforeSleep: "Before sleep",
    // Confirm Medication Modal
    haveYouTakenMedicationName: "Have you taken {medicationName}?",
    // Connect Patient Modal
    enterPatientEmail: "Enter patient email to connect",
    patientEmail: "Patient Email",
    emailPlaceholder: "example@email.com",
    sending: "Sending...",
    sendRequest: "Send Request",
    // Medication History Modal
    late: "Late",
    recordsCount: "{count} records",
    scheduledAt: "Scheduled: {time}",
    takenAt: "Taken: {time}",
    noHistoryTitle: "No history yet",
    noHistorySubtitle: "Medication history will appear here after you start confirming medication",
    
    // Notifications
    notifTimeTitle: "⏰ Time to take medication!",
    notifTimeBody: "{title} - {dosage}",
    notifAfterTitle: "❗ Have you taken your meds?",
    notifAfterBody: "Don't forget to confirm {title} consumption!",
    notifBeforeTitle: "🔔 Medication Reminder",
    notifBeforeBody: "{title} ({dosage}) in 30 minutes",
    
    // Caregiver Notifications
    caregiverMissedMessage: "{patientName} missed {medicationName} scheduled at {scheduledTime}",
    caregiverAlertTitle: "🚨 Patient Missed Medication",
    caregiverAlertBody: "{patientName} hasn't taken {medicationName} scheduled at {scheduledTime}",
    caregiverCheckTitle: "⚠️ Check Patient Status",
    caregiverCheckBody: "Time to check if patient {patientName} has taken {medicationName}",
    testNotifTitle: "✅ Notifications Working!",
    testNotifBody: "This is a test notification. Notification system is working properly!",
    
    // Auth Errors
    authInvalidEmail: "Invalid email",
    authUserNotFound: "Email not found. Please register first",
    authWrongPassword: "Wrong password",
    authInvalidCredentials: "Invalid email or password",
    authUserDisabled: "This account has been disabled",
    authTooManyRequests: "Too many login attempts. Please try again later",
    authEmailInUse: "Email already in use",
    authWeakPassword: "Password too weak. Use at least 6 characters",
    authOperationNotAllowed: "Operation not allowed",
    authNetworkFailed: "Network unstable. Check your internet connection",
    authUnknownError: "An error occurred. Please try again",
    
    // Caregiver Service Errors
    caregiverUserNotFound: "User not found",
    caregiverNotPatient: "User is not a patient",
    caregiverRequestPending: "Request already pending",
    caregiverAlreadyConnected: "Already connected to this patient",
    caregiverRequestNotFound: "Request not found",
  },
};

let currentLanguage: Language = "id";

export const t_static = (key: string, params?: { [key: string]: string | number }) => {
  let text = translations[currentLanguage][key] || key;
  if (params) {
    Object.keys(params).forEach((param) => {
      text = text.replace(`{${param}}`, String(params[param]));
    });
  }
  return text;
};

export const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("id");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const storedLang = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (storedLang === "en" || storedLang === "id") {
        setLanguageState(storedLang);
        currentLanguage = storedLang;
      }
    } catch (error) {
      console.error("Failed to load language", error);
    } finally {
      setIsLoaded(true);
    }
  };

  const setLanguage = async (lang: Language) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, lang);
      setLanguageState(lang);
      currentLanguage = lang;
    } catch (error) {
      console.error("Failed to save language", error);
    }
  };

  const t = (key: string, params?: { [key: string]: string | number }) => {
    let text = translations[language][key] || key;
    if (params) {
      Object.keys(params).forEach((param) => {
        text = text.replace(`{${param}}`, String(params[param]));
      });
    }
    return text;
  };

  if (!isLoaded) {
    return null; // Or a loading spinner
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

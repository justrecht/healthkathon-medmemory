export type MedicationReminder = {
  id: string;
  name: string;
  dosage: string;
  time: string;
  status: "scheduled" | "taken" | "missed";
  notes?: string;
};

export type CaregiverAlert = {
  id: string;
  name: string;
  relation: string;
  status: string;
  timestamp: string;
};

export const todaysReminders: MedicationReminder[] = [
  {
    id: "1",
    name: "Metformin",
    dosage: "500 mg",
    time: "07:00",
    status: "taken",
    notes: "Diminum setelah sarapan",
  },
  {
    id: "2",
    name: "Amlodipine",
    dosage: "10 mg",
    time: "13:00",
    status: "scheduled",
  },
  {
    id: "3",
    name: "Insulin Basal",
    dosage: "14 unit",
    time: "21:00",
    status: "scheduled",
    notes: "Gunakan pena insulin biru",
  },
];

export const adherenceHighlights = {
  adherencePercent: 92,
  missedThisWeek: 1,
  streakDays: 8,
};

export const caregiverAlerts: CaregiverAlert[] = [
  {
    id: "cg-1",
    name: "Anisa Pratiwi",
    relation: "Putri",
    status: "Konfirmasi konsumsi insulin",
    timestamp: "09:12",
  },
  {
    id: "cg-2",
    name: "Puskesmas Setiabudi",
    relation: "Faskes",
    status: "Telekonsultasi 19.00 WIB",
    timestamp: "Kemarin",
  },
];

export const quickActions = [
  { id: "rx", label: "Tambah Obat" },
  { id: "bp", label: "Catat Tekanan Darah" },
  { id: "lab", label: "Upload Resep" },
  { id: "care", label: "Hubungi Caregiver" },
];

export type Reminder = {
  id: string;
  title: string;
  time: string;
  dosage: string;
  notes: string;
  status: "scheduled" | "taken" | "missed";
};

export const reminders: Reminder[] = [
  {
    id: "1",
    title: "Metformin",
    time: "07:00",
    dosage: "500 mg",
    notes: "Sesudah sarapan",
    status: "taken",
  },
  {
    id: "2",
    title: "Amlodipine",
    time: "13:00",
    dosage: "10 mg",
    notes: "Ingat cek tekanan darah",
    status: "scheduled",
  },
  {
    id: "3",
    title: "Vitamin D3",
    time: "21:00",
    dosage: "1 tablet",
    notes: "Sebelum tidur",
    status: "scheduled",
  },
];

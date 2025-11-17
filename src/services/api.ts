// MongoDB Data API endpoint - replace with your actual Data API URL
// For now using mock data until backend API is set up
// To enable real MongoDB: deploy a serverless function or use MongoDB Atlas Data API

const API_BASE_URL = "https://your-api-endpoint.com/api"; // Replace with actual backend
const USE_MOCK_DATA = true; // Set to false when backend is ready

// Mock data for development
const mockReminders = [
  {
    id: "1",
    title: "Metformin",
    time: "07:00",
    dosage: "500 mg",
    notes: "Sesudah sarapan",
    status: "taken" as const,
  },
  {
    id: "2",
    title: "Amlodipine",
    time: "13:00",
    dosage: "10 mg",
    notes: "Ingat cek tekanan darah",
    status: "scheduled" as const,
  },
  {
    id: "3",
    title: "Vitamin D3",
    time: "21:00",
    dosage: "1 tablet",
    notes: "Sebelum tidur",
    status: "scheduled" as const,
  },
];

const mockUserProfile = {
  name: "Siti Rahmawati",
  program: "Peserta JKN - Prolanis",
  adherence: "94%",
  activeMeds: "3",
  visits: "2",
};

const mockCaregivers = [
  {
    id: "1",
    name: "Rina Mulyani",
    role: "Caregiver",
    contact: "Anak",
    status: "active",
  },
  {
    id: "2",
    name: "dr. Dedi Pratama",
    role: "Dokter",
    contact: "Klinik Pratama JKN",
    status: "registered",
  },
];

export async function getReminders() {
  if (USE_MOCK_DATA) {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800));
    return mockReminders;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/reminders`);
    if (!response.ok) throw new Error("Failed to fetch reminders");
    return await response.json();
  } catch (error) {
    console.error("Error fetching reminders:", error);
    return mockReminders;
  }
}

export async function getUserProfile() {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return mockUserProfile;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/user/profile`);
    if (!response.ok) throw new Error("Failed to fetch user profile");
    return await response.json();
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return mockUserProfile;
  }
}

export async function getCaregivers() {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 700));
    return mockCaregivers;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/caregivers`);
    if (!response.ok) throw new Error("Failed to fetch caregivers");
    return await response.json();
  } catch (error) {
    console.error("Error fetching caregivers:", error);
    return mockCaregivers;
  }
}

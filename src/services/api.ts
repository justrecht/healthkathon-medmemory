// For React Native development:
// - Use 10.0.2.2 for Android Emulator (maps to host's localhost)
// - Use your computer's IP address for physical devices or Expo Go
// - Use localhost for iOS Simulator
import { Platform } from 'react-native';
import { API_CONFIG } from '../config/api.config';

const getApiUrl = () => {
  if (!__DEV__) {
    return "https://your-production-api.com/api";
  }
  
  // Development mode
  const { USE_PHYSICAL_DEVICE, COMPUTER_IP, PORT } = API_CONFIG;
  
  if (USE_PHYSICAL_DEVICE) {
    // Physical device or Expo Go - use computer's IP
    return `http://${COMPUTER_IP}:${PORT}/api`;
  }
  
  if (Platform.OS === 'android') {
    // Android Emulator - use 10.0.2.2 (maps to host's 127.0.0.1)
    return `http://10.0.2.2:${PORT}/api`;
  }
  
  // iOS Simulator and web - localhost works fine
  return `http://localhost:${PORT}/api`;
};

const API_BASE_URL = getApiUrl();

console.log('API Base URL:', API_BASE_URL);

// Medications API
export async function getReminders() {
  try {
    // Get medications for a specific user (you can pass userId as parameter)
    const userId = "6739a7e8f5c4d2a1b8e9f012"; // Replace with actual user ID from auth
    const response = await fetch(`${API_BASE_URL}/medications/user/${userId}`);
    if (!response.ok) throw new Error("Failed to fetch medications");
    const medications = await response.json();
    
    // Transform medications to match the expected format
    return medications.map((med: any) => ({
      id: med._id,
      title: med.name,
      dosage: med.dosage,
      time: med.reminderTimes?.[0] || "09:00",
      notes: med.notes || med.instructions || "",
      status: med.isActive ? "scheduled" : "missed",
      frequency: med.frequency,
      startDate: med.startDate,
      endDate: med.endDate,
    }));
  } catch (error) {
    console.error("Error fetching medications:", error);
    // Return empty array when API is not available
    return [];
  }
}

export async function createReminder(medication: {
  id?: string;
  title: string;
  dosage: string;
  time: string;
  notes: string;
  status: string;
  userId?: string;
}) {
  try {
    const userId = medication.userId || "6739a7e8f5c4d2a1b8e9f012"; // Replace with actual user ID from auth
    
    const medicationData = {
      userId,
      name: medication.title,
      dosage: medication.dosage,
      frequency: "daily", // Default frequency
      startDate: new Date().toISOString(),
      instructions: medication.notes,
      reminderTimes: [medication.time],
      isActive: medication.status === "scheduled",
      notes: medication.notes,
    };
    
    const response = await fetch(`${API_BASE_URL}/medications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(medicationData),
    });
    if (!response.ok) throw new Error("Failed to create medication");
    const newMed = await response.json();
    
    // Transform response to match expected format
    return {
      id: newMed._id,
      title: newMed.name,
      dosage: newMed.dosage,
      time: newMed.reminderTimes?.[0] || medication.time,
      notes: newMed.notes || "",
      status: newMed.isActive ? "scheduled" : "missed",
    };
  } catch (error) {
    console.error("Error creating medication:", error);
    // Return the medication for offline usage
    return medication;
  }
}

export async function recordMedicationHistory(medicationId: string, status: "taken" | "missed") {
  try {
    const userId = "6739a7e8f5c4d2a1b8e9f012"; // Replace with actual user ID from auth
    
    const historyData = {
      userId,
      takenAt: new Date().toISOString(),
      scheduledTime: new Date().toTimeString().slice(0, 5),
      status,
      notes: status === "taken" ? "Taken" : "Missed",
    };
    
    const response = await fetch(`${API_BASE_URL}/medications/${medicationId}/history`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(historyData),
    });
    if (!response.ok) throw new Error("Failed to record medication history");
    return await response.json();
  } catch (error) {
    console.error("Error recording medication history:", error);
    return { success: true, takenAt: new Date().toISOString() };
  }
}

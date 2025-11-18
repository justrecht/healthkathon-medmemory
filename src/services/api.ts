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

export async function getReminders() {
  try {
    const response = await fetch(`${API_BASE_URL}/reminders`);
    if (!response.ok) throw new Error("Failed to fetch reminders");
    return await response.json();
  } catch (error) {
    console.error("Error fetching reminders:", error);
    // Return empty array when API is not available
    return [];
  }
}

export async function createReminder(medication: {
  id: string;
  title: string;
  dosage: string;
  time: string;
  notes: string;
  status: string;
}) {
  try {
    const response = await fetch(`${API_BASE_URL}/reminders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(medication),
    });
    if (!response.ok) throw new Error("Failed to create reminder");
    return await response.json();
  } catch (error) {
    console.error("Error creating reminder:", error);
    // Return the medication for offline usage
    return medication;
  }
}

export async function getUserProfile() {
  try {
    const response = await fetch(`${API_BASE_URL}/user/profile`);
    if (!response.ok) throw new Error("Failed to fetch user profile");
    return await response.json();
  } catch (error) {
    console.error("Error fetching user profile:", error);
    // Return empty profile when API is not available
    return {
      name: "",
      program: "",
      adherence: "0%",
      activeMeds: "0",
      visits: "0",
    };
  }
}

export async function getCaregivers() {
  try {
    const response = await fetch(`${API_BASE_URL}/caregivers`);
    if (!response.ok) throw new Error("Failed to fetch caregivers");
    return await response.json();
  } catch (error) {
    console.error("Error fetching caregivers:", error);
    // Return empty array when API is not available
    return [];
  }
}

export async function confirmMedication(medicationId: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/medications/${medicationId}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmedAt: new Date().toISOString() }),
    });
    if (!response.ok) throw new Error("Failed to confirm medication");
    return await response.json();
  } catch (error) {
    console.error("Error confirming medication:", error);
    // Return success for offline usage
    return { success: true, confirmedAt: new Date().toISOString() };
  }
}

export async function updateReminderStatus(reminderId: string, status: "taken" | "missed" | "scheduled") {
  try {
    const response = await fetch(`${API_BASE_URL}/reminders/${reminderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) throw new Error("Failed to update reminder");
    return await response.json();
  } catch (error) {
    console.error("Error updating reminder:", error);
    // Return success for offline usage
    return { success: true };
  }
}

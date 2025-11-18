import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
  MEDICATION_HISTORY: "@medication_history",
  REMINDERS: "@reminders",
  CAREGIVERS: "@caregivers",
  NOTIFICATION_SETTINGS: "@notification_settings",
  UI_SETTINGS: "@ui_settings",
  SCHEDULED_NOTIFICATIONS: "@scheduled_notifications",
};

export type MedicationRecord = {
  id: string;
  medicationId: string;
  medicationName: string;
  dosage: string;
  scheduledTime: string;
  takenAt?: string;
  status: "taken" | "missed" | "scheduled";
  date: string; // ISO date string
  confirmedBy?: "user" | "caregiver";
};

export type NotificationSettings = {
  beforeTime: number; // minutes before
  afterTime: number; // minutes after
  enableCaregiver: boolean;
  caregiverDelay: number; // minutes to wait before notifying caregiver
};

export type UISettings = {
  beforeSchedule: boolean; // Enable notifications 30 minutes before schedule
};

// Medication History
export async function saveMedicationRecord(record: MedicationRecord) {
  try {
    const history = await getMedicationHistory();
    history.push(record);
    await AsyncStorage.setItem(STORAGE_KEYS.MEDICATION_HISTORY, JSON.stringify(history));
    return true;
  } catch (error) {
    console.error("Error saving medication record:", error);
    return false;
  }
}

export async function getMedicationHistory(days: number = 7): Promise<MedicationRecord[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.MEDICATION_HISTORY);
    if (!data) return [];
    
    const history: MedicationRecord[] = JSON.parse(data);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return history.filter((record) => new Date(record.date) >= cutoffDate);
  } catch (error) {
    console.error("Error getting medication history:", error);
    return [];
  }
}

export async function updateMedicationRecord(id: string, updates: Partial<MedicationRecord>) {
  try {
    const history = await AsyncStorage.getItem(STORAGE_KEYS.MEDICATION_HISTORY);
    if (!history) return false;
    
    const records: MedicationRecord[] = JSON.parse(history);
    const index = records.findIndex((r) => r.id === id);
    
    if (index === -1) return false;
    
    records[index] = { ...records[index], ...updates };
    await AsyncStorage.setItem(STORAGE_KEYS.MEDICATION_HISTORY, JSON.stringify(records));
    return true;
  } catch (error) {
    console.error("Error updating medication record:", error);
    return false;
  }
}

// Calculate adherence percentage (assumes 3 medications per day)
export async function calculateAdherence(days: number = 7): Promise<number> {
  try {
    const history = await getMedicationHistory(days);
    
    // Expected: 3 medications per day
    const expectedTotal = days * 3;
    const takenCount = history.filter((r) => r.status === "taken").length;
    
    if (expectedTotal === 0) return 0;
    
    return Math.round((takenCount / expectedTotal) * 100);
  } catch (error) {
    console.error("Error calculating adherence:", error);
    return 0;
  }
}

// UI Settings
export async function saveUISettings(settings: UISettings): Promise<boolean> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.UI_SETTINGS, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error("Error saving UI settings:", error);
    return false;
  }
}

export async function getUISettings(): Promise<UISettings> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.UI_SETTINGS);
    if (!data) {
      // Default settings
      return {
        beforeSchedule: true,
      };
    }
    return JSON.parse(data);
  } catch (error) {
    console.error("Error getting UI settings:", error);
    return {
      beforeSchedule: true,
    };
  }
}

// Scheduled Notifications Tracking
export async function saveScheduledNotifications(notifications: Map<string, string[]>): Promise<boolean> {
  try {
    const obj = Object.fromEntries(notifications);
    await AsyncStorage.setItem(STORAGE_KEYS.SCHEDULED_NOTIFICATIONS, JSON.stringify(obj));
    return true;
  } catch (error) {
    console.error("Error saving scheduled notifications:", error);
    return false;
  }
}

export async function getScheduledNotifications(): Promise<Map<string, string[]>> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SCHEDULED_NOTIFICATIONS);
    if (!data) return new Map();
    
    const obj = JSON.parse(data);
    return new Map(Object.entries(obj));
  } catch (error) {
    console.error("Error getting scheduled notifications:", error);
    return new Map();
  }
}

export async function clearScheduledNotifications(): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.SCHEDULED_NOTIFICATIONS);
    return true;
  } catch (error) {
    console.error("Error clearing scheduled notifications:", error);
    return false;
  }
}

// Get daily adherence for chart (assumes 3 medications per day)
export async function getDailyAdherence(days: number = 7): Promise<Array<{ label: string; value: number }>> {
  try {
    const history = await getMedicationHistory(days);
    const dailyData: { [key: string]: { total: number; taken: number } } = {};
    
    const dayLabels = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    
    // Initialize last 7 days with expected 3 medications per day
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split("T")[0];
      dailyData[dateKey] = { total: 3, taken: 0 }; // Expect 3 per day
    }
    
    // Count taken medications
    history.forEach((record) => {
      const dateKey = record.date.split("T")[0];
      if (dailyData[dateKey] && record.status === "taken") {
        dailyData[dateKey].taken++;
      }
    });
    
    // Calculate percentages based on 3 medications per day
    return Object.keys(dailyData).map((dateKey, index) => {
      const data = dailyData[dateKey];
      const date = new Date(dateKey);
      const dayIndex = date.getDay();
      
      return {
        label: dayLabels[dayIndex],
        value: Math.round((data.taken / 3) * 100), // Always divide by 3
      };
    });
  } catch (error) {
    console.error("Error getting daily adherence:", error);
    return [];
  }
}

// Notification Settings
export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS);
    if (!data) {
      return {
        beforeTime: 30,
        afterTime: 15,
        enableCaregiver: true,
        caregiverDelay: 30,
      };
    }
    return JSON.parse(data);
  } catch (error) {
    console.error("Error getting notification settings:", error);
    return {
      beforeTime: 30,
      afterTime: 15,
      enableCaregiver: true,
      caregiverDelay: 30,
    };
  }
}

export async function saveNotificationSettings(settings: NotificationSettings) {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error("Error saving notification settings:", error);
    return false;
  }
}

// Clear all data (for testing)
export async function clearAllData() {
  try {
    await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
    return true;
  } catch (error) {
    console.error("Error clearing data:", error);
    return false;
  }
}

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    setDoc,
    updateDoc,
    where,
    writeBatch,
} from "firebase/firestore";
import { auth, db } from "../config/firebase";

const STORAGE_KEYS = {
  MEDICATION_HISTORY: "@medication_history",
  REMINDERS: "@reminders",
  CAREGIVERS: "@caregivers",
  NOTIFICATION_SETTINGS: "@notification_settings",
  UI_SETTINGS: "@ui_settings",
  SCHEDULED_NOTIFICATIONS: "@scheduled_notifications",
  PENDING_MEDICATIONS: "@pending_medications",
};

const DEVICE_ID_KEY = "@device_id";

async function getDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (id) return id;
  // Simple UUID-ish generator sufficient for scoping per device
  id = `device_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}

async function getStoragePath(collectionName: string, userId?: string) {
  if (userId) {
    return collection(db, "users", userId, collectionName);
  }
  if (auth.currentUser) {
    return collection(db, "users", auth.currentUser.uid, collectionName);
  }
  const deviceId = await getDeviceId();
  return collection(db, "devices", deviceId, collectionName);
}

async function getDocRef(collectionName: string, docId: string, userId?: string) {
  if (userId) {
    return doc(db, "users", userId, collectionName, docId);
  }
  if (auth.currentUser) {
    return doc(db, "users", auth.currentUser.uid, collectionName, docId);
  }
  const deviceId = await getDeviceId();
  return doc(db, "devices", deviceId, collectionName, docId);
}

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
  themeMode?: "light" | "dark";
};

// Reminder model
export type Reminder = {
  id: string;
  title: string;
  dosage: string;
  time: string; // "HH:MM"
  notes?: string;
  status: "scheduled" | "taken" | "missed";
  createdAt?: string; // ISO date
  repeatDays?: number[]; // 0-6, where 0 is Sunday
};

// Reminders (Firestore)
export async function getReminders(userId?: string): Promise<Reminder[]> {
  try {
    const colRef = await getStoragePath("reminders", userId);
    const q = query(colRef, orderBy("createdAt", "asc"));
    const snap = await getDocs(q);
    const list: Reminder[] = [];
    snap.forEach((d) => list.push(d.data() as Reminder));
    return list;
  } catch (error) {
    console.error("Error getting reminders:", error);
    return [];
  }
}

export async function createReminder(reminder: Reminder, userId?: string): Promise<boolean> {
  try {
    const docRef = await getDocRef("reminders", reminder.id, userId);
    await setDoc(docRef, { ...reminder, createdAt: reminder.createdAt ?? new Date().toISOString() });
    return true;
  } catch (error) {
    console.error("Error creating reminder:", error);
    return false;
  }
}

export async function updateReminder(id: string, updates: Partial<Reminder>, userId?: string): Promise<boolean> {
  try {
    const docRef = await getDocRef("reminders", id, userId);
    await updateDoc(docRef, updates as any);
    return true;
  } catch (error) {
    console.error("Error updating reminder:", error);
    return false;
  }
}

export async function deleteReminder(id: string, userId?: string): Promise<boolean> {
  try {
    const docRef = await getDocRef("reminders", id, userId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error("Error deleting reminder:", error);
    return false;
  }
}

// Medication History
export async function saveMedicationRecord(record: MedicationRecord, userId?: string) {
  try {
    const docRef = await getDocRef("medication_history", record.id, userId);
    await setDoc(docRef, record);
    return true;
  } catch (error) {
    console.error("Error saving medication record:", error);
    return false;
  }
}

export async function getMedicationHistory(days: number = 7, userId?: string): Promise<MedicationRecord[]> {
  try {
    const colRef = await getStoragePath("medication_history", userId);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffIso = cutoffDate.toISOString();

    const q = query(
      colRef,
      where("date", ">=", cutoffIso),
      orderBy("date", "desc")
    );
    const snap = await getDocs(q);
    const items: MedicationRecord[] = [];
    snap.forEach((d) => items.push(d.data() as MedicationRecord));
    return items;
  } catch (error) {
    console.error("Error getting medication history:", error);
    return [];
  }
}

export async function updateMedicationRecord(id: string, updates: Partial<MedicationRecord>, userId?: string) {
  try {
    const docRef = await getDocRef("medication_history", id, userId);
    await updateDoc(docRef, updates as any);
    return true;
  } catch (error) {
    console.error("Error updating medication record:", error);
    return false;
  }
}

export async function clearMedicationHistory(userId?: string): Promise<boolean> {
  try {
    const collectionRef = await getStoragePath("medication_history", userId);
    const snapshot = await getDocs(collectionRef);
    
    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`Cleared ${snapshot.docs.length} medication history records`);
    return true;
  } catch (error) {
    console.error("Error clearing medication history:", error);
    return false;
  }
}

// Calculate adherence percentage (assumes 3 medications per day)
export async function calculateAdherence(days: number = 7, userId?: string): Promise<number> {
  try {
    const history = await getMedicationHistory(days, userId);
    
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
export async function saveUISettings(settings: UISettings, userId?: string): Promise<boolean> {
  try {
    // Save locally first for immediate effect and offline support
    await AsyncStorage.setItem(STORAGE_KEYS.UI_SETTINGS, JSON.stringify(settings));

    const docRef = await getDocRef("settings", "ui", userId);
    await setDoc(docRef, settings, { merge: true });
    return true;
  } catch (error) {
    console.error("Error saving UI settings:", error);
    return false;
  }
}

export async function getUISettings(userId?: string): Promise<UISettings> {
  try {
    // Try local storage first
    const localData = await AsyncStorage.getItem(STORAGE_KEYS.UI_SETTINGS);
    let settings: UISettings = localData ? JSON.parse(localData) : { beforeSchedule: true };

    // If we have a user (or specific userId requested), try to sync from cloud
    if (userId || auth.currentUser) {
      try {
        const docRef = await getDocRef("settings", "ui", userId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const cloudSettings = snap.data() as UISettings;
          // Cloud wins for sync
          settings = { ...settings, ...cloudSettings };
          // Update local cache
          await AsyncStorage.setItem(STORAGE_KEYS.UI_SETTINGS, JSON.stringify(settings));
        }
      } catch (e) {
        console.warn("Failed to fetch cloud settings, using local", e);
      }
    }
    
    return settings;
  } catch (error) {
    console.error("Error getting UI settings:", error);
    return { beforeSchedule: true };
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

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split("T")[0];
      dailyData[dateKey] = { total: 3, taken: 0 };
    }

    history.forEach((record) => {
      const dateKey = record.date.split("T")[0];
      if (dailyData[dateKey] && record.status === "taken") {
        dailyData[dateKey].taken++;
      }
    });

    return Object.keys(dailyData).map((dateKey) => {
      const data = dailyData[dateKey];
      const date = new Date(dateKey);
      const dayIndex = date.getDay();
      return {
        label: dayLabels[dayIndex],
        value: Math.round((data.taken / 3) * 100),
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
    const deviceId = await getDeviceId();
    const ref = doc(db, "devices", deviceId, "settings", "notification");
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return {
        beforeTime: 30,
        afterTime: 15,
        enableCaregiver: true,
        caregiverDelay: 30,
      };
    }
    return snap.data() as NotificationSettings;
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
    const deviceId = await getDeviceId();
    const ref = doc(db, "devices", deviceId, "settings", "notification");
    await setDoc(ref, settings, { merge: true });
    return true;
  } catch (error) {
    console.error("Error saving notification settings:", error);
    return false;
  }
}

// Pending medication tracking (for late notifications)
export type PendingMedication = {
  reminderId: string;
  medicationName: string;
  scheduledTime: string; // ISO string
  notifiedAt: string; // ISO string when first notified
};

export async function addPendingMedication(pending: PendingMedication): Promise<boolean> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_MEDICATIONS);
    const list: PendingMedication[] = data ? JSON.parse(data) : [];
    
    // Check if already exists
    const exists = list.some(p => p.reminderId === pending.reminderId && 
                               p.scheduledTime === pending.scheduledTime);
    if (!exists) {
      list.push(pending);
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_MEDICATIONS, JSON.stringify(list));
    }
    return true;
  } catch (error) {
    console.error("Error adding pending medication:", error);
    return false;
  }
}

export async function getPendingMedications(): Promise<PendingMedication[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_MEDICATIONS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting pending medications:", error);
    return [];
  }
}

export async function removePendingMedication(reminderId: string, scheduledTime: string): Promise<boolean> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_MEDICATIONS);
    const list: PendingMedication[] = data ? JSON.parse(data) : [];
    
    const filtered = list.filter(p => !(p.reminderId === reminderId && p.scheduledTime === scheduledTime));
    await AsyncStorage.setItem(STORAGE_KEYS.PENDING_MEDICATIONS, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error("Error removing pending medication:", error);
    return false;
  }
}

export async function clearPendingMedications(): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_MEDICATIONS);
    return true;
  } catch (error) {
    console.error("Error clearing pending medications:", error);
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

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { clearScheduledNotifications, getScheduledNotifications, saveScheduledNotifications } from "./storage";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Keep track of scheduled notifications to prevent duplicates
let scheduledNotifications = new Map<string, string[]>();
let isInitialized = false;

// Initialize from storage
async function initializeScheduledNotifications() {
  if (isInitialized) return;
  scheduledNotifications = await getScheduledNotifications();
  isInitialized = true;
  console.log(`Loaded ${scheduledNotifications.size} medication notification records from storage`);
}

export async function registerForPushNotifications() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("medication-reminders", {
      name: "Pengingat Obat",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#2874A6",
      sound: "default",
      enableLights: true,
      enableVibrate: true,
      showBadge: true,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.warn("Failed to get push token for push notification!");
    return null;
  }

  return finalStatus;
}

// Remove duplicated scheduled notifications across app sessions
export async function dedupeMedicationNotifications() {
  await initializeScheduledNotifications();
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    // Group by medicationId + type
    const groups = new Map<string, Array<{ id: string; date: number }>>();
    for (const n of all) {
      const medId = (n.content?.data as any)?.medicationId as string | undefined;
      const type = (n.content?.data as any)?.type as string | undefined;
      const dateVal = (n.trigger as any)?.date ? new Date((n.trigger as any).date).getTime() : 0;
      if (!medId || !type) continue;
      const key = `${medId}:${type}`;
      const arr = groups.get(key) || [];
      arr.push({ id: n.identifier, date: dateVal });
      groups.set(key, arr);
    }

    const toKeep = new Set<string>();
    const toCancel: string[] = [];
    for (const [key, arr] of groups.entries()) {
      // Keep the soonest upcoming notification (largest past might be 0); pick max date
      const sorted = arr.sort((a, b) => a.date - b.date);
      if (sorted.length > 0) {
        // keep the latest future or if none, keep the last one
        const now = Date.now();
        const future = sorted.filter((x) => x.date >= now);
        const keep = (future[0] ?? sorted[sorted.length - 1]).id;
        toKeep.add(keep);
        for (const s of sorted) {
          if (s.id !== keep) toCancel.push(s.id);
        }
      }
    }

    // Cancel duplicates
    for (const id of toCancel) {
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    }

    if (toCancel.length > 0) {
      // Rebuild in-memory map from remaining notifications
      const remaining = await Notifications.getAllScheduledNotificationsAsync();
      const newMap = new Map<string, string[]>();
      for (const n of remaining) {
        const medId = (n.content?.data as any)?.medicationId as string | undefined;
        if (!medId) continue;
        const list = newMap.get(medId) || [];
        list.push(n.identifier);
        newMap.set(medId, list);
      }
      scheduledNotifications = newMap;
      await saveScheduledNotifications(scheduledNotifications);
      console.log(`Deduped notifications. Cancelled ${toCancel.length} duplicates.`);
    }
  } catch (e) {
    console.warn("Failed to dedupe notifications", e);
  }
}

export async function scheduleReminderNotification(
  medication: {
    id: string;
    title: string;
    dosage: string;
    time: string;
    notes?: string;
  }
) {
  // Initialize from storage if not done yet
  await initializeScheduledNotifications();

  // Proactive dedupe before scheduling to avoid bursts when state rehydrates
  await dedupeMedicationNotifications();

  // Check if notifications are already scheduled for this medication
  const existing = scheduledNotifications.get(medication.id);
  if (existing && existing.length > 0) {
    // Verify if these notifications actually exist
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    const existingIds = allScheduled.map(n => n.identifier);
    const stillValid = existing.filter(id => existingIds.includes(id));
    
    if (stillValid.length > 0) {
      console.log(`Notifications already scheduled for ${medication.id}, skipping...`);
      return {
        beforeNotificationId: stillValid[0],
        onTimeNotificationId: stillValid[1],
        afterNotificationId: stillValid[2],
      };
    }
    
    // If none are valid, cancel and reschedule
    console.log(`Stale notifications found for ${medication.id}, rescheduling...`);
    for (const notifId of existing) {
      await Notifications.cancelScheduledNotificationAsync(notifId).catch(() => {});
    }
  }

  // Parse time (format: "HH:MM") and use DEVICE LOCAL TIME
  const [hours, minutes] = medication.time.split(":").map(Number);
  const now = new Date();
  const scheduledTime = new Date();
  // Set local device time directly
  scheduledTime.setHours(hours, minutes, 0, 0);

  // If the time has passed today, schedule for tomorrow
  if (scheduledTime <= now) {
    scheduledTime.setDate(scheduledTime.getDate() + 1);
  }

  console.log(`Scheduling notifications for ${medication.title} at ${scheduledTime.toLocaleString()}`);

  const notificationIds: string[] = [];

  // Schedule 30 minutes before
  const beforeTime = new Date(scheduledTime.getTime() - 30 * 60 * 1000);
  
  // Schedule notification 30 minutes before (only if in future)
  if (beforeTime > now) {
    const beforeNotificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "🔔 Pengingat Obat",
        body: `${medication.title} (${medication.dosage}) dalam 30 menit`,
        data: { medicationId: medication.id, type: "before" },
        sound: true,
      },
      trigger: { 
        channelId: "medication-reminders",
        date: beforeTime,
      },
    });
    notificationIds.push(beforeNotificationId);
    console.log(`Scheduled before notification: ${beforeNotificationId}`);
  }

  // Schedule notification at exact time
  const onTimeNotificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: "⏰ Waktunya Minum Obat!",
      body: `${medication.title} - ${medication.dosage}${medication.notes ? `\n${medication.notes}` : ""}`,
      data: { medicationId: medication.id, type: "ontime" },
      sound: true,
    },
    trigger: { 
      channelId: "medication-reminders",
      date: scheduledTime,
    },
  });
  notificationIds.push(onTimeNotificationId);
  console.log(`Scheduled ontime notification: ${onTimeNotificationId}`);

  // Schedule reminder 15 minutes after if not confirmed
  const afterTime = new Date(scheduledTime.getTime() + 15 * 60 * 1000);
  const afterNotificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: "❗ Udah minum obat belum?",
      body: `Konfirmasi konsumsi ${medication.title}`,
      data: { medicationId: medication.id, type: "after" },
      sound: true,
    },
    trigger: { 
      channelId: "medication-reminders",
      date: afterTime,
    },
  });
  notificationIds.push(afterNotificationId);
  console.log(`Scheduled after notification: ${afterNotificationId}`);

  // Store the notification IDs in memory and persist to storage
  scheduledNotifications.set(medication.id, notificationIds);
  await saveScheduledNotifications(scheduledNotifications);
  console.log(`Saved ${notificationIds.length} notification IDs to storage for ${medication.id}`);

  return {
    beforeNotificationId: notificationIds[0],
    onTimeNotificationId: notificationIds[1],
    afterNotificationId: notificationIds[2],
  };
}

export async function cancelNotification(notificationId: string) {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function cancelMedicationNotifications(medicationId: string) {
  await initializeScheduledNotifications();
  
  const existing = scheduledNotifications.get(medicationId);
  if (existing) {
    for (const notifId of existing) {
      await Notifications.cancelScheduledNotificationAsync(notifId).catch(() => {});
    }
    scheduledNotifications.delete(medicationId);
    await saveScheduledNotifications(scheduledNotifications);
    console.log(`Cancelled and removed notifications for ${medicationId}`);
  }
}

export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  scheduledNotifications.clear();
  await clearScheduledNotifications();
  console.log("Cancelled all notifications and cleared storage");
}

export async function sendCaregiverNotification(
  caregiverName: string,
  medicationName: string,
  patientName: string
) {
  // This would typically send via API to caregiver's device
  // For now, we'll show a local notification as demonstration
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "🚨 Notifikasi untuk Caregiver",
      body: `${patientName} belum mengonfirmasi konsumsi ${medicationName}`,
      data: { type: "caregiver-alert" },
      sound: true,
    },
    trigger: null, // Send immediately
  });
}

export async function sendTestNotification() {
  // Send a test notification immediately
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "✅ Notifikasi Berfungsi!",
      body: "Ini adalah notifikasi test. Sistem notifikasi udah jalan dengan baik!",
      data: { type: "test" },
      sound: true,
    },
    trigger: null, // Send immediately
  });
}

export async function getAllScheduledNotifications() {
  return await Notifications.getAllScheduledNotificationsAsync();
}

export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

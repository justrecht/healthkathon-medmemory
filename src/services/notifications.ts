import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { clearScheduledNotifications, getScheduledNotifications, getUISettings, saveScheduledNotifications } from "./storage";

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
    // Group by medicationId + type + weekday (to handle recurring correctly)
    const groups = new Map<string, Array<{ id: string; trigger: any }>>();
    for (const n of all) {
      const medId = (n.content?.data as any)?.medicationId as string | undefined;
      const type = (n.content?.data as any)?.type as string | undefined;
      const trigger = n.trigger as any;
      const weekday = trigger?.weekday ?? 'none';
      const hour = trigger?.hour ?? 'none';
      const minute = trigger?.minute ?? 'none';

      if (!medId || !type) continue;
      
      // Key includes weekday, hour, and minute so we only group exact duplicates
      const key = `${medId}:${type}:${weekday}:${hour}:${minute}`;
      const arr = groups.get(key) || [];
      arr.push({ id: n.identifier, trigger });
      groups.set(key, arr);
    }

    const toCancel: string[] = [];
    for (const [key, arr] of groups.entries()) {
      // If there are duplicates for the exact same time slot, keep only the first one
      if (arr.length > 1) {
        for (let i = 1; i < arr.length; i++) {
          toCancel.push(arr[i].id);
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
    repeatDays?: number[];
  },
  forceReschedule: boolean = false
) {
  // Initialize from storage if not done yet
  await initializeScheduledNotifications();

  // Get UI settings to check if "before" notification is enabled
  const uiSettings = await getUISettings();
  const enableBeforeNotification = uiSettings.beforeSchedule;

  // Check if notifications are already scheduled and still valid
  if (!forceReschedule) {
    const existing = scheduledNotifications.get(medication.id);
    if (existing && existing.length > 0) {
      // Verify that these notifications actually exist in the system
      const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
      const existingIds = new Set(allScheduled.map(n => n.identifier));
      const stillValid = existing.filter(id => existingIds.has(id));
      
      // Check if we have the expected number of notifications
      // For recurring (repeatDays) we now only schedule on-time + after (2 each per day)
      const expectedCount = medication.repeatDays?.length 
        ? medication.repeatDays.length * 2
        : (enableBeforeNotification ? 3 : 2);
      
      if (stillValid.length === existing.length && stillValid.length >= expectedCount) {
        console.log(`✓ Notifications already scheduled for ${medication.title} (${stillValid.length}/${expectedCount} active), skipping...`);
        return {
          beforeNotificationId: stillValid[0],
          onTimeNotificationId: stillValid[1],
          afterNotificationId: stillValid[2],
        };
      }
      
      console.log(`⚠ Incomplete notifications for ${medication.title} (${stillValid.length}/${expectedCount}), rescheduling...`);
      // Cancel incomplete set
      for (const notifId of existing) {
        await Notifications.cancelScheduledNotificationAsync(notifId).catch(() => {});
      }
      scheduledNotifications.delete(medication.id);
    }
  } else {
    // Force reschedule - cancel existing
    const existing = scheduledNotifications.get(medication.id);
    if (existing && existing.length > 0) {
      console.log(`🔄 Force rescheduling ${existing.length} notifications for ${medication.title}...`);
      for (const notifId of existing) {
        await Notifications.cancelScheduledNotificationAsync(notifId).catch(() => {});
      }
      scheduledNotifications.delete(medication.id);
    }
  }

  // Parse time (format: "HH:MM") and use DEVICE LOCAL TIME
  const [hours, minutes] = medication.time.split(":").map(Number);
  
  if (isNaN(hours) || isNaN(minutes)) {
    console.error(`Invalid time format for medication ${medication.title}: ${medication.time}`);
    return null;
  }

  const notificationIds: string[] = [];

  // Helper function to check if a recurring notification would trigger very soon
  const wouldTriggerSoon = (dayIndex: number, hour: number, minute: number): boolean => {
    const now = new Date();
    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // If it's for today and the time hasn't passed, check if it's within 3 minutes
    if (dayIndex === currentDay) {
      const targetTime = hour * 60 + minute;
      const currentTime = currentHour * 60 + currentMinute;
      const timeDiff = targetTime - currentTime;
      
      // If time difference is between 0 and 3 minutes, it would trigger too soon
      if (timeDiff >= 0 && timeDiff <= 3) {
        return true;
      }
      // If time has already passed, it won't trigger today
      if (timeDiff < 0) {
        return false;
      }
    }
    
    return false;
  };

  // If repeatDays is provided, use recurring notifications
  if (medication.repeatDays && medication.repeatDays.length > 0) {
    console.log(`📅 Scheduling recurring notifications for ${medication.title} on ${medication.repeatDays.length} days at ${medication.time}`);
    console.log(`   Days selected: ${medication.repeatDays.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}`);
    
    const now = new Date();
    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    for (const dayIndex of medication.repeatDays) {
      const weekday = dayIndex + 1; // Expo weekday
      const dayLabel = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][dayIndex];
      const daysAhead = (dayIndex - currentDay + 7) % 7; // offset (0..6)
      const targetDate = new Date();
      targetDate.setHours(hours, minutes, 0, 0);
      targetDate.setDate(targetDate.getDate() + daysAhead);

      // If the scheduled time has already passed for this occurrence, schedule for next week
      if (targetDate.getTime() <= Date.now()) {
        targetDate.setDate(targetDate.getDate() + 7);
      }

      // Kita selalu jadwalkan occurrence pertama sebagai one-time date (bukan repeat) agar Android tidak memicu langsung.
      // Setelah menembak, listener akan mengubahnya jadi weekly repeat.
      const onTimeId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Waktunya Minum Obat!',
          body: `${medication.title} - ${medication.dosage}${medication.notes ? `\n${medication.notes}` : ''}`,
          data: { medicationId: medication.id, type: 'ontime', oneTime: true },
          sound: true,
          // @ts-ignore
          channelId: 'medication-reminders',
        },
        trigger: { channelId: 'medication-reminders', date: targetDate } as any,
      });
      notificationIds.push(onTimeId);
      console.log(`   ▶ Scheduled first on-time (one-time) for ${dayLabel} at ${targetDate.toLocaleString()}`);

      // AFTER (+10 menit)
      const afterDate = new Date(targetDate.getTime() + 10 * 60 * 1000);
      const afterId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '❗ Udah minum obat belum?',
          body: `Jangan lupa konfirmasi konsumsi ${medication.title} ya!`,
          data: { medicationId: medication.id, type: 'after', oneTime: true },
          sound: true,
          // @ts-ignore
          channelId: 'medication-reminders',
        },
        trigger: { channelId: 'medication-reminders', date: afterDate } as any,
      });
      notificationIds.push(afterId);
      console.log(`   ▶ Scheduled first after (+10m) one-time for ${dayLabel} at ${afterDate.toLocaleString()}`);
    }
  } else {
    // Legacy/One-time logic
    const now = new Date();
    const scheduledTime = new Date();
    // Set local device time directly
    scheduledTime.setHours(hours, minutes, 0, 0);

    // If the time has passed today (with 2 minute buffer), schedule for tomorrow
    if (scheduledTime.getTime() <= now.getTime() + 120000) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    console.log(`Scheduling one-time notifications for ${medication.title} at ${scheduledTime.toLocaleString()}`);

    // Schedule 30 minutes before
    const beforeTime = new Date(scheduledTime.getTime() - 30 * 60 * 1000);
    
    // Schedule notification 30 minutes before (only if in future AND enabled)
    if (enableBeforeNotification && beforeTime.getTime() > now.getTime() + 120000) {
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

    // Schedule reminder 10 minutes after if not confirmed
    const afterTime = new Date(scheduledTime.getTime() + 10 * 60 * 1000);
    const afterNotificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "❗ Udah minum obat belum?",
        body: `Jangan lupa konfirmasi konsumsi ${medication.title} ya!`,
        data: { medicationId: medication.id, type: "after" },
        sound: true,
      },
      trigger: { 
        channelId: "medication-reminders",
        date: afterTime,
      },
    });
    notificationIds.push(afterNotificationId);
  }

  // Store the notification IDs in memory and persist to storage
  scheduledNotifications.set(medication.id, notificationIds);
  await saveScheduledNotifications(scheduledNotifications);
  console.log(`✅ Scheduled ${notificationIds.length} notifications for ${medication.title}`);

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
  caregiverId: string,
  caregiverName: string,
  medicationName: string,
  patientId: string,
  patientName: string,
  scheduledTime: string
) {
  try {
    // Import Firestore functions
    const { collection, addDoc } = await import('firebase/firestore');
    const { db } = await import('../config/firebase');

    // Store notification in Firestore for the caregiver
    const notificationData = {
      type: 'missed_medication',
      caregiverId,
      patientId,
      patientName,
      medicationName,
      scheduledTime,
      message: `${patientName} melewatkan jadwal minum obat ${medicationName} pada ${scheduledTime}`,
      read: false,
      createdAt: new Date().toISOString(),
    };

    await addDoc(collection(db, 'caregiver_notifications'), notificationData);
    console.log(`📨 Notification sent to caregiver ${caregiverName} about missed medication: ${medicationName}`);

    // Also send a local notification (for demo purposes or if caregiver is using the same device)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🚨 Pasien Melewatkan Obat",
        body: `${patientName} belum minum ${medicationName} yang dijadwalkan jam ${scheduledTime}`,
        data: { 
          type: "caregiver-alert",
          patientId,
          medicationName,
          scheduledTime,
        },
        sound: true,
      },
      trigger: null, // Send immediately
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending caregiver notification:', error);
    return { success: false, error };
  }
}

export async function scheduleCaregiversMissedNotification(
  medication: {
    id: string;
    title: string;
    time: string;
  },
  patientId: string,
  patientName: string,
  caregivers: Array<{ id: string; name: string }>
) {
  // Schedule a notification to be sent to caregivers 30 minutes after scheduled time
  // if the medication hasn't been confirmed
  const [hours, minutes] = medication.time.split(':').map(Number);
  const notificationTime = new Date();
  notificationTime.setHours(hours, minutes + 30, 0, 0);

  // If the time has already passed today, schedule for tomorrow
  if (notificationTime.getTime() <= Date.now()) {
    notificationTime.setDate(notificationTime.getDate() + 1);
  }

  console.log(`⏰ Scheduling caregiver missed notification for ${medication.title} at ${notificationTime.toLocaleString()}`);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "⚠️ Cek Status Pasien",
      body: `Waktu untuk cek apakah pasien ${patientName} sudah minum ${medication.title}`,
      data: {
        type: "caregiver-check",
        medicationId: medication.id,
        patientId,
        caregivers: JSON.stringify(caregivers),
      },
      sound: true,
    },
    trigger: {
      channelId: "medication-reminders",
      date: notificationTime,
    },
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

// Listener untuk menjemput notifikasi yang bersifat one-time (karena waktu sudah lewat hari ini)
// Setelah notifikasi one-time (ontime/after) dikirim, kita jadwalkan ulang menjadi weekly repeat normal.
export function addNotificationReceivedListener() {
  return Notifications.addNotificationReceivedListener(async (notification) => {
    try {
      const data: any = notification.request.content.data;
      if (!data || !data.oneTime || !data.medicationId) return;
      const medId = data.medicationId as string;
      const type = data.type as string;
      // Ambil detail reminder dari storage
      const reminders = await (await import('./storage')).getReminders();
      const medication = reminders.find(r => r.id === medId);
      if (!medication) return;

      const [h, m] = medication.time.split(':').map(Number);
      const now = new Date();
      let jsWeekday = now.getDay(); // hari aktual saat notifikasi pertama menembak (mutable)
      let expoWeekday = jsWeekday + 1; // format expo

      // Jika reminder memiliki repeatDays, kita gunakan weekday sesuai mapping repeatDays agar align hari.
      // Cari index yang cocok dengan jsWeekday; kalau tidak ada, fallback ke jsWeekday agar tetap ter-repeat.
      if (medication.repeatDays && medication.repeatDays.length > 0) {
        if (!medication.repeatDays.includes(jsWeekday)) {
          // Pilih hari pertama dalam daftar repeatDays untuk repeat mingguan berikutnya
          const chosen = medication.repeatDays[0];
          jsWeekday = chosen;
          expoWeekday = jsWeekday + 1;
        }
      }

      // Hanya jadwalkan ulang untuk tipe utama (ontime/after) agar pola mingguan kembali.
      if (type === 'ontime') {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '⏰ Waktunya Minum Obat!',
            body: `${medication.title} - ${medication.dosage}${medication.notes ? `\n${medication.notes}` : ''}`,
            data: { medicationId: medId, type: 'ontime' },
            sound: true,
            // @ts-ignore
            channelId: 'medication-reminders',
          },
          trigger: { weekday: expoWeekday, hour: h, minute: m, repeats: true } as any,
        });
      }
      if (type === 'after') {
        let afterHour = h;
        let afterMinute = m + 10;
        if (afterMinute >= 60) { afterMinute -= 60; afterHour += 1; }
        if (afterHour >= 24) { afterHour -= 24; }
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '❗ Udah minum obat belum?',
            body: `Jangan lupa konfirmasi konsumsi ${medication.title} ya!`,
            data: { medicationId: medId, type: 'after' },
            sound: true,
            // @ts-ignore
            channelId: 'medication-reminders',
          },
            trigger: { weekday: expoWeekday, hour: afterHour, minute: afterMinute, repeats: true } as any,
        });
      }
      console.log(`🔁 Auto-rescheduled weekly notifications for ${medication.title} (type: ${type})`);
    } catch (err) {
      console.warn('Failed to auto-reschedule weekly notification', err);
    }
  });
}

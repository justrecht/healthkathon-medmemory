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
      const expectedCount = medication.repeatDays?.length 
        ? medication.repeatDays.length * (enableBeforeNotification ? 3 : 2)
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
      // Expo: 1=Sun, 7=Sat. JS: 0=Sun, 6=Sat.
      const weekday = dayIndex + 1;
      console.log(`   Scheduling for ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayIndex]} (weekday: ${weekday}) at ${hours}:${minutes.toString().padStart(2, '0')}`);

      // 2. Before Notification (30 mins before) - Only if enabled and not in the past
      if (enableBeforeNotification) {
        let beforeHour = hours;
        let beforeMinute = minutes - 30;
        let beforeWeekday = weekday;
        let beforeDayIndex = dayIndex;
        
        // Adjust if time goes negative
        if (beforeMinute < 0) {
          beforeMinute += 60;
          beforeHour -= 1;
          
          if (beforeHour < 0) {
            beforeHour += 24;
            beforeWeekday = weekday === 1 ? 7 : weekday - 1;
            beforeDayIndex = dayIndex === 0 ? 6 : dayIndex - 1;
          }
        }

        // Check if this would trigger too soon
        if (!wouldTriggerSoon(beforeDayIndex, beforeHour, beforeMinute)) {
          const beforeId = await Notifications.scheduleNotificationAsync({
            content: {
              title: "🔔 Pengingat Obat",
              body: `${medication.title} (${medication.dosage}) dalam 30 menit`,
              data: { medicationId: medication.id, type: "before" },
              sound: true,
              // @ts-ignore
              channelId: "medication-reminders",
            },
            trigger: {
              weekday: beforeWeekday,
              hour: beforeHour,
              minute: beforeMinute,
              repeats: true,
            } as any,
          });
          notificationIds.push(beforeId);
        }
      }

      // 1. On Time Notification - Only schedule if not triggering too soon
      if (!wouldTriggerSoon(dayIndex, hours, minutes)) {
        const onTimeId = await Notifications.scheduleNotificationAsync({
          content: {
            title: "⏰ Waktunya Minum Obat!",
            body: `${medication.title} - ${medication.dosage}${medication.notes ? `\n${medication.notes}` : ""}`,
            data: { medicationId: medication.id, type: "ontime" },
            sound: true,
            // @ts-ignore
            channelId: "medication-reminders",
          },
          trigger: {
            weekday: weekday,
            hour: hours,
            minute: minutes,
            repeats: true,
          } as any,
        });
        notificationIds.push(onTimeId);
        console.log(`   ✓ Scheduled ontime notification (will fire on next ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayIndex]})`);
      } else {
        console.log(`   ⏭ Skipping ontime notification (would fire immediately for today's past time)`);
      }

      // 3. After Notification (10 mins after) - Only if not in the past
      let afterHour = hours;
      let afterMinute = minutes + 10;
      let afterWeekday = weekday;
      let afterDayIndex = dayIndex;
      
      // Adjust if time goes past 59 minutes
      if (afterMinute >= 60) {
        afterMinute -= 60;
        afterHour += 1;
        
        if (afterHour >= 24) {
          afterHour -= 24;
          afterWeekday = weekday === 7 ? 1 : weekday + 1;
          afterDayIndex = dayIndex === 6 ? 0 : dayIndex + 1;
        }
      }

      // Check if this would trigger too soon
      if (!wouldTriggerSoon(afterDayIndex, afterHour, afterMinute)) {
        const afterId = await Notifications.scheduleNotificationAsync({
          content: {
            title: "❗ Udah minum obat belum?",
            body: `Jangan lupa konfirmasi konsumsi ${medication.title} ya!`,
            data: { medicationId: medication.id, type: "after" },
            sound: true,
            // @ts-ignore
            channelId: "medication-reminders",
          },
          trigger: {
            weekday: afterWeekday,
            hour: afterHour,
            minute: afterMinute,
            repeats: true,
          } as any,
        });
        notificationIds.push(afterId);
      }
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

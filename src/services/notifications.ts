import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications() {
  let token;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("medication-reminders", {
      name: "Pengingat Obat",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#2874A6",
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

export async function scheduleReminderNotification(
  medication: {
    id: string;
    title: string;
    dosage: string;
    time: string;
    notes?: string;
  }
) {
  // Parse time (format: "HH:MM")
  const [hours, minutes] = medication.time.split(":").map(Number);
  const now = new Date();
  const scheduledTime = new Date();
  scheduledTime.setHours(hours, minutes, 0, 0);

  // If the time has passed today, schedule for tomorrow
  if (scheduledTime <= now) {
    scheduledTime.setDate(scheduledTime.getDate() + 1);
  }

  // Schedule 30 minutes before
  const beforeTime = new Date(scheduledTime.getTime() - 30 * 60 * 1000);
  
  // Schedule notification 30 minutes before (only if in future)
  let beforeNotificationId = "";
  if (beforeTime > now) {
    beforeNotificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "🔔 Pengingat Obat",
        body: `${medication.title} (${medication.dosage}) dalam 30 menit`,
        data: { medicationId: medication.id, type: "before" },
        sound: true,
      },
      trigger: beforeTime as any,
    });
  }

  // Schedule notification at exact time
  const onTimeNotificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: "⏰ Waktunya Minum Obat!",
      body: `${medication.title} - ${medication.dosage}${medication.notes ? `\n${medication.notes}` : ""}`,
      data: { medicationId: medication.id, type: "ontime" },
      sound: true,
    },
    trigger: scheduledTime as any,
  });

  // Schedule reminder 15 minutes after if not confirmed
  const afterTime = new Date(scheduledTime.getTime() + 15 * 60 * 1000);
  const afterNotificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: "❗ Apakah sudah minum obat?",
      body: `Konfirmasi konsumsi ${medication.title}`,
      data: { medicationId: medication.id, type: "after" },
      sound: true,
    },
    trigger: afterTime as any,
  });

  return {
    beforeNotificationId,
    onTimeNotificationId,
    afterNotificationId,
  };
}

export async function cancelNotification(notificationId: string) {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
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

export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

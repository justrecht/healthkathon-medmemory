// No-op notifications service to avoid Expo Go warnings/errors.
// This implementation removes the dependency on `expo-notifications` and
// safely stubs all functions used by the app.

export async function registerForPushNotifications() {
  console.warn(
    "Notifications are disabled: expo-notifications removed. Using no-op service."
  );
  // Return a value compatible with previous callers
  return "granted" as const;
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
  // No-op scheduling: return placeholder IDs for compatibility
  console.warn(
    `Skipping schedule for ${medication.title} (${medication.time}) — notifications disabled.`
  );
  return {
    beforeNotificationId: "",
    onTimeNotificationId: "",
    afterNotificationId: "",
  };
}

export async function cancelNotification(_notificationId: string) {}

export async function cancelAllNotifications() {}

export async function sendCaregiverNotification(
  _caregiverName: string,
  _medicationName: string,
  _patientName: string
) {
  // No-op
}

export function addNotificationResponseListener(
  _callback: (response: any) => void
) {
  // Return a subscription-like object with a remove method
  return { remove: () => {} } as { remove: () => void };
}

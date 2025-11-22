import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  clearScheduledNotifications,
  getReminders,
  getScheduledNotifications,
  getUISettings,
  Reminder,
  saveScheduledNotifications
} from './storage';

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

// Notification channel for Android
const NOTIFICATION_CHANNEL = {
  channelId: 'medication-reminders',
  name: 'Medication Reminders',
  importance: Notifications.AndroidImportance.MAX,
  description: 'Notifications for medication schedules',
  sound: 'default',
  vibrationPattern: [0, 250, 250, 250],
  enableLights: true,
  enableVibrate: true,
};

export class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize notification system
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('Notification service already initialized');
      return;
    }

    console.log('Initializing notification service...');

    // Create notification channel for Android
    if (Platform.OS === 'android') {
      await this.createNotificationChannel();
    }

    // Set up notification received listener
    Notifications.addNotificationReceivedListener(async (notification) => {
      console.log('Notification Received:', notification);
      
      const { type, reminderId, medicationId } = notification.request.content.data;
      
      // If this is an on-time notification, add to pending medications
      if (type === 'ontime') {
        const { addPendingMedication, getReminders } = await import('./storage');
        try {
          // Get the reminder details
          const reminders = await getReminders();
          const reminder = reminders.find(r => r.id === reminderId || r.id === medicationId);
          
          if (reminder) {
            await addPendingMedication({
              reminderId: reminder.id,
              medicationName: reminder.title,
              scheduledTime: new Date().toISOString(),
              notifiedAt: new Date().toISOString()
            });
            console.log('Added to pending medications:', reminder.title);
          }
        } catch (error) {
          console.error('Error adding to pending medications:', error);
        }
      }
    });

    // Set up notification response listener (when user taps notification)
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification tapped:', response);
      this.handleNotificationOpen(response.notification);
    });

    this.isInitialized = true;
    console.log('Notification service initialized successfully');
  }

  /**
   * Create notification channel for Android
   */
  private async createNotificationChannel() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL.channelId, {
        name: NOTIFICATION_CHANNEL.name,
        importance: NOTIFICATION_CHANNEL.importance,
        description: NOTIFICATION_CHANNEL.description,
        sound: NOTIFICATION_CHANNEL.sound,
        vibrationPattern: NOTIFICATION_CHANNEL.vibrationPattern,
        enableLights: NOTIFICATION_CHANNEL.enableLights,
        enableVibrate: NOTIFICATION_CHANNEL.enableVibrate,
      });
      console.log('Android notification channel created successfully');
    }
  }

  /**
   * Handle notification open event
   */
  private handleNotificationOpen(notification: Notifications.Notification) {
    const { reminderId, medicationId } = notification.request.content.data;
    
    if (reminderId) {
      console.log(`Opening reminder: ${reminderId}`);
      // Navigate to medication detail or mark as taken
      // You can use a navigation service here
    }
  }

  /**
   * Schedule notifications for all reminders
   */
  async scheduleAllNotifications(userId?: string) {
    try {
      console.log('Scheduling all notifications...');
      
      // Clear existing notifications
      await this.cancelAllNotifications();

      // Get UI settings to check if notifications are enabled
      const settings = await getUISettings(userId);
      if (!settings.beforeSchedule) {
        console.log('Notifications disabled in settings');
        return;
      }

      // Get all reminders
      const reminders = await getReminders(userId);
      console.log(`Found ${reminders.length} reminders to schedule`);

      const notificationMap = new Map<string, string[]>();

      for (const reminder of reminders) {
        if (reminder.status !== 'scheduled') {
          continue;
        }

        const notificationIds = await this.scheduleReminderNotifications(reminder, settings.beforeSchedule);
        if (notificationIds.length > 0) {
          notificationMap.set(reminder.id, notificationIds);
        }
      }

      // Save scheduled notification IDs
      await saveScheduledNotifications(notificationMap);
      
      console.log(`Scheduled notifications for ${notificationMap.size} reminders`);
    } catch (error) {
      console.error('Error scheduling all notifications:', error);
    }
  }

  /**
   * Schedule notifications for a specific reminder
   */
  private async scheduleReminderNotifications(reminder: Reminder, enableBeforeNotification: boolean): Promise<string[]> {
    const notificationIds: string[] = [];

    try {
      const [hours, minutes] = reminder.time.split(':').map(Number);
      
      // Get repeat days (default to all days if not specified)
      const repeatDays = reminder.repeatDays && reminder.repeatDays.length > 0 
        ? reminder.repeatDays 
        : [0, 1, 2, 3, 4, 5, 6];

      for (const dayOfWeek of repeatDays) {
        // Calculate next occurrence of this day
        const fireDate = this.getNextDateForDayAndTime(dayOfWeek, hours, minutes);

        // Schedule main notification (on-time notification)
        const mainNotificationId = `${reminder.id}_${dayOfWeek}`;
        await this.scheduleLocalNotification({
          id: mainNotificationId,
          title: '💊 ' + reminder.title,
          body: `Time to take ${reminder.dosage}${reminder.notes ? ` - ${reminder.notes}` : ''}`,
          fireDate,
          payload: {
            reminderId: reminder.id,
            medicationId: reminder.id,
            type: 'ontime'
          },
          repeatType: 'week' // Repeat weekly
        });
        notificationIds.push(mainNotificationId);

        // Schedule "before" notification (30 minutes before)
        if (enableBeforeNotification) {
          const beforeFireDate = new Date(fireDate);
          beforeFireDate.setMinutes(beforeFireDate.getMinutes() - 30);
          
          const beforeNotificationId = `${reminder.id}_${dayOfWeek}_before`;
          await this.scheduleLocalNotification({
            id: beforeNotificationId,
            title: '⏰ Upcoming Medication',
            body: `${reminder.title} in 30 minutes (${reminder.dosage})`,
            fireDate: beforeFireDate,
            payload: {
              reminderId: reminder.id,
              medicationId: reminder.id,
              type: 'before'
            },
            repeatType: 'week'
          });
          notificationIds.push(beforeNotificationId);
        }

        // Schedule "late" notification (10 minutes after scheduled time)
        const lateFireDate = new Date(fireDate);
        lateFireDate.setMinutes(lateFireDate.getMinutes() + 10);
        
        const lateNotificationId = `${reminder.id}_${dayOfWeek}_late`;
        await this.scheduleLocalNotification({
          id: lateNotificationId,
          title: '⚠️ Medication Reminder',
          body: `Did you take your ${reminder.title}? (${reminder.dosage})`,
          fireDate: lateFireDate,
          payload: {
            reminderId: reminder.id,
            medicationId: reminder.id,
            type: 'late'
          },
          repeatType: 'week'
        });
        notificationIds.push(lateNotificationId);
      }

      console.log(`Scheduled ${notificationIds.length} notifications for reminder: ${reminder.title}`);
    } catch (error) {
      console.error(`Error scheduling notifications for reminder ${reminder.id}:`, error);
    }

    return notificationIds;
  }

  /**
   * Get next date for a specific day of week and time
   */
  private getNextDateForDayAndTime(dayOfWeek: number, hours: number, minutes: number): Date {
    const now = new Date();
    const targetDate = new Date(now);
    
    targetDate.setHours(hours, minutes, 0, 0);
    
    // Calculate days until target day
    const currentDay = now.getDay();
    let daysUntilTarget = dayOfWeek - currentDay;
    
    // If target day is today but time has passed, schedule for next week
    if (daysUntilTarget === 0 && now.getTime() > targetDate.getTime()) {
      daysUntilTarget = 7;
    } else if (daysUntilTarget < 0) {
      daysUntilTarget += 7;
    }
    
    targetDate.setDate(now.getDate() + daysUntilTarget);
    
    return targetDate;
  }

  /**
   * Schedule a local notification
   */
  private async scheduleLocalNotification(options: {
    id: string;
    title: string;
    body: string;
    fireDate: Date;
    payload?: any;
    repeatType?: 'week' | 'day';
  }) {
    try {
      const trigger: Notifications.NotificationTriggerInput = 
        options.repeatType === 'week' 
          ? {
              weekday: options.fireDate.getDay() + 1, // expo uses 1-7, JS uses 0-6
              hour: options.fireDate.getHours(),
              minute: options.fireDate.getMinutes(),
              repeats: true,
            } as Notifications.NotificationTriggerInput
          : options.fireDate as any;

      await Notifications.scheduleNotificationAsync({
        identifier: options.id,
        content: {
          title: options.title,
          body: options.body,
          data: options.payload || {},
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          ...(Platform.OS === 'android' && {
            channelId: NOTIFICATION_CHANNEL.channelId,
          }),
        },
        trigger,
      });
      
      console.log(`Scheduled notification: ${options.title} at ${options.fireDate.toISOString()}`);
    } catch (error) {
      console.error('Error scheduling local notification:', error);
      throw error;
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await clearScheduledNotifications();
      console.log('All notifications cancelled');
    } catch (error) {
      console.error('Error cancelling notifications:', error);
    }
  }

  /**
   * Cancel notifications for a specific reminder
   */
  async cancelReminderNotifications(reminderId: string) {
    try {
      const notificationMap = await getScheduledNotifications();
      const notificationIds = notificationMap.get(reminderId);

      if (notificationIds && notificationIds.length > 0) {
        for (const id of notificationIds) {
          await Notifications.cancelScheduledNotificationAsync(id);
        }
        
        notificationMap.delete(reminderId);
        await saveScheduledNotifications(notificationMap);
        
        console.log(`Cancelled ${notificationIds.length} notifications for reminder: ${reminderId}`);
      }
    } catch (error) {
      console.error('Error cancelling reminder notifications:', error);
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS !== 'web' && !Device.isDevice) {
        console.log('Must use physical device for notifications');
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get notification permissions');
        return false;
      }
      
      console.log('Notification permissions granted');
      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Check if notifications are enabled
   */
  async checkPermissions(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking notification permissions:', error);
      return false;
    }
  }

  /**
   * Send notification to caregiver when patient is late taking medication
   */
  async notifyCaregiver(params: {
    caregiverId: string;
    patientName: string;
    medicationName: string;
    scheduledTime: string;
  }) {
    try {
      // Create local notification for caregiver
      // Note: In a production app, you'd typically send a push notification via your backend
      // to the caregiver's device. For now, we'll just log this.
      console.log('Notifying caregiver:', params);
      
      // You would implement this to send a push notification to the caregiver's device
      // via Firebase Cloud Messaging or similar service
      // For now, this is a placeholder that logs the notification
      
      return true;
    } catch (error) {
      console.error('Error notifying caregiver:', error);
      return false;
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();

// Default export for better module resolution
export default notificationService;

// Helper functions for easier integration
export async function registerForPushNotifications(): Promise<boolean> {
  notificationService.initialize();
  return await notificationService.requestPermissions();
}

export async function scheduleReminderNotification(
  reminder: {
    id: string;
    title: string;
    dosage: string;
    time: string;
    notes?: string;
    repeatDays?: number[];
  },
  forceReschedule: boolean = false
): Promise<void> {
  // This function will be called from home.tsx to schedule notifications
  // The actual scheduling is handled by scheduleAllNotifications()
  // which is already called in the NotificationService
  console.log(`Schedule reminder notification called for ${reminder.title}`);
}

export async function cancelMedicationNotifications(medicationId: string): Promise<void> {
  await notificationService.cancelReminderNotifications(medicationId);
}

export async function dedupeMedicationNotifications(): Promise<void> {
  // Placeholder for deduplication logic
  console.log('Dedupe medication notifications called');
}

export function addNotificationResponseListener(handler: (response: any) => void): { remove: () => void } {
  // Set up the notification response listener
  const subscription = Notifications.addNotificationResponseReceivedListener(handler);
  
  return {
    remove: () => {
      subscription.remove();
      console.log('Notification listener removed');
    }
  };
}

export async function sendCaregiverNotification(params: {
  caregiverId: string;
  patientName: string;
  medicationName: string;
  scheduledTime: string;
}): Promise<void> {
  await notificationService.notifyCaregiver(params);
  
  // Also try to send via Firebase Cloud Messaging if available
  try {
    const { collection, addDoc } = await import('firebase/firestore');
    const { db } = await import('../config/firebase');
    
    // Store notification in Firestore for the caregiver
    const notificationRef = collection(db, 'users', params.caregiverId, 'notifications');
    await addDoc(notificationRef, {
      type: 'patient_late',
      patientName: params.patientName,
      medicationName: params.medicationName,
      scheduledTime: params.scheduledTime,
      message: `${params.patientName} is late taking ${params.medicationName} (scheduled at ${params.scheduledTime})`,
      read: false,
      createdAt: new Date().toISOString()
    });
    
    console.log('Caregiver notification sent to Firestore');
  } catch (error) {
    console.error('Error sending caregiver notification to Firestore:', error);
  }
}
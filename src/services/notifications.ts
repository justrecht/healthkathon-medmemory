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
  private notificationReceivedSubscription: any = null;
  private notificationResponseSubscription: any = null;

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

    // Remove any existing listeners to prevent duplicates
    if (this.notificationReceivedSubscription) {
      this.notificationReceivedSubscription.remove();
    }
    if (this.notificationResponseSubscription) {
      this.notificationResponseSubscription.remove();
    }

    // Set up notification received listener (only once)
    this.notificationReceivedSubscription = Notifications.addNotificationReceivedListener(async (notification) => {
      console.log('Notification Received:', notification);
      
      const data = notification.request.content.data as { type?: string; reminderId?: string; medicationId?: string; isWeekly?: boolean; dayOfWeek?: number };
      const { type, reminderId, medicationId, isWeekly, dayOfWeek } = data;
      
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
      
      // Reschedule weekly notifications for next week (Android workaround for calendar triggers)
      if (isWeekly && dayOfWeek !== undefined) {
        try {
          // Calculate next occurrence: same day next week at the same time
          const now = new Date();
          const currentDayOfWeek = now.getDay();
          let daysUntilNextOccurrence = dayOfWeek - currentDayOfWeek;
          
          // If it's the same day or already passed this week, schedule for next week
          if (daysUntilNextOccurrence <= 0) {
            daysUntilNextOccurrence += 7;
          }
          
          const nextWeekDate = new Date(now);
          nextWeekDate.setDate(now.getDate() + daysUntilNextOccurrence);
          
          // Preserve the original notification time
          const triggerDate = notification.request.trigger as any;
          if (triggerDate && triggerDate.date) {
            const originalDate = new Date(triggerDate.date);
            nextWeekDate.setHours(originalDate.getHours(), originalDate.getMinutes(), 0, 0);
          }
          
          console.log(`🔄 Rescheduling weekly notification for next week: ${notification.request.identifier}`);
          console.log(`   Next fire date: ${nextWeekDate.toLocaleString()}`);
          
          const trigger: Notifications.DateTriggerInput = {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: nextWeekDate,
          };
          
          await Notifications.scheduleNotificationAsync({
            identifier: notification.request.identifier,
            content: {
              title: notification.request.content.title || '',
              body: notification.request.content.body || '',
              data: notification.request.content.data,
              sound: notification.request.content.sound as any,
              priority: Notifications.AndroidNotificationPriority.MAX,
              ...(Platform.OS === 'android' && {
                channelId: NOTIFICATION_CHANNEL.channelId,
              }),
            },
            trigger,
          });
        } catch (error) {
          console.error('Error rescheduling weekly notification:', error);
        }
      }
    });

    // Set up notification response listener (when user taps notification) - only once
    this.notificationResponseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
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
    const data = notification.request.content.data as { reminderId?: string; medicationId?: string };
    const { reminderId, medicationId } = data;
    
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
      console.log('📅 Scheduling all notifications...');
      
      // Clear existing notifications
      await this.cancelAllNotifications();

      // Get UI settings to check if "before schedule" notifications are enabled
      const settings = await getUISettings(userId);
      console.log('⚙️ Notification settings:', settings);

      // Get all reminders
      const reminders = await getReminders(userId);
      console.log(`📋 Found ${reminders.length} total reminders`);

      const notificationMap = new Map<string, string[]>();
      let scheduledCount = 0;

      for (const reminder of reminders) {
        if (reminder.status !== 'scheduled') {
          console.log(`⏭️ Skipping reminder "${reminder.title}" (status: ${reminder.status})`);
          continue;
        }

        console.log(`📝 Scheduling reminder: "${reminder.title}" at ${reminder.time}`);
        // Pass settings.beforeSchedule to enable/disable the 30-min-before notification
        const notificationIds = await this.scheduleReminderNotifications(reminder, settings.beforeSchedule);
        if (notificationIds.length > 0) {
          notificationMap.set(reminder.id, notificationIds);
          scheduledCount++;
        }
      }

      // Save scheduled notification IDs
      await saveScheduledNotifications(notificationMap);
      
      console.log(`✅ Successfully scheduled notifications for ${scheduledCount} reminders (${notificationMap.size} total notification sets)`);
    } catch (error) {
      console.error('❌ Error scheduling all notifications:', error);
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

      const now = new Date();

      for (const dayOfWeek of repeatDays) {
        // Calculate next occurrence of this day
        const fireDate = this.getNextDateForDayAndTime(dayOfWeek, hours, minutes);
        
        // Create time checks for TODAY only (not next week)
        const todayScheduledTime = new Date();
        todayScheduledTime.setHours(hours, minutes, 0, 0);
        
        const todayLateTime = new Date(todayScheduledTime);
        todayLateTime.setMinutes(todayLateTime.getMinutes() + 10);
        
        const todayBeforeTime = new Date(todayScheduledTime);
        todayBeforeTime.setMinutes(todayBeforeTime.getMinutes() - 30);
        
        // Check if today is the scheduled day
        const isToday = now.getDay() === dayOfWeek;
        
        // Schedule main notification (on-time notification)
        if (isToday && now < todayScheduledTime) {
          // Today, but time hasn't passed - schedule one-time notification for today
          console.log(`📍 Scheduling one-time notification for TODAY at ${hours}:${minutes}`);
          const mainNotificationIdToday = `${reminder.id}_${dayOfWeek}_today`;
          await this.scheduleLocalNotification({
            id: mainNotificationIdToday,
            title: '💊 ' + reminder.title,
            body: `Time to take ${reminder.dosage}${reminder.notes ? ` - ${reminder.notes}` : ''}`,
            fireDate: todayScheduledTime,
            payload: {
              reminderId: reminder.id,
              medicationId: reminder.id,
              type: 'ontime'
            }
            // No repeatType - will use date trigger for one-time notification
          });
          notificationIds.push(mainNotificationIdToday);
        } else if (isToday && now >= todayScheduledTime) {
          console.log(`⏭️ Skipping on-time notification for ${reminder.title} on ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek]} - time already passed`);
        } else {
          // Different day - use repeating weekly trigger
          const mainNotificationId = `${reminder.id}_${dayOfWeek}`;
          await this.scheduleLocalNotification({
            id: mainNotificationId,
            title: '💊 ' + reminder.title,
            body: `Time to take ${reminder.dosage}${reminder.notes ? ` - ${reminder.notes}` : ''}`,
            fireDate,
            payload: {
              reminderId: reminder.id,
              medicationId: reminder.id,
              type: 'ontime',
              isWeekly: true,
              dayOfWeek: dayOfWeek
            },
            repeatType: 'week' // Repeat weekly
          });
          notificationIds.push(mainNotificationId);
        }

        // Schedule "before" notification (30 minutes before)
        if (enableBeforeNotification) {
          const beforeFireDate = new Date(fireDate);
          beforeFireDate.setMinutes(beforeFireDate.getMinutes() - 30);
          
          if (isToday && now < todayBeforeTime) {
            // Today, but before time hasn't passed - schedule one-time notification for today
            console.log(`📍 Scheduling one-time BEFORE notification for TODAY at ${todayBeforeTime.getHours()}:${todayBeforeTime.getMinutes()}`);
            const beforeNotificationIdToday = `${reminder.id}_${dayOfWeek}_before_today`;
            await this.scheduleLocalNotification({
              id: beforeNotificationIdToday,
              title: '⏰ Upcoming Medication',
              body: `${reminder.title} in 30 minutes (${reminder.dosage})`,
              fireDate: todayBeforeTime,
              payload: {
                reminderId: reminder.id,
                medicationId: reminder.id,
                type: 'before'
              }
              // No repeatType - will use date trigger for one-time notification
            });
            notificationIds.push(beforeNotificationIdToday);
          } else if (isToday && now >= todayBeforeTime) {
            console.log(`⏭️ Skipping before notification for ${reminder.title} on ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek]} - time already passed`);
          } else {
            // Different day - use repeating weekly trigger
            const beforeNotificationId = `${reminder.id}_${dayOfWeek}_before`;
            await this.scheduleLocalNotification({
              id: beforeNotificationId,
              title: '⏰ Upcoming Medication',
              body: `${reminder.title} in 30 minutes (${reminder.dosage})`,
              fireDate: beforeFireDate,
              payload: {
                reminderId: reminder.id,
                medicationId: reminder.id,
                type: 'before',
                isWeekly: true,
                dayOfWeek: dayOfWeek
              },
              repeatType: 'week'
            });
            notificationIds.push(beforeNotificationId);
          }
        }

        // Schedule "late" notification (10 minutes after scheduled time)
        if (isToday && now < todayLateTime) {
          // Today, but late time hasn't passed - schedule one-time notification for today
          console.log(`📍 Scheduling one-time LATE notification for TODAY at ${todayLateTime.getHours()}:${todayLateTime.getMinutes()}`);
          const lateNotificationIdToday = `${reminder.id}_${dayOfWeek}_late_today`;
          await this.scheduleLocalNotification({
            id: lateNotificationIdToday,
            title: '⚠️ Medication Reminder',
            body: `Did you take your ${reminder.title}? (${reminder.dosage})`,
            fireDate: todayLateTime,
            payload: {
              reminderId: reminder.id,
              medicationId: reminder.id,
              type: 'late'
            }
            // No repeatType - will use date trigger for one-time notification
          });
          notificationIds.push(lateNotificationIdToday);
        } else if (isToday && now >= todayLateTime) {
          console.log(`⏭️ Skipping late notification for ${reminder.title} on ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek]} - time already passed`);
        } else {
          // Different day - use repeating weekly trigger
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
              type: 'late',
              isWeekly: true,
              dayOfWeek: dayOfWeek
            },
            repeatType: 'week'
          });
          notificationIds.push(lateNotificationId);
        }
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
    
    // Calculate days until target day
    const currentDay = now.getDay();
    let daysUntilTarget = dayOfWeek - currentDay;
    
    // Create target date by calculating the target day first
    const targetDate = new Date(now);
    
    // If target day is today but time has passed, schedule for next week
    const tempDate = new Date(now);
    tempDate.setHours(hours, minutes, 0, 0);
    
    if (daysUntilTarget === 0 && now.getTime() > tempDate.getTime()) {
      daysUntilTarget = 7;
    } else if (daysUntilTarget < 0) {
      daysUntilTarget += 7;
    }
    
    // Set the target day
    targetDate.setDate(now.getDate() + daysUntilTarget);
    // Then set the time in local timezone
    targetDate.setHours(hours, minutes, 0, 0);
    
    console.log(`📅 Calculated next occurrence: Day ${dayOfWeek}, ${hours}:${String(minutes).padStart(2, '0')} => ${targetDate.toLocaleString()}`);
    
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
      // Calendar triggers are not supported on Android
      // All notifications will use date triggers with proper format
      // For weekly repeating, we schedule for next occurrence and handle repetition manually
      const trigger: Notifications.DateTriggerInput = {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: options.fireDate,
      };

      const notificationId = await Notifications.scheduleNotificationAsync({
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
      
      const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayName = weekdayNames[options.fireDate.getDay()];
      console.log(`✅ Scheduled notification [${notificationId}]: "${options.title}"`);
      console.log(`   Day: ${dayName} (${options.fireDate.getDay()}) at ${options.fireDate.getHours()}:${String(options.fireDate.getMinutes()).padStart(2, '0')}`);
      console.log(`   Repeats: ${options.repeatType === 'week' ? 'weekly' : 'once'}`);
    } catch (error) {
      console.error('❌ Error scheduling local notification:', error);
      console.error('   Options:', options);
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
  await notificationService.initialize();
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
  // Schedule notifications for all reminders
  await notificationService.scheduleAllNotifications();
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
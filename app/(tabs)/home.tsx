import { FontAwesome6 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ReminderShimmer } from "../../src/components/shimmer";
import {
  GradientChip,
  SectionHeader,
  Surface,
  ThemedText,
} from "../../src/components/ui";
import { confirmMedication, getCaregivers, getReminders, updateReminderStatus } from "../../src/services/api";
import {
  addNotificationResponseListener,
  registerForPushNotifications,
  scheduleReminderNotification,
  sendCaregiverNotification,
} from "../../src/services/notifications";
import {
  calculateAdherence,
  getDailyAdherence,
  saveMedicationRecord,
  type MedicationRecord,
} from "../../src/services/storage";
import { useTheme } from "../../src/theme";

const adherence = [
  { label: "Sen", value: 92 },
  { label: "Sel", value: 94 },
  { label: "Rab", value: 88 },
  { label: "Kam", value: 96 },
  { label: "Jum", value: 91 },
  { label: "Sab", value: 89 },
  { label: "Min", value: 95 },
];

export default function HomeScreen() {
  const { theme } = useTheme();
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adherenceData, setAdherenceData] = useState(adherence);
  const [adherencePercentage, setAdherencePercentage] = useState(94);
  const [activeRemindersCount, setActiveRemindersCount] = useState(3);
  const [caregivers, setCaregivers] = useState<any[]>([]);

  useEffect(() => {
    // Request notification permissions
    registerForPushNotifications();

    // Load initial data
    loadData();

    // Set up notification response listener
    const subscription = addNotificationResponseListener((response) => {
      const { medicationId, type } = response.notification.request.content.data as { medicationId: string; type: string };
      console.log("Notification tapped:", type, medicationId);
      
      if (type === "ontime" || type === "after") {
        // Navigate to confirmation or show alert
        Alert.alert(
          "Konfirmasi Minum Obat",
          "Apakah Anda sudah minum obat?",
          [
            { text: "Belum", style: "cancel" },
            { text: "Sudah", onPress: () => handleConfirmMedication(medicationId) },
          ]
        );
      }
    });

    // Schedule notifications for all reminders
    scheduleAllNotifications();

    return () => {
      subscription.remove();
    };
  }, []);

  async function loadData() {
    try {
      const [remindersData, adherencePercent, dailyData, caregiversData] = await Promise.all([
        getReminders(),
        calculateAdherence(7),
        getDailyAdherence(7),
        getCaregivers(),
      ]);

      setReminders(remindersData);
      setAdherencePercentage(adherencePercent);
      setCaregivers(caregiversData);
      
      if (dailyData.length > 0) {
        setAdherenceData(dailyData);
      }

      const activeCount = remindersData.filter((r: any) => r.status === "scheduled").length;
      setActiveRemindersCount(activeCount);

      setLoading(false);
    } catch (err) {
      console.error("Failed to load data:", err);
      setLoading(false);
    }
  }

  async function scheduleAllNotifications() {
    try {
      const remindersData = await getReminders();
      for (const reminder of remindersData) {
        if (reminder.status === "scheduled") {
          await scheduleReminderNotification({
            id: reminder.id,
            title: reminder.title,
            dosage: reminder.dosage,
            time: reminder.time,
            notes: reminder.notes,
          });
        }
      }
    } catch (error) {
      console.error("Error scheduling notifications:", error);
    }
  }

  async function handleConfirmMedication(medicationId?: string) {
    const targetId = medicationId || nextReminder.id;
    if (!targetId) return;

    try {
      // Confirm via API
      await confirmMedication(targetId);
      
      // Update local status
      await updateReminderStatus(targetId, "taken");
      
      // Save to history
      const reminder = reminders.find((r) => r.id === targetId);
      if (reminder) {
        const record: MedicationRecord = {
          id: `${targetId}-${Date.now()}`,
          medicationId: targetId,
          medicationName: reminder.title,
          dosage: reminder.dosage,
          scheduledTime: reminder.time,
          takenAt: new Date().toISOString(),
          status: "taken",
          date: new Date().toISOString(),
          confirmedBy: "user",
        };
        await saveMedicationRecord(record);
      }

      // Update UI
      setReminders((prev) =>
        prev.map((r) => (r.id === targetId ? { ...r, status: "taken" } : r))
      );

      // Refresh adherence data
      const newAdherence = await calculateAdherence(7);
      setAdherencePercentage(newAdherence);
      
      const dailyData = await getDailyAdherence(7);
      if (dailyData.length > 0) {
        setAdherenceData(dailyData);
      }

      Alert.alert("Berhasil", "Konsumsi obat telah dikonfirmasi!");
    } catch (error) {
      console.error("Error confirming medication:", error);
      Alert.alert("Error", "Gagal mengonfirmasi konsumsi obat");
    }
  }

  // Check for missed medications and notify caregivers
  useEffect(() => {
    const checkMissedMedications = setInterval(async () => {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
      
      for (const reminder of reminders) {
        if (reminder.status === "scheduled") {
          const [schedHour, schedMin] = reminder.time.split(":").map(Number);
          const scheduledTime = new Date();
          scheduledTime.setHours(schedHour, schedMin, 0, 0);
          
          // If 30 minutes past scheduled time and not confirmed
          const timeDiff = now.getTime() - scheduledTime.getTime();
          if (timeDiff > 30 * 60 * 1000 && timeDiff < 35 * 60 * 1000) {
            // Notify caregivers
            const activeCaregivers = caregivers.filter((c) => c.status === "active");
            for (const caregiver of activeCaregivers) {
              await sendCaregiverNotification(
                caregiver.name,
                reminder.title,
                "Pasien"
              );
            }
          }
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(checkMissedMedications);
  }, [reminders, caregivers]);

  const nextReminder = reminders[0] || {
    title: "Belum ada pengingat",
    time: "--:--",
    dosage: "-",
    notes: "Tambahkan pengingat pertama Anda",
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}
        showsVerticalScrollIndicator={false}
      >
        <Surface padding={false}>
          <LinearGradient
            colors={theme.colors.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", width: "100%" }}>
              <ThemedText variant="title" weight="700" style={{ color: "white" }}>
                MedMemory
              </ThemedText>
              <FontAwesome6 name="bell" color="white" size={24} />
            </View>
            <Text style={styles.heroSubtitle}>Pendamping terapi untuk peserta JKN</Text>
            <View style={styles.heroTags}>
              <GradientChip label={`Kepatuhan ${adherencePercentage}%`} />
              <GradientChip label={`${activeRemindersCount} pengingat aktif`} />
            </View>
          </LinearGradient>
        </Surface>

        <Surface>
          <SectionHeader
            title="Dosis berikutnya"
            subtitle="Sinkron dengan jadwal Prolanis"
            actionLabel="Detail"
          />
          <View style={styles.nextDoseRow}>
            <View style={[styles.pillIcon, { backgroundColor: theme.colors.cardMuted }]}>
              <FontAwesome6 name="pills" color={theme.colors.accent} size={18} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText variant="subheading" weight="600">
                {nextReminder.title}
              </ThemedText>
              <ThemedText variant="caption" color="secondary">{nextReminder.dosage}</ThemedText>
              <ThemedText variant="caption" color="muted">{nextReminder.notes}</ThemedText>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <ThemedText variant="subheading" weight="600">
                {nextReminder.time}
              </ThemedText>
              <ThemedText variant="caption" color="muted">
                hari ini
              </ThemedText>
            </View>
          </View>
          <Pressable
            style={[styles.primaryButton, { backgroundColor: theme.colors.accent }]}
            onPress={() => handleConfirmMedication()}
          >
            <Text style={[styles.primaryButtonText, { fontFamily: theme.typography.fontFamily }]}>Konfirmasi minum obat</Text>
          </Pressable>
        </Surface>

        <Surface>
          <SectionHeader title="Timeline terapi" subtitle="Catatan konsumsi 7 hari" />
          {/* Compact histogram so pasien dapat memantau pola kepatuhan mingguan */}
          <View style={styles.timelineRow}>
            {adherenceData.map((day) => (
              <View key={day.label} style={styles.timelineColumn}>
                <View
                  style={[
                    styles.timelineBarContainer,
                    { backgroundColor: theme.colors.cardMuted },
                  ]}
                >
                  <LinearGradient
                    colors={theme.colors.gradient}
                    start={{ x: 0, y: 1 }}
                    end={{ x: 0, y: 0 }}
                    style={{
                      height: `${day.value}%`,
                      borderRadius: theme.radius.md,
                      width: "100%",
                    }}
                  />
                </View>
                <ThemedText variant="caption" color="muted" style={{ marginTop: 8 }}>
                  {day.label}
                </ThemedText>
              </View>
            ))}
          </View>
        </Surface>

        <Surface>
          <SectionHeader title="Pengingat hari ini" actionLabel="Lihat semua" />
          {loading ? (
            <ReminderShimmer />
          ) : (
            <View style={{ gap: theme.spacing.md }}>
              {reminders.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.reminderRow,
                    {
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.reminderIcon,
                      { backgroundColor: theme.colors.cardMuted },
                    ]}
                  >
                    <FontAwesome6 name="clock" color={theme.colors.accent} size={16} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText weight="600">{item.title}</ThemedText>
                    <ThemedText color="muted">{item.notes}</ThemedText>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <ThemedText>{item.time}</ThemedText>
                    <Text style={[styles.statusChip, styles[item.status as keyof typeof styles]]}>{item.status}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Surface>

        <Surface>
          <SectionHeader title="Pemantauan keluarga" subtitle="Caregiver menerima notifikasi" />
          {caregivers.filter((c) => c.status === "active").map((caregiver) => (
            <View key={caregiver.id} style={styles.caregiverRow}>
              <View style={{ flex: 1 }}>
                <ThemedText weight="500">{caregiver.name}</ThemedText>
                <ThemedText variant="caption" color="muted">{caregiver.role} | {caregiver.contact}</ThemedText>
              </View>
              <FontAwesome6 name="shield-halved" color={theme.colors.success} size={20} />
            </View>
          ))}
          <View style={styles.caregiverActions}>
            <Surface muted padding={true} style={{ flex: 1 }}>
              <View style={styles.actionContent}>
                <FontAwesome6 name="chart-line" color={theme.colors.accent} size={16} />
                <ThemedText variant="caption">Riwayat konsumsi</ThemedText>
              </View>
            </Surface>
            <Surface muted padding={true} style={{ flex: 1 }}>
              <View style={styles.actionContent}>
                <FontAwesome6 name="stethoscope" color={theme.colors.accent} size={16} />
                <ThemedText>Konsultasi klinik</ThemedText>
              </View>
            </Surface>
          </View>
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: {
    padding: 24,
    borderRadius: 24,
    minHeight: 160,
    justifyContent: "center",
    alignItems: "flex-start",
    gap: 16,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 16,
    lineHeight: 24,
  },
  heroTags: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  nextDoseRow: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  pillIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  primaryButton: {
    backgroundColor: "#0F172A",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "white",
    fontWeight: "600",
  },
  timelineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  timelineColumn: {
    alignItems: "center",
    flex: 1,
  },
  timelineBarContainer: {
    width: "100%",
    height: 80,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(226,232,240,0.4)",
  },
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    gap: 12,
    borderBottomWidth: 0.5,
  },
  reminderIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(30,143,225,0.08)",
  },
  statusChip: {
    marginTop: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    textTransform: "capitalize",
    fontWeight: "500",
    fontSize: 11,
    fontFamily: "Geist",
  },
  scheduled: {
    backgroundColor: "rgba(30,143,225,0.12)",
    color: "#1E8FE1",
  },
  taken: {
    backgroundColor: "rgba(12,186,135,0.12)",
    color: "#00C48C",
  },
  missed: {
    backgroundColor: "rgba(255,107,107,0.12)",
    color: "#FF6B6B",
  },
  caregiverRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  caregiverActions: {
    flexDirection: "row",
    gap: 12,
  },
  actionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
});

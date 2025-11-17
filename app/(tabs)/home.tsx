import {
    AlarmClockIcon,
    Calendar01Icon,
    MedicineBottle01Icon,
    ReminderIcon,
} from "@hugeicons/react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "../../src/components/Card";
import { SectionHeader } from "../../src/components/SectionHeader";
import { adherenceHighlights, caregiverAlerts, todaysReminders } from "../../src/data/mockData";
import type { AppTheme } from "../../src/theme";
import { useTheme } from "../../src/theme";

export default function HomeScreen() {
  const { theme } = useTheme();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={styles.wrapper}>
        <LinearGradient colors={theme.gradient} style={styles.hero}>
          <Text style={styles.heroLabel}>MedMemory</Text>
          <Text style={styles.heroTitle}>Pengingat obat terintegrasi Prolanis</Text>
          <Text style={styles.heroSubtitle}>
            Jadwalkan terapi, catat kepatuhan, dan kirim update otomatis ke keluarga serta faskes JKN.
          </Text>
          <View style={styles.heroBadges}>
            <View style={styles.badge}>
              <AlarmClockIcon color="#FFFFFF" size={20} variant="stroke" />
              <Text style={styles.badgeText}>3 pengingat hari ini</Text>
            </View>
            <View style={styles.badge}>
              <Calendar01Icon color="#FFFFFF" size={20} variant="stroke" />
              <Text style={styles.badgeText}>Sinkron Prolanis</Text>
            </View>
          </View>
        </LinearGradient>

        <Card style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>{adherenceHighlights.adherencePercent}%</Text>
              <Text style={[styles.statLabel, { color: theme.subtext }]}>Kepatuhan Minggu Ini</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>{adherenceHighlights.streakDays} hari</Text>
              <Text style={[styles.statLabel, { color: theme.subtext }]}>Streak tertib minum obat</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>{adherenceHighlights.missedThisWeek}</Text>
              <Text style={[styles.statLabel, { color: theme.subtext }]}>Obat terlewat</Text>
            </View>
          </View>
        </Card>

        <SectionHeader title="Jadwal Hari Ini" subtitle="Notifikasi sebelum, saat, dan setelah jadwal" actionLabel="Lihat semua" onPressAction={() => {}} />
        <Card>
          {todaysReminders.map((reminder, index) => {
            const isLast = index === todaysReminders.length - 1;
            return (
              <View
                key={reminder.id}
                style={[styles.reminderRow, !isLast && { borderBottomColor: theme.border, borderBottomWidth: 1 }]}
              >
                <View style={styles.reminderIcon}>
                  <MedicineBottle01Icon color={theme.accent} size={28} variant="stroke" />
                </View>
                <View style={styles.reminderMeta}>
                  <Text style={[styles.reminderName, { color: theme.text }]}>{reminder.name}</Text>
                  <Text style={[styles.reminderDosage, { color: theme.subtext }]}>
                    {reminder.dosage} • {reminder.notes ?? "Tanpa catatan"}
                  </Text>
                </View>
                <View style={styles.reminderStatus}>
                  <Text style={[styles.reminderTime, { color: theme.text }]}>{reminder.time}</Text>
                  <View style={[styles.statusBadge, getStatusStyles(reminder.status, theme)]}>
                    <Text
                      style={[
                        styles.statusText,
                        { color: theme.name === "dark" ? theme.text : "#0F172A" },
                      ]}
                    >
                      {formatStatus(reminder.status)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </Card>

        <SectionHeader title="Alert Caregiver" subtitle="Keluarga dan faskes menerima update otomatis" />
        <Card>
          {caregiverAlerts.map((alert, index) => (
            <View
              key={alert.id}
              style={[styles.caregiverRow, index !== caregiverAlerts.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: 1 }]}
            >
              <View style={styles.caregiverIcon}>
                <ReminderIcon color={theme.accent} size={22} variant="stroke" />
              </View>
              <View style={styles.caregiverMeta}>
                <Text style={[styles.caregiverName, { color: theme.text }]}>{alert.name}</Text>
                <Text style={[styles.caregiverRelation, { color: theme.subtext }]}>{alert.relation}</Text>
              </View>
              <View style={styles.caregiverStatus}>
                <Text style={[styles.caregiverNote, { color: theme.text }]}>{alert.status}</Text>
                <Text style={[styles.caregiverTime, { color: theme.subtext }]}>{alert.timestamp}</Text>
              </View>
            </View>
          ))}
        </Card>
      </View>
    </ScrollView>
  );
}

function formatStatus(status: string) {
  if (status === "taken") return "Selesai";
  if (status === "missed") return "Terlewat";
  return "Terjadwal";
}

function getStatusStyles(status: "scheduled" | "taken" | "missed", theme: AppTheme) {
  if (status === "taken") {
    return { backgroundColor: theme.pill, borderColor: "transparent" };
  }

  if (status === "missed") {
    return { backgroundColor: "rgba(240, 68, 56, 0.12)", borderColor: "transparent" };
  }

  return { backgroundColor: "rgba(10, 139, 255, 0.12)", borderColor: "transparent" };
}

const styles = StyleSheet.create({
  wrapper: {
    padding: 20,
    gap: 20,
  },
  hero: {
    borderRadius: 28,
    padding: 24,
  },
  heroLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "600",
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "700",
    marginTop: 4,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.9)",
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
  },
  heroBadges: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  badgeText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 13,
  },
  statsCard: {
    padding: 18,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  statItem: {
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 13,
    marginTop: 4,
  },
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    gap: 14,
  },
  reminderIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(20, 216, 114, 0.12)",
  },
  reminderMeta: {
    flex: 1,
  },
  reminderName: {
    fontSize: 16,
    fontWeight: "600",
  },
  reminderDosage: {
    fontSize: 13,
    marginTop: 4,
  },
  reminderStatus: {
    alignItems: "flex-end",
  },
  reminderTime: {
    fontSize: 15,
    fontWeight: "600",
  },
  statusBadge: {
    marginTop: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "600",
  },
  caregiverRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    gap: 12,
  },
  caregiverIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(10, 139, 255, 0.12)",
  },
  caregiverMeta: {
    flex: 1,
  },
  caregiverName: {
    fontSize: 15,
    fontWeight: "600",
  },
  caregiverRelation: {
    fontSize: 13,
    marginTop: 3,
  },
  caregiverStatus: {
    flex: 1,
  },
  caregiverNote: {
    fontSize: 14,
    fontWeight: "600",
  },
  caregiverTime: {
    fontSize: 12,
    marginTop: 4,
    textAlign: "right",
  },
});

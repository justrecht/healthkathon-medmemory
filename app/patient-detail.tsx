import { FontAwesome6 } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GradientChip, SectionHeader, Surface, ThemedText } from "../src/components/ui";
import { db } from "../src/config/firebase";
import {
  calculateAdherence,
  getMedicationHistory,
  getReminders,
  type MedicationRecord,
  type Reminder
} from "../src/services/storage";
import { useTheme } from "../src/theme";

export default function PatientDetailScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<any>(null);
  const [adherence, setAdherence] = useState(0);
  const [history, setHistory] = useState<MedicationRecord[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);

  useEffect(() => {
    if (patientId) {
      loadPatientData();
    }
  }, [patientId]);

  async function loadPatientData() {
    try {
      // 1. Get Patient Profile
      const userDoc = await getDoc(doc(db, "users", patientId));
      if (userDoc.exists()) {
        setPatient(userDoc.data());
      }

      // 2. Get Stats
      const [adherenceScore, historyData, remindersData] = await Promise.all([
        calculateAdherence(7, patientId),
        getMedicationHistory(7, patientId),
        getReminders(patientId)
      ]);

      setAdherence(adherenceScore);
      setHistory(historyData);
      setReminders(remindersData);
    } catch (error) {
      console.error("Error loading patient data:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'right', 'bottom', 'left']}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Custom Header */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 16, 
        paddingVertical: 12,
        backgroundColor: theme.colors.background,
        borderBottomWidth: 0,
      }}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ marginRight: 16 }}>
          <FontAwesome6 name="arrow-left" color={theme.colors.textPrimary} size={18} />
        </Pressable>
        <ThemedText style={{ fontSize: 18, fontWeight: '700' }}>Detail Pasien</ThemedText>
      </View>
      
      <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
        {/* Patient Header */}
        <Surface>
          <View style={styles.headerRow}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.cardMuted }]}>
              <FontAwesome6 name="user" color={theme.colors.accent} size={24} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText variant="subheading" weight="600">{patient?.name || "Pasien"}</ThemedText>
              <ThemedText variant="caption" color="muted">{patient?.email}</ThemedText>
            </View>
            <GradientChip label={`Konsistensi ${adherence}%`} />
          </View>
        </Surface>

        {/* Stats Overview */}
        <Surface>
          <SectionHeader title="Ringkasan Mingguan" subtitle="7 hari terakhir" />
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: theme.colors.cardMuted }]}>
              <FontAwesome6 name="pills" color={theme.colors.accent} size={20} />
              <ThemedText variant="heading" weight="700" style={{ marginTop: 8 }}>{history.filter(h => h.status === 'taken').length}</ThemedText>
              <ThemedText variant="caption" color="muted">Obat Diminum</ThemedText>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.colors.cardMuted }]}>
              <FontAwesome6 name="triangle-exclamation" color={theme.colors.danger} size={20} />
              <ThemedText variant="heading" weight="700" style={{ marginTop: 8 }}>{history.filter(h => h.status === 'missed').length}</ThemedText>
              <ThemedText variant="caption" color="muted">Terlewat</ThemedText>
            </View>
          </View>
        </Surface>

        {/* Active Reminders */}
        <Surface>
          <SectionHeader title="Jadwal Obat" subtitle="Pengingat aktif pasien" />
          {reminders.length > 0 ? (
            <View style={{ gap: 12 }}>
              {reminders.map((reminder) => {
                const getDayLabels = (repeatDays?: number[]) => {
                  if (!repeatDays || repeatDays.length === 0) return "Tidak ada hari";
                  if (repeatDays.length === 7) return "Setiap hari";
                  const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
                  return repeatDays.map(d => dayNames[d]).join(", ");
                };

                return (
                  <View key={reminder.id} style={[styles.reminderRow, { borderBottomColor: theme.colors.border }]}>
                    <View style={[styles.iconBox, { backgroundColor: theme.colors.cardMuted }]}>
                      <FontAwesome6 name="clock" color={theme.colors.accent} size={14} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText weight="600">{reminder.title}</ThemedText>
                      <ThemedText variant="caption" color="secondary">{getDayLabels(reminder.repeatDays)}</ThemedText>
                      <ThemedText variant="caption" color="muted">{reminder.dosage}</ThemedText>
                    </View>
                    <ThemedText weight="600">{reminder.time}</ThemedText>
                  </View>
                );
              })}
            </View>
          ) : (
            <ThemedText color="muted" style={{ textAlign: 'center', padding: 16 }}>Belum ada jadwal obat</ThemedText>
          )}
        </Surface>

        {/* Recent History */}
        <Surface>
          <SectionHeader title="Riwayat Terakhir" subtitle="Aktivitas konsumsi obat" />
          {history.length > 0 ? (
            <View style={{ gap: 12 }}>
              {history.slice(0, 5).map((record) => (
                <View key={record.id} style={[styles.historyRow, { borderBottomColor: theme.colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <ThemedText weight="500">{record.medicationName}</ThemedText>
                    <ThemedText variant="caption" color="muted">
                      {new Date(record.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })} • {record.scheduledTime}
                    </ThemedText>
                  </View>
                  <View style={[
                    styles.statusBadge, 
                    { backgroundColor: record.status === 'taken' ? 'rgba(16, 217, 157, 0.1)' : 'rgba(255, 133, 133, 0.1)' }
                  ]}>
                    <ThemedText 
                      variant="caption" 
                      weight="600" 
                      style={{ color: record.status === 'taken' ? '#10D99D' : '#FF8585' }}
                    >
                      {record.status === 'taken' ? 'Diminum' : 'Terlewat'}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <ThemedText color="muted" style={{ textAlign: 'center', padding: 16 }}>Belum ada riwayat</ThemedText>
          )}
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
});

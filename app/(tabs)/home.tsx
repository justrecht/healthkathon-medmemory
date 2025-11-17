import { FontAwesome6 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ReminderShimmer } from "../../src/components/shimmer";
import {
  GradientChip,
  SectionHeader,
  Surface,
  ThemedText,
} from "../../src/components/ui";
import { getReminders } from "../../src/services/api";
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

  useEffect(() => {
    getReminders()
      .then((data) => {
        setReminders(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch reminders:", err);
        setLoading(false);
      });
  }, []);

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
              <GradientChip label="Kepatuhan 94%" />
              <GradientChip label="3 pengingat aktif" />
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
            style={[styles.primaryButton, { backgroundColor: theme.colors.textPrimary }]}
          >
            <Text style={[styles.primaryButtonText, { fontFamily: theme.typography.fontFamily }]}>Konfirmasi minum obat</Text>
          </Pressable>
        </Surface>

        <Surface>
          <SectionHeader title="Timeline terapi" subtitle="Catatan konsumsi 7 hari" />
          {/* Compact histogram so pasien dapat memantau pola kepatuhan mingguan */}
          <View style={styles.timelineRow}>
            {adherence.map((day) => (
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
          <View style={styles.caregiverRow}>
            <View style={{ flex: 1 }}>
              <ThemedText weight="500">Rina Mulyani</ThemedText>
              <ThemedText variant="caption" color="muted">Anak | +62 812-1234-5678</ThemedText>
            </View>
            <FontAwesome6 name="shield-halved" color={theme.colors.success} size={20} />
          </View>
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

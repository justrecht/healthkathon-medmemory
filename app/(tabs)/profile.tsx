import {
    Calendar01Icon,
    HeartAddIcon,
    Settings01Icon,
    Shield01Icon,
    UserStar01Icon,
} from "@hugeicons/react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "../../src/components/Card";
import { SectionHeader } from "../../src/components/SectionHeader";
import { quickActions } from "../../src/data/mockData";
import { useTheme } from "../../src/theme";

export default function ProfileScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={styles.wrapper}>
        <Card>
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.name, { color: theme.text }]}>Lansia Budi Santosa</Text>
              <Text style={[styles.meta, { color: theme.subtext }]}>Peserta JKN • Prolanis Diabetes</Text>
            </View>
            <Pressable style={[styles.settingsButton, { borderColor: theme.border }]} onPress={() => router.push("/settings")}>
              <Settings01Icon color={theme.text} size={22} variant="stroke" />
            </Pressable>
          </View>

          <LinearGradient colors={theme.gradient} style={styles.profileCard}>
            <View>
              <Text style={styles.profileTitle}>Skor Ketaatan</Text>
              <Text style={styles.profileScore}>92%</Text>
              <Text style={styles.profileCaption}>Terintegrasi laporan Prolanis JKN</Text>
            </View>
            <View style={styles.profileBadge}>
              <Shield01Icon color="#ffffff" size={24} variant="stroke" />
              <Text style={styles.profileBadgeText}>Kontrol stabil</Text>
            </View>
          </LinearGradient>
        </Card>

        <SectionHeader title="Aksi Cepat" subtitle="Catat kebutuhan terapi tanpa membuka menu lain" />
        <View style={styles.grid}>
          {quickActions.map((action) => (
            <Card key={action.id} style={styles.gridCard}>
              <Text style={[styles.gridLabel, { color: theme.text }]}>{action.label}</Text>
              <Text style={[styles.gridHint, { color: theme.subtext }]}>Tap untuk lanjut</Text>
            </Card>
          ))}
        </View>

        <SectionHeader title="Agenda Klinik" subtitle="Konsultasi dan telemedis untuk keluarga" />
        <Card>
          <View style={styles.agendaRow}>
            <View style={styles.agendaIcon}>
              <Calendar01Icon color={theme.accent} size={24} variant="stroke" />
            </View>
            <View style={styles.agendaMeta}>
              <Text style={[styles.agendaTitle, { color: theme.text }]}>Kontrol Prolanis</Text>
              <Text style={[styles.agendaSubtitle, { color: theme.subtext }]}>Rabu, 20 Nov 2025 • 19.00 WIB</Text>
            </View>
            <View style={styles.agendaStatus}>
              <Text style={[styles.agendaBadge, { color: theme.accent }]}>Online</Text>
            </View>
          </View>
        </Card>

        <SectionHeader title="Program Keluarga" subtitle="Caregiver menerima update otomatis" />
        <Card>
          <View style={styles.familyRow}>
            <View style={styles.familyIcon}>
              <UserStar01Icon color={theme.accent} size={24} variant="stroke" />
            </View>
            <View style={styles.familyMeta}>
              <Text style={[styles.familyTitle, { color: theme.text }]}>Anisa Pratiwi</Text>
              <Text style={[styles.familySubtitle, { color: theme.subtext }]}>Monitoring jarak jauh siap digunakan</Text>
            </View>
            <View>
              <HeartAddIcon color={theme.accent} size={22} variant="stroke" />
            </View>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    padding: 20,
    gap: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
  },
  meta: {
    fontSize: 14,
    marginTop: 4,
  },
  settingsButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  profileCard: {
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  profileTitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "600",
  },
  profileScore: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "700",
    marginTop: 6,
  },
  profileCaption: {
    color: "rgba(255,255,255,0.85)",
    marginTop: 8,
    fontSize: 14,
  },
  profileBadge: {
    alignItems: "flex-end",
  },
  profileBadgeText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
    marginTop: 8,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  gridCard: {
    width: "47%",
    padding: 18,
  },
  gridLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  gridHint: {
    fontSize: 13,
    marginTop: 6,
  },
  agendaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  agendaIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "rgba(10, 139, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  agendaMeta: {
    flex: 1,
  },
  agendaTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  agendaSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  agendaStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(20,216,114,0.12)",
  },
  agendaBadge: {
    fontWeight: "700",
  },
  familyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  familyIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: "rgba(65, 242, 157, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  familyMeta: {
    flex: 1,
  },
  familyTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  familySubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
});

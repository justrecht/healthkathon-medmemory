import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
    DarkModeIcon,
    Notification01Icon,
    ReminderIcon,
    SecurityIcon,
} from "hugeicons-react-native";
import { ReactNode, useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { Card } from "../src/components/Card";
import { SectionHeader } from "../src/components/SectionHeader";
import { useTheme } from "../src/theme";

export default function SettingsScreen() {
  const { theme, themeName, toggleTheme } = useTheme();
  const router = useRouter();
  const [notifDaily, setNotifDaily] = useState(true);
  const [notifCaregiver, setNotifCaregiver] = useState(true);

  const handleThemeChange = () => {
    toggleTheme();
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentInsetAdjustmentBehavior="automatic">
      <View style={styles.wrapper}>
        <Text style={[styles.pageLabel, { color: theme.subtext }]} onPress={() => router.back()}>
          Kembali
        </Text>
        <Text style={[styles.pageTitle, { color: theme.text }]}>Pengaturan</Text>
        <Text style={[styles.pageSubtitle, { color: theme.subtext }]}>Kelola tema, notifikasi, dan akses caregiver</Text>

        <LinearGradient colors={theme.gradient} style={styles.topCard}>
          <Text style={styles.topCardTitle}>Tema aplikasi</Text>
          <View style={styles.topCardRow}>
            <DarkModeIcon color="#FFFFFF" size={24} variant="stroke" />
            <Text style={styles.topCardValue}>{themeName === "dark" ? "Mode Gelap" : "Mode Terang"}</Text>
            <Switch value={themeName === "dark"} onValueChange={handleThemeChange} thumbColor="#FFFFFF" trackColor={{ false: "rgba(255,255,255,0.3)", true: "#2ed98b" }} />
          </View>
        </LinearGradient>

        <SectionHeader title="Notifikasi" subtitle="Sesuai kebutuhan jadwal terapi" />
        <Card>
          <PreferenceRow
            icon={<Notification01Icon color={theme.accent} size={22} variant="stroke" />}
            title="Reminder harian"
            subtitle="Pengingat sebelum dan setelah jadwal"
            value={notifDaily}
            onChange={setNotifDaily}
          />
          <PreferenceRow
            icon={<ReminderIcon color={theme.accent} size={22} variant="stroke" />}
            title="Alert ke Caregiver"
            subtitle="Kirim notifikasi jika obat terlewat"
            value={notifCaregiver}
            onChange={setNotifCaregiver}
            isLast
          />
        </Card>

        <SectionHeader title="Keamanan" subtitle="Akses JKN dan caregiver" />
        <Card>
          <View style={styles.securityRow}>
            <View style={styles.securityIcon}>
              <SecurityIcon color={theme.accent} size={26} variant="stroke" />
            </View>
            <View style={styles.securityMeta}>
              <Text style={[styles.securityTitle, { color: theme.text }]}>PIN & Verifikasi</Text>
              <Text style={[styles.securitySubtitle, { color: theme.subtext }]}>Gunakan PIN 6 digit sebelum mengubah data obat</Text>
            </View>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}

type PreferenceRowProps = {
  icon: ReactNode;
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (next: boolean) => void;
  isLast?: boolean;
};

function PreferenceRow({ icon, title, subtitle, value, onChange, isLast }: PreferenceRowProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.preferenceRow,
        {
          borderBottomColor: isLast ? "transparent" : theme.border,
          borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      <View style={styles.preferenceIcon}>{icon}</View>
      <View style={styles.preferenceMeta}>
        <Text style={[styles.preferenceTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.preferenceSubtitle, { color: theme.subtext }]}>{subtitle}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} thumbColor="#FFFFFF" trackColor={{ false: "#CBD5F5", true: theme.accent }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    padding: 20,
    gap: 20,
  },
  pageLabel: {
    fontSize: 14,
    marginBottom: 12,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "700",
  },
  pageSubtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  topCard: {
    borderRadius: 24,
    padding: 20,
    gap: 12,
  },
  topCardTitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
  },
  topCardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  topCardValue: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    marginLeft: 10,
  },
  preferenceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
  },
  preferenceIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "rgba(10,139,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  preferenceMeta: {
    flex: 1,
  },
  preferenceTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  preferenceSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  securityRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  securityIcon: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: "rgba(65, 242, 157, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  securityMeta: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  securitySubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
});

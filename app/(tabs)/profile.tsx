import { FontAwesome6 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProfileShimmer } from "../../src/components/shimmer";
import { GradientChip, SectionHeader, Surface, ThemedText } from "../../src/components/ui";
import { getCaregivers, getUserProfile } from "../../src/services/api";
import { useTheme } from "../../src/theme";

export default function ProfileScreen() {
  const { theme, mode } = useTheme();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [caregivers, setCaregivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getUserProfile(), getCaregivers()])
      .then(([profile, caregiverData]) => {
        setUserProfile(profile);
        setCaregivers(caregiverData);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch profile data:", err);
        setLoading(false);
      });
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: false,
          headerTitle: "Profil",
          headerStyle: { backgroundColor: theme.colors.background },
          headerTitleStyle: { color: theme.colors.textPrimary, fontWeight: "600" },
          headerRight: () => (
            <Pressable onPress={() => router.push("/settings" as const)} hitSlop={12}>
              <FontAwesome6 name="gear" color={theme.colors.textPrimary} size={22} />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}>
        <Surface>
          {loading ? (
            <ProfileShimmer />
          ) : (
            <>
              <View style={styles.userRow}>
                <View style={[styles.avatar, { backgroundColor: theme.colors.cardMuted }]}>
                  <FontAwesome6 name="user" color={theme.colors.accent} size={24} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="subheading" weight="600">
                    {userProfile?.name || "Pengguna"}
                  </ThemedText>
                  <ThemedText variant="caption" color="muted">{userProfile?.program || "Peserta JKN"}</ThemedText>
                </View>
                <GradientChip label="Level stabil" />
              </View>
              <View style={styles.statRow}>
                <StatItem
                  label="Kepatuhan"
                  value={userProfile?.adherence || "0%"}
                  caption="7 hari terakhir"
                />
                <StatItem
                  label="Obat aktif"
                  value={userProfile?.activeMeds || "0"}
                  caption="Terjadwal"
                />
                <StatItem
                  label="Visit klinik"
                  value={userProfile?.visits || "0"}
                  caption="Bulan ini"
                />
              </View>
            </>
          )}
        </Surface>

        <Surface>
          <SectionHeader title="Preferensi tampilan" subtitle="Light / Dark mode" />
          <View style={styles.preferenceCard}>
            <LinearGradient colors={theme.colors.gradient} style={styles.preferenceIcon}>
              <FontAwesome6 name={mode === "dark" ? "moon" : "sun"} color="white" size={18} />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <ThemedText weight="500">Mode {mode === "dark" ? "Gelap" : "Terang"}</ThemedText>
              <ThemedText variant="caption" color="muted">Atur tema pada layar pengaturan</ThemedText>
            </View>
          </View>
        </Surface>

        <Surface>
          <SectionHeader title="Tim pendamping" subtitle="Caregiver & tenaga kesehatan" />
          <View style={{ gap: theme.spacing.md }}>
            {caregivers.length > 0 ? (
              caregivers.map((caregiver) => (
                <TeamItem
                  key={caregiver.id}
                  title={caregiver.name}
                  subtitle={`${caregiver.role} | ${caregiver.contact}`}
                  indicator={caregiver.status === "active" ? "Aktif" : "Teregistrasi"}
                />
              ))
            ) : (
              <ThemedText color="muted">Belum ada tim pendamping terdaftar</ThemedText>
            )}
          </View>
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
}

type StatProps = {
  label: string;
  value: string;
  caption: string;
};

function StatItem({ label, value, caption }: StatProps) {
  return (
    <View style={{ flex: 1 }}>
      <ThemedText color="muted">{label}</ThemedText>
      <ThemedText variant="heading" weight="700">
        {value}
      </ThemedText>
      <ThemedText variant="caption" color="muted">
        {caption}
      </ThemedText>
    </View>
  );
}

type TeamItemProps = {
  title: string;
  subtitle: string;
  indicator: string;
};

function TeamItem({ title, subtitle, indicator }: TeamItemProps) {
  const { theme } = useTheme();
  return (
    <View style={[styles.teamRow, { borderColor: theme.colors.border }]}>
      <View style={[styles.teamAvatar, { backgroundColor: theme.colors.cardMuted }]}>
        <FontAwesome6 name="user-group" color={theme.colors.accent} size={16} />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText weight="500">{title}</ThemedText>
        <ThemedText variant="caption" color="muted">{subtitle}</ThemedText>
      </View>
      <GradientChip label={indicator} />
    </View>
  );
}

const styles = StyleSheet.create({
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(30,143,225,0.12)",
  },
  statRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  settingsButton: {
    marginTop: 16,
    borderWidth: 0.5,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  preferenceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  preferenceIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  teamRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
    borderBottomWidth: 0.5,
  },
  teamAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(30,143,225,0.12)",
  },
});

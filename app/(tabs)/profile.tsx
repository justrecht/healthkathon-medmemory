import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FaGear, FaMoon, FaSun, FaUser, FaUserGroup } from "react-icons/fa6";
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
              <FaGear color={theme.colors.textPrimary} size={22} />
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
                  <FaUser color={theme.colors.accent} size={32} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="heading" weight="700">
                    {userProfile?.name || "Pengguna"}
                  </ThemedText>
                  <ThemedText color="muted">{userProfile?.program || "Peserta JKN"}</ThemedText>
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
              {mode === "dark" ? <FaMoon color="white" size={24} /> : <FaSun color="white" size={24} />}
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <ThemedText weight="600">Mode {mode === "dark" ? "Gelap" : "Terang"}</ThemedText>
              <ThemedText color="muted">Atur tema pada layar pengaturan</ThemedText>
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
        <FaUserGroup color={theme.colors.accent} size={20} />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText weight="600">{title}</ThemedText>
        <ThemedText color="muted">{subtitle}</ThemedText>
      </View>
      <GradientChip label={indicator} />
    </View>
  );
}

const styles = StyleSheet.create({
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(30,143,225,0.12)",
  },
  statRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  settingsButton: {
    marginTop: 20,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  preferenceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  preferenceIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  teamRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  teamAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(30,143,225,0.12)",
  },
});

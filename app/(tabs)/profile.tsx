import { FontAwesome6 } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProfileShimmer } from "../../src/components/shimmer";
import { GradientChip, Surface, ThemedText } from "../../src/components/ui";
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
          headerShadowVisible: false,
          headerTitleStyle: { color: theme.colors.textPrimary, fontWeight: "700", fontFamily: theme.typography.fontFamily, fontSize: 16 },
          headerRight: () => (
            <Pressable onPress={() => router.push("/settings" as const)} hitSlop={12} style={{ marginRight: 15 }}>
              <FontAwesome6 name="gear" color={theme.colors.textPrimary} size={18} />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
        <Surface>
          {loading ? (
            <ProfileShimmer />
          ) : (
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
          )}
        </Surface>

        {!loading && (
          <Surface>
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
          </Surface>
        )}
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
      <ThemedText variant="caption" color="muted">{label}</ThemedText>
      <ThemedText variant="subheading" weight="600">
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

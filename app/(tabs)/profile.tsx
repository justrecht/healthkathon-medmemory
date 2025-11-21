import { FontAwesome6 } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { GradientChip, Surface, ThemedText } from "../../src/components/ui";
import { auth, db } from "../../src/config/firebase";
import { getConnectedPatients, type ConnectedUser } from "../../src/services/caregiver";
import { calculateAdherence, getReminders } from "../../src/services/storage";
import { useTheme } from "../../src/theme";

export default function ProfileScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [connectedPatients, setConnectedPatients] = useState<ConnectedUser[]>([]);
  const [adherence, setAdherence] = useState(0);
  const [activeMedsCount, setActiveMedsCount] = useState(0);

  useEffect(() => {
    setLoading(true);
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          setUserProfile(null);
          setLoading(false);
          return;
        }
        const docRef = doc(db, "users", user.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const userData = snap.data();
          setUserProfile(userData);
          if (userData.role === "caregiver") {
            const patients = await getConnectedPatients(user.uid);
            setConnectedPatients(patients);
          } else {
            setConnectedPatients([]);
            // Fetch stats for patient
            const [adherenceVal, reminders] = await Promise.all([
              calculateAdherence(7, user.uid),
              getReminders(user.uid)
            ]);
            setAdherence(adherenceVal);
            setActiveMedsCount(reminders.length);
          }
        } else {
          setUserProfile({
            uid: user.uid,
            name: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
          });
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
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
            <ActivityIndicator />
          ) : !userProfile ? (
            <View style={{ padding: 16 }}>
              <ThemedText variant="subheading" weight="600">Belum masuk</ThemedText>
              <ThemedText variant="body" color="muted" style={{ marginTop: 8 }}>Silakan masuk untuk melihat profil Anda.</ThemedText>
              <Pressable onPress={() => router.push("/login" as any)} style={{ marginTop: 12 }}>
                <ThemedText color="primary" weight="600">Ke Halaman Login</ThemedText>
              </Pressable>
            </View>
          ) : (
            <View style={styles.userRow}>
              <View style={[styles.avatar, { backgroundColor: theme.colors.cardMuted }]}>
                <FontAwesome6 name="user" color={theme.colors.accent} size={24} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText variant="subheading" weight="600">
                  {userProfile.name}
                </ThemedText>
                <ThemedText variant="caption" color="muted">{userProfile.program ?? userProfile.email}</ThemedText>
              </View>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <GradientChip label={userProfile.role === "caregiver" ? "Caregiver" : "Pasien"} />
              </View>
            </View>
          )}
        </Surface>

        {!loading && userProfile && (
          <Surface>
            {userProfile.role === "caregiver" ? (
              <View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <FontAwesome6 name="hospital-user" size={20} color={theme.colors.accent} />
                  <ThemedText variant="subheading" weight="600">Informasi Pasien</ThemedText>
                </View>

                {connectedPatients.length > 0 ? (
                  <View style={{ gap: 12 }}>
                    {connectedPatients.map((patient) => (
                      <View key={patient.uid} style={{ padding: 12, backgroundColor: theme.colors.cardMuted, borderRadius: 12 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <ThemedText weight="600">{patient.name}</ThemedText>
                          <GradientChip label="Aktif" />
                        </View>
                        <ThemedText variant="caption" color="muted">{patient.email}</ThemedText>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={{ gap: 12 }}>
                    <ThemedText color="muted">Belum ada pasien terhubung.</ThemedText>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.statRow}>
                <StatItem label="Konsistensi" value={`${adherence}%`} caption="7 hari terakhir" />
                <StatItem label="Obat aktif" value={`${activeMedsCount}`} caption="Terjadwal" />
              </View>
            )}
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
      <ThemedText variant="subheading" weight="600">{value}</ThemedText>
      <ThemedText variant="caption" color="muted">{caption}</ThemedText>
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
  },
  statRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
});

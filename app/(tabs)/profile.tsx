import { FontAwesome6 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Surface, ThemedText } from "../../src/components/ui";
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
          headerTitleStyle: { 
            color: theme.colors.textPrimary, 
            fontWeight: "700", 
            fontFamily: theme.typography.fontFamily, 
            fontSize: 34
          },
          headerTitleAlign: "left",
          headerLeft: () => null,
          headerRight: () => (
            <Pressable 
              onPress={() => router.push("/settings" as const)} 
              hitSlop={16}
              style={{ marginRight: 24 }}
            >
              <LinearGradient
                colors={["rgba(0,122,255,0.2)", "rgba(0,122,255,0.1)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" }}
              >
                <FontAwesome6 name="gear" color={theme.colors.accent} size={20} />
              </LinearGradient>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
        <LinearGradient
          colors={theme.colors.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileHeader}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : !userProfile ? (
            <View style={{ padding: 16 }}>
              <ThemedText variant="subheading" weight="600" style={{ color: "#FFFFFF" }}>Belum masuk</ThemedText>
              <ThemedText variant="body" style={{ marginTop: 8, color: "rgba(255,255,255,0.8)" }}>Silakan masuk untuk melihat profil Anda.</ThemedText>
              <Pressable 
                onPress={() => router.push("/login" as any)} 
                style={{ marginTop: 16, backgroundColor: "rgba(255,255,255,0.2)", paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, alignSelf: "flex-start" }}
              >
                <ThemedText weight="600" style={{ color: "#FFFFFF" }}>Ke Halaman Login</ThemedText>
              </Pressable>
            </View>
          ) : (
            <View style={styles.userSection}>
              <View style={styles.avatarContainer}>
                <LinearGradient
                  colors={["rgba(255,255,255,0.3)", "rgba(255,255,255,0.1)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatar}
                >
                  <FontAwesome6 name={userProfile.role === "caregiver" ? "user-nurse" : "user"} color="#FFFFFF" size={32} />
                </LinearGradient>
              </View>
              <View style={styles.userInfo}>
                <ThemedText variant="title" weight="600" style={{ color: "#FFFFFF", fontSize: 24 }}>
                  {userProfile.name}
                </ThemedText>
                <ThemedText variant="body" style={{ color: "rgba(255,255,255,0.85)", marginTop: 4 }}>
                  {userProfile.program ?? userProfile.email}
                </ThemedText>
                <View style={{ marginTop: 12 }}>
                  <View style={styles.roleBadge}>
                    <FontAwesome6 
                      name={userProfile.role === "caregiver" ? "user-nurse" : "heart-pulse"} 
                      color="#FFFFFF" 
                      size={12} 
                    />
                    <ThemedText weight="600" style={{ color: "#FFFFFF", fontSize: 14 }}>
                      {userProfile.role === "caregiver" ? "Caregiver" : "Pasien"}
                    </ThemedText>
                  </View>
                </View>
              </View>
            </View>
          )}
        </LinearGradient>

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
                      <LinearGradient
                        key={patient.uid}
                        colors={["rgba(0,122,255,0.1)", "rgba(0,122,255,0.05)"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.patientCard}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                          <LinearGradient
                            colors={theme.colors.gradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.patientAvatar}
                          >
                            <FontAwesome6 name="user" color="#FFFFFF" size={16} />
                          </LinearGradient>
                          <View style={{ flex: 1 }}>
                            <ThemedText weight="600" style={{ fontSize: 16 }}>{patient.name}</ThemedText>
                            <ThemedText variant="caption" color="muted" style={{ marginTop: 2 }}>{patient.email}</ThemedText>
                          </View>
                          <View style={styles.activeIndicator}>
                            <View style={styles.activeDot} />
                            <ThemedText variant="caption" weight="600" style={{ color: "#34C759", fontSize: 12 }}>Aktif</ThemedText>
                          </View>
                        </View>
                      </LinearGradient>
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
                <LinearGradient
                  colors={["rgba(0,122,255,0.15)", "rgba(0,122,255,0.05)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.statCard}
                >
                  <View style={[styles.statIconContainer, { backgroundColor: "rgba(0,122,255,0.2)" }]}>
                    <FontAwesome6 name="chart-line" color={theme.colors.accent} size={18} />
                  </View>
                  <ThemedText variant="caption" color="muted" style={{ marginTop: 8 }}>Konsistensi</ThemedText>
                  <ThemedText variant="title" weight="600" style={{ fontSize: 28, marginTop: 4 }}>{adherence}%</ThemedText>
                  <ThemedText variant="caption" color="muted">7 hari terakhir</ThemedText>
                </LinearGradient>
                
                <LinearGradient
                  colors={["rgba(52,199,89,0.15)", "rgba(52,199,89,0.05)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.statCard}
                >
                  <View style={[styles.statIconContainer, { backgroundColor: "rgba(52,199,89,0.2)" }]}>
                    <FontAwesome6 name="pills" color="#34C759" size={18} />
                  </View>
                  <ThemedText variant="caption" color="muted" style={{ marginTop: 8 }}>Obat aktif</ThemedText>
                  <ThemedText variant="title" weight="600" style={{ fontSize: 28, marginTop: 4 }}>{activeMedsCount}</ThemedText>
                  <ThemedText variant="caption" color="muted">Terjadwal</ThemedText>
                </LinearGradient>
              </View>
            )}
          </Surface>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  profileHeader: {
    borderRadius: 20,
    padding: 24,
    overflow: "hidden",
  },
  userSection: {
    gap: 16,
  },
  avatarContainer: {
    alignItems: "center",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
  },
  userInfo: {
    alignItems: "center",
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    overflow: "hidden",
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  patientCard: {
    padding: 16,
    borderRadius: 16,
    overflow: "hidden",
  },
  patientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  activeIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(52,199,89,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#34C759",
  },
});

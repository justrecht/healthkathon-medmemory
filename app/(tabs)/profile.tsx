import { FontAwesome6 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { ConnectPatientModal } from "../../src/components/ConnectPatientModal";
import { CustomAlert } from "../../src/components/CustomAlert";
import { ProfileShimmer } from "../../src/components/shimmer";
import { GradientChip, Surface, ThemedText } from "../../src/components/ui";
import { auth, db } from "../../src/config/firebase";
import { signInWithEmail, signOutUser, signUpWithEmail } from "../../src/services/auth";
import { getConnectedPatients, sendConnectionRequest, type ConnectedUser } from "../../src/services/caregiver";
import { useTheme } from "../../src/theme";

function StyledInput({ 
  icon, 
  value, 
  onChangeText, 
  placeholder, 
  secureTextEntry, 
  autoCapitalize, 
  keyboardType 
}: any) {
  const { theme } = useTheme();
  return (
    <View style={[styles.inputContainer, { backgroundColor: theme.colors.cardMuted, borderColor: theme.colors.border }]}>
      <View style={{ width: 40, alignItems: 'center', justifyContent: 'center' }}>
        <FontAwesome6 name={icon} size={16} color={theme.colors.muted} />
      </View>
      <TextInput
        style={[styles.input, { color: theme.colors.textPrimary, fontFamily: theme.typography.fontFamily }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.muted}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
      />
    </View>
  );
}

function PrimaryButton({ title, onPress, loading }: any) {
  const { theme } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={loading} style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
      <LinearGradient
        colors={theme.colors.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.primaryButton}
      >
        {loading ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <ThemedText style={{ color: "white", fontWeight: "600", fontSize: 16 }}>{title}</ThemedText>
        )}
      </LinearGradient>
    </Pressable>
  );
}

function RoleSelector({ role, setRole }: { role: 'patient' | 'caregiver', setRole: (role: 'patient' | 'caregiver') => void }) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <Pressable 
        onPress={() => setRole('patient')}
        style={[
          styles.roleButton, 
          { 
            backgroundColor: role === 'patient' ? theme.colors.accent : theme.colors.cardMuted,
            borderColor: role === 'patient' ? theme.colors.accent : theme.colors.border
          }
        ]}
      >
        <FontAwesome6 name="user-injured" size={16} color={role === 'patient' ? 'white' : theme.colors.muted} />
        <ThemedText style={{ color: role === 'patient' ? 'white' : theme.colors.muted, fontWeight: '600' }}>Pasien</ThemedText>
      </Pressable>
      <Pressable 
        onPress={() => setRole('caregiver')}
        style={[
          styles.roleButton, 
          { 
            backgroundColor: role === 'caregiver' ? theme.colors.accent : theme.colors.cardMuted,
            borderColor: role === 'caregiver' ? theme.colors.accent : theme.colors.border
          }
        ]}
      >
        <FontAwesome6 name="user-nurse" size={16} color={role === 'caregiver' ? 'white' : theme.colors.muted} />
        <ThemedText style={{ color: role === 'caregiver' ? 'white' : theme.colors.muted, fontWeight: '600' }}>Caregiver</ThemedText>
      </Pressable>
    </View>
  );
}

export default function ProfileScreen() {
  const { theme, mode } = useTheme();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [caregivers, setCaregivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectedPatients, setConnectedPatients] = useState<ConnectedUser[]>([]);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Auth state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'patient' | 'caregiver'>('patient');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: "",
    message: "",
    buttons: [] as any[],
    icon: undefined as any,
    iconColor: undefined as any,
  });

  const showAlert = (
    title: string,
    message: string,
    buttons: any[] = [{ text: "OK" }],
    icon?: keyof typeof FontAwesome6.glyphMap,
    iconColor?: string
  ) => {
    setAlertConfig({ title, message, buttons, icon, iconColor });
    setAlertVisible(true);
  };

  useEffect(() => {
    // Subscribe to Firebase auth state
    setLoading(true);
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          setUserProfile(null);
          setLoading(false);
          return;
        }
        // ambil profile dari Firestore
        const docRef = doc(db, "users", user.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const userData = snap.data();
          setUserProfile(userData);
          
          if (userData.role === 'caregiver') {
            await loadConnectedPatients(user.uid);
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
        // Optionally show an alert or retry logic here
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const loadConnectedPatients = async (uid: string) => {
    const patients = await getConnectedPatients(uid);
    setConnectedPatients(patients);
  };

  const handleConnectPatient = async (email: string) => {
    if (!auth.currentUser) return;
    
    setIsConnecting(true);
    try {
      const result = await sendConnectionRequest(
        auth.currentUser.uid,
        auth.currentUser.displayName || "Caregiver",
        auth.currentUser.email || "",
        email
      );

      if (result.success) {
        setShowConnectModal(false);
        showAlert(
          "Permintaan Terkirim",
          "Menunggu konfirmasi dari pasien",
          [{ text: "OK" }],
        );
      } else {
        showAlert(
          "Gagal",
          result.error || "Gagal mengirim permintaan",
          [{ text: "OK" }],
        );
      }
    } catch (error) {
      console.error(error);
      showAlert("Error", "Terjadi kesalahan");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    setUserProfile(null);
  };

  const handleAuth = async () => {
    if (!email || !password) {
      showAlert("Error", "Mohon isi semua kolom");
      return;
    }
    
    if (isRegistering && !name) {
      showAlert("Error", "Mohon isi nama Anda");
      return;
    }

    // Password strength validation for registration
    if (isRegistering) {
      const passwordValid = /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
      if (!passwordValid) {
        showAlert(
          "Password Tidak Memenuhi Syarat",
          "Password harus minimal 8 karakter, mengandung minimal 1 huruf besar dan 1 angka."
        );
        return;
      }
    }

    setAuthLoading(true);
    let result;
    if (isRegistering) {
      result = await signUpWithEmail(email, password, name, role);
    } else {
      result = await signInWithEmail(email, password);
    }
    setAuthLoading(false);

    if (result.error) {
      showAlert("Authentication Error", result.error.message);
    } else if (result.user) {
      // Show success message
      showAlert(
        "Berhasil!",
        isRegistering 
          ? `Selamat datang, ${name}! Akun Anda telah dibuat.` 
          : "Anda berhasil masuk!",
        [{ text: "OK" }],
        "check-circle",
        "#10D99D"
      );
      
      // Reset form
      setEmail("");
      setPassword("");
      setName("");
    }
  };

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
          ) : !userProfile ? (
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.authContainer}>
              <View style={styles.authHeader}>
                <View style={[styles.authIconContainer, { backgroundColor: theme.colors.cardMuted }]}>
                  <FontAwesome6 name={isRegistering ? "user-plus" : "right-to-bracket"} color={theme.colors.accent} size={32} />
                </View>
                <ThemedText variant="heading" weight="700" style={{ marginTop: 16 }}>
                  {isRegistering ? "Buat Akun Baru" : "Selamat Datang Kembali"}
                </ThemedText>
                <ThemedText variant="body" color="muted" style={{ textAlign: 'center', marginTop: 8 }}>
                  {isRegistering 
                    ? "Daftar untuk mulai memantau kesehatan Anda dan keluarga." 
                    : "Masuk untuk mengakses riwayat pengobatan Anda."}
                </ThemedText>
              </View>
              
              <View style={{ width: '100%', marginTop: 24, gap: 16 }}>
                {isRegistering && (
                  <>
                    <StyledInput
                      icon="user"
                      placeholder="Nama Lengkap"
                      value={name}
                      onChangeText={setName}
                    />
                    <RoleSelector role={role} setRole={setRole} />
                  </>
                )}
                <StyledInput
                  icon="envelope"
                  placeholder="Email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <View style={[styles.inputContainer, { backgroundColor: theme.colors.cardMuted, borderColor: theme.colors.border }]}>
                  <View style={{ width: 40, alignItems: 'center', justifyContent: 'center' }}>
                    <FontAwesome6 name="lock" size={16} color={theme.colors.muted} />
                  </View>
                  <TextInput
                    style={[styles.input, { color: theme.colors.textPrimary, fontFamily: theme.typography.fontFamily }]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Password"
                    placeholderTextColor={theme.colors.muted}
                    secureTextEntry={!showPassword}
                  />
                  <Pressable onPress={() => setShowPassword(s => !s)} style={{ width: 48, alignItems: 'center', justifyContent: 'center' }}>
                    <FontAwesome6 name={showPassword ? "eye" : "eye-slash"} size={16} color={theme.colors.muted} />
                  </Pressable>
                </View>
                
                <View style={{ marginTop: 8 }}>
                  <PrimaryButton 
                    title={isRegistering ? "Daftar Sekarang" : "Masuk"} 
                    onPress={handleAuth} 
                    loading={authLoading}
                  />
                </View>

                <Pressable onPress={() => setIsRegistering(!isRegistering)} style={{ alignItems: 'center', marginTop: 16, padding: 8 }}>
                  <ThemedText variant="body" color="muted">
                    {isRegistering ? "Sudah punya akun? " : "Belum punya akun? "}
                    <ThemedText variant="body" color="primary" weight="600">
                      {isRegistering ? "Masuk" : "Daftar"}
                    </ThemedText>
                  </ThemedText>
                </Pressable>
              </View>
            </KeyboardAvoidingView>
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
                <GradientChip label={userProfile.role === 'caregiver' ? "Caregiver" : "Pasien"} />
              </View>
            </View>
          )}
        </Surface>

        {!loading && userProfile && (
          <Surface>
            {userProfile.role === 'caregiver' ? (
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <FontAwesome6 name="hospital-user" size={20} color={theme.colors.accent} />
                  <ThemedText variant="subheading" weight="600">Informasi Pasien</ThemedText>
                </View>
                
                {connectedPatients.length > 0 ? (
                  <View style={{ gap: 12 }}>
                    {connectedPatients.map((patient) => (
                      <View key={patient.uid} style={{ padding: 12, backgroundColor: theme.colors.cardMuted, borderRadius: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <ThemedText weight="600">{patient.name}</ThemedText>
                          <GradientChip label="Aktif" />
                        </View>
                        <ThemedText variant="caption" color="muted">{patient.email}</ThemedText>
                      </View>
                    ))}
                    <View style={{ marginTop: 8 }}>
                      <PrimaryButton 
                        title="Hubungkan Pasien Lain" 
                        onPress={() => setShowConnectModal(true)} 
                      />
                    </View>
                  </View>
                ) : (
                  <View style={{ gap: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: theme.colors.border }}>
                      <ThemedText color="muted">Nama Pasien</ThemedText>
                      <ThemedText weight="500">Belum terhubung</ThemedText>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: theme.colors.border }}>
                      <ThemedText color="muted">Status</ThemedText>
                      <ThemedText weight="500" color="muted">-</ThemedText>
                    </View>
                    <View style={{ marginTop: 8 }}>
                      <PrimaryButton 
                        title="Hubungkan Pasien" 
                        onPress={() => setShowConnectModal(true)} 
                      />
                    </View>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.statRow}>
                <StatItem
                  label="Kepatuhan"
                  value={userProfile.adherence ?? "-"}
                  caption="7 hari terakhir"
                />
                <StatItem
                  label="Obat aktif"
                  value={userProfile.activeMeds ?? "-"}
                  caption="Terjadwal"
                />
                <StatItem
                  label="Visit klinik"
                  value={userProfile.visits ?? "-"}
                  caption="Bulan ini"
                />
              </View>
            )}
          </Surface>
        )}
      </ScrollView>
      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        icon={alertConfig.icon}
        iconColor={alertConfig.iconColor}
        onClose={() => setAlertVisible(false)}
      />
      <ConnectPatientModal
        visible={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        onConnect={handleConnectPatient}
        loading={isConnecting}
      />
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
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyStateTitle: {
    marginTop: 16,
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    height: 50,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    height: '100%',
    paddingRight: 16,
    fontSize: 16,
  },
  primaryButton: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  authContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  authHeader: {
    alignItems: 'center',
    width: '100%',
  },
  authIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
});

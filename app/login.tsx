import { FontAwesome6 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CustomAlert } from "../src/components/CustomAlert";
import { ThemedText } from "../src/components/ui";
import { useLanguage } from "../src/i18n";
import { signInWithEmail, signUpWithEmail } from "../src/services/auth";
import { useTheme } from "../src/theme";

// --- COMPONENTS ---

function StyledInput({ icon, value, onChangeText, placeholder, secureTextEntry, autoCapitalize, keyboardType }: any) {
  const { theme } = useTheme();
  return (
    <View style={[styles.inputContainer, { backgroundColor: theme.colors.cardMuted, borderColor: theme.colors.border }]}>
      <View style={{ width: 40, alignItems: "center", justifyContent: "center" }}>
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
      <LinearGradient colors={theme.colors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryButton}>
        {loading ? <ActivityIndicator color="white" size="small" /> : <ThemedText style={{ color: "white", fontWeight: "600", fontSize: 16 }}>{title}</ThemedText>}
      </LinearGradient>
    </Pressable>
  );
}

// Komponen Role Selector dikembalikan ke sini
function RoleSelector({ role, setRole }: { role: 'patient' | 'caregiver', setRole: (role: 'patient' | 'caregiver') => void }) {
  const { theme } = useTheme();
  const { t } = useLanguage();
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
        <ThemedText style={{ color: role === 'patient' ? 'white' : theme.colors.muted, fontWeight: '600' }}>{t("patient")}</ThemedText>
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
        <ThemedText style={{ color: role === 'caregiver' ? 'white' : theme.colors.muted, fontWeight: '600' }}>{t("caregiver")}</ThemedText>
      </Pressable>
    </View>
  );
}

// --- MAIN SCREEN ---

export default function LoginScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<'patient' | 'caregiver'>('patient');
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  // Feedback modal state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState<string | undefined>(undefined);
  const [alertMessage, setAlertMessage] = useState<string | undefined>(undefined);
  const [alertIcon, setAlertIcon] = useState<keyof typeof FontAwesome6.glyphMap | undefined>(undefined);
  const [alertIconColor, setAlertIconColor] = useState<string | undefined>(undefined);

  const handleAuth = async () => {
    if (!email || !password || (isRegistering && !name)) return;
    
    if (isRegistering) {
        const passwordValid = /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
        if (!passwordValid) {
          alert(t("passwordRequirement"));
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
      const message = result.error.message || String(result.error) || t("authUnknownError");
      // show feedback modal for error
      setAlertTitle(t("loginFailed") || "Login gagal");
      setAlertMessage(message);
      setAlertIcon("triangle-exclamation");
      setAlertIconColor("#FF8585");
      setAlertVisible(true);
    } else if (result.user) {
      // show feedback modal for success
      setAlertTitle(t("loginSuccess") || "Login berhasil");
      setAlertMessage(t("welcomeBack") || "Selamat datang kembali");
      setAlertIcon("circle-check");
      setAlertIconColor("#10D99D");
      setAlertVisible(true);
      // navigate after small delay to allow user to see feedback
      setTimeout(() => {
        setAlertVisible(false);
        router.replace("/(tabs)/home");
      }, 900);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.authContainer}>
        <View style={styles.authHeader}>
          <View style={[styles.authIconContainer, { backgroundColor: theme.colors.cardMuted }]}>
            <FontAwesome6 name={isRegistering ? "user-plus" : "right-to-bracket"} color={theme.colors.accent} size={32} />
          </View>
          <ThemedText variant="heading" weight="700" style={{ marginTop: 16 }}>
            {isRegistering ? t("createAccount") : t("login")}
          </ThemedText>
          <ThemedText variant="body" color="muted" style={{ textAlign: 'center', marginTop: 8 }}>
            {isRegistering 
              ? t("registerDesc") 
              : t("loginDesc")}
          </ThemedText>
        </View>

        <View style={{ width: "100%", marginTop: 24, gap: 16 }}>
          {isRegistering && (
            <>
              <StyledInput icon="user" placeholder={t("fullName")} value={name} onChangeText={setName} />
              {/* Menampilkan RoleSelector hanya saat Register */}
              <RoleSelector role={role} setRole={setRole} />
            </>
          )}
          
          <StyledInput icon="envelope" placeholder={t("email")} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          
          <View style={[styles.inputContainer, { backgroundColor: theme.colors.cardMuted, borderColor: theme.colors.border }]}>
            <View style={{ width: 40, alignItems: "center", justifyContent: "center" }}>
              <FontAwesome6 name="lock" size={16} color={theme.colors.muted} />
            </View>
            <TextInput style={[styles.input, { color: theme.colors.textPrimary, fontFamily: theme.typography.fontFamily }]} value={password} onChangeText={setPassword} placeholder={t("password")} placeholderTextColor={theme.colors.muted} secureTextEntry={!showPassword} />
            <Pressable onPress={() => setShowPassword(s => !s)} style={{ width: 48, alignItems: "center", justifyContent: "center" }}>
              <FontAwesome6 name={showPassword ? "eye" : "eye-slash"} size={16} color={theme.colors.muted} />
            </Pressable>
          </View>

          <View style={{ marginTop: 8 }}>
            <PrimaryButton title={isRegistering ? t("registerNow") : t("login")} onPress={handleAuth} loading={authLoading} />
          </View>

          <Pressable onPress={() => setIsRegistering(s => !s)} style={{ alignItems: "center", marginTop: 16, padding: 8 }}>
            <ThemedText variant="body" color="muted">
              {isRegistering ? t("alreadyHaveAccount") : t("dontHaveAccount")}
              <ThemedText variant="body" color="primary" weight="600">
                {isRegistering ? t("login") : t("register")}
              </ThemedText>
            </ThemedText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        icon={alertIcon}
        iconColor={alertIconColor}
        onClose={() => setAlertVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    height: 50,
    overflow: "hidden",
  },
  input: {
    flex: 1,
    height: "100%",
    paddingRight: 16,
    fontSize: 16,
  },
  primaryButton: {
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  authContainer: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  authHeader: {
    alignItems: "center",
    width: "100%",
  },
  authIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  // Style tambahan untuk Role Button
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
import { FontAwesome6 } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { ReactNode, useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CustomAlert } from "../src/components/CustomAlert";
import { SectionHeader, Surface, ThemedText } from "../src/components/ui";
import { signOutUser } from "../src/services/auth";
import { clearScheduledNotifications, getUISettings, saveUISettings, UISettings } from "../src/services/storage";
import { ThemeMode, useTheme } from "../src/theme";

export default function SettingsScreen() {
  const { theme, mode, setMode } = useTheme();
  const router = useRouter();
  const [notificationSettings, setNotificationSettings] = useState<UISettings>({
    beforeSchedule: true,
  });
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: "",
    message: "",
    buttons: [] as any[]
  });

  const showAlert = (title: string, message: string, buttons: any[] = [{ text: "OK" }]) => {
    setAlertConfig({ title, message, buttons });
    setAlertVisible(true);
  };

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const settings = await getUISettings();
    setNotificationSettings(settings);
  };

  const handleThemeChange = (selectedMode: ThemeMode) => {
    setMode(selectedMode);
    setShowThemeDropdown(false);
  };

  const handleNotificationToggle = async (setting: keyof UISettings) => {
    const newSettings = {
      ...notificationSettings,
      [setting]: !notificationSettings[setting]
    };
    setNotificationSettings(newSettings);
    await saveUISettings(newSettings);
  };

  const handleSignOut = async () => {
    showAlert(
      "Keluar",
      "Apakah Anda yakin ingin keluar?",
      [
        { text: "Batal", style: "cancel" },
        { 
          text: "Keluar", 
          style: "destructive",
          onPress: async () => {
            await signOutUser();
            router.replace("/(tabs)/profile");
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={["top"]}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: false,
          headerTitle: "Pengaturan",
          headerStyle: { backgroundColor: theme.colors.background },
          headerShadowVisible: false,
          headerTitleStyle: {
            color: theme.colors.textPrimary,
            fontSize: 16,
            fontWeight: "700",
            fontFamily: theme.typography.fontFamily,
          },
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={12} style={{ marginLeft: 4, marginRight: 12 }}>
              <FontAwesome6 name="arrow-left" color={theme.colors.textPrimary} size={14} />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
        <Surface>
          <SectionHeader title="Tampilan" subtitle="Pilih tema aplikasi" />
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flex: 1, marginRight: 14 }}>
              <ThemedText weight="500">Mode tema</ThemedText>
              <ThemedText variant="caption" color="muted">
                {mode === "dark" 
                  ? "Mode gelap aktif" 
                  : "Mode terang aktif"}
              </ThemedText>
            </View>
            <Pressable 
              style={[styles.dropdownButton, { backgroundColor: theme.colors.cardMuted, borderColor: theme.colors.border }]}
              onPress={() => setShowThemeDropdown(true)}
            >
              <ThemedText style={{ fontSize: 14 }}>
                {mode === "dark" ? "Gelap" : "Terang"}
              </ThemedText>
              <FontAwesome6 name="chevron-down" size={12} color={theme.colors.textSecondary} />
            </Pressable>
          </View>
        </Surface>

        <Surface>
          <SectionHeader title="Pengingat" subtitle="Notifikasi pengingat obat" />
          <SettingToggle
            icon={<FontAwesome6 name="bell" color={theme.colors.accent} size={16} />}
            title="Notifikasi sebelum jadwal"
            description="Dikirim 30 menit sebelumnya"
            value={notificationSettings.beforeSchedule}
            onValueChange={() => handleNotificationToggle('beforeSchedule')}
          />
          <Pressable 
            onPress={async () => {
              showAlert(
                "Hapus Cache Notifikasi",
                "Ini akan menghapus semua data notifikasi yang tersimpan di perangkat. Lanjutkan?",
                [
                  { text: "Batal", style: "cancel" },
                  { 
                    text: "Hapus", 
                    onPress: async () => {
                      await clearScheduledNotifications();
                      showAlert("Sukses", "Cache notifikasi berhasil dihapus");
                    }
                  }
                ]
              );
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 0.5, borderTopColor: theme.colors.border, marginTop: 8 }}
          >
            <View style={{ 
              width: 36, 
              height: 36, 
              borderRadius: 18, 
              backgroundColor: theme.colors.cardMuted, 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <FontAwesome6 name="trash-can" color={theme.colors.textSecondary} size={16} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText weight="500">Hapus Cache Notifikasi</ThemedText>
              <ThemedText variant="caption" color="muted">Perbaiki masalah notifikasi ganda</ThemedText>
            </View>
            <FontAwesome6 name="chevron-right" size={12} color={theme.colors.muted} />
          </Pressable>
        </Surface>

        <Surface>
          <Pressable 
            onPress={handleSignOut}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 }}
          >
            <View style={{ 
              width: 36, 
              height: 36, 
              borderRadius: 18, 
              backgroundColor: 'rgba(255, 107, 107, 0.1)', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <FontAwesome6 name="right-from-bracket" color={theme.colors.danger} size={16} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText weight="500" style={{ color: theme.colors.danger }}>Keluar</ThemedText>
              <ThemedText variant="caption" color="muted">Keluar dari akun Anda</ThemedText>
            </View>
            <FontAwesome6 name="chevron-right" size={12} color={theme.colors.muted} />
          </Pressable>
        </Surface>
      </ScrollView>
      
      <Modal
        visible={showThemeDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowThemeDropdown(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setShowThemeDropdown(false)}
        >
          <View style={[styles.dropdownModal, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Pressable
              style={[styles.dropdownItem, mode === "light" && { backgroundColor: theme.colors.cardMuted }]}
              onPress={() => handleThemeChange("light")}
            >
              <FontAwesome6 name="sun" size={16} color={theme.colors.accent} />
              <ThemedText weight={mode === "light" ? "600" : "400"}>Terang</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.dropdownItem, mode === "dark" && { backgroundColor: theme.colors.cardMuted }]}
              onPress={() => handleThemeChange("dark")}
            >
              <FontAwesome6 name="moon" size={16} color={theme.colors.accent} />
              <ThemedText weight={mode === "dark" ? "600" : "400"}>Gelap</ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={() => setAlertVisible(false)}
      />
    </SafeAreaView>
  );
}

type SettingToggleProps = {
  icon: ReactNode;
  title: string;
  description: string;
  value: boolean;
  onValueChange: () => void;
};

function SettingToggle({ icon, title, description, value, onValueChange }: SettingToggleProps) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: theme.spacing.sm,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: theme.colors.cardMuted,
          }}
        >
          {icon}
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText weight="500">{title}</ThemedText>
          <ThemedText variant="caption" color="muted">{description}</ThemedText>
        </View>
      </View>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    minWidth: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownModal: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 8,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
});

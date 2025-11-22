import { FontAwesome6 } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { ReactNode, useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CustomAlert } from "../src/components/CustomAlert";
import { SectionHeader, Surface, ThemedText } from "../src/components/ui";
import { Language, useLanguage } from "../src/i18n";
import { signOutUser } from "../src/services/auth";
import { clearScheduledNotifications, getUISettings, saveUISettings, UISettings } from "../src/services/storage";
import { ThemeMode, useTheme } from "../src/theme";

export default function SettingsScreen() {
  const { theme, mode, setMode } = useTheme();
  const { t, language, setLanguage } = useLanguage();
  const router = useRouter();
  const [notificationSettings, setNotificationSettings] = useState<UISettings>({
    beforeSchedule: true,
  });
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: "",
    message: "",
    buttons: [] as any[]
  });

  const showAlert = (title: string, message: string, buttons: any[] = [{ text: t("ok") }]) => {
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

  const handleLanguageChange = (selectedLanguage: Language) => {
    setLanguage(selectedLanguage);
    setShowLanguageDropdown(false);
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
      t("signOutTitle"),
      t("signOutConfirm"),
      [
        { text: t("cancel"), style: "cancel" },
        { 
          text: t("signOut"), 
          style: "destructive",
          onPress: async () => {
            try {
              await signOutUser();
              showAlert(
                t("signOutSuccessTitle"),
                t("signOutSuccessDesc"),
                [{ 
                  text: t("ok"), 
                  onPress: () => router.replace("/login")
                }]
              );
            } catch (error) {
              showAlert(
                t("signOutFailTitle"),
                t("signOutFailDesc"),
                [{ text: t("ok") }]
              );
            }
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
          headerTitle: t("settings"),
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
          <SectionHeader title={t("appearance")} subtitle={t("chooseTheme")} />
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flex: 1, marginRight: 14 }}>
              <ThemedText weight="500">{t("themeMode")}</ThemedText>
              <ThemedText variant="caption" color="muted">
                {mode === "dark" 
                  ? t("darkModeActive") 
                  : t("lightModeActive")}
              </ThemedText>
            </View>
            <Pressable 
              style={[styles.dropdownButton, { backgroundColor: theme.colors.cardMuted, borderColor: theme.colors.border }]}
              onPress={() => setShowThemeDropdown(true)}
            >
              <ThemedText style={{ fontSize: 14 }}>
                {mode === "dark" ? t("dark") : t("light")}
              </ThemedText>
              <FontAwesome6 name="chevron-down" size={12} color={theme.colors.textSecondary} />
            </Pressable>
          </View>
        </Surface>

        <Surface>
          <SectionHeader title={t("language")} subtitle={t("chooseLanguage")} />
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flex: 1, marginRight: 14 }}>
              <ThemedText weight="500">{t("language")}</ThemedText>
              <ThemedText variant="caption" color="muted">
                {language === "id" ? t("indonesian") : t("english")}
              </ThemedText>
            </View>
            <Pressable 
              style={[styles.dropdownButton, { backgroundColor: theme.colors.cardMuted, borderColor: theme.colors.border }]}
              onPress={() => setShowLanguageDropdown(true)}
            >
              <ThemedText style={{ fontSize: 14 }}>
                {language === "id" ? "ID" : "EN"}
              </ThemedText>
              <FontAwesome6 name="chevron-down" size={12} color={theme.colors.textSecondary} />
            </Pressable>
          </View>
        </Surface>

        <Surface>
          <SectionHeader title={t("reminders")} subtitle={t("reminderNotifications")} />
          <SettingToggle
            icon={<FontAwesome6 name="bell" color={theme.colors.accent} size={16} />}
            title={t("notificationBefore")}
            description={t("sent30MinBefore")}
            value={notificationSettings.beforeSchedule}
            onValueChange={() => handleNotificationToggle('beforeSchedule')}
          />
          <Pressable 
            onPress={async () => {
              showAlert(
                t("clearCacheTitle"),
                t("clearCacheConfirm"),
                [
                  { text: t("cancel"), style: "cancel" },
                  { 
                    text: t("delete"), 
                    onPress: async () => {
                      await clearScheduledNotifications();
                      showAlert(t("success"), t("cacheCleared"));
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
              <ThemedText weight="500">{t("clearCache")}</ThemedText>
              <ThemedText variant="caption" color="muted">{t("fixDoubleNotif")}</ThemedText>
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
              <ThemedText weight="500" style={{ color: theme.colors.danger }}>{t("signOut")}</ThemedText>
              <ThemedText variant="caption" color="muted">{t("signOutDesc")}</ThemedText>
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
              <ThemedText weight={mode === "light" ? "600" : "400"}>{t("light")}</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.dropdownItem, mode === "dark" && { backgroundColor: theme.colors.cardMuted }]}
              onPress={() => handleThemeChange("dark")}
            >
              <FontAwesome6 name="moon" size={16} color={theme.colors.accent} />
              <ThemedText weight={mode === "dark" ? "600" : "400"}>{t("dark")}</ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={showLanguageDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageDropdown(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setShowLanguageDropdown(false)}
        >
          <View style={[styles.dropdownModal, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Pressable
              style={[styles.dropdownItem, language === "id" && { backgroundColor: theme.colors.cardMuted }]}
              onPress={() => handleLanguageChange("id")}
            >
              <ThemedText weight={language === "id" ? "600" : "400"}>Bahasa Indonesia</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.dropdownItem, language === "en" && { backgroundColor: theme.colors.cardMuted }]}
              onPress={() => handleLanguageChange("en")}
            >
              <ThemedText weight={language === "en" ? "600" : "400"}>English</ThemedText>
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

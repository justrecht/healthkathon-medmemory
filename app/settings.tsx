import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import { ReactNode, useState } from "react";
import { FaArrowLeft, FaBell, FaLink, FaPalette, FaShieldHalved } from "react-icons/fa6";
import { Pressable, ScrollView, Switch, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SectionHeader, Surface, ThemedText } from "../src/components/ui";
import { ThemeMode, useTheme } from "../src/theme";

export default function SettingsScreen() {
  const { theme, mode, setMode } = useTheme();
  const router = useRouter();

  const handleThemeToggle = (value: boolean) => {
    const nextMode: ThemeMode = value ? "dark" : "light";
    setMode(nextMode);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={["top"]}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: false,
          headerTitle: "Pengaturan",
          headerStyle: { backgroundColor: theme.colors.background },
          headerTitleStyle: {
            color: theme.colors.textPrimary,
            fontWeight: "600",
            fontFamily: theme.typography.fontFamily,
          },
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <FaArrowLeft color={theme.colors.textPrimary} size={22} />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}>
        <Surface>
          <SectionHeader title="Tampilan" subtitle="Mode terang / gelap" />
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flex: 1, marginRight: 16 }}>
              <ThemedText weight="600">Mode gelap</ThemedText>
              <ThemedText color="muted">
                {mode === "dark"
                  ? "Mengurangi silau & hemat baterai"
                  : "Visual cerah untuk pagi hari"}
              </ThemedText>
            </View>
            <Switch value={mode === "dark"} onValueChange={handleThemeToggle} />
          </View>
        </Surface>

        <Surface>
          <SectionHeader title="Pengingat" subtitle="Notifikasi Mobile JKN" />
          <SettingToggle
            icon={<FaBell color={theme.colors.accent} size={20} />}
            title="Notifikasi sebelum jadwal"
            description="Dikirim 30 menit sebelumnya"
            initialValue
          />
          <SettingToggle
            icon={<FaPalette color={theme.colors.accent} size={20} />}
            title="Ringkas tampilan malam"
            description="Kurangi elemen visual saat jam istirahat"
          />
        </Surface>

        <Surface>
          <SectionHeader title="Integrasi" subtitle="Konektivitas layanan JKN" />
          <IntegrationCard
            icon={<FaShieldHalved color="white" size={26} />}
            title="Prolanis"
            subtitle="Sinkron jadwal kontrol & pengingat obat"
          />
          <IntegrationCard
            icon={<FaLink color="white" size={26} />}
            title="Rekam medis elektronik"
            subtitle="Tarik catatan terapi terakhir klinik"
          />
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
}

type SettingToggleProps = {
  icon: ReactNode;
  title: string;
  description: string;
  initialValue?: boolean;
};

function SettingToggle({ icon, title, description, initialValue = false }: SettingToggleProps) {
  const { theme } = useTheme();
  const [value, setValue] = useState(initialValue);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: theme.spacing.md,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: theme.colors.cardMuted,
          }}
        >
          {icon}
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText weight="600">{title}</ThemedText>
          <ThemedText color="muted">{description}</ThemedText>
        </View>
      </View>
      <Switch value={value} onValueChange={setValue} />
    </View>
  );
}

type IntegrationCardProps = {
  icon: ReactNode;
  title: string;
  subtitle: string;
};

function IntegrationCard({ icon, title, subtitle }: IntegrationCardProps) {
  const { theme } = useTheme();
  return (
    <Surface muted>
      <LinearGradient
        colors={theme.colors.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: theme.radius.lg,
          padding: theme.spacing.lg,
          flexDirection: "row",
          alignItems: "center",
          gap: 16,
        }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: "rgba(0,0,0,0.15)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText weight="600" style={{ color: "white" }}>
            {title}
          </ThemedText>
          <ThemedText color="muted" style={{ color: "rgba(255,255,255,0.72)" }}>
            {subtitle}
          </ThemedText>
        </View>
      </LinearGradient>
    </Surface>
  );
}

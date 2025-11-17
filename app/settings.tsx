import { FontAwesome6 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import { ReactNode, useState } from "react";
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
              <FontAwesome6 name="arrow-left" color={theme.colors.textPrimary} size={18} />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}>
        <Surface>
          <SectionHeader title="Tampilan" subtitle="Mode terang / gelap" />
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flex: 1, marginRight: 14 }}>
              <ThemedText weight="500">Mode gelap</ThemedText>
              <ThemedText variant="caption" color="muted">
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
            icon={<FontAwesome6 name="bell" color={theme.colors.accent} size={16} />}
            title="Notifikasi sebelum jadwal"
            description="Dikirim 30 menit sebelumnya"
            initialValue
          />
          <SettingToggle
            icon={<FontAwesome6 name="palette" color={theme.colors.accent} size={16} />}
            title="Ringkas tampilan malam"
            description="Kurangi elemen visual saat jam istirahat"
          />
        </Surface>

        <Surface>
          <SectionHeader title="Integrasi" subtitle="Konektivitas layanan JKN" />
          <IntegrationCard
            icon={<FontAwesome6 name="shield-halved" color="white" size={20} />}
            title="Prolanis"
            subtitle="Sinkron jadwal kontrol & pengingat obat"
          />
          <IntegrationCard
            icon={<FontAwesome6 name="link" color="white" size={20} />}
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
          borderRadius: theme.radius.md,
          padding: theme.spacing.md,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: "rgba(0,0,0,0.15)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText weight="500" style={{ color: "white", fontFamily: theme.typography.fontFamily }}>
            {title}
          </ThemedText>
          <ThemedText variant="caption" color="muted" style={{ color: "rgba(255,255,255,0.72)", fontFamily: theme.typography.fontFamily }}>
            {subtitle}
          </ThemedText>
        </View>
      </LinearGradient>
    </Surface>
  );
}

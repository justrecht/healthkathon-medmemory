import { Tabs } from "expo-router";
import { FaHouse, FaUser } from "react-icons/fa6";
import { View } from "react-native";

import { useTheme } from "../../src/theme";

export default function TabsLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: theme.colors.textPrimary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
          height: 72,
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: 16,
        },
        tabBarLabelStyle: {
          fontWeight: "600",
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Beranda",
          tabBarIcon: ({ color, size }) => (
            <View style={{ alignItems: "center" }}>
              <FaHouse color={color} size={size} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => (
            <View style={{ alignItems: "center" }}>
              <FaUser color={color} size={size} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

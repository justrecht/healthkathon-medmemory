import { FontAwesome6 } from "@expo/vector-icons";
import { Tabs } from "expo-router";
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
          borderTopWidth: 0.5,
          height: 60,
          paddingHorizontal: theme.spacing.md,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontWeight: "500",
          fontSize: 11,
          fontFamily: theme.typography.fontFamily,
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Beranda",
          tabBarIcon: ({ color, size }) => (
            <View style={{ alignItems: "center" }}>
              <FontAwesome6 name="house" solid color={color} size={20} />
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
              <FontAwesome6 name="user" solid color={color} size={20} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../theme";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onPressAction?: () => void;
};

export function SectionHeader({ title, subtitle, actionLabel, onPressAction }: SectionHeaderProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.row}>
      <View>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: theme.subtext }]}>{subtitle}</Text> : null}
      </View>
      {actionLabel && onPressAction ? (
        <Pressable onPress={onPressAction} hitSlop={10}>
          <Text style={[styles.action, { color: theme.accent }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  action: {
    fontSize: 14,
    fontWeight: "600",
  },
});

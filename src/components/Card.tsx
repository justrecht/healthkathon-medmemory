import { ReactNode } from "react";
import { StyleSheet, View, ViewProps } from "react-native";

import { useTheme } from "../theme";

type CardProps = ViewProps & {
  children: ReactNode;
  variant?: "default" | "muted" | "ghost";
};

export function Card({ children, style, variant = "default", ...rest }: CardProps) {
  const { theme } = useTheme();

  const backgrounds = {
    default: theme.card,
    muted: theme.cardMuted,
    ghost: "transparent",
  } as const;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: backgrounds[variant],
          borderColor: variant === "ghost" ? "transparent" : theme.border,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
});

import { LinearGradient } from "expo-linear-gradient";
import { ReactNode } from "react";
import {
    Pressable,
    StyleProp,
    Text,
    TextStyle,
    View,
    ViewStyle,
} from "react-native";

import { useTheme } from "../theme";

type SurfaceProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  muted?: boolean;
  padding?: boolean;
  onPress?: () => void;
};

export function Surface({
  children,
  style,
  muted = false,
  padding = true,
  onPress,
}: SurfaceProps) {
  const { theme } = useTheme();
  const content = (
    <View
      style={[
        {
          backgroundColor: muted ? theme.colors.cardMuted : theme.colors.card,
          borderRadius: theme.radius.md,
          padding: padding ? theme.spacing.md : 0,
          borderWidth: 0.5,
          borderColor: theme.colors.border,
        },
        style,
      ]
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable style={{ width: "100%" }} onPress={onPress}>
        {content}
      </Pressable>
    );
  }

  return content;
}

type ThemedTextProps = {
  children: ReactNode;
  variant?: "title" | "heading" | "subheading" | "body" | "caption";
  weight?: TextStyle["fontWeight"];
  color?: "primary" | "secondary" | "muted";
  style?: StyleProp<TextStyle>;
};

export function ThemedText({
  children,
  variant = "body",
  weight = "500",
  color = "primary",
  style,
}: ThemedTextProps) {
  const { theme } = useTheme();
  const size = theme.typography[variant];
  const palette = {
    primary: theme.colors.textPrimary,
    secondary: theme.colors.textSecondary,
    muted: theme.colors.muted,
  } as const;

  return (
    <Text
      style={[
        {
          fontSize: size,
          color: palette[color],
          fontWeight: weight,
          fontFamily: theme.typography.fontFamily,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export function SectionHeader({ title, subtitle, actionLabel, onActionPress }: SectionHeaderProps) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: theme.spacing.sm,
      }}
    >
      <View style={{ flex: 1 }}>
        <ThemedText variant="subheading" weight="600">
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText variant="caption" color="muted" style={{ marginTop: 2 }}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {actionLabel ? (
        <Pressable onPress={onActionPress} hitSlop={8}>
          <Text
            style={{
              color: theme.colors.accent,
              fontWeight: "500",
              fontSize: theme.typography.caption,
              fontFamily: theme.typography.fontFamily,
            }}
          >
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

type GradientChipProps = {
  label: string;
  icon?: ReactNode;
};

export function GradientChip({ label, icon }: GradientChipProps) {
  const { theme } = useTheme();
  return (
    <LinearGradient
      colors={theme.colors.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs - 2,
        borderRadius: theme.radius.pill,
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
      }}
    >
      {icon}
      <Text style={{ color: "white", fontWeight: "500", fontSize: 11, fontFamily: theme.typography.fontFamily }}>{label}</Text>
    </LinearGradient>
  );
}

type MetricBadgeProps = {
  label: string;
  value: string;
  trend?: string;
};

export function MetricBadge({ label, value, trend }: MetricBadgeProps) {
  const { theme } = useTheme();
  return (
    <View>
      <ThemedText variant="caption" color="muted">
        {label}
      </ThemedText>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
        <ThemedText variant="subheading" weight="600">
          {value}
        </ThemedText>
        {trend ? (
          <Text style={{ color: theme.colors.success, fontWeight: "500", fontSize: 11, fontFamily: theme.typography.fontFamily }}>{trend}</Text>
        ) : null}
      </View>
    </View>
  );
}

type ProgressBarProps = {
  value: number;
};

export function ProgressBar({ value }: ProgressBarProps) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        height: 4,
        borderRadius: theme.radius.pill,
        backgroundColor: theme.colors.cardMuted,
        overflow: "hidden",
      }}
    >
      <LinearGradient
        colors={theme.colors.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: `${value}%`,
          height: "100%",
        }}
      />
    </View>
  );
}

import { LinearGradient } from "expo-linear-gradient";
import { View } from "react-native";
import { createShimmerPlaceholder } from "react-native-shimmer-placeholder";

import { useTheme } from "../theme";

const ShimmerPlaceholder = createShimmerPlaceholder(LinearGradient);

export function ReminderShimmer() {
  const { theme } = useTheme();
  return (
    <View style={{ gap: theme.spacing.md }}>
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 16,
            paddingVertical: 8,
          }}
        >
          <ShimmerPlaceholder
            shimmerColors={[
              theme.colors.cardMuted,
              theme.colors.card,
              theme.colors.cardMuted,
            ]}
            style={{ width: 44, height: 44, borderRadius: 22 }}
          />
          <View style={{ flex: 1, gap: 8 }}>
            <ShimmerPlaceholder
              shimmerColors={[
                theme.colors.cardMuted,
                theme.colors.card,
                theme.colors.cardMuted,
              ]}
              style={{ width: "60%", height: 16, borderRadius: 8 }}
            />
            <ShimmerPlaceholder
              shimmerColors={[
                theme.colors.cardMuted,
                theme.colors.card,
                theme.colors.cardMuted,
              ]}
              style={{ width: "40%", height: 12, borderRadius: 6 }}
            />
          </View>
          <ShimmerPlaceholder
            shimmerColors={[
              theme.colors.cardMuted,
              theme.colors.card,
              theme.colors.cardMuted,
            ]}
            style={{ width: 60, height: 32, borderRadius: 16 }}
          />
        </View>
      ))}
    </View>
  );
}

export function ProfileShimmer() {
  const { theme } = useTheme();
  return (
    <View style={{ gap: theme.spacing.lg }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <ShimmerPlaceholder
          shimmerColors={[
            theme.colors.cardMuted,
            theme.colors.card,
            theme.colors.cardMuted,
          ]}
          style={{ width: 64, height: 64, borderRadius: 32 }}
        />
        <View style={{ flex: 1, gap: 8 }}>
          <ShimmerPlaceholder
            shimmerColors={[
              theme.colors.cardMuted,
              theme.colors.card,
              theme.colors.cardMuted,
            ]}
            style={{ width: "50%", height: 20, borderRadius: 10 }}
          />
          <ShimmerPlaceholder
            shimmerColors={[
              theme.colors.cardMuted,
              theme.colors.card,
              theme.colors.cardMuted,
            ]}
            style={{ width: "70%", height: 14, borderRadius: 7 }}
          />
        </View>
      </View>
    </View>
  );
}

import React, { useEffect } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonLoader({
  width = "100%",
  height = 100,
  borderRadius = BorderRadius.sm,
  style,
}: SkeletonLoaderProps) {
  const { theme } = useTheme();
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.3, 0.7]),
  }));

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: theme.backgroundSecondary,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

interface SkeletonGridProps {
  count?: number;
}

export function SkeletonGrid({ count = 6 }: SkeletonGridProps) {
  return (
    <View style={styles.grid}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.gridItem}>
          <SkeletonLoader height={150} />
          <SkeletonLoader
            height={16}
            width="80%"
            style={{ marginTop: Spacing.sm }}
          />
          <SkeletonLoader
            height={12}
            width="50%"
            style={{ marginTop: Spacing.xs }}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {},
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  gridItem: {
    width: "47%",
  },
});

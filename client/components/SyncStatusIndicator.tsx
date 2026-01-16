import React from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  useSharedValue,
  withDelay,
} from "react-native-reanimated";
import { useEffect } from "react";
import { ThemedText } from "./ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { processSyncQueue } from "@/lib/sync-queue";
import { Spacing, BorderRadius } from "@/constants/theme";

export function SyncStatusIndicator() {
  const { theme } = useTheme();
  const { pendingCount, isSyncing, failedCount, hasPending } = useSyncStatus();
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (isSyncing) {
      rotation.value = withRepeat(
        withSequence(
          withTiming(360, { duration: 1000 }),
        ),
        -1,
        false
      );
    } else {
      rotation.value = withTiming(0, { duration: 200 });
    }
  }, [isSyncing]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  if (!hasPending && failedCount === 0) {
    return null;
  }

  const handleRetry = () => {
    processSyncQueue();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
      {failedCount > 0 ? (
        <Pressable style={styles.content} onPress={handleRetry}>
          <Feather name="alert-circle" size={14} color={theme.error} />
          <ThemedText type="caption" style={{ color: theme.error, marginLeft: Spacing.xs }}>
            {failedCount} failed to sync. Tap to retry.
          </ThemedText>
        </Pressable>
      ) : (
        <View style={styles.content}>
          <Animated.View style={animatedStyle}>
            <Feather name="refresh-cw" size={14} color={theme.textSecondary} />
          </Animated.View>
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginLeft: Spacing.xs }}>
            Syncing {pendingCount} {pendingCount === 1 ? "item" : "items"}...
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
    alignSelf: "center",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
});

import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  useSharedValue,
} from "react-native-reanimated";
import { useEffect } from "react";
import { ThemedText } from "./ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { retryFailedOperations } from "@/lib/sync-queue";
import { Spacing, BorderRadius } from "@/constants/theme";

function formatSyncMessage(itemCount: number, outfitCount: number): string {
  const parts: string[] = [];
  
  if (itemCount > 0) {
    parts.push(`${itemCount} ${itemCount === 1 ? "item" : "items"}`);
  }
  
  if (outfitCount > 0) {
    parts.push(`${outfitCount} ${outfitCount === 1 ? "outfit" : "outfits"}`);
  }
  
  if (parts.length === 0) {
    return "Syncing...";
  }
  
  return `Syncing ${parts.join(", ")}...`;
}

export function SyncStatusIndicator() {
  const { theme } = useTheme();
  const { itemCount, outfitCount, isSyncing, failedCount, hasPending } = useSyncStatus();
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
    retryFailedOperations();
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
            {formatSyncMessage(itemCount, outfitCount)}
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

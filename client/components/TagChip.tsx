import React from "react";
import { StyleSheet, Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface TagChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
  size?: "small" | "medium";
}

export function TagChip({
  label,
  selected = false,
  onPress,
  onRemove,
  size = "medium",
}: TagChipProps) {
  const { theme } = useTheme();

  const backgroundColor = selected ? theme.primary : theme.backgroundSecondary;
  const textColor = selected ? theme.buttonText : theme.text;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        size === "small" ? styles.chipSmall : styles.chipMedium,
        { backgroundColor },
      ]}
    >
      <ThemedText
        type={size === "small" ? "small" : "caption"}
        style={{ color: textColor }}
      >
        {label}
      </ThemedText>
      {onRemove ? (
        <Pressable onPress={onRemove} hitSlop={8} style={styles.removeButton}>
          <Feather name="x" size={14} color={textColor} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.full,
  },
  chipSmall: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  chipMedium: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  removeButton: {
    marginLeft: Spacing.xs,
  },
});

import React, { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "./ThemedText";
import { TagChip } from "./TagChip";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";

interface TagFilterDropdownProps {
  availableTags: string[];
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export function TagFilterDropdown({
  availableTags,
  selectedTags,
  onTagsChange,
}: TagFilterDropdownProps) {
  const { theme } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const [isOpen, setIsOpen] = useState(false);

  const sortedTags = useMemo(() => {
    return [...availableTags].sort((a, b) => a.localeCompare(b));
  }, [availableTags]);

  const toggleTag = (tag: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const clearTags = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onTagsChange([]);
    setIsOpen(false);
  };

  const handleOpen = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsOpen(true);
  };

  return (
    <View>
      <Pressable
        style={[
          styles.dropdownButton,
          {
            backgroundColor: theme.backgroundSecondary,
            borderColor: selectedTags.length > 0 ? theme.primary : "transparent",
            borderWidth: selectedTags.length > 0 ? 1 : 0,
          },
        ]}
        onPress={handleOpen}
      >
        <Feather name="tag" size={16} color={selectedTags.length > 0 ? theme.primary : theme.textSecondary} />
        <ThemedText
          style={[
            styles.dropdownText,
            { color: selectedTags.length > 0 ? theme.primary : theme.textSecondary },
          ]}
          numberOfLines={1}
        >
          {selectedTags.length === 0
            ? "Filter by tags"
            : selectedTags.length === 1
            ? selectedTags[0]
            : `${selectedTags.length} tags`}
        </ThemedText>
        <Feather name="chevron-down" size={16} color={theme.textSecondary} />
      </Pressable>

      {selectedTags.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.selectedTagsRow}
          contentContainerStyle={styles.selectedTagsContent}
        >
          {selectedTags.map((tag) => (
            <TagChip
              key={tag}
              label={tag}
              size="small"
              selected
              onRemove={() => toggleTag(tag)}
            />
          ))}
        </ScrollView>
      ) : null}

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => setIsOpen(false)}
        >
          <View
            style={[
              styles.dropdown,
              {
                backgroundColor: theme.backgroundDefault,
                maxHeight: windowHeight * 0.5,
              },
            ]}
          >
            <View style={[styles.dropdownHeader, { borderBottomColor: theme.border }]}>
              <ThemedText type="subheading" style={styles.dropdownTitle}>
                Filter by Tags
              </ThemedText>
              {selectedTags.length > 0 ? (
                <Pressable onPress={clearTags}>
                  <ThemedText style={{ color: theme.primary }}>Clear</ThemedText>
                </Pressable>
              ) : null}
            </View>

            <ScrollView
              style={styles.tagList}
              contentContainerStyle={styles.tagListContent}
              showsVerticalScrollIndicator={false}
            >
              {sortedTags.length === 0 ? (
                <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                  No tags available
                </ThemedText>
              ) : (
                <View style={styles.tagsGrid}>
                  {sortedTags.map((tag) => (
                    <TagChip
                      key={tag}
                      label={tag}
                      selected={selectedTags.includes(tag)}
                      onPress={() => toggleTag(tag)}
                    />
                  ))}
                </View>
              )}
            </ScrollView>

            <Pressable
              style={[styles.doneButton, { backgroundColor: theme.primary }]}
              onPress={() => setIsOpen(false)}
            >
              <ThemedText style={styles.doneButtonText}>Done</ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  dropdownText: {
    flex: 1,
    fontSize: Typography.body.fontSize,
  },
  selectedTagsRow: {
    marginTop: Spacing.sm,
  },
  selectedTagsContent: {
    gap: Spacing.xs,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  dropdown: {
    width: "100%",
    maxWidth: 400,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  dropdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  dropdownTitle: {
    fontWeight: "600",
  },
  tagList: {
    maxHeight: 300,
  },
  tagListContent: {
    padding: Spacing.lg,
  },
  tagsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  emptyText: {
    textAlign: "center",
    paddingVertical: Spacing.xl,
  },
  doneButton: {
    margin: Spacing.lg,
    marginTop: 0,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  doneButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: Typography.body.fontSize,
  },
});

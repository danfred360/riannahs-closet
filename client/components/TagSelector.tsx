import React, { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { TagChip } from "@/components/TagChip";
import { useTheme } from "@/hooks/useTheme";
import { DEFAULT_TAGS } from "@/lib/types";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";

interface TagSelectorProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  existingTags?: string[];
  placeholder?: string;
}

export function TagSelector({
  selectedTags,
  onTagsChange,
  existingTags = [],
  placeholder = "Add a tag...",
}: TagSelectorProps) {
  const { theme } = useTheme();
  const [inputValue, setInputValue] = useState("");

  const allSuggestions = useMemo(() => {
    const suggestions = new Set<string>(DEFAULT_TAGS);
    existingTags.forEach((tag) => suggestions.add(tag.toLowerCase()));
    return Array.from(suggestions).sort();
  }, [existingTags]);

  const availableSuggestions = useMemo(() => {
    return allSuggestions.filter(
      (tag) =>
        !selectedTags.includes(tag) &&
        (inputValue === "" ||
          tag.toLowerCase().includes(inputValue.toLowerCase()))
    );
  }, [allSuggestions, selectedTags, inputValue]);

  const handleAddTag = (tag: string) => {
    const normalizedTag = tag.trim().toLowerCase();
    if (normalizedTag && !selectedTags.includes(normalizedTag)) {
      onTagsChange([...selectedTags, normalizedTag]);
      setInputValue("");
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(selectedTags.filter((t) => t !== tagToRemove));
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleSubmit = () => {
    if (inputValue.trim()) {
      handleAddTag(inputValue);
    }
  };

  return (
    <View style={styles.container}>
      {selectedTags.length > 0 ? (
        <View style={styles.selectedTags}>
          {selectedTags.map((tag) => (
            <TagChip
              key={tag}
              label={tag}
              selected
              onRemove={() => handleRemoveTag(tag)}
            />
          ))}
        </View>
      ) : null}

      <View
        style={[
          styles.inputContainer,
          { backgroundColor: theme.backgroundSecondary },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            { color: theme.text },
            Typography.body,
          ]}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          value={inputValue}
          onChangeText={setInputValue}
          onSubmitEditing={handleSubmit}
          returnKeyType="done"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {inputValue.trim() ? (
          <Pressable
            onPress={handleSubmit}
            style={[styles.addButton, { backgroundColor: theme.primary }]}
            hitSlop={8}
          >
            <Feather name="plus" size={16} color={theme.buttonText} />
          </Pressable>
        ) : null}
      </View>

      {availableSuggestions.length > 0 ? (
        <View style={styles.suggestionsSection}>
          <ThemedText type="caption" style={styles.suggestionsLabel}>
            Suggestions
          </ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsScroll}
          >
            {availableSuggestions.map((tag) => (
              <TagChip
                key={tag}
                label={tag}
                onPress={() => handleAddTag(tag)}
                size="small"
              />
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  selectedTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.xs,
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionsSection: {
    gap: Spacing.xs,
  },
  suggestionsLabel: {
    opacity: 0.7,
  },
  suggestionsScroll: {
    gap: Spacing.xs,
  },
});

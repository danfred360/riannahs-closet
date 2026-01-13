import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { TagChip } from "@/components/TagChip";
import { ClothingCategory, CATEGORY_LABELS, ALL_CATEGORIES } from "@/lib/types";
import { Spacing } from "@/constants/theme";

interface CategoryFilterProps {
  selectedCategory: ClothingCategory | "all";
  onSelectCategory: (category: ClothingCategory | "all") => void;
}

export function CategoryFilter({
  selectedCategory,
  onSelectCategory,
}: CategoryFilterProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <TagChip
          label="All"
          selected={selectedCategory === "all"}
          onPress={() => onSelectCategory("all")}
        />
        {ALL_CATEGORIES.map((category) => (
          <TagChip
            key={category}
            label={CATEGORY_LABELS[category]}
            selected={selectedCategory === category}
            onPress={() => onSelectCategory(category)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  scrollContent: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
});

import React, { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { ObjectStorageImage } from "@/components/ObjectStorageImage";
import { useTheme } from "@/hooks/useTheme";
import {
  ClothingItem,
  ClothingCategory,
  CATEGORY_LABELS,
  ALL_CATEGORIES,
} from "@/lib/types";
import { Spacing, BorderRadius } from "@/constants/theme";

interface ItemSearchModalProps {
  visible: boolean;
  onClose: () => void;
  items: ClothingItem[];
  selectedCoreIds: string[];
  selectedAccessoryIds: string[];
  onSelectionChange: (coreIds: string[], accessoryIds: string[]) => void;
  coreCategories: ClothingCategory[];
  accessoryCategories: ClothingCategory[];
}

const ITEM_SIZE = 80;

export function ItemSearchModal({
  visible,
  onClose,
  items,
  selectedCoreIds,
  selectedAccessoryIds,
  onSelectionChange,
  coreCategories,
  accessoryCategories,
}: ItemSearchModalProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ClothingCategory | "all">("all");
  const [selectedTag, setSelectedTag] = useState<string | "all">("all");

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    items.forEach((item) => item.tags?.forEach((tag) => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = searchQuery.trim() === "" || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      
      const matchesTag = selectedTag === "all" || item.tags?.includes(selectedTag);
      
      return matchesSearch && matchesCategory && matchesTag;
    });
  }, [items, searchQuery, selectedCategory, selectedTag]);

  const isSelected = (itemId: string) => {
    return selectedCoreIds.includes(itemId) || selectedAccessoryIds.includes(itemId);
  };

  const toggleItem = (item: ClothingItem) => {
    const isCore = coreCategories.includes(item.category);
    const isAccessory = accessoryCategories.includes(item.category);
    
    if (isCore) {
      if (selectedCoreIds.includes(item.id)) {
        onSelectionChange(
          selectedCoreIds.filter((id) => id !== item.id),
          selectedAccessoryIds
        );
      } else {
        onSelectionChange([...selectedCoreIds, item.id], selectedAccessoryIds);
      }
    } else if (isAccessory) {
      if (selectedAccessoryIds.includes(item.id)) {
        onSelectionChange(
          selectedCoreIds,
          selectedAccessoryIds.filter((id) => id !== item.id)
        );
      } else {
        onSelectionChange(selectedCoreIds, [...selectedAccessoryIds, item.id]);
      }
    }
    
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedTag("all");
  };

  const handleClose = () => {
    clearFilters();
    onClose();
  };

  const selectedCount = selectedCoreIds.length + selectedAccessoryIds.length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <ThemedText type="subheading">Find Items</ThemedText>
          <Pressable onPress={handleClose} hitSlop={8}>
            <Feather name="x" size={24} color={theme.text} />
          </Pressable>
        </View>

        <View style={styles.searchContainer}>
          <View
            style={[
              styles.searchInputContainer,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <Feather name="search" size={18} color={theme.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search by name or tag..."
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 ? (
              <Pressable onPress={() => setSearchQuery("")}>
                <Feather name="x-circle" size={18} color={theme.textSecondary} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.filtersSection}>
          <ThemedText type="caption" style={styles.filterLabel}>
            Filter by Type
          </ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChips}
          >
            <Pressable
              style={[
                styles.filterChip,
                {
                  backgroundColor:
                    selectedCategory === "all"
                      ? theme.primary
                      : theme.backgroundSecondary,
                },
              ]}
              onPress={() => setSelectedCategory("all")}
            >
              <ThemedText
                type="small"
                style={{
                  color: selectedCategory === "all" ? theme.buttonText : theme.text,
                }}
              >
                All Types
              </ThemedText>
            </Pressable>
            {ALL_CATEGORIES.map((category) => (
              <Pressable
                key={category}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor:
                      selectedCategory === category
                        ? theme.primary
                        : theme.backgroundSecondary,
                  },
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <ThemedText
                  type="small"
                  style={{
                    color:
                      selectedCategory === category ? theme.buttonText : theme.text,
                  }}
                >
                  {CATEGORY_LABELS[category]}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>

          {allTags.length > 0 ? (
            <>
              <ThemedText type="caption" style={[styles.filterLabel, { marginTop: Spacing.md }]}>
                Filter by Tag
              </ThemedText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterChips}
              >
                <Pressable
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor:
                        selectedTag === "all"
                          ? theme.primary
                          : theme.backgroundSecondary,
                    },
                  ]}
                  onPress={() => setSelectedTag("all")}
                >
                  <ThemedText
                    type="small"
                    style={{
                      color: selectedTag === "all" ? theme.buttonText : theme.text,
                    }}
                  >
                    All Tags
                  </ThemedText>
                </Pressable>
                {allTags.map((tag) => (
                  <Pressable
                    key={tag}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor:
                          selectedTag === tag
                            ? theme.primary
                            : theme.backgroundSecondary,
                      },
                    ]}
                    onPress={() => setSelectedTag(tag)}
                  >
                    <ThemedText
                      type="small"
                      style={{
                        color: selectedTag === tag ? theme.buttonText : theme.text,
                      }}
                    >
                      {tag}
                    </ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          ) : null}
        </View>

        <View style={styles.resultsHeader}>
          <ThemedText type="caption">
            {filteredItems.length} {filteredItems.length === 1 ? "item" : "items"}
          </ThemedText>
          {(searchQuery || selectedCategory !== "all" || selectedTag !== "all") ? (
            <Pressable onPress={clearFilters}>
              <ThemedText type="small" style={{ color: theme.primary }}>
                Clear filters
              </ThemedText>
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          style={styles.itemsScrollView}
          contentContainerStyle={[
            styles.itemsGrid,
            { paddingBottom: insets.bottom + 80 },
          ]}
        >
          {filteredItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="search" size={48} color={theme.textSecondary} />
              <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
                No items match your search
              </ThemedText>
            </View>
          ) : (
            <View style={styles.gridContainer}>
              {filteredItems.map((item) => {
                const selected = isSelected(item.id);
                return (
                  <Pressable
                    key={item.id}
                    style={[
                      styles.itemCard,
                      {
                        backgroundColor: theme.backgroundDefault,
                      },
                      selected && { borderColor: theme.primary, borderWidth: 2 },
                    ]}
                    onPress={() => toggleItem(item)}
                  >
                    <ObjectStorageImage
                      imageUri={item.imageUri}
                      style={styles.itemImage}
                      contentFit="cover"
                    />
                    {selected ? (
                      <View
                        style={[styles.checkBadge, { backgroundColor: theme.primary }]}
                      >
                        <Feather name="check" size={12} color={theme.buttonText} />
                      </View>
                    ) : null}
                    <View style={styles.itemInfo}>
                      <ThemedText type="small" numberOfLines={1}>
                        {item.name}
                      </ThemedText>
                      <ThemedText
                        type="small"
                        style={{ color: theme.textSecondary, fontSize: 10 }}
                      >
                        {CATEGORY_LABELS[item.category]}
                      </ThemedText>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: insets.bottom + Spacing.md,
              backgroundColor: theme.backgroundRoot,
              borderTopColor: theme.border,
            },
          ]}
        >
          <Button onPress={handleClose}>
            Done ({selectedCount} selected)
          </Button>
        </View>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    height: 44,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  filtersSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  filterLabel: {
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  filterChips: {
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  itemsScrollView: {
    flex: 1,
  },
  itemsGrid: {
    paddingHorizontal: Spacing.lg,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  itemCard: {
    width: ITEM_SIZE + 20,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },
  itemImage: {
    width: "100%",
    aspectRatio: 1,
  },
  itemInfo: {
    padding: Spacing.xs,
  },
  checkBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
});

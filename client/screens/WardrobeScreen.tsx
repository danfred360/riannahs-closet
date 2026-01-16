import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, StyleSheet, FlatList, RefreshControl, useWindowDimensions, TextInput, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedView } from "@/components/ThemedView";
import { CategoryFilter } from "@/components/CategoryFilter";
import { TagFilterDropdown } from "@/components/TagFilterDropdown";
import { ClothingItemCard } from "@/components/ClothingItemCard";
import { EmptyState } from "@/components/EmptyState";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { SkeletonGrid } from "@/components/SkeletonLoader";
import { useTheme } from "@/hooks/useTheme";
import { ClothingItem, ClothingCategory } from "@/lib/types";
import { getClothingItems } from "@/lib/api";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { SyncStatusIndicator } from "@/components/SyncStatusIndicator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ITEM_WIDTH = 160;
const ITEM_GAP = 12;

export default function WardrobeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  
  const numColumns = Math.max(2, Math.floor((windowWidth - Spacing.lg * 2 + ITEM_GAP) / (ITEM_WIDTH + ITEM_GAP)));

  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    ClothingCategory | "all"
  >("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    items.forEach((item) => item.tags?.forEach((tag) => tagSet.add(tag)));
    return Array.from(tagSet);
  }, [items]);

  const loadItems = useCallback(async (forceRefresh: boolean = false) => {
    try {
      const clothingItems = await getClothingItems(forceRefresh);
      setItems(clothingItems.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch (error) {
      console.error("Error loading items:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadItems().then(() => {
      getClothingItems(true).then((freshItems) => {
        setItems(freshItems.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
      }).catch(() => {});
    });
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => loadItems());
    return unsubscribe;
  }, [navigation, loadItems]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const clothingItems = await getClothingItems(true);
      setItems(clothingItems.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch (error) {
      console.error("Error refreshing items:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || item.category === selectedCategory;
    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.some((tag) => item.tags?.includes(tag));
    return matchesSearch && matchesCategory && matchesTags;
  });

  const handleAddItem = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("AddEditItem", {});
  };

  const handleItemPress = (item: ClothingItem) => {
    navigation.navigate("ItemDetail", { itemId: item.id });
  };

  const renderItem = ({
    item,
    index,
  }: {
    item: ClothingItem;
    index: number;
  }) => (
    <View style={styles.gridItem}>
      <ClothingItemCard
        item={item}
        onPress={() => handleItemPress(item)}
        index={index}
      />
    </View>
  );

  const renderEmpty = () => {
    if (loading) {
      return <SkeletonGrid count={6} />;
    }
    return (
      <EmptyState
        image={require("@/assets/images/empty-wardrobe.png")}
        title="Start building your wardrobe"
        subtitle="Add your first clothing item to get started"
      />
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.searchWrapper, { paddingTop: headerHeight + Spacing.lg }]}>
        <View style={styles.searchRow}>
          <View style={[styles.searchContainer, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="search" size={18} color={theme.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search by name..."
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 ? (
              <Pressable onPress={() => setSearchQuery("")}>
                <Feather name="x" size={18} color={theme.textSecondary} />
              </Pressable>
            ) : null}
          </View>
          <TagFilterDropdown
            availableTags={availableTags}
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
          />
        </View>
        <CategoryFilter
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
        <SyncStatusIndicator />
      </View>
      <FlatList
        key={`wardrobe-grid-${numColumns}`}
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: Spacing.md,
            paddingBottom: tabBarHeight + Spacing["5xl"],
          },
          filteredItems.length === 0 && styles.emptyContent,
        ]}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
            progressViewOffset={headerHeight}
          />
        }
        showsVerticalScrollIndicator={false}
      />
      <FloatingActionButton
        onPress={handleAddItem}
        bottom={tabBarHeight + Spacing.xl}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  emptyContent: {
    flexGrow: 1,
  },
  row: {
    gap: Spacing.md,
    marginBottom: Spacing.md,
    justifyContent: "center",
  },
  gridItem: {
    width: ITEM_WIDTH,
    maxWidth: ITEM_WIDTH,
  },
  searchWrapper: {
    paddingHorizontal: Spacing.lg,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.body.fontSize,
    paddingVertical: Spacing.xs,
  },
});

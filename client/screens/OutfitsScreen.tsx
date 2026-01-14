import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, StyleSheet, FlatList, RefreshControl, TextInput, Pressable, useWindowDimensions, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { OutfitCard } from "@/components/OutfitCard";
import { EmptyState } from "@/components/EmptyState";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { SkeletonGrid } from "@/components/SkeletonLoader";
import { useTheme } from "@/hooks/useTheme";
import { Outfit, ClothingItem, PlannedOutfit } from "@/lib/types";
import { getOutfits, getClothingItems, getPlannedOutfits } from "@/lib/api";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type SortOption = "newest" | "recently-worn" | "least-worn" | "never-worn";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ITEM_WIDTH = 160;
const ITEM_GAP = 12;

export default function OutfitsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  
  const numColumns = Math.max(2, Math.floor((windowWidth - Spacing.lg * 2 + ITEM_GAP) / (ITEM_WIDTH + ITEM_GAP)));

  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [plannedOutfits, setPlannedOutfits] = useState<PlannedOutfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("newest");

  const sortLabels: Record<SortOption, string> = {
    "newest": "Newest",
    "recently-worn": "Recently Worn",
    "least-worn": "Least Recently Worn",
    "never-worn": "Never Worn",
  };

  const getLastWornDate = useCallback((outfitId: string): Date | null => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    const wornDates = plannedOutfits
      .filter(p => p.outfitId === outfitId)
      .map(p => new Date(p.date))
      .filter(d => d <= today)
      .sort((a, b) => b.getTime() - a.getTime());
    
    return wornDates.length > 0 ? wornDates[0] : null;
  }, [plannedOutfits]);

  const filteredAndSortedOutfits = useMemo(() => {
    let filtered = outfits;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((outfit) => {
        const nameMatch = outfit.name.toLowerCase().includes(query);
        const tagMatch = outfit.tags?.some((tag) => tag.toLowerCase().includes(query));
        return nameMatch || tagMatch;
      });
    }

    if (sortOption === "never-worn") {
      filtered = filtered.filter((outfit) => getLastWornDate(outfit.id) === null);
      return filtered.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      switch (sortOption) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        
        case "recently-worn": {
          const aWorn = getLastWornDate(a.id);
          const bWorn = getLastWornDate(b.id);
          if (!aWorn && !bWorn) return 0;
          if (!aWorn) return 1;
          if (!bWorn) return -1;
          return bWorn.getTime() - aWorn.getTime();
        }
        
        case "least-worn": {
          const aWorn = getLastWornDate(a.id);
          const bWorn = getLastWornDate(b.id);
          if (!aWorn && !bWorn) return 0;
          if (!aWorn) return -1;
          if (!bWorn) return 1;
          return aWorn.getTime() - bWorn.getTime();
        }
        
        default:
          return 0;
      }
    });

    return sorted;
  }, [outfits, searchQuery, sortOption, getLastWornDate]);

  const loadData = useCallback(async (forceRefresh: boolean = false) => {
    try {
      const [outfitData, itemData, plannedData] = await Promise.all([
        getOutfits(forceRefresh),
        getClothingItems(forceRefresh),
        getPlannedOutfits(forceRefresh),
      ]);
      setOutfits(outfitData);
      setItems(itemData);
      setPlannedOutfits(plannedData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData().then(() => {
      Promise.all([getOutfits(true), getClothingItems(true), getPlannedOutfits(true)]).then(([freshOutfits, freshItems, freshPlanned]) => {
        setOutfits(freshOutfits);
        setItems(freshItems);
        setPlannedOutfits(freshPlanned);
      }).catch(() => {});
    });
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => loadData());
    return unsubscribe;
  }, [navigation, loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const [outfitData, itemData, plannedData] = await Promise.all([
        getOutfits(true),
        getClothingItems(true),
        getPlannedOutfits(true),
      ]);
      setOutfits(outfitData);
      setItems(itemData);
      setPlannedOutfits(plannedData);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSortChange = (option: SortOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSortOption(option);
  };

  const handleAddOutfit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("OutfitBuilder", {});
  };

  const handleOutfitPress = (outfit: Outfit) => {
    navigation.navigate("OutfitDetail", { outfitId: outfit.id });
  };

  const renderItem = ({ item, index }: { item: Outfit; index: number }) => (
    <View style={styles.gridItem}>
      <OutfitCard
        outfit={item}
        items={items}
        onPress={() => handleOutfitPress(item)}
        index={index}
      />
    </View>
  );

  const renderEmpty = () => {
    if (loading) {
      return <SkeletonGrid count={4} />;
    }
    return (
      <EmptyState
        image={require("@/assets/images/empty-outfits.png")}
        title="Create your first outfit"
        subtitle="Combine your clothing items into complete looks"
      />
    );
  };

  const sortOptions: SortOption[] = ["newest", "recently-worn", "least-worn", "never-worn"];

  return (
    <ThemedView style={styles.container}>
      {outfits.length > 0 ? (
        <View style={[styles.searchWrapper, { paddingTop: headerHeight + Spacing.lg }]}>
          <View style={[styles.searchContainer, { backgroundColor: theme.backgroundSecondary }]}>
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
                <Feather name="x" size={18} color={theme.textSecondary} />
              </Pressable>
            ) : null}
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.sortContainer}
            contentContainerStyle={styles.sortContent}
          >
            {sortOptions.map((option) => (
              <Pressable
                key={option}
                style={[
                  styles.sortChip,
                  { 
                    backgroundColor: sortOption === option ? theme.primary : theme.backgroundSecondary,
                  },
                ]}
                onPress={() => handleSortChange(option)}
              >
                <ThemedText
                  style={[
                    styles.sortChipText,
                    { color: sortOption === option ? "#FFFFFF" : theme.textSecondary },
                  ]}
                >
                  {sortLabels[option]}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
      <FlatList
        key={`outfits-grid-${numColumns}`}
        data={filteredAndSortedOutfits}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        columnWrapperStyle={filteredAndSortedOutfits.length > 0 ? styles.row : undefined}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: outfits.length > 0 ? Spacing.md : headerHeight + Spacing.lg,
            paddingBottom: tabBarHeight + Spacing["5xl"],
          },
          filteredAndSortedOutfits.length === 0 && styles.emptyContent,
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
        onPress={handleAddOutfit}
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.body.fontSize,
    paddingVertical: Spacing.xs,
  },
  searchWrapper: {
    paddingHorizontal: Spacing.lg,
  },
  sortContainer: {
    marginBottom: Spacing.md,
  },
  sortContent: {
    gap: Spacing.sm,
  },
  sortChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  sortChipText: {
    fontSize: Typography.caption.fontSize,
    fontWeight: "500",
  },
});

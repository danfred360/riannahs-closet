import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, StyleSheet, FlatList, RefreshControl, TextInput, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedView } from "@/components/ThemedView";
import { OutfitCard } from "@/components/OutfitCard";
import { EmptyState } from "@/components/EmptyState";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { SkeletonGrid } from "@/components/SkeletonLoader";
import { useTheme } from "@/hooks/useTheme";
import { Outfit, ClothingItem } from "@/lib/types";
import { getOutfits, getClothingItems } from "@/lib/api";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function OutfitsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();

  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOutfits = useMemo(() => {
    if (!searchQuery.trim()) {
      return outfits;
    }
    const query = searchQuery.toLowerCase().trim();
    return outfits.filter((outfit) => {
      const nameMatch = outfit.name.toLowerCase().includes(query);
      const tagMatch = outfit.tags?.some((tag) => tag.toLowerCase().includes(query));
      return nameMatch || tagMatch;
    });
  }, [outfits, searchQuery]);

  const loadData = useCallback(async () => {
    try {
      const [outfitData, itemData] = await Promise.all([
        getOutfits(),
        getClothingItems(),
      ]);
      setOutfits(outfitData.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
      setItems(itemData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", loadData);
    return unsubscribe;
  }, [navigation, loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleAddOutfit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("OutfitBuilder", {});
  };

  const handleOutfitPress = (outfit: Outfit) => {
    navigation.navigate("OutfitBuilder", { outfitId: outfit.id });
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
        </View>
      ) : null}
      <FlatList
        data={filteredOutfits}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={filteredOutfits.length > 0 ? styles.row : undefined}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: outfits.length > 0 ? Spacing.md : headerHeight + Spacing.lg,
            paddingBottom: tabBarHeight + Spacing["5xl"],
          },
          filteredOutfits.length === 0 && styles.emptyContent,
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
  },
  gridItem: {
    flex: 1,
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
});

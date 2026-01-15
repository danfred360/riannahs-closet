import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, StyleSheet, ScrollView, Pressable, Platform, Alert, useWindowDimensions } from "react-native";
import * as Haptics from "expo-haptics";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeaderButton, useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { TagChip } from "@/components/TagChip";
import { ObjectStorageImage } from "@/components/ObjectStorageImage";
import { useTheme } from "@/hooks/useTheme";
import { Outfit, ClothingItem, PlannedOutfit, CORE_CATEGORIES, ACCESSORY_CATEGORIES } from "@/lib/types";
import { getOutfits, getClothingItems, getPlannedOutfits, deleteOutfit } from "@/lib/api";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteParams = RouteProp<RootStackParamList, "OutfitDetail">;

const INITIAL_WEAR_HISTORY_COUNT = 3;

const ITEM_IMAGE_SIZE = 100;
const MAX_CONTENT_WIDTH = 500;

export default function OutfitDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParams>();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const { width: windowWidth } = useWindowDimensions();
  const isWideScreen = windowWidth > MAX_CONTENT_WIDTH;

  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [wearHistory, setWearHistory] = useState<PlannedOutfit[]>([]);
  const [showAllWearHistory, setShowAllWearHistory] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [outfits, allItems, plannedOutfits] = await Promise.all([
        getOutfits(),
        getClothingItems(),
        getPlannedOutfits(),
      ]);

      const found = outfits.find((o) => o.id === route.params.outfitId);
      setOutfit(found || null);
      setItems(allItems);

      if (found) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const history = plannedOutfits
          .filter((p) => p.outfitId === found.id)
          .filter((p) => {
            const planDate = new Date(p.date + "T00:00:00");
            return planDate <= today;
          })
          .sort((a, b) => b.date.localeCompare(a.date));
        
        setWearHistory(history);
      }
    } catch (error) {
      console.error("Error loading outfit:", error);
    }
  }, [route.params.outfitId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", loadData);
    return unsubscribe;
  }, [navigation, loadData]);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: outfit?.name || "Outfit Details",
      headerRight: () => (
        <HeaderButton
          onPress={() =>
            navigation.navigate("OutfitBuilder", { outfitId: route.params.outfitId })
          }
        >
          <Feather name="edit-2" size={20} color={theme.text} />
        </HeaderButton>
      ),
    });
  }, [navigation, route.params.outfitId, theme.text, outfit?.name]);

  const coreItems = useMemo(() => {
    if (!outfit) return [];
    return items.filter((item) => outfit.itemIds.includes(item.id));
  }, [items, outfit]);

  const accessoryItems = useMemo(() => {
    if (!outfit) return [];
    return items.filter((item) => outfit.accessoryIds?.includes(item.id));
  }, [items, outfit]);

  const performDelete = async () => {
    try {
      await deleteOutfit(route.params.outfitId);
      queryClient.invalidateQueries({ queryKey: ["/api/v1/outfits"] });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      navigation.goBack();
    } catch (error) {
      console.error("Error deleting outfit:", error);
      if (Platform.OS === "web") {
        alert("Failed to delete outfit. Please try again.");
      } else {
        Alert.alert("Error", "Failed to delete outfit. Please try again.");
      }
    }
  };

  const handleDelete = () => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        `Are you sure you want to delete "${outfit?.name}"? This cannot be undone.`
      );
      if (confirmed) {
        performDelete();
      }
    } else {
      Alert.alert(
        "Delete Outfit",
        `Are you sure you want to delete "${outfit?.name}"? This cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: performDelete,
          },
        ]
      );
    }
  };

  const displayedWearHistory = showAllWearHistory
    ? wearHistory
    : wearHistory.slice(0, INITIAL_WEAR_HISTORY_COUNT);

  const hasMoreHistory = wearHistory.length > INITIAL_WEAR_HISTORY_COUNT;

  const renderItemsGrid = (itemsList: ClothingItem[]) => (
    <View style={styles.itemsGrid}>
      {itemsList.map((item) => (
        <Pressable
          key={item.id}
          style={[styles.itemCard, { width: ITEM_IMAGE_SIZE }]}
          onPress={() => navigation.navigate("ItemDetail", { itemId: item.id })}
        >
          <ObjectStorageImage
            imageUri={item.imageUri}
            style={[styles.itemImage, { width: ITEM_IMAGE_SIZE, height: ITEM_IMAGE_SIZE }]}
            contentFit="cover"
            transition={200}
          />
          <ThemedText type="small" numberOfLines={1} style={styles.itemName}>
            {item.name}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );

  if (!outfit) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ThemedText type="body">Loading...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { 
            paddingTop: headerHeight + Spacing.md, 
            paddingBottom: insets.bottom + Spacing.xl,
            alignItems: isWideScreen ? "center" : "stretch",
          },
        ]}
      >
        <View style={[styles.contentWrapper, isWideScreen && { maxWidth: MAX_CONTENT_WIDTH, width: "100%" }]}>
          <View style={styles.outfitSection}>
            <ThemedText type="subheading" style={styles.sectionTitle}>
              The Outfit
            </ThemedText>
            {renderItemsGrid(coreItems)}
          </View>

          {accessoryItems.length > 0 ? (
            <View style={styles.accessorySection}>
              <ThemedText type="subheading" style={styles.sectionTitle}>
                Looks Good With
              </ThemedText>
              {renderItemsGrid(accessoryItems)}
            </View>
          ) : null}

          <View style={styles.content}>
            {outfit.tags.length > 0 ? (
              <View style={styles.tagsSection}>
                <ThemedText type="caption" style={styles.sectionLabel}>
                  Tags
                </ThemedText>
                <View style={styles.tagsRow}>
                  {outfit.tags.map((tag) => (
                    <TagChip key={tag} label={tag} size="small" />
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.metaSection}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Created{" "}
                {new Date(outfit.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </ThemedText>
            </View>

            {wearHistory.length > 0 ? (
              <View style={styles.wearHistorySection}>
                <View style={styles.sectionHeader}>
                  <ThemedText type="caption" style={styles.sectionLabel}>
                    Recently Worn ({wearHistory.length} {wearHistory.length === 1 ? "time" : "times"})
                  </ThemedText>
                </View>
                <View style={styles.wearHistoryList}>
                  {displayedWearHistory.map((planned) => {
                    const planDate = new Date(planned.date + "T00:00:00");
                    return (
                      <View
                        key={planned.id}
                        style={[styles.wearHistoryItem, { backgroundColor: theme.backgroundSecondary }]}
                      >
                        <Feather name="check-circle" size={16} color={theme.primary} />
                        <ThemedText type="body">
                          {planDate.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: planDate.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
                          })}
                        </ThemedText>
                      </View>
                    );
                  })}
                </View>
                {hasMoreHistory ? (
                  <Pressable
                    style={styles.showMoreButton}
                    onPress={() => setShowAllWearHistory(!showAllWearHistory)}
                  >
                    <ThemedText type="small" style={{ color: theme.primary }}>
                      {showAllWearHistory
                        ? "Show less"
                        : `Show ${wearHistory.length - INITIAL_WEAR_HISTORY_COUNT} more`}
                    </ThemedText>
                    <Feather
                      name={showAllWearHistory ? "chevron-up" : "chevron-down"}
                      size={16}
                      color={theme.primary}
                    />
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <View style={styles.wearHistorySection}>
                <ThemedText type="caption" style={styles.sectionLabel}>
                  Wear History
                </ThemedText>
                <ThemedText type="body" style={{ color: theme.textSecondary }}>
                  This outfit hasn't been worn yet.
                </ThemedText>
              </View>
            )}

            <Pressable
              style={[styles.deleteButton, { borderColor: theme.error }]}
              onPress={handleDelete}
            >
              <Feather name="trash-2" size={18} color={theme.error} />
              <ThemedText style={[styles.deleteButtonText, { color: theme.error }]}>
                Delete Outfit
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
  },
  contentWrapper: {
    width: "100%",
  },
  outfitSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  accessorySection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    marginBottom: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  itemsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  itemCard: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  itemImage: {
    borderRadius: BorderRadius.md,
  },
  itemName: {
    padding: Spacing.xs,
    textAlign: "center",
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  tagsSection: {
    marginTop: Spacing.sm,
  },
  sectionLabel: {
    marginBottom: Spacing.sm,
    fontWeight: "500",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  metaSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  wearHistorySection: {
    marginTop: Spacing.lg,
  },
  wearHistoryList: {
    gap: Spacing.sm,
  },
  wearHistoryItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  showMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    marginTop: Spacing["2xl"],
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  deleteButtonText: {
    fontWeight: "600",
  },
});

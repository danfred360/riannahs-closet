import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeaderButton, useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { TagChip } from "@/components/TagChip";
import { useTheme } from "@/hooks/useTheme";
import { Outfit, ClothingItem, PlannedOutfit } from "@/lib/types";
import { getOutfits, getClothingItems, getPlannedOutfits } from "@/lib/api";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteParams = RouteProp<RootStackParamList, "OutfitDetail">;

const INITIAL_WEAR_HISTORY_COUNT = 3;

export default function OutfitDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParams>();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();

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

  const outfitItems = items.filter((item) => outfit?.itemIds.includes(item.id));

  const displayedWearHistory = showAllWearHistory
    ? wearHistory
    : wearHistory.slice(0, INITIAL_WEAR_HISTORY_COUNT);

  const hasMoreHistory = wearHistory.length > INITIAL_WEAR_HISTORY_COUNT;

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
          { paddingTop: headerHeight + Spacing.md, paddingBottom: insets.bottom + Spacing.xl },
        ]}
      >
        <View style={styles.itemsGrid}>
          {outfitItems.map((item) => (
            <Pressable
              key={item.id}
              style={styles.itemCard}
              onPress={() => navigation.navigate("ItemDetail", { itemId: item.id })}
            >
              <Image
                source={{ uri: item.imageUri }}
                style={styles.itemImage}
                contentFit="contain"
                transition={200}
              />
              <ThemedText type="small" numberOfLines={1} style={styles.itemName}>
                {item.name}
              </ThemedText>
            </Pressable>
          ))}
        </View>

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
  itemsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    justifyContent: "center",
  },
  itemCard: {
    width: 150,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
  },
  itemImage: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#f0f0f0",
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
});

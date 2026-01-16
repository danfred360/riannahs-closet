import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, ScrollView, Alert, Pressable, Platform, useWindowDimensions } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { HeaderButton, useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { TagChip } from "@/components/TagChip";
import { ObjectStorageImage } from "@/components/ObjectStorageImage";
import { useTheme } from "@/hooks/useTheme";
import { ClothingItem, Outfit, CATEGORY_LABELS } from "@/lib/types";
import { getClothingItems, deleteClothingItem, getOutfits } from "@/lib/api";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteParams = RouteProp<RootStackParamList, "ItemDetail">;

const MAX_CONTENT_WIDTH = 500;
const MAX_IMAGE_SIZE = 300;

export default function ItemDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParams>();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const { width: windowWidth } = useWindowDimensions();
  const isWideScreen = windowWidth > MAX_CONTENT_WIDTH;

  const [item, setItem] = useState<ClothingItem | null>(null);
  const [usedInOutfits, setUsedInOutfits] = useState<Outfit[]>([]);

  const loadItem = useCallback(async () => {
    try {
      const [items, outfits] = await Promise.all([
        getClothingItems(),
        getOutfits(),
      ]);
      const found = items.find((i) => i.id === route.params.itemId);
      setItem(found || null);
      
      const outfitsWithItem = outfits.filter((outfit) =>
        outfit.itemIds.includes(route.params.itemId)
      );
      setUsedInOutfits(outfitsWithItem);
    } catch (error) {
      console.error("Error loading item:", error);
    }
  }, [route.params.itemId]);

  useEffect(() => {
    loadItem();
  }, [loadItem]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", loadItem);
    return unsubscribe;
  }, [navigation, loadItem]);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: item?.name || "Item Details",
      headerRight: () => (
        <HeaderButton
          onPress={() =>
            navigation.navigate("AddEditItem", { itemId: route.params.itemId })
          }
        >
          <Feather name="edit-2" size={20} color={theme.text} />
        </HeaderButton>
      ),
    });
  }, [navigation, route.params.itemId, theme.text, item?.name]);

  const performDelete = async () => {
    try {
      await deleteClothingItem(route.params.itemId);
      queryClient.invalidateQueries({ queryKey: ["/api/v1/items"] });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      navigation.goBack();
    } catch (error) {
      console.error("Error deleting item:", error);
      if (Platform.OS === "web") {
        alert("Failed to delete item. Please try again.");
      } else {
        Alert.alert("Error", "Failed to delete item. Please try again.");
      }
    }
  };

  const handleDelete = () => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        "Are you sure you want to delete this item? This action cannot be undone."
      );
      if (confirmed) {
        performDelete();
      }
    } else {
      Alert.alert(
        "Delete Item",
        "Are you sure you want to delete this item? This action cannot be undone.",
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

  if (!item) {
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
        <ObjectStorageImage
          imageUri={item.imageUri}
          style={[styles.image, { maxWidth: MAX_IMAGE_SIZE, maxHeight: MAX_IMAGE_SIZE }]}
          contentFit="cover"
          transition={200}
        />

        <View style={styles.content}>
          <View style={styles.categoryRow}>
            <Feather name="folder" size={16} color={theme.textSecondary} />
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              {CATEGORY_LABELS[item.category]}
            </ThemedText>
          </View>

          {item.tags.length > 0 ? (
            <View style={styles.tagsSection}>
              <ThemedText type="caption" style={styles.sectionLabel}>
                Tags
              </ThemedText>
              <View style={styles.tagsRow}>
                {item.tags.map((tag) => (
                  <TagChip key={tag} label={tag} size="small" />
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.metaSection}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Added{" "}
              {new Date(item.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </ThemedText>
          </View>

          {usedInOutfits.length > 0 ? (
            <View style={styles.outfitsSection}>
              <ThemedText type="caption" style={styles.sectionLabel}>
                Used in {usedInOutfits.length} {usedInOutfits.length === 1 ? "Outfit" : "Outfits"}
              </ThemedText>
              <View style={styles.outfitsList}>
                {usedInOutfits.map((outfit) => (
                  <Pressable
                    key={outfit.id}
                    style={[styles.outfitCard, { backgroundColor: theme.backgroundSecondary }]}
                    onPress={() => navigation.navigate("OutfitDetail", { outfitId: outfit.id })}
                  >
                    <Feather name="layers" size={16} color={theme.primary} />
                    <ThemedText type="body" style={styles.outfitName}>
                      {outfit.name}
                    </ThemedText>
                    <Feather name="chevron-right" size={16} color={theme.textSecondary} />
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={handleDelete}
            style={[styles.deleteButton, { borderColor: theme.error }]}
          >
            <Feather name="trash-2" size={18} color={theme.error} />
            <ThemedText style={[styles.deleteButtonText, { color: theme.error }]}>
              Delete Item
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
  image: {
    width: "100%",
    aspectRatio: 1,
    alignSelf: "center",
    borderRadius: BorderRadius.md,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  tagsSection: {
    marginTop: Spacing.sm,
  },
  sectionLabel: {
    marginBottom: Spacing.sm,
    fontWeight: "500",
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
  actions: {
    padding: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  deleteButtonText: {
    fontWeight: "600",
  },
  outfitsSection: {
    marginTop: Spacing.lg,
  },
  outfitsList: {
    gap: Spacing.sm,
  },
  outfitCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  outfitName: {
    flex: 1,
  },
});

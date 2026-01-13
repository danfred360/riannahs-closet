import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, ScrollView, Alert, Pressable, Platform } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { TagChip } from "@/components/TagChip";
import { useTheme } from "@/hooks/useTheme";
import { ClothingItem, CATEGORY_LABELS } from "@/lib/types";
import { getClothingItems, deleteClothingItem } from "@/lib/api";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteParams = RouteProp<RootStackParamList, "ItemDetail">;

export default function ItemDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParams>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const queryClient = useQueryClient();

  const [item, setItem] = useState<ClothingItem | null>(null);

  const loadItem = useCallback(async () => {
    try {
      const items = await getClothingItems();
      const found = items.find((i) => i.id === route.params.itemId);
      setItem(found || null);
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
      headerRight: () => (
        <Pressable
          onPress={() =>
            navigation.navigate("AddEditItem", { itemId: route.params.itemId })
          }
          hitSlop={8}
        >
          <Feather name="edit-2" size={20} color={theme.text} />
        </Pressable>
      ),
    });
  }, [navigation, route.params.itemId, theme.text]);

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
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
      >
        <Image
          source={{ uri: item.imageUri }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />

        <View style={styles.content}>
          <ThemedText type="heading">{item.name}</ThemedText>

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
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={handleDelete}
            style={[
              styles.deleteButton,
              { borderColor: theme.error, borderWidth: 1, borderRadius: 24, paddingVertical: 14, alignItems: "center" },
            ]}
          >
            <ThemedText style={{ color: theme.error, fontWeight: "600" }}>Delete Item</ThemedText>
          </Pressable>
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
    paddingTop: Spacing.xl,
  },
  image: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#f0f0f0",
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
    paddingTop: 0,
  },
  deleteButton: {
    borderColor: "red",
  },
});

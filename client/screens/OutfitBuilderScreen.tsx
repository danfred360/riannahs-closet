import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  FlatList,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeaderButton } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { CategoryFilter } from "@/components/CategoryFilter";
import { useTheme } from "@/hooks/useTheme";
import { ClothingItem, ClothingCategory, Outfit } from "@/lib/types";
import {
  getClothingItems,
  getOutfits,
  addOutfit,
  updateOutfit,
  deleteOutfit,
  generateId,
} from "@/lib/storage";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteParams = RouteProp<RootStackParamList, "OutfitBuilder">;

export default function OutfitBuilderScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParams>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const isEditing = !!route.params?.outfitId;

  const [name, setName] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [filterCategory, setFilterCategory] = useState<
    ClothingCategory | "all"
  >("all");
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const clothingItems = await getClothingItems();
      setItems(clothingItems);

      if (isEditing) {
        const outfits = await getOutfits();
        const outfit = outfits.find((o) => o.id === route.params?.outfitId);
        if (outfit) {
          setName(outfit.name);
          setSelectedItemIds(outfit.itemIds);
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }, [isEditing, route.params?.outfitId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: isEditing ? "Edit Outfit" : "Create Outfit",
      headerLeft: () => (
        <HeaderButton onPress={() => navigation.goBack()}>
          <ThemedText style={{ color: theme.primary }}>Cancel</ThemedText>
        </HeaderButton>
      ),
      headerRight: () => (
        <HeaderButton onPress={handleSave} disabled={saving}>
          <ThemedText
            style={{
              color: canSave() ? theme.primary : theme.textSecondary,
              fontWeight: "600",
            }}
          >
            {saving ? "Saving..." : "Save"}
          </ThemedText>
        </HeaderButton>
      ),
    });
  }, [navigation, name, selectedItemIds, saving, theme]);

  const canSave = () => {
    return name.trim() && selectedItemIds.length > 0;
  };

  const handleSave = async () => {
    if (!canSave()) return;

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const outfit: Outfit = {
        id: isEditing ? route.params!.outfitId! : generateId(),
        name: name.trim(),
        itemIds: selectedItemIds,
        createdAt: now,
        updatedAt: now,
      };

      if (isEditing) {
        const outfits = await getOutfits();
        const existing = outfits.find((o) => o.id === route.params?.outfitId);
        if (existing) {
          outfit.createdAt = existing.createdAt;
        }
        await updateOutfit(outfit);
      } else {
        await addOutfit(outfit);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error) {
      console.error("Error saving outfit:", error);
      Alert.alert("Error", "Failed to save outfit. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Outfit",
      "Are you sure you want to delete this outfit?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteOutfit(route.params!.outfitId!);
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
              navigation.goBack();
            } catch (error) {
              console.error("Error deleting outfit:", error);
            }
          },
        },
      ]
    );
  };

  const toggleItem = (itemId: string) => {
    if (selectedItemIds.includes(itemId)) {
      setSelectedItemIds(selectedItemIds.filter((id) => id !== itemId));
    } else {
      setSelectedItemIds([...selectedItemIds, itemId]);
    }
    Haptics.selectionAsync();
  };

  const selectedItems = items.filter((item) =>
    selectedItemIds.includes(item.id)
  );

  const filteredItems = items.filter(
    (item) => filterCategory === "all" || item.category === filterCategory
  );

  const renderItem = ({ item }: { item: ClothingItem }) => {
    const isSelected = selectedItemIds.includes(item.id);
    return (
      <Pressable
        style={[
          styles.itemCard,
          { backgroundColor: theme.backgroundDefault },
          isSelected && { borderColor: theme.primary, borderWidth: 2 },
        ]}
        onPress={() => toggleItem(item.id)}
      >
        <Image
          source={{ uri: item.imageUri }}
          style={styles.itemImage}
          contentFit="cover"
        />
        {isSelected ? (
          <View
            style={[styles.checkBadge, { backgroundColor: theme.primary }]}
          >
            <Feather name="check" size={14} color={theme.buttonText} />
          </View>
        ) : null}
        <ThemedText type="small" numberOfLines={1} style={styles.itemName}>
          {item.name}
        </ThemedText>
      </Pressable>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.nameSection}>
        <ThemedText type="caption" style={styles.label}>
          Outfit Name
        </ThemedText>
        <TextInput
          style={[
            styles.input,
            {
              color: theme.text,
              backgroundColor: theme.backgroundSecondary,
              fontFamily: Typography.body.fontFamily,
            },
          ]}
          value={name}
          onChangeText={setName}
          placeholder="e.g., Casual Friday"
          placeholderTextColor={theme.textSecondary}
        />
      </View>

      {selectedItems.length > 0 ? (
        <View style={styles.previewSection}>
          <ThemedText type="caption" style={styles.label}>
            Selected Items ({selectedItems.length})
          </ThemedText>
          <FlatList
            data={selectedItems}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.previewList}
            renderItem={({ item }) => (
              <Pressable
                style={styles.previewItem}
                onPress={() => toggleItem(item.id)}
              >
                <Image
                  source={{ uri: item.imageUri }}
                  style={styles.previewImage}
                  contentFit="cover"
                />
                <View
                  style={[
                    styles.removeIcon,
                    { backgroundColor: theme.error },
                  ]}
                >
                  <Feather name="x" size={12} color="white" />
                </View>
              </Pressable>
            )}
          />
        </View>
      ) : null}

      <View style={styles.itemsSection}>
        <ThemedText type="caption" style={styles.label}>
          Choose Items
        </ThemedText>
        <CategoryFilter
          selectedCategory={filterCategory}
          onSelectCategory={setFilterCategory}
        />
        {items.length === 0 ? (
          <View style={styles.emptyItems}>
            <ThemedText type="body" style={styles.emptyText}>
              No items in your wardrobe yet.
            </ThemedText>
            <ThemedText type="caption">
              Add some clothes first to create an outfit.
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={filteredItems}
            numColumns={3}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.itemsGrid,
              { paddingBottom: insets.bottom + (isEditing ? 100 : 20) },
            ]}
            columnWrapperStyle={styles.itemRow}
            renderItem={renderItem}
          />
        )}
      </View>

      {isEditing ? (
        <View
          style={[
            styles.deleteSection,
            {
              paddingBottom: insets.bottom + Spacing.lg,
              backgroundColor: theme.backgroundRoot,
            },
          ]}
        >
          <Button
            variant="outline"
            onPress={handleDelete}
            style={{ borderColor: theme.error }}
          >
            <ThemedText style={{ color: theme.error }}>Delete Outfit</ThemedText>
          </Button>
        </View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  nameSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  label: {
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  input: {
    height: Spacing.inputHeight,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    fontSize: 16,
  },
  previewSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  previewList: {
    gap: Spacing.sm,
  },
  previewItem: {
    position: "relative",
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.sm,
  },
  removeIcon: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  itemsSection: {
    flex: 1,
    paddingTop: Spacing.md,
  },
  itemsGrid: {
    paddingHorizontal: Spacing.lg,
  },
  itemRow: {
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  itemCard: {
    flex: 1,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
    position: "relative",
  },
  itemImage: {
    width: "100%",
    aspectRatio: 1,
  },
  checkBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  itemName: {
    padding: Spacing.xs,
    textAlign: "center",
  },
  emptyItems: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing["3xl"],
  },
  emptyText: {
    marginBottom: Spacing.sm,
  },
  deleteSection: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
  },
});

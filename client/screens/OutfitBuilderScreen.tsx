import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  FlatList,
  Platform,
  useWindowDimensions,
  ScrollView,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeaderButton, useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { TagSelector } from "@/components/TagSelector";
import { ObjectStorageImage } from "@/components/ObjectStorageImage";
import { useTheme } from "@/hooks/useTheme";
import {
  ClothingItem,
  ClothingCategory,
  Outfit,
  CORE_CATEGORIES,
  ACCESSORY_CATEGORIES,
  CATEGORY_LABELS,
} from "@/lib/types";
import {
  getClothingItems,
  getOutfits,
  addOutfit,
  addOutfitOptimistic,
  updateOutfit,
  deleteOutfit,
  uploadImage,
  generateId,
} from "@/lib/api";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteParams = RouteProp<RootStackParamList, "OutfitBuilder">;

const MAX_CONTENT_WIDTH = 600;
const ITEM_SIZE = 80;

export default function OutfitBuilderScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParams>();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();

  const isEditing = !!route.params?.outfitId;
  const { width: windowWidth } = useWindowDimensions();
  const isWideScreen = windowWidth > MAX_CONTENT_WIDTH;

  const [name, setName] = useState("");
  const [coverImageUri, setCoverImageUri] = useState<string | null>(null);
  const [selectedCoreIds, setSelectedCoreIds] = useState<string[]>([]);
  const [selectedAccessoryIds, setSelectedAccessoryIds] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [originalCreatedAt, setOriginalCreatedAt] = useState<string>("");
  const [originalAccessoryIds, setOriginalAccessoryIds] = useState<string[]>([]);

  const existingTags = useMemo(() => {
    const tagSet = new Set<string>();
    items.forEach((item) => item.tags?.forEach((tag) => tagSet.add(tag)));
    return Array.from(tagSet);
  }, [items]);

  const coreItems = useMemo(
    () => items.filter((item) => CORE_CATEGORIES.includes(item.category)),
    [items]
  );

  const accessoryItems = useMemo(
    () => items.filter((item) => ACCESSORY_CATEGORIES.includes(item.category)),
    [items]
  );

  const loadData = useCallback(async () => {
    try {
      const clothingItems = await getClothingItems();
      setItems(clothingItems);

      if (isEditing) {
        const outfits = await getOutfits();
        const outfit = outfits.find((o) => o.id === route.params?.outfitId);
        if (outfit) {
          setName(outfit.name);
          setCoverImageUri(outfit.coverImageUri);
          setSelectedCoreIds(outfit.itemIds || []);
          setSelectedAccessoryIds(outfit.accessoryIds || []);
          setOriginalAccessoryIds(outfit.accessoryIds || []);
          setTags(outfit.tags || []);
          setOriginalCreatedAt(outfit.createdAt);
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
  }, [navigation, name, selectedCoreIds, selectedAccessoryIds, tags, saving, theme]);

  const canSave = () => {
    return name.trim() && selectedCoreIds.length > 0;
  };

  const compressAndConvertToBase64 = async (uri: string): Promise<string> => {
    if (uri.startsWith("data:")) {
      return uri;
    }
    
    const MAX_DIMENSION = 800;
    
    try {
      if (Platform.OS !== "web") {
        const manipulated = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: MAX_DIMENSION } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );
        
        if (manipulated.base64) {
          return `data:image/jpeg;base64,${manipulated.base64}`;
        }
      }
    } catch (error) {
      console.log("Image manipulation failed, falling back to original:", error);
    }
    
    if (Platform.OS === "web") {
      try {
        const response = await fetch(uri);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch {
        return uri;
      }
    }
    
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: "base64",
      });
      return `data:image/jpeg;base64,${base64}`;
    } catch {
      return uri;
    }
  };

  const handlePickCoverImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
      });

      if (!result.canceled && result.assets[0]) {
        const localUri = result.assets[0].uri;
        const base64Image = await compressAndConvertToBase64(localUri);
        setCoverImageUri(base64Image);
        if (Platform.OS !== "web") {
          Haptics.selectionAsync();
        }
      }
    } catch (error) {
      console.error("Error picking cover image:", error);
      Alert.alert("Error", "Failed to process cover photo. Please try again.");
    }
  };

  const handleRemoveCoverImage = () => {
    setCoverImageUri(null);
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
  };

  const handleSave = async () => {
    if (!canSave()) return;

    setSaving(true);
    try {
      if (isEditing) {
        let finalCoverImageUri = coverImageUri;
        
        if (coverImageUri && coverImageUri.startsWith("data:")) {
          const imageKey = `outfit-cover-${generateId()}.jpg`;
          const uploadResult = await uploadImage(coverImageUri, imageKey);
          finalCoverImageUri = uploadResult.key;
        }
        
        await updateOutfit({
          id: route.params!.outfitId!,
          name: name.trim(),
          coverImageUri: finalCoverImageUri,
          itemIds: selectedCoreIds,
          accessoryIds: selectedAccessoryIds,
          tags,
          createdAt: originalCreatedAt,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await addOutfitOptimistic({
          name: name.trim(),
          coverImageUri,
          itemIds: selectedCoreIds,
          accessoryIds: selectedAccessoryIds,
          tags,
        });
      }

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      navigation.goBack();
    } catch (error) {
      console.error("Error saving outfit:", error);
      Alert.alert("Error", "Failed to save outfit. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const performDelete = async () => {
    try {
      await deleteOutfit(route.params!.outfitId!);
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
        "Are you sure you want to delete this outfit?"
      );
      if (confirmed) {
        performDelete();
      }
    } else {
      Alert.alert(
        "Delete Outfit",
        "Are you sure you want to delete this outfit?",
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

  const toggleCoreItem = (itemId: string) => {
    if (selectedCoreIds.includes(itemId)) {
      setSelectedCoreIds(selectedCoreIds.filter((id) => id !== itemId));
    } else {
      setSelectedCoreIds([...selectedCoreIds, itemId]);
    }
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
  };

  const toggleAccessoryItem = (itemId: string) => {
    if (selectedAccessoryIds.includes(itemId)) {
      setSelectedAccessoryIds(selectedAccessoryIds.filter((id) => id !== itemId));
    } else {
      setSelectedAccessoryIds([...selectedAccessoryIds, itemId]);
    }
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
  };

  const renderItemRow = (
    categoryItems: ClothingItem[],
    selectedIds: string[],
    toggleFn: (id: string) => void
  ) => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.itemRow}
    >
      {categoryItems.map((item) => {
        const isSelected = selectedIds.includes(item.id);
        return (
          <Pressable
            key={item.id}
            style={[
              styles.itemCard,
              {
                backgroundColor: theme.backgroundDefault,
                width: ITEM_SIZE,
              },
              isSelected && { borderColor: theme.primary, borderWidth: 2 },
            ]}
            onPress={() => toggleFn(item.id)}
          >
            <ObjectStorageImage
              imageUri={item.imageUri}
              style={[styles.itemImage, { width: ITEM_SIZE, height: ITEM_SIZE }]}
              contentFit="cover"
            />
            {isSelected ? (
              <View
                style={[styles.checkBadge, { backgroundColor: theme.primary }]}
              >
                <Feather name="check" size={12} color={theme.buttonText} />
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );

  const renderCategorySection = (
    category: ClothingCategory,
    categoryItems: ClothingItem[],
    selectedIds: string[],
    toggleFn: (id: string) => void
  ) => {
    if (categoryItems.length === 0) return null;
    const selectedCount = categoryItems.filter((item) =>
      selectedIds.includes(item.id)
    ).length;

    return (
      <View key={category} style={styles.categorySection}>
        <View style={styles.categoryHeader}>
          <ThemedText type="caption" style={styles.categoryLabel}>
            {CATEGORY_LABELS[category]}
          </ThemedText>
          {selectedCount > 0 ? (
            <View style={[styles.countBadge, { backgroundColor: theme.primary }]}>
              <ThemedText type="small" style={{ color: theme.buttonText }}>
                {selectedCount}
              </ThemedText>
            </View>
          ) : null}
        </View>
        {renderItemRow(categoryItems, selectedIds, toggleFn)}
      </View>
    );
  };

  const groupedCoreItems = useMemo(() => {
    return CORE_CATEGORIES.map((category) => ({
      category,
      items: coreItems.filter((item) => item.category === category),
    })).filter((group) => group.items.length > 0);
  }, [coreItems]);

  const groupedAccessoryItems = useMemo(() => {
    return ACCESSORY_CATEGORIES.map((category) => ({
      category,
      items: accessoryItems.filter((item) => item.category === category),
    })).filter((group) => group.items.length > 0);
  }, [accessoryItems]);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + (isEditing ? 100 : 40),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
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

        <View style={styles.section}>
          <ThemedText type="caption" style={styles.label}>
            Tags
          </ThemedText>
          <TagSelector
            selectedTags={tags}
            onTagsChange={setTags}
            existingTags={existingTags}
            placeholder="Add a tag..."
          />
        </View>

        <View style={styles.section}>
          <ThemedText type="caption" style={styles.label}>
            Cover Photo (Optional)
          </ThemedText>
          <ThemedText type="small" style={styles.coverSubtitle}>
            Add a photo of you wearing this outfit or the items laid out together
          </ThemedText>
          {coverImageUri ? (
            <View style={styles.coverImageContainer}>
              <ObjectStorageImage
                imageUri={coverImageUri}
                style={styles.coverImage}
                contentFit="cover"
              />
              <View style={styles.coverImageActions}>
                <Pressable
                  style={[styles.coverActionButton, { backgroundColor: theme.backgroundSecondary }]}
                  onPress={handlePickCoverImage}
                >
                  <Feather name="edit-2" size={16} color={theme.text} />
                  <ThemedText type="small">Change</ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.coverActionButton, { backgroundColor: theme.backgroundSecondary }]}
                  onPress={handleRemoveCoverImage}
                >
                  <Feather name="trash-2" size={16} color={theme.error} />
                  <ThemedText type="small" style={{ color: theme.error }}>Remove</ThemedText>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              style={[styles.addCoverButton, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
              onPress={handlePickCoverImage}
            >
              <Feather name="camera" size={24} color={theme.textSecondary} />
              <ThemedText type="body" style={{ color: theme.textSecondary }}>
                Add Cover Photo
              </ThemedText>
            </Pressable>
          )}
        </View>

        <View style={styles.section}>
          <ThemedText type="subheading" style={styles.sectionTitle}>
            The Outfit
          </ThemedText>
          <ThemedText type="caption" style={styles.sectionSubtitle}>
            Select your core pieces (tops, bottoms, dresses)
          </ThemedText>
          {coreItems.length === 0 ? (
            <View style={styles.emptySection}>
              <ThemedText type="body" style={styles.emptyText}>
                No core items in your wardrobe yet.
              </ThemedText>
              <ThemedText type="caption">
                Add tops, bottoms, or dresses to create an outfit.
              </ThemedText>
            </View>
          ) : (
            groupedCoreItems.map((group) =>
              renderCategorySection(
                group.category,
                group.items,
                selectedCoreIds,
                toggleCoreItem
              )
            )
          )}
        </View>

        <View style={[styles.section, styles.accessorySection]}>
          <ThemedText type="subheading" style={styles.sectionTitle}>
            Looks Good With
          </ThemedText>
          <ThemedText type="caption" style={styles.sectionSubtitle}>
            Add complementary pieces (outerwear, shoes, accessories)
          </ThemedText>
          {accessoryItems.length === 0 ? (
            <View style={styles.emptySection}>
              <ThemedText type="body" style={styles.emptyText}>
                No accessories in your wardrobe yet.
              </ThemedText>
              <ThemedText type="caption">
                Add outerwear, shoes, or accessories to style your outfit.
              </ThemedText>
            </View>
          ) : (
            groupedAccessoryItems.map((group) =>
              renderCategorySection(
                group.category,
                group.items,
                selectedAccessoryIds,
                toggleAccessoryItem
              )
            )
          )}
        </View>
      </ScrollView>

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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  accessorySection: {
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    opacity: 0.7,
    marginBottom: Spacing.md,
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
  categorySection: {
    marginBottom: Spacing.md,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  categoryLabel: {
    opacity: 0.7,
  },
  countBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    minWidth: 20,
    alignItems: "center",
  },
  itemRow: {
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  itemCard: {
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
    position: "relative",
  },
  itemImage: {
    borderRadius: BorderRadius.sm,
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
  emptySection: {
    paddingVertical: Spacing.xl,
    alignItems: "center",
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
  coverSubtitle: {
    opacity: 0.7,
    marginBottom: Spacing.md,
  },
  coverImageContainer: {
    alignItems: "center",
  },
  coverImage: {
    width: 200,
    height: 200,
    borderRadius: BorderRadius.md,
  },
  coverImageActions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  coverActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  addCoverButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderStyle: "dashed",
  },
});

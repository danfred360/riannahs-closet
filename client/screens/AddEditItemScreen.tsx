import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  Platform,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeaderButton } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { TagChip } from "@/components/TagChip";
import { useTheme } from "@/hooks/useTheme";
import {
  ClothingItem,
  ClothingCategory,
  CATEGORY_LABELS,
  ALL_CATEGORIES,
} from "@/lib/types";
import {
  getClothingItems,
  addClothingItem,
  updateClothingItem,
  generateId,
} from "@/lib/storage";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteParams = RouteProp<RootStackParamList, "AddEditItem">;

export default function AddEditItemScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParams>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const isEditing = !!route.params?.itemId;

  const [name, setName] = useState("");
  const [imageUri, setImageUri] = useState("");
  const [category, setCategory] = useState<ClothingCategory>("tops");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEditing) {
      loadItem();
    }
  }, [isEditing, route.params?.itemId]);

  const loadItem = async () => {
    try {
      const items = await getClothingItems();
      const item = items.find((i) => i.id === route.params?.itemId);
      if (item) {
        setName(item.name);
        setImageUri(item.imageUri);
        setCategory(item.category);
        setTags(item.tags);
      }
    } catch (error) {
      console.error("Error loading item:", error);
    }
  };

  useEffect(() => {
    navigation.setOptions({
      headerTitle: isEditing ? "Edit Item" : "Add Item",
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
  }, [navigation, name, imageUri, category, tags, saving, theme]);

  const canSave = () => {
    return name.trim() && imageUri;
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error("Error picking image:", error);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Camera permission is needed to take photos."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
    }
  };

  const handleAddTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setNewTag("");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSave = async () => {
    if (!canSave()) return;

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const item: ClothingItem = {
        id: isEditing ? route.params!.itemId! : generateId(),
        name: name.trim(),
        category,
        imageUri,
        tags,
        createdAt: isEditing ? "" : now,
        updatedAt: now,
      };

      if (isEditing) {
        const items = await getClothingItems();
        const existing = items.find((i) => i.id === route.params?.itemId);
        if (existing) {
          item.createdAt = existing.createdAt;
        }
        await updateClothingItem(item);
      } else {
        item.createdAt = now;
        await addClothingItem(item);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error) {
      console.error("Error saving item:", error);
      Alert.alert("Error", "Failed to save item. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: insets.bottom + Spacing.xl },
      ]}
    >
      <View style={styles.imageSection}>
        {imageUri ? (
          <Pressable onPress={handlePickImage}>
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              contentFit="cover"
            />
            <View
              style={[
                styles.changeImageOverlay,
                { backgroundColor: theme.overlay },
              ]}
            >
              <Feather name="camera" size={24} color="white" />
              <ThemedText style={styles.changeImageText}>
                Change Photo
              </ThemedText>
            </View>
          </Pressable>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Pressable
              style={[
                styles.imageButton,
                { backgroundColor: theme.backgroundSecondary },
              ]}
              onPress={handlePickImage}
            >
              <Feather name="image" size={32} color={theme.textSecondary} />
              <ThemedText type="caption">Choose Photo</ThemedText>
            </Pressable>
            <Pressable
              style={[
                styles.imageButton,
                { backgroundColor: theme.backgroundSecondary },
              ]}
              onPress={handleTakePhoto}
            >
              <Feather name="camera" size={32} color={theme.textSecondary} />
              <ThemedText type="caption">Take Photo</ThemedText>
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.form}>
        <View style={styles.field}>
          <ThemedText type="caption" style={styles.label}>
            Name
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
            placeholder="e.g., Blue Summer Dress"
            placeholderTextColor={theme.textSecondary}
          />
        </View>

        <View style={styles.field}>
          <ThemedText type="caption" style={styles.label}>
            Category
          </ThemedText>
          <View style={styles.categoryGrid}>
            {ALL_CATEGORIES.map((cat) => (
              <TagChip
                key={cat}
                label={CATEGORY_LABELS[cat]}
                selected={category === cat}
                onPress={() => setCategory(cat)}
              />
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <ThemedText type="caption" style={styles.label}>
            Tags (optional)
          </ThemedText>
          <View style={styles.tagInputRow}>
            <TextInput
              style={[
                styles.tagInput,
                {
                  color: theme.text,
                  backgroundColor: theme.backgroundSecondary,
                  fontFamily: Typography.body.fontFamily,
                },
              ]}
              value={newTag}
              onChangeText={setNewTag}
              placeholder="Add a tag..."
              placeholderTextColor={theme.textSecondary}
              onSubmitEditing={handleAddTag}
              returnKeyType="done"
            />
            <Pressable
              style={[styles.addTagButton, { backgroundColor: theme.primary }]}
              onPress={handleAddTag}
            >
              <Feather name="plus" size={20} color={theme.buttonText} />
            </Pressable>
          </View>
          {tags.length > 0 ? (
            <View style={styles.tagsRow}>
              {tags.map((tag) => (
                <TagChip
                  key={tag}
                  label={tag}
                  size="small"
                  onRemove={() => handleRemoveTag(tag)}
                />
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: Spacing.lg,
  },
  imageSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing["2xl"],
  },
  image: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
  },
  changeImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    opacity: 0,
  },
  changeImageText: {
    color: "white",
    marginTop: Spacing.xs,
  },
  imagePlaceholder: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  imageButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.sm,
  },
  form: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing["2xl"],
  },
  field: {
    gap: Spacing.sm,
  },
  label: {
    fontWeight: "600",
  },
  input: {
    height: Spacing.inputHeight,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    fontSize: 16,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  tagInputRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  tagInput: {
    flex: 1,
    height: Spacing.inputHeight,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    fontSize: 16,
  },
  addTagButton: {
    width: Spacing.inputHeight,
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
});

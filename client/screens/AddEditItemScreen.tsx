import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeaderButton, useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { ObjectStorageImage } from "@/components/ObjectStorageImage";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { TagChip } from "@/components/TagChip";
import { TagSelector } from "@/components/TagSelector";
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
  uploadImage,
  generateId,
} from "@/lib/api";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

const MAX_CONTENT_WIDTH = 480;
const MAX_IMAGE_SIZE = 320;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteParams = RouteProp<RootStackParamList, "AddEditItem">;

export default function AddEditItemScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParams>();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const { width: windowWidth } = useWindowDimensions();

  const isEditing = !!route.params?.itemId;
  const isWideScreen = windowWidth > 600;
  const imageSize = isWideScreen ? MAX_IMAGE_SIZE : windowWidth - Spacing.lg * 2;

  const [name, setName] = useState("");
  const [imageUri, setImageUri] = useState("");
  const [category, setCategory] = useState<ClothingCategory>("tops");
  const [tags, setTags] = useState<string[]>([]);
  const [allItems, setAllItems] = useState<ClothingItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [originalCreatedAt, setOriginalCreatedAt] = useState<string>("");

  useEffect(() => {
    if (isEditing) {
      loadItem();
    }
  }, [isEditing, route.params?.itemId]);

  const loadItem = async () => {
    try {
      const items = await getClothingItems();
      setAllItems(items);
      const item = items.find((i) => i.id === route.params?.itemId);
      if (item) {
        setName(item.name);
        setImageUri(item.imageUri);
        setCategory(item.category);
        setTags(item.tags);
        setOriginalCreatedAt(item.createdAt);
      }
    } catch (error) {
      console.error("Error loading item:", error);
    }
  };

  useEffect(() => {
    if (!isEditing) {
      getClothingItems().then(setAllItems).catch(console.error);
    }
  }, [isEditing]);

  const existingTags = React.useMemo(() => {
    const tagSet = new Set<string>();
    allItems.forEach((item) => item.tags?.forEach((tag) => tagSet.add(tag)));
    return Array.from(tagSet);
  }, [allItems]);

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

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        let finalUri: string;
        
        if (asset.base64) {
          const mimeType = asset.mimeType || "image/jpeg";
          finalUri = `data:${mimeType};base64,${asset.base64}`;
        } else {
          finalUri = await compressAndConvertToBase64(asset.uri);
        }
        
        setImageUri(finalUri);
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
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        let finalUri: string;
        
        if (asset.base64) {
          const mimeType = asset.mimeType || "image/jpeg";
          finalUri = `data:${mimeType};base64,${asset.base64}`;
        } else {
          finalUri = await compressAndConvertToBase64(asset.uri);
        }
        
        setImageUri(finalUri);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
    }
  };

  const handleSave = async () => {
    if (!canSave()) return;

    setSaving(true);
    try {
      let finalImageUri = imageUri;
      
      // Check if this is a new base64 image (not already an object storage key)
      if (imageUri.startsWith("data:")) {
        // Upload to object storage
        const fileName = `${generateId()}.jpg`;
        const uploadResult = await uploadImage(imageUri, fileName);
        finalImageUri = uploadResult.key;
      }
      
      if (isEditing) {
        await updateClothingItem({
          id: route.params!.itemId!,
          name: name.trim(),
          category,
          imageUri: finalImageUri,
          tags,
          createdAt: originalCreatedAt,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await addClothingItem({
          name: name.trim(),
          category,
          imageUri: finalImageUri,
          tags,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/v1/items"] });
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
        { 
          paddingTop: headerHeight + Spacing.lg, 
          paddingBottom: insets.bottom + Spacing.xl,
          alignItems: isWideScreen ? "center" : "stretch",
        },
      ]}
    >
      <View style={[styles.contentContainer, isWideScreen && { maxWidth: MAX_CONTENT_WIDTH }]}>
        <View style={[styles.imageSection, isWideScreen && { alignItems: "center" }]}>
          {imageUri ? (
            <Pressable onPress={handlePickImage}>
              <ObjectStorageImage
                imageUri={imageUri}
                style={[
                  styles.image,
                  { 
                    width: imageSize, 
                    height: imageSize,
                    maxWidth: MAX_IMAGE_SIZE,
                    maxHeight: MAX_IMAGE_SIZE,
                  },
                ]}
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
            <View style={[
              styles.imagePlaceholder, 
              isWideScreen && { maxWidth: MAX_IMAGE_SIZE }
            ]}>
              <Pressable
                style={[
                  styles.imageButton,
                  { 
                    backgroundColor: theme.backgroundSecondary,
                    maxWidth: (MAX_IMAGE_SIZE - Spacing.md) / 2,
                    maxHeight: (MAX_IMAGE_SIZE - Spacing.md) / 2,
                  },
                ]}
                onPress={handlePickImage}
              >
                <Feather name="image" size={32} color={theme.textSecondary} />
                <ThemedText type="caption">Choose Photo</ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.imageButton,
                  { 
                    backgroundColor: theme.backgroundSecondary,
                    maxWidth: (MAX_IMAGE_SIZE - Spacing.md) / 2,
                    maxHeight: (MAX_IMAGE_SIZE - Spacing.md) / 2,
                  },
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
            Tags
          </ThemedText>
          <TagSelector
            selectedTags={tags}
            onTagsChange={setTags}
            existingTags={existingTags}
            placeholder="Add a tag..."
          />
        </View>
        </View>
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: Spacing.lg,
  },
  contentContainer: {
    width: "100%",
  },
  imageSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing["2xl"],
  },
  image: {
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
    padding: Spacing.md,
    minWidth: 120,
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

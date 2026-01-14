import React from "react";
import { StyleSheet, Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeIn,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { TagChip } from "@/components/TagChip";
import { ObjectStorageImage } from "@/components/ObjectStorageImage";
import { useTheme } from "@/hooks/useTheme";
import { Outfit, ClothingItem } from "@/lib/types";
import { Spacing, BorderRadius } from "@/constants/theme";

interface OutfitCardProps {
  outfit: Outfit;
  items: ClothingItem[];
  onPress: () => void;
  index?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function OutfitCard({
  outfit,
  items,
  onPress,
  index = 0,
}: OutfitCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const outfitItems = items.filter((item) => outfit.itemIds.includes(item.id));
  const previewItems = outfitItems.slice(0, 4);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <AnimatedPressable
      entering={FadeIn.delay(index * 50).duration(300)}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.card,
        { backgroundColor: theme.backgroundDefault },
        animatedStyle,
      ]}
    >
      <View style={styles.imageGrid}>
        {previewItems.map((item, idx) => (
          <ObjectStorageImage
            key={item.id}
            imageUri={item.imageUri}
            style={[
              styles.gridImage,
              previewItems.length === 1 && styles.singleImage,
              previewItems.length === 2 && styles.halfImage,
              previewItems.length === 3 && idx === 0 && styles.halfImage,
            ]}
            contentFit="cover"
          />
        ))}
        {previewItems.length === 0 ? (
          <View
            style={[
              styles.placeholder,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          />
        ) : null}
      </View>
      <View style={styles.info}>
        <ThemedText type="body" numberOfLines={1} style={styles.name}>
          {outfit.name}
        </ThemedText>
        <ThemedText type="small">
          {outfitItems.length} {outfitItems.length === 1 ? "item" : "items"}
        </ThemedText>
        {outfit.tags && outfit.tags.length > 0 ? (
          <View style={styles.tagsRow}>
            {outfit.tags.slice(0, 2).map((tag) => (
              <TagChip key={tag} label={tag} size="small" />
            ))}
            {outfit.tags.length > 2 ? (
              <ThemedText type="small" style={styles.moreText}>
                +{outfit.tags.length - 2}
              </ThemedText>
            ) : null}
          </View>
        ) : null}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    maxWidth: 200,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },
  imageGrid: {
    width: "100%",
    aspectRatio: 1,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  gridImage: {
    width: "50%",
    height: "50%",
  },
  singleImage: {
    width: "100%",
    height: "100%",
  },
  halfImage: {
    width: "50%",
    height: "100%",
  },
  placeholder: {
    width: "100%",
    height: "100%",
  },
  info: {
    padding: Spacing.sm,
  },
  name: {
    fontWeight: "500",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: Spacing.xs,
  },
  moreText: {
    opacity: 0.6,
  },
});

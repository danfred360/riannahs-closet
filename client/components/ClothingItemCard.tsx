import React from "react";
import { StyleSheet, Pressable, View } from "react-native";
import { Image } from "expo-image";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeIn,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { ClothingItem, CATEGORY_LABELS } from "@/lib/types";
import { Spacing, BorderRadius } from "@/constants/theme";

interface ClothingItemCardProps {
  item: ClothingItem;
  onPress: () => void;
  index?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ClothingItemCard({
  item,
  onPress,
  index = 0,
}: ClothingItemCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

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
      <Image
        source={{ uri: item.imageUri }}
        style={styles.image}
        contentFit="cover"
        transition={200}
      />
      <View style={styles.info}>
        <ThemedText type="body" numberOfLines={1} style={styles.name}>
          {item.name}
        </ThemedText>
        <ThemedText type="small" numberOfLines={1}>
          {CATEGORY_LABELS[item.category]}
        </ThemedText>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#f0f0f0",
  },
  info: {
    padding: Spacing.sm,
  },
  name: {
    fontWeight: "500",
  },
});

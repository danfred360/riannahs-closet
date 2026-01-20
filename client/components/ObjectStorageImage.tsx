import React, { useState, useEffect } from "react";
import { View, StyleSheet, StyleProp, ViewStyle, ActivityIndicator } from "react-native";
import { Image, ImageStyle } from "expo-image";
import { getImageDataUrl } from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";

interface ObjectStorageImageProps {
  imageUri: string;
  style?: StyleProp<ImageStyle>;
  contentFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
  transition?: number;
}

export function ObjectStorageImage({
  imageUri,
  style,
  contentFit = "cover",
  transition = 200,
}: ObjectStorageImageProps) {
  const { theme } = useTheme();
  const [resolvedUri, setResolvedUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadImage = async () => {
      // If it's already a data URL, http(s) URL, or file:// URL, use directly
      if (imageUri.startsWith("data:") || imageUri.startsWith("http") || imageUri.startsWith("file://")) {
        setResolvedUri(imageUri);
        return;
      }

      // Otherwise it's an object storage key - fetch it
      setLoading(true);
      try {
        const dataUrl = await getImageDataUrl(imageUri);
        if (!cancelled && dataUrl) {
          setResolvedUri(dataUrl);
        }
      } catch (error) {
        console.error("Failed to load image:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      cancelled = true;
    };
  }, [imageUri]);

  if (loading || !resolvedUri) {
    return (
      <View style={[styles.placeholder, style as StyleProp<ViewStyle>, { backgroundColor: theme.backgroundSecondary }]}>
        {loading ? <ActivityIndicator color={theme.textSecondary} /> : null}
      </View>
    );
  }

  return (
    <Image
      source={{ uri: resolvedUri }}
      style={style}
      contentFit={contentFit}
      transition={transition}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    justifyContent: "center",
    alignItems: "center",
  },
});

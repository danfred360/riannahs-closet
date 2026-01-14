import React, { useState, useEffect } from "react";
import {
  View,
  Modal,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

const FIRST_LAUNCH_KEY = "@riannahs_closet_first_launch_v1";

interface TipItem {
  icon: keyof typeof Feather.glyphMap;
  text: string;
}

const tips: TipItem[] = [
  { icon: "camera", text: "Take photos of your clothes to add them to your wardrobe" },
  { icon: "tag", text: "Add tags to organize items by color, season, or occasion" },
  { icon: "layers", text: "Combine items into outfits for quick access" },
  { icon: "calendar", text: "Plan your outfits ahead using the calendar" },
];

export function WelcomeModal() {
  const [visible, setVisible] = useState(false);
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    checkFirstLaunch();
  }, []);

  const checkFirstLaunch = async () => {
    try {
      const hasLaunched = await AsyncStorage.getItem(FIRST_LAUNCH_KEY);
      if (!hasLaunched) {
        setVisible(true);
      }
    } catch (error) {
      console.error("Error checking first launch:", error);
    }
  };

  const handleDismiss = async () => {
    try {
      await AsyncStorage.setItem(FIRST_LAUNCH_KEY, "true");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setVisible(false);
    } catch (error) {
      console.error("Error saving first launch:", error);
      setVisible(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
    >
      <View style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.6)" }]}>
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: theme.backgroundRoot,
              marginTop: insets.top + Spacing.xl,
              marginBottom: insets.bottom + Spacing.xl,
            },
          ]}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Image
              source={require("../../assets/images/icon.png")}
              style={styles.logo}
              contentFit="contain"
            />

            <ThemedText type="title" style={styles.title}>
              Welcome to Riannah's Closet
            </ThemedText>

            <ThemedText type="body" style={styles.subtitle}>
              Your wardrobe, beautifully organized. Here are some tips to get
              started:
            </ThemedText>

            <View style={styles.tipsList}>
              {tips.map((tip, index) => (
                <Card key={index} style={styles.tipCard}>
                  <View style={styles.tipRow}>
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: `${theme.primary}20` },
                      ]}
                    >
                      <Feather name={tip.icon} size={20} color={theme.primary} />
                    </View>
                    <ThemedText type="body" style={styles.tipText}>
                      {tip.text}
                    </ThemedText>
                  </View>
                </Card>
              ))}
            </View>

            <Pressable
              style={[styles.button, { backgroundColor: theme.primary }]}
              onPress={handleDismiss}
            >
              <ThemedText style={styles.buttonText}>Get Started</ThemedText>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    maxHeight: "90%",
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  scrollContent: {
    padding: Spacing.xl,
    alignItems: "center",
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 16,
    marginBottom: Spacing.lg,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  subtitle: {
    textAlign: "center",
    marginBottom: Spacing.xl,
    opacity: 0.8,
  },
  tipsList: {
    width: "100%",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  tipCard: {
    padding: Spacing.md,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  tipText: {
    flex: 1,
  },
  button: {
    width: "100%",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
});

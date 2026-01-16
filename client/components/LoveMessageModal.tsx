import React, { useState, useEffect } from "react";
import {
  View,
  Modal,
  StyleSheet,
  Pressable,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { getApiUrl } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";

const SPECIAL_EMAIL = "riannah.arlene@gmail.com";

export function LoveMessageModal() {
  const [visible, setVisible] = useState(false);
  const { theme } = useTheme();
  const { user, token } = useAuth();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (user && token) {
      checkShouldShow();
    }
  }, [user, token]);

  const checkShouldShow = async () => {
    if (!user || user.email.toLowerCase() !== SPECIAL_EMAIL) {
      return;
    }

    try {
      const response = await fetch(new URL("/api/v1/preferences", getApiUrl()).toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const prefs = await response.json();
        const today = new Date().toDateString();
        
        if (prefs.loveMessageLastSeen !== today) {
          setVisible(true);
        }
      }
    } catch (error) {
      console.error("Error checking love message:", error);
    }
  };

  const handleDismiss = async () => {
    try {
      const today = new Date().toDateString();
      await fetch(new URL("/api/v1/preferences/love-message-seen", getApiUrl()).toString(), {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ date: today }),
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setVisible(false);
    } catch (error) {
      console.error("Error saving love message date:", error);
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
          <View style={styles.content}>
            <View style={[styles.heartContainer, { backgroundColor: `${theme.primary}20` }]}>
              <Feather name="heart" size={48} color={theme.primary} />
            </View>

            <ThemedText type="title" style={styles.message}>
              I love you!
            </ThemedText>

            <ThemedText type="body" style={styles.signature}>
              From, Danny
            </ThemedText>

            <Pressable
              style={[styles.button, { backgroundColor: theme.primary }]}
              onPress={handleDismiss}
            >
              <Feather name="heart" size={16} color="white" style={styles.buttonIcon} />
              <ThemedText style={styles.buttonText}>Close</ThemedText>
            </Pressable>
          </View>
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
    maxWidth: 320,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  content: {
    padding: Spacing.xl,
    alignItems: "center",
  },
  heartContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  message: {
    textAlign: "center",
    marginBottom: Spacing.md,
    fontSize: 28,
  },
  signature: {
    textAlign: "center",
    marginBottom: Spacing.xl,
    opacity: 0.7,
    fontStyle: "italic",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  buttonIcon: {
    marginRight: Spacing.xs,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
});

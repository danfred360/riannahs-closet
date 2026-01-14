import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  Platform,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { UserProfile, ClothingItem, Outfit } from "@/lib/types";
import {
  getUserProfile,
  saveUserProfile,
  getClothingItems,
  getOutfits,
  deleteAccount,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";

export default function ProfileScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user, logout } = useAuth();

  const [profile, setProfile] = useState<UserProfile>({
    displayName: user?.displayName || "User",
    avatarUri: null,
  });
  const [itemCount, setItemCount] = useState(0);
  const [outfitCount, setOutfitCount] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");

  const loadData = useCallback(async (forceRefresh: boolean = false) => {
    try {
      const [userProfile, items, outfits] = await Promise.all([
        getUserProfile(forceRefresh),
        getClothingItems(forceRefresh),
        getOutfits(forceRefresh),
      ]);
      const displayName = userProfile.displayName || user?.displayName || "User";
      setProfile({ ...userProfile, displayName });
      setItemCount(items.length);
      setOutfitCount(outfits.length);
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  }, [user?.displayName]);

  useEffect(() => {
    loadData().then(() => {
      Promise.all([getUserProfile(true), getClothingItems(true), getOutfits(true)]).then(([freshProfile, freshItems, freshOutfits]) => {
        const displayName = freshProfile.displayName || user?.displayName || "User";
        setProfile({ ...freshProfile, displayName });
        setItemCount(freshItems.length);
        setOutfitCount(freshOutfits.length);
      }).catch(() => {});
    });
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => loadData());
    return unsubscribe;
  }, [navigation, loadData]);

  const handleStartEdit = () => {
    setEditName(profile.displayName);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (editName.trim()) {
      const newProfile = { ...profile, displayName: editName.trim() };
      await saveUserProfile(newProfile);
      setProfile(newProfile);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.xl,
        paddingBottom: tabBarHeight + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
    >
      <View style={styles.profileHeader}>
        <View
          style={[
            styles.avatarContainer,
            { borderColor: theme.border },
          ]}
        >
          <Image
            source={require("@/assets/images/avatar-floral.png")}
            style={styles.avatar}
            contentFit="cover"
          />
        </View>

        {isEditing ? (
          <View style={styles.editNameContainer}>
            <TextInput
              style={[
                styles.nameInput,
                {
                  color: theme.text,
                  backgroundColor: theme.backgroundSecondary,
                  fontFamily: Typography.heading.fontFamily,
                },
              ]}
              value={editName}
              onChangeText={setEditName}
              autoFocus
              selectTextOnFocus
            />
            <View style={styles.editButtons}>
              <Pressable onPress={handleCancelEdit} hitSlop={8}>
                <Feather name="x" size={24} color={theme.textSecondary} />
              </Pressable>
              <Pressable onPress={handleSaveEdit} hitSlop={8}>
                <Feather name="check" size={24} color={theme.success} />
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable onPress={handleStartEdit} style={styles.nameRow}>
            <ThemedText type="title">{profile.displayName}</ThemedText>
            <Feather name="edit-2" size={18} color={theme.textSecondary} />
          </Pressable>
        )}
      </View>

      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <ThemedText type="title" style={styles.statNumber}>
            {itemCount}
          </ThemedText>
          <ThemedText type="caption">Items</ThemedText>
        </Card>
        <Card style={styles.statCard}>
          <ThemedText type="title" style={styles.statNumber}>
            {outfitCount}
          </ThemedText>
          <ThemedText type="caption">Outfits</ThemedText>
        </Card>
      </View>

      <View style={styles.section}>
        <ThemedText type="subheading" style={styles.sectionTitle}>
          About
        </ThemedText>
        <Card>
          <ThemedText type="body">
            Riannah's Closet helps you organize your wardrobe, create stunning
            outfit combinations, and plan what to wear each day.
          </ThemedText>
        </Card>
      </View>

      <View style={styles.section}>
        <ThemedText type="subheading" style={styles.sectionTitle}>
          Tips
        </ThemedText>
        <View style={styles.tipsList}>
          <Card style={styles.tipCard}>
            <View style={styles.tipRow}>
              <Feather name="camera" size={20} color={theme.primary} />
              <ThemedText type="body" style={styles.tipText}>
                Take photos of your clothes to add them to your wardrobe
              </ThemedText>
            </View>
          </Card>
          <Card style={styles.tipCard}>
            <View style={styles.tipRow}>
              <Feather name="tag" size={20} color={theme.primary} />
              <ThemedText type="body" style={styles.tipText}>
                Add tags to organize items by color, season, or occasion
              </ThemedText>
            </View>
          </Card>
          <Card style={styles.tipCard}>
            <View style={styles.tipRow}>
              <Feather name="layers" size={20} color={theme.primary} />
              <ThemedText type="body" style={styles.tipText}>
                Combine items into outfits for quick access
              </ThemedText>
            </View>
          </Card>
          <Card style={styles.tipCard}>
            <View style={styles.tipRow}>
              <Feather name="calendar" size={20} color={theme.primary} />
              <ThemedText type="body" style={styles.tipText}>
                Plan your outfits ahead using the calendar
              </ThemedText>
            </View>
          </Card>
        </View>
      </View>

      <View style={styles.section}>
        <Pressable
          style={[styles.logoutButton, { backgroundColor: theme.error }]}
          onPress={async () => {
            if (Platform.OS === "web") {
              const confirmed = window.confirm("Are you sure you want to sign out?");
              if (confirmed) {
                await logout();
              }
            } else {
              Alert.alert(
                "Sign Out",
                "Are you sure you want to sign out?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Sign Out",
                    style: "destructive",
                    onPress: async () => {
                      await logout();
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    },
                  },
                ]
              );
            }
          }}
        >
          <Feather name="log-out" size={20} color="white" />
          <ThemedText style={styles.logoutText}>Sign Out</ThemedText>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Pressable
          style={[styles.deleteButton, { borderColor: theme.error }]}
          onPress={() => {
            const handleDelete = async () => {
              try {
                await deleteAccount();
                await logout();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } catch (error: any) {
                if (Platform.OS === "web") {
                  window.alert(error?.message || "Failed to delete account");
                } else {
                  Alert.alert("Error", error?.message || "Failed to delete account");
                }
              }
            };

            if (Platform.OS === "web") {
              const confirmed = window.confirm(
                "Are you sure you want to delete your account? This will permanently remove all your wardrobe items, outfits, and planned looks. This action cannot be undone."
              );
              if (confirmed) {
                handleDelete();
              }
            } else {
              Alert.alert(
                "Delete Account",
                "Are you sure you want to delete your account? This will permanently remove all your wardrobe items, outfits, and planned looks. This action cannot be undone.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete Account",
                    style: "destructive",
                    onPress: handleDelete,
                  },
                ]
              );
            }
          }}
        >
          <Feather name="trash-2" size={20} color={theme.error} />
          <ThemedText style={[styles.deleteText, { color: theme.error }]}>
            Delete Account
          </ThemedText>
        </Pressable>
      </View>

      <Image
        source={require("@/assets/images/botanical-divider.png")}
        style={styles.divider}
        contentFit="contain"
      />

      <ThemedText type="small" style={styles.versionText}>
        Version 1.0.0
      </ThemedText>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  profileHeader: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    overflow: "hidden",
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  editNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  nameInput: {
    fontSize: 28,
    fontWeight: "700",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    minWidth: 150,
    textAlign: "center",
  },
  editButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing["3xl"],
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  statNumber: {
    marginBottom: Spacing.xs,
  },
  section: {
    marginBottom: Spacing["2xl"],
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  tipsList: {
    gap: Spacing.sm,
  },
  tipCard: {
    padding: Spacing.md,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  tipText: {
    flex: 1,
  },
  divider: {
    width: "100%",
    height: 40,
    marginVertical: Spacing.xl,
    opacity: 0.6,
  },
  versionText: {
    textAlign: "center",
    opacity: 0.5,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  logoutText: {
    color: "white",
    fontWeight: "600",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  deleteText: {
    fontWeight: "600",
  },
});

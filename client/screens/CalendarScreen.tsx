import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  useWindowDimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";

const MAX_CALENDAR_WIDTH = 480;
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { EmptyState } from "@/components/EmptyState";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Outfit, ClothingItem, PlannedOutfit } from "@/lib/types";
import {
  getOutfits,
  getClothingItems,
  getPlannedOutfits,
  planOutfit,
  removePlannedOutfit,
} from "@/lib/api";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function getDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export default function CalendarScreen() {
  const navigation = useNavigation<NavigationProp>();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isWideScreen = windowWidth > 600;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(
    getDateString(new Date())
  );
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [plannedOutfits, setPlannedOutfits] = useState<PlannedOutfit[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showOutfitPicker, setShowOutfitPicker] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [outfitData, itemData, plannedData] = await Promise.all([
        getOutfits(),
        getClothingItems(),
        getPlannedOutfits(),
      ]);
      setOutfits(outfitData);
      setItems(itemData);
      setPlannedOutfits(plannedData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", loadData);
    return unsubscribe;
  }, [navigation, loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const getPlannedOutfitForDate = (dateStr: string): PlannedOutfit | undefined => {
    return plannedOutfits.find((p) => p.date === dateStr);
  };

  const getOutfitById = (outfitId: string): Outfit | undefined => {
    return outfits.find((o) => o.id === outfitId);
  };

  const selectedPlannedOutfit = getPlannedOutfitForDate(selectedDate);
  const selectedOutfit = selectedPlannedOutfit
    ? getOutfitById(selectedPlannedOutfit.outfitId)
    : undefined;
  const selectedOutfitItems = selectedOutfit
    ? items.filter((item) => selectedOutfit.itemIds.includes(item.id))
    : [];

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDatePress = (day: number) => {
    const dateStr = getDateString(new Date(year, month, day));
    setSelectedDate(dateStr);
    Haptics.selectionAsync();
  };

  const handleAssignOutfit = async (outfit: Outfit) => {
    try {
      await planOutfit(selectedDate, outfit.id);
      setShowOutfitPicker(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadData();
    } catch (error) {
      console.error("Error planning outfit:", error);
    }
  };

  const handleRemoveOutfit = async () => {
    try {
      if (selectedPlannedOutfit) {
        await removePlannedOutfit(selectedPlannedOutfit.id);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        loadData();
      }
    } catch (error) {
      console.error("Error removing outfit:", error);
    }
  };

  const today = getDateString(new Date());

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing.xl,
            alignItems: isWideScreen ? "center" : "stretch",
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
            progressViewOffset={headerHeight}
          />
        }
      >
        <View style={[styles.contentContainer, isWideScreen && { maxWidth: MAX_CALENDAR_WIDTH }]}>
          <View style={styles.calendarHeader}>
            <Pressable onPress={handlePreviousMonth} hitSlop={12}>
              <Feather name="chevron-left" size={24} color={theme.text} />
            </Pressable>
            <ThemedText type="heading">
              {MONTHS[month]} {year}
            </ThemedText>
            <Pressable onPress={handleNextMonth} hitSlop={12}>
              <Feather name="chevron-right" size={24} color={theme.text} />
            </Pressable>
          </View>

          <View style={styles.weekHeader}>
            {DAYS.map((day) => (
              <View key={day} style={styles.weekDay}>
                <ThemedText type="caption" style={styles.weekDayText}>
                  {day}
                </ThemedText>
              </View>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {calendarDays.map((day, index) => {
              if (day === null) {
                return <View key={`empty-${index}`} style={styles.dayCell} />;
              }
              const dateStr = getDateString(new Date(year, month, day));
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === today;
              const hasOutfit = !!getPlannedOutfitForDate(dateStr);

              return (
                <Pressable
                  key={day}
                  style={[
                    styles.dayCell,
                    isSelected && { backgroundColor: theme.primary },
                    isToday && !isSelected && { backgroundColor: theme.backgroundSecondary },
                  ]}
                  onPress={() => handleDatePress(day)}
                >
                  <ThemedText
                    type="body"
                    style={[
                      styles.dayText,
                      isSelected && { color: theme.buttonText },
                    ]}
                  >
                    {day}
                  </ThemedText>
                  {hasOutfit ? (
                    <View
                      style={[
                        styles.outfitDot,
                        {
                          backgroundColor: isSelected
                            ? theme.buttonText
                            : theme.accent,
                        },
                      ]}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          <View style={styles.selectedDateSection}>
            <ThemedText type="subheading" style={styles.selectedDateTitle}>
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </ThemedText>

            {selectedOutfit ? (
              <Card style={styles.outfitPreview}>
                <View style={styles.outfitHeader}>
                  <ThemedText type="body" style={styles.outfitName}>
                    {selectedOutfit.name}
                  </ThemedText>
                  <Pressable onPress={handleRemoveOutfit} hitSlop={8}>
                    <Feather name="x" size={20} color={theme.textSecondary} />
                  </Pressable>
                </View>
                <View style={styles.outfitItemsRow}>
                  {selectedOutfitItems.slice(0, 4).map((item) => (
                    <Image
                      key={item.id}
                      source={{ uri: item.imageUri }}
                      style={styles.outfitItemImage}
                      contentFit="cover"
                    />
                  ))}
                </View>
              </Card>
            ) : showOutfitPicker ? (
              <View style={styles.outfitPicker}>
                <ThemedText type="caption" style={styles.pickerTitle}>
                  Choose an outfit:
                </ThemedText>
                {outfits.length === 0 ? (
                  <ThemedText type="caption">
                    No outfits yet. Create one first!
                  </ThemedText>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.outfitPickerList}
                  >
                    {outfits.map((outfit) => (
                      <Pressable
                        key={outfit.id}
                        style={[
                          styles.outfitPickerItem,
                          { backgroundColor: theme.backgroundDefault },
                        ]}
                        onPress={() => handleAssignOutfit(outfit)}
                      >
                        <View style={styles.outfitPickerImages}>
                          {items
                            .filter((item) => outfit.itemIds.includes(item.id))
                            .slice(0, 2)
                            .map((item) => (
                              <Image
                                key={item.id}
                                source={{ uri: item.imageUri }}
                                style={styles.outfitPickerThumb}
                                contentFit="cover"
                              />
                            ))}
                        </View>
                        <ThemedText type="small" numberOfLines={1}>
                          {outfit.name}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
                <Button
                  variant="outline"
                  onPress={() => setShowOutfitPicker(false)}
                  style={styles.cancelButton}
                >
                  Cancel
                </Button>
              </View>
            ) : (
              <Button onPress={() => setShowOutfitPicker(true)}>
                Plan an outfit
              </Button>
            )}
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
  },
  contentContainer: {
    width: "100%",
    paddingHorizontal: Spacing.lg,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  weekHeader: {
    flexDirection: "row",
    marginBottom: Spacing.sm,
  },
  weekDay: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },
  weekDayText: {
    fontWeight: "500",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: Spacing["2xl"],
  },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: BorderRadius.xs,
  },
  dayText: {
    fontWeight: "500",
  },
  outfitDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
  selectedDateSection: {
    gap: Spacing.md,
  },
  selectedDateTitle: {
    marginBottom: Spacing.sm,
  },
  outfitPreview: {
    padding: Spacing.md,
  },
  outfitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  outfitName: {
    fontWeight: "600",
  },
  outfitItemsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  outfitItemImage: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.xs,
  },
  outfitPicker: {
    gap: Spacing.md,
  },
  pickerTitle: {
    fontWeight: "500",
  },
  outfitPickerList: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  outfitPickerItem: {
    width: 100,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  outfitPickerImages: {
    flexDirection: "row",
    marginBottom: Spacing.xs,
  },
  outfitPickerThumb: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xs,
    marginRight: -10,
  },
  cancelButton: {
    marginTop: Spacing.sm,
  },
});

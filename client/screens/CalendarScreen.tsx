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
import * as Haptics from "expo-haptics";

const MAX_CALENDAR_WIDTH = 480;
import { ThemedView } from "@/components/ThemedView";
import { ObjectStorageImage } from "@/components/ObjectStorageImage";
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
  planOutfitOptimistic,
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
  const [planningOutfit, setPlanningOutfit] = useState(false);
  const [pickerDate, setPickerDate] = useState<string | null>(null);

  const loadData = useCallback(async (forceRefresh: boolean = false) => {
    try {
      const [outfitData, itemData, plannedData] = await Promise.all([
        getOutfits(forceRefresh),
        getClothingItems(forceRefresh),
        getPlannedOutfits(forceRefresh),
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
    loadData().then(() => {
      Promise.all([getOutfits(true), getClothingItems(true), getPlannedOutfits(true)]).then(([freshOutfits, freshItems, freshPlanned]) => {
        setOutfits(freshOutfits);
        setItems(freshItems);
        setPlannedOutfits(freshPlanned);
      }).catch(() => {});
    });
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => loadData());
    return unsubscribe;
  }, [navigation, loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const [outfitData, itemData, plannedData] = await Promise.all([
        getOutfits(true),
        getClothingItems(true),
        getPlannedOutfits(true),
      ]);
      setOutfits(outfitData);
      setItems(itemData);
      setPlannedOutfits(plannedData);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setRefreshing(false);
    }
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

  const getPlannedOutfitsForDate = (dateStr: string): PlannedOutfit[] => {
    return plannedOutfits.filter((p) => p.date === dateStr);
  };

  const getOutfitById = (outfitId: string): Outfit | undefined => {
    return outfits.find((o) => o.id === outfitId);
  };

  const selectedPlannedOutfits = getPlannedOutfitsForDate(selectedDate);

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDatePress = (day: number) => {
    const dateStr = getDateString(new Date(year, month, day));
    setSelectedDate(dateStr);
    setShowOutfitPicker(false);
    setPickerDate(null);
    Haptics.selectionAsync();
  };

  const handleOpenOutfitPicker = () => {
    setPickerDate(selectedDate);
    setShowOutfitPicker(true);
  };

  const handleAssignOutfit = async (outfit: Outfit) => {
    const dateToUse = pickerDate || selectedDate;
    setPlanningOutfit(true);
    try {
      await planOutfitOptimistic(dateToUse, outfit.id);
      setShowOutfitPicker(false);
      setPickerDate(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadData(true);
    } catch (error) {
      console.error("Error planning outfit:", error);
    } finally {
      setPlanningOutfit(false);
    }
  };

  const handleRemoveOutfit = async (plannedOutfitId: string) => {
    try {
      await removePlannedOutfit(plannedOutfitId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      loadData(true);
    } catch (error) {
      console.error("Error removing outfit:", error);
    }
  };

  const today = getDateString(new Date());
  const isSelectedDatePast = selectedDate < today;

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
              const plannedCount = getPlannedOutfitsForDate(dateStr).length;

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
                  {plannedCount > 0 ? (
                    <View style={styles.outfitDotsRow}>
                      {Array.from({ length: Math.min(plannedCount, 3) }).map((_, i) => (
                        <View
                          key={i}
                          style={[
                            styles.outfitDot,
                            {
                              backgroundColor: isSelected
                                ? theme.buttonText
                                : theme.accent,
                            },
                          ]}
                        />
                      ))}
                    </View>
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

            {selectedPlannedOutfits.length > 0 ? (
              <View style={styles.plannedOutfitsList}>
                {selectedPlannedOutfits.map((plannedOutfit) => {
                  const outfit = getOutfitById(plannedOutfit.outfitId);
                  if (!outfit) return null;
                  const outfitItems = items.filter((item) => outfit.itemIds.includes(item.id));
                  return (
                    <Card key={plannedOutfit.id} style={styles.outfitPreview}>
                      <View style={styles.outfitHeader}>
                        <ThemedText type="body" style={styles.outfitName}>
                          {outfit.name}
                        </ThemedText>
                        <Pressable onPress={() => handleRemoveOutfit(plannedOutfit.id)} hitSlop={8}>
                          <Feather name="x" size={20} color={theme.textSecondary} />
                        </Pressable>
                      </View>
                      <View style={styles.outfitItemsRow}>
                        {outfitItems.slice(0, 4).map((item) => (
                          <ObjectStorageImage
                            key={item.id}
                            imageUri={item.imageUri}
                            style={styles.outfitItemImage}
                            contentFit="cover"
                          />
                        ))}
                      </View>
                    </Card>
                  );
                })}
              </View>
            ) : null}

            {showOutfitPicker ? (
              <View style={styles.outfitPicker}>
                <ThemedText type="caption" style={styles.pickerTitle}>
                  Choose an outfit:
                </ThemedText>
                {(() => {
                  const alreadyPlannedIds = selectedPlannedOutfits.map(p => p.outfitId);
                  const availableOutfits = outfits.filter(o => !alreadyPlannedIds.includes(o.id));
                  
                  if (outfits.length === 0) {
                    return (
                      <ThemedText type="caption">
                        No outfits yet. Create one first!
                      </ThemedText>
                    );
                  }
                  
                  if (availableOutfits.length === 0) {
                    return (
                      <ThemedText type="caption">
                        All outfits are already planned for this day.
                      </ThemedText>
                    );
                  }
                  
                  return (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.outfitPickerList}
                    >
                      {availableOutfits.map((outfit) => (
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
                                <ObjectStorageImage
                                  key={item.id}
                                  imageUri={item.imageUri}
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
                  );
                })()}
                {planningOutfit ? (
                  <ThemedText type="caption" style={styles.planningText}>
                    Adding outfit...
                  </ThemedText>
                ) : (
                  <Button
                    variant="outline"
                    onPress={() => {
                      setShowOutfitPicker(false);
                      setPickerDate(null);
                    }}
                    style={styles.cancelButton}
                  >
                    Cancel
                  </Button>
                )}
              </View>
            ) : (
              <Button onPress={handleOpenOutfitPicker}>
                {selectedPlannedOutfits.length > 0 
                  ? (isSelectedDatePast ? "Track another outfit" : "Add another outfit")
                  : (isSelectedDatePast ? "Track an outfit" : "Plan an outfit")}
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
  outfitDotsRow: {
    flexDirection: "row",
    gap: 2,
    marginTop: 2,
  },
  outfitDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  selectedDateSection: {
    gap: Spacing.md,
  },
  selectedDateTitle: {
    marginBottom: Spacing.sm,
  },
  plannedOutfitsList: {
    gap: Spacing.md,
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
  planningText: {
    textAlign: "center",
    fontStyle: "italic",
  },
});

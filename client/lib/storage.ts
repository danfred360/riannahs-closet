import AsyncStorage from "@react-native-async-storage/async-storage";
import { ClothingItem, Outfit, PlannedOutfit, UserProfile } from "./types";

const STORAGE_KEYS = {
  CLOTHING_ITEMS: "@riannahs_closet:clothing_items",
  OUTFITS: "@riannahs_closet:outfits",
  PLANNED_OUTFITS: "@riannahs_closet:planned_outfits",
  USER_PROFILE: "@riannahs_closet:user_profile",
};

export async function getClothingItems(): Promise<ClothingItem[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CLOTHING_ITEMS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting clothing items:", error);
    return [];
  }
}

export async function saveClothingItems(items: ClothingItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.CLOTHING_ITEMS,
      JSON.stringify(items)
    );
  } catch (error) {
    console.error("Error saving clothing items:", error);
    throw error;
  }
}

export async function addClothingItem(item: ClothingItem): Promise<void> {
  const items = await getClothingItems();
  items.push(item);
  await saveClothingItems(items);
}

export async function updateClothingItem(item: ClothingItem): Promise<void> {
  const items = await getClothingItems();
  const index = items.findIndex((i) => i.id === item.id);
  if (index !== -1) {
    items[index] = { ...item, updatedAt: new Date().toISOString() };
    await saveClothingItems(items);
  }
}

export async function deleteClothingItem(itemId: string): Promise<void> {
  const items = await getClothingItems();
  const filtered = items.filter((i) => i.id !== itemId);
  await saveClothingItems(filtered);
}

export async function getOutfits(): Promise<Outfit[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.OUTFITS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting outfits:", error);
    return [];
  }
}

export async function saveOutfits(outfits: Outfit[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.OUTFITS, JSON.stringify(outfits));
  } catch (error) {
    console.error("Error saving outfits:", error);
    throw error;
  }
}

export async function addOutfit(outfit: Outfit): Promise<void> {
  const outfits = await getOutfits();
  outfits.push(outfit);
  await saveOutfits(outfits);
}

export async function updateOutfit(outfit: Outfit): Promise<void> {
  const outfits = await getOutfits();
  const index = outfits.findIndex((o) => o.id === outfit.id);
  if (index !== -1) {
    outfits[index] = { ...outfit, updatedAt: new Date().toISOString() };
    await saveOutfits(outfits);
  }
}

export async function deleteOutfit(outfitId: string): Promise<void> {
  const outfits = await getOutfits();
  const filtered = outfits.filter((o) => o.id !== outfitId);
  await saveOutfits(filtered);
}

export async function getPlannedOutfits(): Promise<PlannedOutfit[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PLANNED_OUTFITS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting planned outfits:", error);
    return [];
  }
}

export async function savePlannedOutfits(
  plannedOutfits: PlannedOutfit[]
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.PLANNED_OUTFITS,
      JSON.stringify(plannedOutfits)
    );
  } catch (error) {
    console.error("Error saving planned outfits:", error);
    throw error;
  }
}

export async function planOutfit(plannedOutfit: PlannedOutfit): Promise<void> {
  const planned = await getPlannedOutfits();
  const existingIndex = planned.findIndex((p) => p.date === plannedOutfit.date);
  if (existingIndex !== -1) {
    planned[existingIndex] = plannedOutfit;
  } else {
    planned.push(plannedOutfit);
  }
  await savePlannedOutfits(planned);
}

export async function removePlannedOutfit(date: string): Promise<void> {
  const planned = await getPlannedOutfits();
  const filtered = planned.filter((p) => p.date !== date);
  await savePlannedOutfits(filtered);
}

export async function getUserProfile(): Promise<UserProfile> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    return data
      ? JSON.parse(data)
      : { displayName: "Riannah", avatarUri: null };
  } catch (error) {
    console.error("Error getting user profile:", error);
    return { displayName: "Riannah", avatarUri: null };
  }
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.USER_PROFILE,
      JSON.stringify(profile)
    );
  } catch (error) {
    console.error("Error saving user profile:", error);
    throw error;
  }
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

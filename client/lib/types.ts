export type ClothingCategory =
  | "tops"
  | "bottoms"
  | "dresses"
  | "outerwear"
  | "shoes"
  | "accessories";

export interface ClothingItem {
  id: string;
  name: string;
  category: ClothingCategory;
  imageUri: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Outfit {
  id: string;
  name: string;
  itemIds: string[];
  accessoryIds: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export const CORE_CATEGORIES: ClothingCategory[] = ["tops", "bottoms", "dresses"];
export const ACCESSORY_CATEGORIES: ClothingCategory[] = ["outerwear", "shoes", "accessories"];

export const DEFAULT_TAGS = ["summer", "winter", "spring", "fall"];

export interface PlannedOutfit {
  id: string;
  date: string;
  outfitId: string;
}

export interface UserProfile {
  displayName: string;
  avatarUri: string | null;
}

export const CATEGORY_LABELS: Record<ClothingCategory, string> = {
  tops: "Tops",
  bottoms: "Bottoms",
  dresses: "Dresses",
  outerwear: "Outerwear",
  shoes: "Shoes",
  accessories: "Accessories",
};

export const ALL_CATEGORIES: ClothingCategory[] = [
  "tops",
  "bottoms",
  "dresses",
  "outerwear",
  "shoes",
  "accessories",
];

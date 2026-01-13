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
  createdAt: string;
  updatedAt: string;
}

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

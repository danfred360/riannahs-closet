import { getApiUrl } from "./query-client";
import { ClothingItem, Outfit, PlannedOutfit, UserProfile } from "./types";

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = new URL(path, getApiUrl()).toString();
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Request failed");
  }
  
  if (response.status === 204) {
    return undefined as T;
  }
  
  return response.json();
}

export async function getClothingItems(): Promise<ClothingItem[]> {
  return apiRequest<ClothingItem[]>("/api/items");
}

export async function addClothingItem(item: Omit<ClothingItem, "id" | "createdAt" | "updatedAt">): Promise<ClothingItem> {
  return apiRequest<ClothingItem>("/api/items", {
    method: "POST",
    body: JSON.stringify(item),
  });
}

export async function updateClothingItem(item: ClothingItem): Promise<ClothingItem> {
  return apiRequest<ClothingItem>(`/api/items/${item.id}`, {
    method: "PUT",
    body: JSON.stringify({
      name: item.name,
      category: item.category,
      imageUri: item.imageUri,
      tags: item.tags,
    }),
  });
}

export async function deleteClothingItem(itemId: string): Promise<void> {
  await apiRequest<void>(`/api/items/${itemId}`, {
    method: "DELETE",
  });
}

export async function getOutfits(): Promise<Outfit[]> {
  return apiRequest<Outfit[]>("/api/outfits");
}

export async function addOutfit(outfit: Omit<Outfit, "id" | "createdAt" | "updatedAt">): Promise<Outfit> {
  return apiRequest<Outfit>("/api/outfits", {
    method: "POST",
    body: JSON.stringify(outfit),
  });
}

export async function updateOutfit(outfit: Outfit): Promise<Outfit> {
  return apiRequest<Outfit>(`/api/outfits/${outfit.id}`, {
    method: "PUT",
    body: JSON.stringify({
      name: outfit.name,
      itemIds: outfit.itemIds,
    }),
  });
}

export async function deleteOutfit(outfitId: string): Promise<void> {
  await apiRequest<void>(`/api/outfits/${outfitId}`, {
    method: "DELETE",
  });
}

export async function getPlannedOutfits(): Promise<PlannedOutfit[]> {
  return apiRequest<PlannedOutfit[]>("/api/planner");
}

export async function planOutfit(date: string, outfitId: string): Promise<PlannedOutfit> {
  return apiRequest<PlannedOutfit>("/api/planner", {
    method: "POST",
    body: JSON.stringify({ date, outfitId }),
  });
}

export async function removePlannedOutfit(planId: string): Promise<void> {
  await apiRequest<void>(`/api/planner/${planId}`, {
    method: "DELETE",
  });
}

export async function getUserProfile(): Promise<UserProfile> {
  const user = await apiRequest<{ displayName: string | null; avatarUri: string | null }>("/api/auth/me");
  return {
    displayName: user.displayName || "",
    avatarUri: user.avatarUri,
  };
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await apiRequest<void>("/api/profile", {
    method: "PUT",
    body: JSON.stringify(profile),
  });
}

export function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
}

import { getApiUrl } from "./query-client";
import { ClothingItem, Outfit, PlannedOutfit, UserProfile } from "./types";
import { getCached, setCache, invalidateCache, CACHE_KEYS } from "./cache";

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

export async function getClothingItems(forceRefresh: boolean = false): Promise<ClothingItem[]> {
  if (!forceRefresh) {
    const cached = await getCached<ClothingItem[]>(CACHE_KEYS.CLOTHING_ITEMS);
    if (cached) {
      return cached;
    }
  }
  
  const items = await apiRequest<ClothingItem[]>("/api/v1/items");
  await setCache(CACHE_KEYS.CLOTHING_ITEMS, items);
  return items;
}

export async function addClothingItem(item: Omit<ClothingItem, "id" | "createdAt" | "updatedAt">): Promise<ClothingItem> {
  const result = await apiRequest<ClothingItem>("/api/v1/items", {
    method: "POST",
    body: JSON.stringify(item),
  });
  await invalidateCache(CACHE_KEYS.CLOTHING_ITEMS);
  return result;
}

export async function updateClothingItem(item: ClothingItem): Promise<ClothingItem> {
  const result = await apiRequest<ClothingItem>(`/api/v1/items/${item.id}`, {
    method: "PUT",
    body: JSON.stringify({
      name: item.name,
      category: item.category,
      imageUri: item.imageUri,
      tags: item.tags,
    }),
  });
  await invalidateCache(CACHE_KEYS.CLOTHING_ITEMS);
  return result;
}

export async function deleteClothingItem(itemId: string): Promise<void> {
  await apiRequest<void>(`/api/v1/items/${itemId}`, {
    method: "DELETE",
  });
  await invalidateCache(CACHE_KEYS.CLOTHING_ITEMS);
  await invalidateCache(CACHE_KEYS.OUTFITS);
}

export async function getOutfits(forceRefresh: boolean = false): Promise<Outfit[]> {
  if (!forceRefresh) {
    const cached = await getCached<Outfit[]>(CACHE_KEYS.OUTFITS);
    if (cached) {
      return cached;
    }
  }
  
  const outfits = await apiRequest<Outfit[]>("/api/v1/outfits");
  await setCache(CACHE_KEYS.OUTFITS, outfits);
  return outfits;
}

export async function addOutfit(outfit: Omit<Outfit, "id" | "createdAt" | "updatedAt">): Promise<Outfit> {
  const result = await apiRequest<Outfit>("/api/v1/outfits", {
    method: "POST",
    body: JSON.stringify(outfit),
  });
  await invalidateCache(CACHE_KEYS.OUTFITS);
  return result;
}

export async function updateOutfit(outfit: Outfit): Promise<Outfit> {
  const result = await apiRequest<Outfit>(`/api/v1/outfits/${outfit.id}`, {
    method: "PUT",
    body: JSON.stringify({
      name: outfit.name,
      itemIds: outfit.itemIds,
      tags: outfit.tags,
    }),
  });
  await invalidateCache(CACHE_KEYS.OUTFITS);
  return result;
}

export async function deleteOutfit(outfitId: string): Promise<void> {
  await apiRequest<void>(`/api/v1/outfits/${outfitId}`, {
    method: "DELETE",
  });
  await invalidateCache(CACHE_KEYS.OUTFITS);
  await invalidateCache(CACHE_KEYS.PLANNED_OUTFITS);
}

export async function getPlannedOutfits(forceRefresh: boolean = false): Promise<PlannedOutfit[]> {
  if (!forceRefresh) {
    const cached = await getCached<PlannedOutfit[]>(CACHE_KEYS.PLANNED_OUTFITS);
    if (cached) {
      return cached;
    }
  }
  
  const planned = await apiRequest<PlannedOutfit[]>("/api/v1/planner");
  await setCache(CACHE_KEYS.PLANNED_OUTFITS, planned);
  return planned;
}

export async function planOutfit(date: string, outfitId: string): Promise<PlannedOutfit> {
  const result = await apiRequest<PlannedOutfit>("/api/v1/planner", {
    method: "POST",
    body: JSON.stringify({ date, outfitId }),
  });
  await invalidateCache(CACHE_KEYS.PLANNED_OUTFITS);
  return result;
}

export async function removePlannedOutfit(planId: string): Promise<void> {
  await apiRequest<void>(`/api/v1/planner/${planId}`, {
    method: "DELETE",
  });
  await invalidateCache(CACHE_KEYS.PLANNED_OUTFITS);
}

export async function getUserProfile(forceRefresh: boolean = false): Promise<UserProfile> {
  if (!forceRefresh) {
    const cached = await getCached<UserProfile>(CACHE_KEYS.USER_PROFILE);
    if (cached) {
      return cached;
    }
  }
  
  const user = await apiRequest<{ displayName: string | null; avatarUri: string | null }>("/api/v1/auth/me");
  const profile: UserProfile = {
    displayName: user.displayName || "",
    avatarUri: user.avatarUri,
  };
  await setCache(CACHE_KEYS.USER_PROFILE, profile);
  return profile;
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await apiRequest<void>("/api/v1/profile", {
    method: "PUT",
    body: JSON.stringify(profile),
  });
  await invalidateCache(CACHE_KEYS.USER_PROFILE);
}

export function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
}

export { invalidateAllCache } from "./cache";

import { getApiUrl } from "./query-client";
import { ClothingItem, Outfit, PlannedOutfit, UserProfile } from "./types";
import { getCached, setCache, invalidateCache, CACHE_KEYS } from "./cache";
import { setAuthToken as setSharedAuthToken, getAuthToken } from "./auth-state";
import { addToSyncQueue, processSyncQueue, loadSyncQueue } from "./sync-queue";

export function setAuthToken(token: string | null) {
  setSharedAuthToken(token);
  if (token) {
    loadSyncQueue().then(() => processSyncQueue());
  }
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = new URL(path, getApiUrl()).toString();
  const token = getAuthToken();
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
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

export async function addClothingItemOptimistic(
  item: Omit<ClothingItem, "id" | "createdAt" | "updatedAt">
): Promise<ClothingItem> {
  const now = new Date().toISOString();
  const tempId = `temp_${generateId()}`;
  
  const optimisticItem: ClothingItem = {
    ...item,
    id: tempId,
    createdAt: now,
    updatedAt: now,
  };
  
  const cached = await getCached<ClothingItem[]>(CACHE_KEYS.CLOTHING_ITEMS);
  const updatedItems = cached ? [optimisticItem, ...cached] : [optimisticItem];
  await setCache(CACHE_KEYS.CLOTHING_ITEMS, updatedItems);
  
  addToSyncQueue({
    type: "create_item",
    payload: { ...item, tempId },
  });
  
  return optimisticItem;
}

export async function updateClothingItem(item: ClothingItem): Promise<ClothingItem> {
  // Check if this is a temp item that hasn't synced yet
  if (item.id.startsWith("temp_")) {
    return updateClothingItemOptimistic(item);
  }
  
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

async function updateClothingItemOptimistic(item: ClothingItem): Promise<ClothingItem> {
  // Update the item in local cache
  const cached = await getCached<ClothingItem[]>(CACHE_KEYS.CLOTHING_ITEMS);
  if (cached) {
    const updatedItems = cached.map((cachedItem) =>
      cachedItem.id === item.id ? { ...item, updatedAt: new Date().toISOString() } : cachedItem
    );
    await setCache(CACHE_KEYS.CLOTHING_ITEMS, updatedItems);
  }
  
  // Update the pending sync operation with new data
  const { updateSyncOperation } = await import("./sync-queue");
  await updateSyncOperation(item.id, {
    name: item.name,
    category: item.category,
    imageUri: item.imageUri,
    tags: item.tags,
  });
  
  return { ...item, updatedAt: new Date().toISOString() };
}

export async function deleteClothingItem(itemId: string): Promise<void> {
  // Check if this is a temp item that hasn't synced yet
  if (itemId.startsWith("temp_")) {
    return deleteClothingItemOptimistic(itemId);
  }
  
  await apiRequest<void>(`/api/v1/items/${itemId}`, {
    method: "DELETE",
  });
  await invalidateCache(CACHE_KEYS.CLOTHING_ITEMS);
  await invalidateCache(CACHE_KEYS.OUTFITS);
}

async function deleteClothingItemOptimistic(itemId: string): Promise<void> {
  // Remove from local cache
  const cached = await getCached<ClothingItem[]>(CACHE_KEYS.CLOTHING_ITEMS);
  if (cached) {
    const updatedItems = cached.filter((item) => item.id !== itemId);
    await setCache(CACHE_KEYS.CLOTHING_ITEMS, updatedItems);
  }
  
  // Remove the pending sync operation
  const { removeSyncOperationByTempId } = await import("./sync-queue");
  await removeSyncOperationByTempId(itemId);
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

export async function addOutfitOptimistic(
  outfit: Omit<Outfit, "id" | "createdAt" | "updatedAt">
): Promise<Outfit> {
  const now = new Date().toISOString();
  const tempId = `temp_${generateId()}`;
  
  const optimisticOutfit: Outfit = {
    ...outfit,
    id: tempId,
    createdAt: now,
    updatedAt: now,
  };
  
  const cached = await getCached<Outfit[]>(CACHE_KEYS.OUTFITS);
  const updatedOutfits = cached ? [optimisticOutfit, ...cached] : [optimisticOutfit];
  await setCache(CACHE_KEYS.OUTFITS, updatedOutfits);
  
  addToSyncQueue({
    type: "create_outfit",
    payload: { ...outfit, tempId },
  });
  
  return optimisticOutfit;
}

export async function updateOutfit(outfit: Outfit): Promise<Outfit> {
  // Check if this is a temp outfit that hasn't synced yet
  if (outfit.id.startsWith("temp_")) {
    return updateOutfitOptimistic(outfit);
  }
  
  const result = await apiRequest<Outfit>(`/api/v1/outfits/${outfit.id}`, {
    method: "PUT",
    body: JSON.stringify({
      name: outfit.name,
      itemIds: outfit.itemIds,
      accessoryIds: outfit.accessoryIds,
      tags: outfit.tags,
      coverImageUri: outfit.coverImageUri,
    }),
  });
  await invalidateCache(CACHE_KEYS.OUTFITS);
  return result;
}

async function updateOutfitOptimistic(outfit: Outfit): Promise<Outfit> {
  // Update the outfit in local cache
  const cached = await getCached<Outfit[]>(CACHE_KEYS.OUTFITS);
  if (cached) {
    const updatedOutfits = cached.map((cachedOutfit) =>
      cachedOutfit.id === outfit.id ? { ...outfit, updatedAt: new Date().toISOString() } : cachedOutfit
    );
    await setCache(CACHE_KEYS.OUTFITS, updatedOutfits);
  }
  
  // Update the pending sync operation with new data
  const { updateSyncOperation } = await import("./sync-queue");
  await updateSyncOperation(outfit.id, {
    name: outfit.name,
    itemIds: outfit.itemIds,
    accessoryIds: outfit.accessoryIds,
    tags: outfit.tags,
    coverImageUri: outfit.coverImageUri,
  });
  
  return { ...outfit, updatedAt: new Date().toISOString() };
}

export async function deleteOutfit(outfitId: string): Promise<void> {
  // Check if this is a temp outfit that hasn't synced yet
  if (outfitId.startsWith("temp_")) {
    return deleteOutfitOptimistic(outfitId);
  }
  
  await apiRequest<void>(`/api/v1/outfits/${outfitId}`, {
    method: "DELETE",
  });
  await invalidateCache(CACHE_KEYS.OUTFITS);
  await invalidateCache(CACHE_KEYS.PLANNED_OUTFITS);
}

async function deleteOutfitOptimistic(outfitId: string): Promise<void> {
  // Remove from local cache
  const cached = await getCached<Outfit[]>(CACHE_KEYS.OUTFITS);
  if (cached) {
    const updatedOutfits = cached.filter((outfit) => outfit.id !== outfitId);
    await setCache(CACHE_KEYS.OUTFITS, updatedOutfits);
  }
  
  // Remove the pending sync operation
  const { removeSyncOperationByTempId } = await import("./sync-queue");
  await removeSyncOperationByTempId(outfitId);
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
  if (planId.startsWith("temp_")) {
    return removePlannedOutfitOptimistic(planId);
  }
  
  await apiRequest<void>(`/api/v1/planner/${planId}`, {
    method: "DELETE",
  });
  await invalidateCache(CACHE_KEYS.PLANNED_OUTFITS);
}

export async function planOutfitOptimistic(date: string, outfitId: string): Promise<PlannedOutfit> {
  const tempId = `temp_${generateId()}`;
  
  const optimisticPlan: PlannedOutfit = {
    id: tempId,
    outfitId,
    date,
  };
  
  const cached = await getCached<PlannedOutfit[]>(CACHE_KEYS.PLANNED_OUTFITS);
  const updatedPlans = cached ? [...cached, optimisticPlan] : [optimisticPlan];
  await setCache(CACHE_KEYS.PLANNED_OUTFITS, updatedPlans);
  
  addToSyncQueue({
    type: "create_planned_outfit",
    payload: { tempId, date, outfitId },
  });
  
  return optimisticPlan;
}

async function removePlannedOutfitOptimistic(planId: string): Promise<void> {
  const cached = await getCached<PlannedOutfit[]>(CACHE_KEYS.PLANNED_OUTFITS);
  if (cached) {
    const updatedPlans = cached.filter((plan) => plan.id !== planId);
    await setCache(CACHE_KEYS.PLANNED_OUTFITS, updatedPlans);
  }
  
  const { removeSyncOperationByTempId } = await import("./sync-queue");
  await removeSyncOperationByTempId(planId);
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
  // crypto.randomUUID is not available on React Native, use fallback
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback: generate UUID-like string
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const imageCache: Map<string, string> = new Map();

export async function uploadImage(imageData: string, fileName: string): Promise<{ key: string; url: string }> {
  const result = await apiRequest<{ key: string; url: string }>("/api/v1/images/upload", {
    method: "POST",
    body: JSON.stringify({ imageData, fileName }),
  });
  return result;
}

export async function getImageDataUrl(key: string): Promise<string | null> {
  const cached = imageCache.get(key);
  // Only use cache if it has valid data (real base64 images are much longer than 100 chars)
  if (cached && cached.length > 100) {
    return cached;
  }
  
  try {
    const path = `/api/v1/images/${encodeURIComponent(key)}`;
    const result = await apiRequest<{ dataUrl: string }>(path);
    // Only cache valid responses
    if (result.dataUrl && result.dataUrl.length > 100) {
      imageCache.set(key, result.dataUrl);
    }
    return result.dataUrl;
  } catch (error: any) {
    console.error("Failed to get image:", key, "Error:", error?.message || error);
    return null;
  }
}

export async function deleteImage(key: string): Promise<boolean> {
  try {
    await apiRequest<{ success: boolean }>(`/api/v1/images/${encodeURIComponent(key)}`, {
      method: "DELETE",
    });
    imageCache.delete(key);
    return true;
  } catch (error) {
    console.error("Failed to delete image:", error);
    return false;
  }
}

export function clearImageCache(): void {
  imageCache.clear();
}

export async function deleteAccount(): Promise<void> {
  await apiRequest<{ message: string }>("/api/v1/auth/account", {
    method: "DELETE",
  });
}

export { invalidateAllCache } from "./cache";

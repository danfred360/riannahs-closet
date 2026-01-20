import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCacheUserId } from "./cache";

const SYNC_QUEUE_KEY = "@riannahs_closet:sync_queue";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

export type SyncOperation = {
  id: string;
  type: "create_item" | "update_item" | "delete_item" | "create_outfit" | "update_outfit" | "delete_outfit" | "create_planned_outfit" | "delete_planned_outfit";
  payload: Record<string, unknown>;
  createdAt: number;
  retries: number;
  status: "pending" | "syncing" | "failed";
  userId: string;
};

const tempIdToRealId: Map<string, string> = new Map();

export function registerTempIdMapping(tempId: string, realId: string): void {
  tempIdToRealId.set(tempId, realId);
}

export function resolveTempId(id: string): string {
  return tempIdToRealId.get(id) || id;
}

type SyncListener = (queue: SyncOperation[]) => void;

let syncQueue: SyncOperation[] = [];
let isSyncing = false;
let listeners: SyncListener[] = [];

export function subscribeSyncQueue(listener: SyncListener): () => void {
  listeners.push(listener);
  listener(syncQueue);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function notifyListeners() {
  listeners.forEach((l) => l([...syncQueue]));
}

export async function loadSyncQueue(): Promise<void> {
  try {
    const userId = getCacheUserId();
    if (!userId) return;
    
    const data = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    if (data) {
      const allOps: SyncOperation[] = JSON.parse(data);
      syncQueue = allOps.filter((op) => op.userId === userId);
    }
    notifyListeners();
  } catch (error) {
    console.error("Error loading sync queue:", error);
  }
}

async function saveSyncQueue(): Promise<void> {
  try {
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(syncQueue));
    notifyListeners();
  } catch (error) {
    console.error("Error saving sync queue:", error);
  }
}

export async function addToSyncQueue(operation: Omit<SyncOperation, "id" | "createdAt" | "retries" | "status" | "userId">): Promise<string> {
  const userId = getCacheUserId();
  if (!userId) throw new Error("No user ID for sync queue");
  
  const id = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const op: SyncOperation = {
    ...operation,
    id,
    createdAt: Date.now(),
    retries: 0,
    status: "pending",
    userId,
  };
  
  syncQueue.push(op);
  await saveSyncQueue();
  
  processSyncQueue();
  
  return id;
}

export async function removeFromSyncQueue(id: string): Promise<void> {
  syncQueue = syncQueue.filter((op) => op.id !== id);
  await saveSyncQueue();
}

export function getSyncQueue(): SyncOperation[] {
  return [...syncQueue];
}

export function getPendingSyncCount(): number {
  return syncQueue.filter((op) => op.status !== "failed" || op.retries < MAX_RETRIES).length;
}

export function hasPendingSync(): boolean {
  return getPendingSyncCount() > 0;
}

async function uploadImageToServer(base64Data: string, fileName: string, token: string): Promise<string> {
  const { getApiUrl } = await import("./query-client");
  
  const response = await fetch(new URL("/api/v1/images/upload", getApiUrl()).toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ imageData: base64Data, fileName }),
  });
  
  if (!response.ok) {
    throw new Error("Image upload failed");
  }
  
  const result = await response.json();
  return result.key;
}

type SyncResult = "success" | "failed" | "waiting";

async function executeSyncOperation(operation: SyncOperation): Promise<SyncResult> {
  const { getApiUrl } = await import("./query-client");
  const { getAuthToken } = await import("./auth-state");
  
  const token = getAuthToken();
  if (!token) {
    console.log("[Sync] No auth token, skipping sync");
    return "waiting";
  }
  
  console.log(`[Sync] Executing ${operation.type} for ${operation.payload.tempId || operation.id}`);
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  
  try {
    let url: string;
    let method: string;
    let body: string | undefined;
    
    switch (operation.type) {
      case "create_item": {
        const payload = { ...operation.payload };
        
        if (typeof payload.imageUri === "string" && payload.imageUri.startsWith("data:")) {
          const fileName = `${payload.tempId || Date.now()}.jpg`;
          const uploadedKey = await uploadImageToServer(payload.imageUri, fileName, token);
          payload.imageUri = uploadedKey;
        }
        
        url = new URL("/api/v1/items", getApiUrl()).toString();
        method = "POST";
        body = JSON.stringify(payload);
        break;
      }
      case "update_item":
        url = new URL(`/api/v1/items/${operation.payload.id}`, getApiUrl()).toString();
        method = "PUT";
        body = JSON.stringify(operation.payload);
        break;
      case "delete_item":
        url = new URL(`/api/v1/items/${operation.payload.id}`, getApiUrl()).toString();
        method = "DELETE";
        break;
      case "create_outfit": {
        const outfitPayload = { ...operation.payload };
        
        if (Array.isArray(outfitPayload.itemIds)) {
          const resolvedItemIds: string[] = [];
          for (const itemId of outfitPayload.itemIds as string[]) {
            if (itemId.startsWith("temp_")) {
              const resolvedId = resolveTempId(itemId);
              if (resolvedId.startsWith("temp_")) {
                console.log("[Sync] Waiting for item to sync before creating outfit:", itemId);
                return "waiting";
              }
              resolvedItemIds.push(resolvedId);
            } else {
              resolvedItemIds.push(itemId);
            }
          }
          outfitPayload.itemIds = resolvedItemIds;
        }
        
        if (Array.isArray(outfitPayload.accessoryIds)) {
          const resolvedAccessoryIds: string[] = [];
          for (const accId of outfitPayload.accessoryIds as string[]) {
            if (accId.startsWith("temp_")) {
              const resolvedId = resolveTempId(accId);
              if (resolvedId.startsWith("temp_")) {
                console.log("[Sync] Waiting for accessory to sync before creating outfit:", accId);
                return "waiting";
              }
              resolvedAccessoryIds.push(resolvedId);
            } else {
              resolvedAccessoryIds.push(accId);
            }
          }
          outfitPayload.accessoryIds = resolvedAccessoryIds;
        }
        
        if (typeof outfitPayload.coverImageUri === "string" && outfitPayload.coverImageUri.startsWith("data:")) {
          console.log("[Sync] Uploading outfit cover image...");
          const fileName = `outfit-cover-${outfitPayload.tempId || Date.now()}.jpg`;
          const uploadedKey = await uploadImageToServer(outfitPayload.coverImageUri, fileName, token);
          console.log("[Sync] Outfit cover image uploaded, key:", uploadedKey);
          outfitPayload.coverImageUri = uploadedKey;
        } else if (outfitPayload.coverImageUri) {
          console.log("[Sync] Outfit cover image already has key:", outfitPayload.coverImageUri);
        }
        
        url = new URL("/api/v1/outfits", getApiUrl()).toString();
        method = "POST";
        body = JSON.stringify(outfitPayload);
        break;
      }
      case "update_outfit": {
        const updateOutfitPayload = { ...operation.payload };
        
        // Handle cover image upload for updates
        if (typeof updateOutfitPayload.coverImageUri === "string" && updateOutfitPayload.coverImageUri.startsWith("data:")) {
          console.log("[Sync] Uploading outfit cover image for update...");
          const fileName = `outfit-cover-${updateOutfitPayload.id || Date.now()}.jpg`;
          const uploadedKey = await uploadImageToServer(updateOutfitPayload.coverImageUri, fileName, token);
          console.log("[Sync] Outfit cover image uploaded, key:", uploadedKey);
          updateOutfitPayload.coverImageUri = uploadedKey;
        }
        
        url = new URL(`/api/v1/outfits/${operation.payload.id}`, getApiUrl()).toString();
        method = "PUT";
        body = JSON.stringify(updateOutfitPayload);
        break;
      }
      case "delete_outfit":
        url = new URL(`/api/v1/outfits/${operation.payload.id}`, getApiUrl()).toString();
        method = "DELETE";
        break;
      case "create_planned_outfit": {
        const plannedPayload = { ...operation.payload };
        
        if (typeof plannedPayload.outfitId === "string" && plannedPayload.outfitId.startsWith("temp_")) {
          const resolvedId = resolveTempId(plannedPayload.outfitId);
          if (resolvedId.startsWith("temp_")) {
            console.log("[Sync] Waiting for outfit to sync before planning:", plannedPayload.outfitId);
            return "waiting";
          }
          plannedPayload.outfitId = resolvedId;
        }
        
        url = new URL("/api/v1/planner", getApiUrl()).toString();
        method = "POST";
        body = JSON.stringify({ date: plannedPayload.date, outfitId: plannedPayload.outfitId });
        break;
      }
      case "delete_planned_outfit": {
        const planId = operation.payload.id as string;
        
        if (planId.startsWith("temp_")) {
          console.log("[Sync] Removing temp planned outfit from queue:", planId);
          return "success";
        }
        
        url = new URL(`/api/v1/planner/${planId}`, getApiUrl()).toString();
        method = "DELETE";
        break;
      }
      default:
        return "failed";
    }
    
    const response = await fetch(url, { method, headers, body });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error(`[Sync] Failed ${operation.type}: ${response.status} - ${errorText}`);
      return "failed";
    }
    
    if (operation.type === "create_item" && operation.payload.tempId) {
      try {
        const result = await response.json();
        if (result?.id) {
          registerTempIdMapping(operation.payload.tempId as string, result.id);
          console.log(`[Sync] Registered item temp ID mapping: ${operation.payload.tempId} -> ${result.id}`);
          
          // Update local cache with server response (includes correct imageUri key)
          const { getCached, setCache, CACHE_KEYS } = await import("./cache");
          const cached = await getCached<any[]>(CACHE_KEYS.CLOTHING_ITEMS);
          if (cached) {
            const updatedCache = cached.map((item) => 
              item.id === operation.payload.tempId ? result : item
            );
            await setCache(CACHE_KEYS.CLOTHING_ITEMS, updatedCache);
            console.log(`[Sync] Updated cache with server item data, imageUri: ${result.imageUri}`);
          }
        }
      } catch (e) {
        console.error("[Sync] Error updating cache after item creation:", e);
      }
    }
    
    if (operation.type === "create_outfit" && operation.payload.tempId) {
      try {
        const result = await response.json();
        if (result?.id) {
          registerTempIdMapping(operation.payload.tempId as string, result.id);
          console.log(`[Sync] Registered outfit temp ID mapping: ${operation.payload.tempId} -> ${result.id}`);
          
          // Update local cache with server response (includes correct coverImageUri key)
          const { getCached, setCache, CACHE_KEYS } = await import("./cache");
          const cached = await getCached<any[]>(CACHE_KEYS.OUTFITS);
          if (cached) {
            const updatedCache = cached.map((outfit) => 
              outfit.id === operation.payload.tempId 
                ? { ...result, itemIds: outfit.itemIds || [], accessoryIds: outfit.accessoryIds || [] }
                : outfit
            );
            await setCache(CACHE_KEYS.OUTFITS, updatedCache);
            console.log(`[Sync] Updated cache with server outfit data, coverImageUri: ${result.coverImageUri}`);
          }
        }
      } catch (e) {
        console.error("[Sync] Error updating cache after outfit creation:", e);
      }
    }
    
    if (operation.type === "update_outfit") {
      try {
        const result = await response.json();
        if (result?.id) {
          // Update local cache with server response (includes correct coverImageUri key)
          const { getCached, setCache, CACHE_KEYS } = await import("./cache");
          const cached = await getCached<any[]>(CACHE_KEYS.OUTFITS);
          if (cached) {
            const updatedCache = cached.map((outfit) => 
              outfit.id === result.id 
                ? { ...result, itemIds: outfit.itemIds || [], accessoryIds: outfit.accessoryIds || [] }
                : outfit
            );
            await setCache(CACHE_KEYS.OUTFITS, updatedCache);
            console.log(`[Sync] Updated cache after outfit update, coverImageUri: ${result.coverImageUri}`);
          }
        }
      } catch (e) {
        console.error("[Sync] Error updating cache after outfit update:", e);
      }
    }
    
    console.log(`[Sync] Success ${operation.type}`);
    return "success";
  } catch (error: any) {
    console.error(`[Sync] Error ${operation.type}:`, error?.message || error);
    return "failed";
  }
}

export async function processSyncQueue(): Promise<void> {
  if (isSyncing || syncQueue.length === 0) return;
  
  isSyncing = true;
  
  try {
    const pendingOps = syncQueue.filter(
      (op) => op.status === "pending" && op.retries < MAX_RETRIES
    );
    
    for (const op of pendingOps) {
      op.status = "syncing";
      await saveSyncQueue();
      
      const result = await executeSyncOperation(op);
      
      if (result === "success") {
        await removeFromSyncQueue(op.id);
      } else if (result === "waiting") {
        op.status = "pending";
        await saveSyncQueue();
        setTimeout(() => processSyncQueue(), RETRY_DELAY_MS);
      } else {
        op.retries += 1;
        op.status = op.retries >= MAX_RETRIES ? "failed" : "pending";
        await saveSyncQueue();
        
        if (op.status === "pending") {
          setTimeout(() => processSyncQueue(), RETRY_DELAY_MS);
        }
      }
    }
  } finally {
    isSyncing = false;
  }
}

export async function clearUserSyncQueue(): Promise<void> {
  const userId = getCacheUserId();
  if (!userId) return;
  
  syncQueue = syncQueue.filter((op) => op.userId !== userId);
  await saveSyncQueue();
}

export async function retryFailedOperations(): Promise<void> {
  const userId = getCacheUserId();
  if (!userId) return;
  
  let hasChanges = false;
  for (const op of syncQueue) {
    if (op.userId === userId && op.status === "failed") {
      op.status = "pending";
      op.retries = 0;
      hasChanges = true;
    }
  }
  
  if (hasChanges) {
    await saveSyncQueue();
    processSyncQueue();
  }
}

export async function updateSyncOperation(
  tempId: string,
  updatedPayload: Record<string, unknown>
): Promise<void> {
  const userId = getCacheUserId();
  if (!userId) return;
  
  // Find the sync operation for this temp item
  const op = syncQueue.find(
    (o) => o.userId === userId && o.payload.tempId === tempId
  );
  
  if (op) {
    // Update the payload with new values while preserving tempId and imageUri
    op.payload = {
      ...op.payload,
      ...updatedPayload,
      tempId, // Always preserve tempId
    };
    await saveSyncQueue();
  }
}

export async function removeSyncOperationByTempId(tempId: string): Promise<void> {
  const userId = getCacheUserId();
  if (!userId) return;
  
  const initialLength = syncQueue.length;
  syncQueue = syncQueue.filter(
    (op) => !(op.userId === userId && op.payload.tempId === tempId)
  );
  
  if (syncQueue.length !== initialLength) {
    await saveSyncQueue();
  }
}

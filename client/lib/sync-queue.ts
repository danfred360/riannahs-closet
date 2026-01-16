import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCacheUserId } from "./cache";

const SYNC_QUEUE_KEY = "@riannahs_closet:sync_queue";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

export type SyncOperation = {
  id: string;
  type: "create_item" | "update_item" | "delete_item" | "create_outfit" | "update_outfit" | "delete_outfit";
  payload: Record<string, unknown>;
  createdAt: number;
  retries: number;
  status: "pending" | "syncing" | "failed";
  userId: string;
};

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

async function executeSyncOperation(operation: SyncOperation): Promise<boolean> {
  const { getApiUrl } = await import("./query-client");
  const { getAuthToken } = await import("./auth-state");
  
  const token = getAuthToken();
  if (!token) return false;
  
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
        
        if (typeof outfitPayload.coverImageUri === "string" && outfitPayload.coverImageUri.startsWith("data:")) {
          const fileName = `outfit-cover-${outfitPayload.tempId || Date.now()}.jpg`;
          const uploadedKey = await uploadImageToServer(outfitPayload.coverImageUri, fileName, token);
          outfitPayload.coverImageUri = uploadedKey;
        }
        
        url = new URL("/api/v1/outfits", getApiUrl()).toString();
        method = "POST";
        body = JSON.stringify(outfitPayload);
        break;
      }
      case "update_outfit":
        url = new URL(`/api/v1/outfits/${operation.payload.id}`, getApiUrl()).toString();
        method = "PUT";
        body = JSON.stringify(operation.payload);
        break;
      case "delete_outfit":
        url = new URL(`/api/v1/outfits/${operation.payload.id}`, getApiUrl()).toString();
        method = "DELETE";
        break;
      default:
        return false;
    }
    
    const response = await fetch(url, { method, headers, body });
    
    if (!response.ok) {
      console.error(`Sync failed for ${operation.type}:`, response.status);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Sync error for ${operation.type}:`, error);
    return false;
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
      
      const success = await executeSyncOperation(op);
      
      if (success) {
        await removeFromSyncQueue(op.id);
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

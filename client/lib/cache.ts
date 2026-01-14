import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_PREFIX = "@riannahs_closet:cache:";
const CACHE_META_KEY = "@riannahs_closet:cache_meta";
const CACHE_USER_KEY = "@riannahs_closet:cache_user";

const DEFAULT_TTL_MS = 5 * 60 * 1000;

let currentUserId: string | null = null;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  userId: string;
}

interface CacheMeta {
  lastSync: number;
  version: number;
  userId: string | null;
}

export function setCacheUserId(userId: string | null): void {
  currentUserId = userId;
}

export function getCacheUserId(): string | null {
  return currentUserId;
}

async function getCacheMeta(): Promise<CacheMeta> {
  try {
    const data = await AsyncStorage.getItem(CACHE_META_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading cache meta:", error);
  }
  return { lastSync: 0, version: 1, userId: null };
}

async function setCacheMeta(meta: CacheMeta): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_META_KEY, JSON.stringify(meta));
  } catch (error) {
    console.error("Error saving cache meta:", error);
  }
}

function getUserScopedKey(key: string): string {
  if (!currentUserId) {
    return CACHE_PREFIX + key;
  }
  return CACHE_PREFIX + currentUserId + ":" + key;
}

export async function getCached<T>(key: string): Promise<T | null> {
  if (!currentUserId) {
    return null;
  }
  
  try {
    const cacheKey = getUserScopedKey(key);
    const data = await AsyncStorage.getItem(cacheKey);
    
    if (!data) {
      return null;
    }
    
    const entry: CacheEntry<T> = JSON.parse(data);
    const now = Date.now();
    
    if (entry.userId !== currentUserId) {
      await AsyncStorage.removeItem(cacheKey);
      return null;
    }
    
    if (now - entry.timestamp > entry.ttl) {
      await AsyncStorage.removeItem(cacheKey);
      return null;
    }
    
    return entry.data;
  } catch (error) {
    console.error("Error reading from cache:", error);
    return null;
  }
}

export async function setCache<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): Promise<void> {
  if (!currentUserId) {
    return;
  }
  
  try {
    const cacheKey = getUserScopedKey(key);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
      userId: currentUserId,
    };
    await AsyncStorage.setItem(cacheKey, JSON.stringify(entry));
    
    const meta = await getCacheMeta();
    meta.lastSync = Date.now();
    meta.userId = currentUserId;
    await setCacheMeta(meta);
  } catch (error) {
    console.error("Error writing to cache:", error);
  }
}

export async function invalidateCache(key: string): Promise<void> {
  try {
    const cacheKey = getUserScopedKey(key);
    await AsyncStorage.removeItem(cacheKey);
  } catch (error) {
    console.error("Error invalidating cache:", error);
  }
}

export async function invalidateAllCache(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter((k) => k.startsWith(CACHE_PREFIX));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
    await setCacheMeta({ lastSync: 0, version: 1, userId: null });
  } catch (error) {
    console.error("Error clearing cache:", error);
  }
}

export async function invalidateUserCache(): Promise<void> {
  if (!currentUserId) {
    return;
  }
  
  try {
    const userPrefix = CACHE_PREFIX + currentUserId + ":";
    const allKeys = await AsyncStorage.getAllKeys();
    const userCacheKeys = allKeys.filter((k) => k.startsWith(userPrefix));
    if (userCacheKeys.length > 0) {
      await AsyncStorage.multiRemove(userCacheKeys);
    }
  } catch (error) {
    console.error("Error clearing user cache:", error);
  }
}

export async function getLastSyncTime(): Promise<number> {
  const meta = await getCacheMeta();
  return meta.lastSync;
}

export async function isCacheStale(maxAgeMs: number = DEFAULT_TTL_MS): Promise<boolean> {
  const meta = await getCacheMeta();
  if (meta.lastSync === 0) {
    return true;
  }
  if (meta.userId !== currentUserId) {
    return true;
  }
  return Date.now() - meta.lastSync > maxAgeMs;
}

export const CACHE_KEYS = {
  CLOTHING_ITEMS: "clothing_items",
  OUTFITS: "outfits",
  PLANNED_OUTFITS: "planned_outfits",
  USER_PROFILE: "user_profile",
};

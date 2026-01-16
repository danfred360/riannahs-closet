import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";

// Production API URL - hardcoded to ensure TestFlight/App Store builds always work
const PRODUCTION_API_URL = "https://riannahscloset.com/";

/**
 * Determines if the app is running in a development context
 * Uses multiple signals for robust detection:
 * 1. expo-constants executionEnvironment (most reliable)
 * 2. __DEV__ flag (React Native standard)
 */
function isDevEnvironment(): boolean {
  // Check expo-constants first (most reliable for Expo apps)
  // StoreClient = Expo Go, Bare = native build (TestFlight/App Store)
  const execEnv = Constants.executionEnvironment;
  
  if (execEnv === ExecutionEnvironment.StoreClient) {
    // Running in Expo Go - this is development
    return true;
  }
  
  if (execEnv === ExecutionEnvironment.Bare) {
    // Running as a native build (TestFlight/App Store) - this is production
    return false;
  }
  
  // Fallback to __DEV__ flag
  return __DEV__;
}

/**
 * Gets the base URL for the Express API server
 * @returns {string} The API base URL
 */
export function getApiUrl(): string {
  // Development domain from environment (set by Expo dev server)
  const devDomain = process.env.EXPO_PUBLIC_DOMAIN;
  
  // Web platform handling
  if (Platform.OS === "web" && typeof window !== "undefined") {
    // Development: use the dev domain (includes port :5000)
    if (devDomain) {
      return `https://${devDomain}/`;
    }
    // Production web: use relative URLs (same origin)
    return window.location.origin + "/";
  }

  // Mobile (iOS/Android) handling
  const isDev = isDevEnvironment();
  
  console.log("Environment detection:", {
    executionEnvironment: Constants.executionEnvironment,
    __DEV__,
    isDev,
    devDomain: devDomain || "(not set)",
  });
  
  if (isDev && devDomain) {
    // Development/Preview (Expo Go): use the dev server
    const url = `https://${devDomain}/`;
    console.log("Mobile API URL (dev):", url);
    return url;
  }
  
  // Production builds (TestFlight, App Store): use hardcoded production URL
  console.log("Mobile API URL (prod):", PRODUCTION_API_URL);
  return PRODUCTION_API_URL;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiUrl();
    const url = new URL(queryKey.join("/") as string, baseUrl);

    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

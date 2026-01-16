import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";

// HARDCODED production API URL - this is the ultimate fallback
// This ensures TestFlight/App Store builds ALWAYS work regardless of build config
const HARDCODED_PRODUCTION_URL = "https://riannahscloset.com/";

/**
 * Gets the base URL for the Express API server
 * 
 * Priority order:
 * 1. Web: Use dev domain or window.location.origin
 * 2. Mobile production (TestFlight/App Store): Use EXPO_PUBLIC_API_DOMAIN or hardcoded URL
 * 3. Mobile development (Expo Go): Use EXPO_PUBLIC_DOMAIN (dev server)
 * 
 * @returns {string} The API base URL
 */
export function getApiUrl(): string {
  // Environment variables baked at build time
  const apiDomain = process.env.EXPO_PUBLIC_API_DOMAIN;  // Production API (from eas.json)
  const devDomain = process.env.EXPO_PUBLIC_DOMAIN;       // Development server
  
  // Web platform handling
  if (Platform.OS === "web" && typeof window !== "undefined") {
    if (devDomain) {
      return `https://${devDomain}/`;
    }
    return window.location.origin + "/";
  }

  // Mobile (iOS/Android) - detect environment
  const execEnv = Constants.executionEnvironment;
  const isExpoGo = execEnv === ExecutionEnvironment.StoreClient;
  const isNativeBuild = execEnv === ExecutionEnvironment.Bare;
  
  console.log("API URL Detection:", {
    platform: Platform.OS,
    executionEnvironment: execEnv,
    isExpoGo,
    isNativeBuild,
    __DEV__,
    EXPO_PUBLIC_API_DOMAIN: apiDomain || "(not set)",
    EXPO_PUBLIC_DOMAIN: devDomain || "(not set)",
  });

  // NATIVE BUILDS (TestFlight, App Store)
  // Always use the production API - either from env var or hardcoded fallback
  if (isNativeBuild || !__DEV__) {
    // Prefer EXPO_PUBLIC_API_DOMAIN (set in eas.json), fall back to hardcoded
    const productionUrl = apiDomain 
      ? `https://${apiDomain}/` 
      : HARDCODED_PRODUCTION_URL;
    console.log("Using production API URL:", productionUrl);
    return productionUrl;
  }

  // EXPO GO (Development/Preview)
  // Use the dev server if available
  if (isExpoGo && devDomain) {
    const devUrl = `https://${devDomain}/`;
    console.log("Using development API URL:", devUrl);
    return devUrl;
  }

  // Fallback for edge cases - use production
  console.log("Fallback to production API URL:", HARDCODED_PRODUCTION_URL);
  return HARDCODED_PRODUCTION_URL;
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

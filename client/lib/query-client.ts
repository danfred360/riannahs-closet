import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { Platform } from "react-native";

// EXPO_PUBLIC_API_DOMAIN: Set at build time to configure which backend the app connects to
// - For production builds: "riannahscloset.com"
// - For staging/test builds: your dev deployment domain
// This is injected via EAS build secrets or eas.json env configuration

/**
 * Gets the base URL for the Express API server
 * @returns {string} The API base URL
 */
export function getApiUrl(): string {
  // Production API URL - used for TestFlight and App Store builds
  const PRODUCTION_API_URL = "https://riannahscloset.com/";
  
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
  // __DEV__ is true in Expo Go and dev builds, false in production builds
  if (__DEV__ && devDomain) {
    // Development/Preview: use the dev server
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

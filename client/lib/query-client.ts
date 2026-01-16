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
  // HARDCODED production domain for mobile apps - this ensures TestFlight/App Store
  // builds always connect to the correct API regardless of build environment
  const PRODUCTION_API_URL = "https://riannahscloset.com/";
  
  // For web platform only, we need dynamic URL handling
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const devDomain = process.env.EXPO_PUBLIC_DOMAIN;
    
    // Development: use the dev domain (includes port :5000)
    if (devDomain) {
      return `https://${devDomain}/`;
    }
    
    // Production web: use relative URLs (same origin)
    return window.location.origin + "/";
  }

  // iOS and Android: ALWAYS use the production API URL
  // This is intentionally hardcoded to avoid any env var issues with mobile builds
  console.log("Mobile API URL:", PRODUCTION_API_URL);
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

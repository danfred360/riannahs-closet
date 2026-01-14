import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { Platform } from "react-native";

// Production domain - all mobile traffic goes through Cloudflare
const PRODUCTION_DOMAIN = "riannahscloset.com";

/**
 * Gets the base URL for the Express API server (e.g., "http://localhost:3000")
 * @returns {string} The API base URL
 */
export function getApiUrl(): string {
  // EXPO_PUBLIC_DOMAIN is set in development to include the API port (:5000)
  // In production, it falls back to the hardcoded production domain
  const expoDomain = process.env.EXPO_PUBLIC_DOMAIN;

  // On web platform
  if (Platform.OS === "web" && typeof window !== "undefined") {
    // If EXPO_PUBLIC_DOMAIN is set (development), use it for API calls
    // This ensures we hit the Express server on port 5000, not Metro on 8081
    if (expoDomain) {
      return `https://${expoDomain}/`;
    }
    
    // In production/deployed builds, use relative URLs (same origin)
    return window.location.origin + "/";
  }

  // Mobile: use EXPO_PUBLIC_DOMAIN in development, production domain otherwise
  const host = expoDomain || PRODUCTION_DOMAIN;

  const url = new URL(`https://${host}`);
  console.log("Mobile API URL:", url.href);

  return url.href;
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

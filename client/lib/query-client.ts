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
  // EXPO_PUBLIC_API_DOMAIN is the production API domain, set at build time
  // EXPO_PUBLIC_DOMAIN is set in development for the Replit dev server
  const apiDomain = process.env.EXPO_PUBLIC_API_DOMAIN;
  const devDomain = process.env.EXPO_PUBLIC_DOMAIN;

  // On web platform
  if (Platform.OS === "web" && typeof window !== "undefined") {
    // Development: use the dev domain (includes port :5000)
    if (devDomain) {
      return `https://${devDomain}/`;
    }
    
    // Production web: use relative URLs (same origin)
    return window.location.origin + "/";
  }

  // Mobile: prefer API domain (production), fall back to dev domain
  const host = apiDomain || devDomain;

  if (!host) {
    throw new Error("EXPO_PUBLIC_API_DOMAIN or EXPO_PUBLIC_DOMAIN must be set");
  }

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

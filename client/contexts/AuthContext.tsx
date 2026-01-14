import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "@/lib/query-client";
import { setAuthToken, invalidateAllCache, clearImageCache } from "@/lib/api";
import { setCacheUserId } from "@/lib/cache";

interface User {
  id: string;
  username: string;
  displayName: string | null;
  avatarUri: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (displayName: string | null, avatarUri: string | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "auth_token";

async function getStoredToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return await AsyncStorage.getItem(TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function storeToken(token: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } else {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    }
  } catch (error) {
    console.error("Error storing token:", error);
  }
}

async function removeToken(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  } catch (error) {
    console.error("Error removing token:", error);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async (authToken: string) => {
    try {
      const response = await fetch(new URL("/api/v1/auth/me", getApiUrl()).toString(), {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setCacheUserId(userData.id);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error fetching user:", error);
      return false;
    }
  }, []);

  useEffect(() => {
    async function loadToken() {
      const storedToken = await getStoredToken();
      if (storedToken) {
        setAuthToken(storedToken);
        const success = await fetchUser(storedToken);
        if (success) {
          setToken(storedToken);
        } else {
          await removeToken();
          setAuthToken(null);
        }
      }
      setIsLoading(false);
    }
    loadToken();
  }, [fetchUser]);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const apiUrl = getApiUrl();
      const loginUrl = new URL("/api/v1/auth/login", apiUrl).toString();
      console.log("Login attempt to:", loginUrl, "Platform:", Platform.OS);
      
      const response = await fetch(loginUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const text = await response.text();
      console.log("Login response status:", response.status, "First 100 chars:", text.substring(0, 100));
      
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        console.error("Failed to parse login response as JSON:", text.substring(0, 200));
        return { success: false, error: "Server returned invalid response" };
      }

      if (!response.ok) {
        return { success: false, error: data.error || "Login failed" };
      }

      await storeToken(data.token);
      setAuthToken(data.token);
      setToken(data.token);
      setUser(data.user);
      setCacheUserId(data.user.id);
      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: "Network error. Please try again." };
    }
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    try {
      const response = await fetch(new URL("/api/v1/auth/register", getApiUrl()).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || "Registration failed" };
      }

      await storeToken(data.token);
      setAuthToken(data.token);
      setToken(data.token);
      setUser(data.user);
      setCacheUserId(data.user.id);
      return { success: true };
    } catch (error) {
      console.error("Registration error:", error);
      return { success: false, error: "Network error. Please try again." };
    }
  }, []);

  const logout = useCallback(async () => {
    await removeToken();
    await invalidateAllCache();
    clearImageCache();
    setAuthToken(null);
    setCacheUserId(null);
    setToken(null);
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (displayName: string | null, avatarUri: string | null) => {
    if (!token) return;

    try {
      const response = await fetch(new URL("/api/v1/profile", getApiUrl()).toString(), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ displayName, avatarUri }),
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.error("Update profile error:", error);
    }
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

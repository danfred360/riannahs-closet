import type { Express, Response } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";
import { authMiddleware, generateToken, verifyPassword, AuthRequest } from "./auth";
import { insertUserSchema, insertClothingItemSchema, insertOutfitSchema, insertPlannedOutfitSchema } from "@shared/schema";
import { z } from "zod";
import { uploadImage, getImageUrl, deleteImage, isUserImage, deleteAllUserImages } from "./objectStorage";
import { sendPasswordResetEmail, sendAccountDeletionEmail } from "./email";
import crypto from "crypto";

const passwordResetRateLimiter = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 3;

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const key = email.toLowerCase();
  const entry = passwordResetRateLimiter.get(key);
  
  if (!entry || now > entry.resetAt) {
    passwordResetRateLimiter.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  entry.count++;
  return true;
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/v1/auth/register", async (req, res) => {
    try {
      const parsed = insertUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid input", details: parsed.error.errors });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(parsed.data.email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }

      const existing = await storage.getUserByEmail(parsed.data.email);
      if (existing) {
        return res.status(409).json({ error: "An account with this email already exists" });
      }

      const user = await storage.createUser(parsed.data);
      const token = generateToken(user.id);

      res.status(201).json({
        user: { id: user.id, email: user.email, displayName: user.displayName, avatarUri: user.avatarUri },
        token,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/v1/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const valid = await verifyPassword(password, user.password);
      if (!valid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = generateToken(user.id);

      res.json({
        user: { id: user.id, email: user.email, displayName: user.displayName, avatarUri: user.avatarUri },
        token,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.get("/api/v1/auth/me", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ id: user.id, email: user.email, displayName: user.displayName, avatarUri: user.avatarUri });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  app.put("/api/v1/profile", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { displayName, avatarUri } = req.body;
      const user = await storage.updateUserProfile(req.userId!, displayName, avatarUri);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ id: user.id, email: user.email, displayName: user.displayName, avatarUri: user.avatarUri });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.get("/api/v1/preferences", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const prefs = await storage.getUserPreferences(req.userId!);
      if (!prefs) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(prefs);
    } catch (error) {
      console.error("Get preferences error:", error);
      res.status(500).json({ error: "Failed to get preferences" });
    }
  });

  app.post("/api/v1/preferences/welcome-seen", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      await storage.markWelcomeSeen(req.userId!);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark welcome seen error:", error);
      res.status(500).json({ error: "Failed to update preference" });
    }
  });

  app.post("/api/v1/preferences/love-message-seen", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { date } = req.body;
      if (!date || typeof date !== "string") {
        return res.status(400).json({ error: "Date is required" });
      }
      await storage.updateLoveMessageLastSeen(req.userId!, date);
      res.json({ success: true });
    } catch (error) {
      console.error("Update love message seen error:", error);
      res.status(500).json({ error: "Failed to update preference" });
    }
  });

  app.post("/api/v1/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: "Email is required" });
      }

      if (!checkRateLimit(email)) {
        return res.status(429).json({ error: "Too many requests. Please try again later." });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.json({ message: "If an account with that email exists, a reset code has been sent." });
      }

      const resetToken = crypto.randomInt(100000, 999999).toString();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await storage.createPasswordResetToken(user.id, resetToken, expiresAt);

      const appUrl = process.env.EXPO_PUBLIC_DOMAIN 
        ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` 
        : 'https://riannahscloset.com';
      
      await sendPasswordResetEmail(email, resetToken, appUrl);

      res.json({ message: "If an account with that email exists, a reset code has been sent." });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Failed to process password reset request" });
    }
  });

  app.post("/api/v1/auth/verify-reset-token", async (req, res) => {
    try {
      const { token } = req.body;
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: "Reset code is required" });
      }

      const resetToken = await storage.getPasswordResetToken(token);
      if (!resetToken) {
        return res.status(400).json({ error: "Invalid or expired reset code" });
      }

      res.json({ valid: true });
    } catch (error) {
      console.error("Verify reset token error:", error);
      res.status(500).json({ error: "Failed to verify reset code" });
    }
  });

  app.post("/api/v1/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: "Reset code is required" });
      }
      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      const resetToken = await storage.getPasswordResetToken(token);
      if (!resetToken) {
        return res.status(400).json({ error: "Invalid or expired reset code" });
      }

      await storage.updateUserPassword(resetToken.userId, newPassword);
      await storage.deletePasswordResetToken(token);

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  app.delete("/api/v1/auth/account", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const email = user.email;
      const displayName = user.displayName;
      const userId = req.userId!;

      // Delete all user images from object storage first
      const deletedImages = await deleteAllUserImages(userId);
      console.log(`Deleted ${deletedImages} images for user ${userId}`);

      // Delete user from database (cascade deletes all related data)
      const deleted = await storage.deleteUser(userId);
      if (!deleted) {
        return res.status(500).json({ error: "Failed to delete account" });
      }

      // Send confirmation email (fire and forget)
      sendAccountDeletionEmail(email, displayName).catch((err) => {
        console.error("Failed to send account deletion email:", err);
      });

      res.json({ message: "Account deleted successfully" });
    } catch (error) {
      console.error("Delete account error:", error);
      res.status(500).json({ error: "Failed to delete account" });
    }
  });

  app.post("/api/v1/images/upload", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { imageData, fileName } = req.body;
      if (!imageData || !fileName) {
        return res.status(400).json({ error: "Missing imageData or fileName" });
      }

      const key = await uploadImage(req.userId!, imageData, fileName);
      res.json({ key, url: `/api/v1/images/${encodeURIComponent(key)}` });
    } catch (error) {
      console.error("Image upload error:", error);
      res.status(500).json({ error: "Failed to upload image" });
    }
  });

  app.get("/api/v1/images/:key(*)", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const key = decodeURIComponent(req.params.key);
      console.log(`Image GET request - key: ${key}, userId: ${req.userId}`);
      
      // Security check: users can only access their own images
      if (!isUserImage(req.userId!, key)) {
        console.log(`Access denied - key doesn't match user: ${key}`);
        return res.status(403).json({ error: "Access denied" });
      }
      
      const dataUrl = await getImageUrl(key);
      if (!dataUrl) {
        console.log(`Image not found in storage: ${key}`);
        return res.status(404).json({ error: "Image not found" });
      }
      console.log(`Image found, dataUrl length: ${dataUrl.length}`);
      res.json({ dataUrl });
    } catch (error) {
      console.error("Image download error:", error);
      res.status(500).json({ error: "Failed to download image" });
    }
  });

  app.delete("/api/v1/images/:key(*)", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const key = decodeURIComponent(req.params.key);
      
      // Security check: users can only delete their own images
      if (!isUserImage(req.userId!, key)) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const success = await deleteImage(key);
      if (!success) {
        return res.status(500).json({ error: "Failed to delete image" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Image delete error:", error);
      res.status(500).json({ error: "Failed to delete image" });
    }
  });

  app.get("/api/v1/items", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const items = await storage.getClothingItems(req.userId!);
      const formattedItems = items.map((item) => ({
        ...item,
        tags: item.tags || [],
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      }));
      res.json(formattedItems);
    } catch (error) {
      console.error("Get items error:", error);
      res.status(500).json({ error: "Failed to get items" });
    }
  });

  app.get("/api/v1/items/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const item = await storage.getClothingItem(req.userId!, req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      res.json({
        ...item,
        tags: item.tags || [],
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error("Get item error:", error);
      res.status(500).json({ error: "Failed to get item" });
    }
  });

  app.post("/api/v1/items", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const parsed = insertClothingItemSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid input", details: parsed.error.errors });
      }

      const item = await storage.createClothingItem(req.userId!, parsed.data);
      res.status(201).json({
        ...item,
        tags: item.tags || [],
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error("Create item error:", error);
      res.status(500).json({ error: "Failed to create item" });
    }
  });

  app.put("/api/v1/items/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const item = await storage.updateClothingItem(req.userId!, req.params.id, req.body);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      res.json({
        ...item,
        tags: item.tags || [],
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error("Update item error:", error);
      res.status(500).json({ error: "Failed to update item" });
    }
  });

  app.delete("/api/v1/items/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      await storage.deleteClothingItem(req.userId!, req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete item error:", error);
      res.status(500).json({ error: "Failed to delete item" });
    }
  });

  app.get("/api/v1/outfits", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const outfits = await storage.getOutfits(req.userId!);
      const formattedOutfits = outfits.map((outfit) => ({
        ...outfit,
        tags: outfit.tags || [],
        createdAt: outfit.createdAt.toISOString(),
        updatedAt: outfit.updatedAt.toISOString(),
      }));
      res.json(formattedOutfits);
    } catch (error) {
      console.error("Get outfits error:", error);
      res.status(500).json({ error: "Failed to get outfits" });
    }
  });

  app.get("/api/v1/outfits/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const outfit = await storage.getOutfit(req.userId!, req.params.id);
      if (!outfit) {
        return res.status(404).json({ error: "Outfit not found" });
      }
      res.json({
        ...outfit,
        tags: outfit.tags || [],
        createdAt: outfit.createdAt.toISOString(),
        updatedAt: outfit.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error("Get outfit error:", error);
      res.status(500).json({ error: "Failed to get outfit" });
    }
  });

  app.post("/api/v1/outfits", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const parsed = insertOutfitSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid input", details: parsed.error.errors });
      }

      const outfit = await storage.createOutfit(req.userId!, parsed.data);
      res.status(201).json({
        ...outfit,
        tags: outfit.tags || [],
        createdAt: outfit.createdAt.toISOString(),
        updatedAt: outfit.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error("Create outfit error:", error);
      res.status(500).json({ error: "Failed to create outfit" });
    }
  });

  app.put("/api/v1/outfits/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const outfit = await storage.updateOutfit(req.userId!, req.params.id, req.body);
      if (!outfit) {
        return res.status(404).json({ error: "Outfit not found" });
      }
      res.json({
        ...outfit,
        tags: outfit.tags || [],
        createdAt: outfit.createdAt.toISOString(),
        updatedAt: outfit.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error("Update outfit error:", error);
      res.status(500).json({ error: "Failed to update outfit" });
    }
  });

  app.delete("/api/v1/outfits/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      await storage.deleteOutfit(req.userId!, req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete outfit error:", error);
      res.status(500).json({ error: "Failed to delete outfit" });
    }
  });

  app.get("/api/v1/planner", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const plannedOutfits = await storage.getPlannedOutfits(req.userId!);
      res.json(plannedOutfits);
    } catch (error) {
      console.error("Get planner error:", error);
      res.status(500).json({ error: "Failed to get planned outfits" });
    }
  });

  app.post("/api/v1/planner", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const parsed = insertPlannedOutfitSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid input", details: parsed.error.errors });
      }

      const planned = await storage.planOutfit(req.userId!, parsed.data);
      res.status(201).json(planned);
    } catch (error) {
      console.error("Plan outfit error:", error);
      res.status(500).json({ error: "Failed to plan outfit" });
    }
  });

  app.delete("/api/v1/planner/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      await storage.removePlannedOutfit(req.userId!, req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Remove planned outfit error:", error);
      res.status(500).json({ error: "Failed to remove planned outfit" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}

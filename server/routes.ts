import type { Express, Response } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";
import { authMiddleware, generateToken, verifyPassword, AuthRequest } from "./auth";
import { insertUserSchema, insertClothingItemSchema, insertOutfitSchema, insertPlannedOutfitSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/v1/auth/register", async (req, res) => {
    try {
      const parsed = insertUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid input", details: parsed.error.errors });
      }

      const existing = await storage.getUserByUsername(parsed.data.username);
      if (existing) {
        return res.status(409).json({ error: "Username already exists" });
      }

      const user = await storage.createUser(parsed.data);
      const token = generateToken(user.id);

      res.status(201).json({
        user: { id: user.id, username: user.username, displayName: user.displayName, avatarUri: user.avatarUri },
        token,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/v1/auth/login", async (req, res) => {
    try {
      const parsed = insertUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid input" });
      }

      const user = await storage.getUserByUsername(parsed.data.username);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const valid = await verifyPassword(parsed.data.password, user.password);
      if (!valid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = generateToken(user.id);

      res.json({
        user: { id: user.id, username: user.username, displayName: user.displayName, avatarUri: user.avatarUri },
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

      res.json({ id: user.id, username: user.username, displayName: user.displayName, avatarUri: user.avatarUri });
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

      res.json({ id: user.id, username: user.username, displayName: user.displayName, avatarUri: user.avatarUri });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ error: "Failed to update profile" });
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

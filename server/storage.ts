import { db } from "./db";
import { eq, and, notInArray, sql, gt, lt } from "drizzle-orm";
import {
  users,
  clothingItems,
  outfits,
  outfitItems,
  plannedOutfits,
  passwordResetTokens,
  type User,
  type InsertUser,
  type ClothingItem,
  type InsertClothingItem,
  type Outfit,
  type InsertOutfit,
  type PlannedOutfit,
  type InsertPlannedOutfit,
  type PasswordResetToken,
} from "@shared/schema";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserProfile(userId: string, displayName: string | null, avatarUri: string | null): Promise<User | undefined>;
  updateUserPassword(userId: string, password: string): Promise<User | undefined>;
  
  createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  deletePasswordResetToken(token: string): Promise<boolean>;
  deleteExpiredPasswordResetTokens(): Promise<void>;
  
  getClothingItems(userId: string): Promise<ClothingItem[]>;
  getClothingItem(userId: string, itemId: string): Promise<ClothingItem | undefined>;
  createClothingItem(userId: string, item: InsertClothingItem): Promise<ClothingItem>;
  updateClothingItem(userId: string, itemId: string, item: Partial<InsertClothingItem>): Promise<ClothingItem | undefined>;
  deleteClothingItem(userId: string, itemId: string): Promise<boolean>;
  
  getOutfits(userId: string): Promise<(Outfit & { itemIds: string[] })[]>;
  getOutfit(userId: string, outfitId: string): Promise<(Outfit & { itemIds: string[] }) | undefined>;
  createOutfit(userId: string, outfit: InsertOutfit): Promise<Outfit & { itemIds: string[] }>;
  updateOutfit(userId: string, outfitId: string, outfit: Partial<InsertOutfit>): Promise<(Outfit & { itemIds: string[] }) | undefined>;
  deleteOutfit(userId: string, outfitId: string): Promise<boolean>;
  
  getPlannedOutfits(userId: string): Promise<PlannedOutfit[]>;
  planOutfit(userId: string, plan: InsertPlannedOutfit): Promise<PlannedOutfit>;
  removePlannedOutfit(userId: string, planId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, SALT_ROUNDS);
    const [user] = await db
      .insert(users)
      .values({ ...insertUser, password: hashedPassword })
      .returning();
    return user;
  }

  async updateUserProfile(userId: string, displayName: string | null, avatarUri: string | null): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ displayName, avatarUri, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserPassword(userId: string, password: string): Promise<User | undefined> {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const [user] = await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<PasswordResetToken> {
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
    const [resetToken] = await db
      .insert(passwordResetTokens)
      .values({ userId, token, expiresAt })
      .returning();
    return resetToken;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(and(eq(passwordResetTokens.token, token), gt(passwordResetTokens.expiresAt, new Date())));
    return resetToken;
  }

  async deletePasswordResetToken(token: string): Promise<boolean> {
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, token));
    return true;
  }

  async deleteExpiredPasswordResetTokens(): Promise<void> {
    await db.delete(passwordResetTokens).where(lt(passwordResetTokens.expiresAt, new Date()));
  }

  async getClothingItems(userId: string): Promise<ClothingItem[]> {
    return db.select().from(clothingItems).where(eq(clothingItems.userId, userId));
  }

  async getClothingItem(userId: string, itemId: string): Promise<ClothingItem | undefined> {
    const [item] = await db
      .select()
      .from(clothingItems)
      .where(and(eq(clothingItems.id, itemId), eq(clothingItems.userId, userId)));
    return item;
  }

  async createClothingItem(userId: string, item: InsertClothingItem): Promise<ClothingItem> {
    const [created] = await db
      .insert(clothingItems)
      .values({ ...item, userId })
      .returning();
    return created;
  }

  async updateClothingItem(userId: string, itemId: string, item: Partial<InsertClothingItem>): Promise<ClothingItem | undefined> {
    const [updated] = await db
      .update(clothingItems)
      .set({ ...item, updatedAt: new Date() })
      .where(and(eq(clothingItems.id, itemId), eq(clothingItems.userId, userId)))
      .returning();
    return updated;
  }

  async deleteClothingItem(userId: string, itemId: string): Promise<boolean> {
    await db
      .delete(clothingItems)
      .where(and(eq(clothingItems.id, itemId), eq(clothingItems.userId, userId)));
    
    // Clean up any outfits that now have zero items
    const userOutfits = await db.select().from(outfits).where(eq(outfits.userId, userId));
    
    for (const outfit of userOutfits) {
      const remainingItems = await db
        .select()
        .from(outfitItems)
        .where(eq(outfitItems.outfitId, outfit.id));
      
      if (remainingItems.length === 0) {
        await db.delete(outfits).where(eq(outfits.id, outfit.id));
      }
    }
    
    return true;
  }

  async getOutfits(userId: string): Promise<(Outfit & { itemIds: string[] })[]> {
    const outfitsList = await db.select().from(outfits).where(eq(outfits.userId, userId));
    
    const outfitsWithItems = await Promise.all(
      outfitsList.map(async (outfit) => {
        const items = await db.select().from(outfitItems).where(eq(outfitItems.outfitId, outfit.id));
        return { ...outfit, itemIds: items.map((i) => i.clothingItemId) };
      })
    );
    
    return outfitsWithItems;
  }

  async getOutfit(userId: string, outfitId: string): Promise<(Outfit & { itemIds: string[] }) | undefined> {
    const [outfit] = await db
      .select()
      .from(outfits)
      .where(and(eq(outfits.id, outfitId), eq(outfits.userId, userId)));
    
    if (!outfit) return undefined;
    
    const items = await db.select().from(outfitItems).where(eq(outfitItems.outfitId, outfit.id));
    return { ...outfit, itemIds: items.map((i) => i.clothingItemId) };
  }

  async createOutfit(userId: string, outfit: InsertOutfit): Promise<Outfit & { itemIds: string[] }> {
    const { itemIds, ...outfitData } = outfit;
    
    const [created] = await db
      .insert(outfits)
      .values({ ...outfitData, userId })
      .returning();
    
    if (itemIds && itemIds.length > 0) {
      await db.insert(outfitItems).values(
        itemIds.map((clothingItemId) => ({
          outfitId: created.id,
          clothingItemId,
        }))
      );
    }
    
    return { ...created, itemIds: itemIds || [] };
  }

  async updateOutfit(userId: string, outfitId: string, outfit: Partial<InsertOutfit>): Promise<(Outfit & { itemIds: string[] }) | undefined> {
    const { itemIds, ...outfitData } = outfit;
    
    const [updated] = await db
      .update(outfits)
      .set({ ...outfitData, updatedAt: new Date() })
      .where(and(eq(outfits.id, outfitId), eq(outfits.userId, userId)))
      .returning();
    
    if (!updated) return undefined;
    
    if (itemIds !== undefined) {
      await db.delete(outfitItems).where(eq(outfitItems.outfitId, outfitId));
      if (itemIds.length > 0) {
        await db.insert(outfitItems).values(
          itemIds.map((clothingItemId) => ({
            outfitId: updated.id,
            clothingItemId,
          }))
        );
      }
    }
    
    const items = await db.select().from(outfitItems).where(eq(outfitItems.outfitId, updated.id));
    return { ...updated, itemIds: items.map((i) => i.clothingItemId) };
  }

  async deleteOutfit(userId: string, outfitId: string): Promise<boolean> {
    await db.delete(outfits).where(and(eq(outfits.id, outfitId), eq(outfits.userId, userId)));
    return true;
  }

  async getPlannedOutfits(userId: string): Promise<PlannedOutfit[]> {
    return db.select().from(plannedOutfits).where(eq(plannedOutfits.userId, userId));
  }

  async planOutfit(userId: string, plan: InsertPlannedOutfit): Promise<PlannedOutfit> {
    await db.delete(plannedOutfits).where(
      and(eq(plannedOutfits.userId, userId), eq(plannedOutfits.date, plan.date))
    );
    
    const [created] = await db
      .insert(plannedOutfits)
      .values({ ...plan, userId })
      .returning();
    return created;
  }

  async removePlannedOutfit(userId: string, planId: string): Promise<boolean> {
    await db.delete(plannedOutfits).where(and(eq(plannedOutfits.id, planId), eq(plannedOutfits.userId, userId)));
    return true;
  }
}

export const storage = new DatabaseStorage();

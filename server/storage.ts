import { db } from "./db";
import { eq, and, notInArray, sql, gt, lt, inArray } from "drizzle-orm";
import {
  users,
  clothingItems,
  outfits,
  outfitItems,
  plannedOutfits,
  passwordResetTokens,
  tags,
  clothingItemTags,
  outfitTags,
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
  
  getOutfits(userId: string): Promise<(Outfit & { itemIds: string[]; accessoryIds: string[] })[]>;
  getOutfit(userId: string, outfitId: string): Promise<(Outfit & { itemIds: string[]; accessoryIds: string[] }) | undefined>;
  createOutfit(userId: string, outfit: InsertOutfit): Promise<Outfit & { itemIds: string[]; accessoryIds: string[] }>;
  updateOutfit(userId: string, outfitId: string, outfit: Partial<InsertOutfit>): Promise<(Outfit & { itemIds: string[]; accessoryIds: string[] }) | undefined>;
  deleteOutfit(userId: string, outfitId: string): Promise<boolean>;
  
  getPlannedOutfits(userId: string): Promise<PlannedOutfit[]>;
  planOutfit(userId: string, plan: InsertPlannedOutfit): Promise<PlannedOutfit>;
  removePlannedOutfit(userId: string, planId: string): Promise<boolean>;
  
  deleteUser(userId: string): Promise<boolean>;
  
  getUserPreferences(userId: string): Promise<{ hasSeenWelcome: boolean; loveMessageLastSeen: string | null; email: string } | undefined>;
  markWelcomeSeen(userId: string): Promise<void>;
  updateLoveMessageLastSeen(userId: string, date: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  
  private async getOrCreateTags(userId: string, tagNames: string[]): Promise<string[]> {
    if (!tagNames || tagNames.length === 0) return [];
    
    const tagIds: string[] = [];
    
    for (const name of tagNames) {
      const normalizedName = name.trim().toLowerCase();
      if (!normalizedName) continue;
      
      const [existing] = await db
        .select()
        .from(tags)
        .where(and(eq(tags.userId, userId), eq(tags.name, normalizedName)));
      
      if (existing) {
        tagIds.push(existing.id);
      } else {
        const [created] = await db
          .insert(tags)
          .values({ userId, name: normalizedName })
          .returning();
        tagIds.push(created.id);
      }
    }
    
    return tagIds;
  }

  private async getTagNamesForItem(itemId: string): Promise<string[]> {
    const itemTagRows = await db
      .select({ tagId: clothingItemTags.tagId })
      .from(clothingItemTags)
      .where(eq(clothingItemTags.clothingItemId, itemId));
    
    if (itemTagRows.length === 0) return [];
    
    const tagIds = itemTagRows.map(r => r.tagId);
    const tagRows = await db
      .select({ name: tags.name })
      .from(tags)
      .where(inArray(tags.id, tagIds));
    
    return tagRows.map(t => t.name);
  }

  private async getTagNamesForOutfit(outfitId: string): Promise<string[]> {
    const outfitTagRows = await db
      .select({ tagId: outfitTags.tagId })
      .from(outfitTags)
      .where(eq(outfitTags.outfitId, outfitId));
    
    if (outfitTagRows.length === 0) return [];
    
    const tagIds = outfitTagRows.map(r => r.tagId);
    const tagRows = await db
      .select({ name: tags.name })
      .from(tags)
      .where(inArray(tags.id, tagIds));
    
    return tagRows.map(t => t.name);
  }

  private async setItemTags(userId: string, itemId: string, tagNames: string[]): Promise<void> {
    await db.delete(clothingItemTags).where(eq(clothingItemTags.clothingItemId, itemId));
    
    if (!tagNames || tagNames.length === 0) return;
    
    const tagIds = await this.getOrCreateTags(userId, tagNames);
    
    if (tagIds.length > 0) {
      await db.insert(clothingItemTags).values(
        tagIds.map(tagId => ({ clothingItemId: itemId, tagId }))
      );
    }
  }

  private async setOutfitTags(userId: string, outfitId: string, tagNames: string[]): Promise<void> {
    await db.delete(outfitTags).where(eq(outfitTags.outfitId, outfitId));
    
    if (!tagNames || tagNames.length === 0) return;
    
    const tagIds = await this.getOrCreateTags(userId, tagNames);
    
    if (tagIds.length > 0) {
      await db.insert(outfitTags).values(
        tagIds.map(tagId => ({ outfitId, tagId }))
      );
    }
  }

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
    const items = await db.select().from(clothingItems).where(eq(clothingItems.userId, userId));
    
    const itemsWithTags = await Promise.all(
      items.map(async (item) => {
        const tagNames = await this.getTagNamesForItem(item.id);
        return { ...item, tags: tagNames };
      })
    );
    
    return itemsWithTags;
  }

  async getClothingItem(userId: string, itemId: string): Promise<ClothingItem | undefined> {
    const [item] = await db
      .select()
      .from(clothingItems)
      .where(and(eq(clothingItems.id, itemId), eq(clothingItems.userId, userId)));
    
    if (!item) return undefined;
    
    const tagNames = await this.getTagNamesForItem(item.id);
    return { ...item, tags: tagNames };
  }

  async createClothingItem(userId: string, item: InsertClothingItem): Promise<ClothingItem> {
    const { tags: tagNames, tempId, ...itemData } = item as InsertClothingItem & { tempId?: string };
    
    const [created] = await db
      .insert(clothingItems)
      .values({ ...itemData, userId, tags: [] })
      .returning();
    
    if (tagNames && tagNames.length > 0) {
      await this.setItemTags(userId, created.id, tagNames);
    }
    
    const resolvedTags = await this.getTagNamesForItem(created.id);
    return { ...created, tags: resolvedTags };
  }

  async updateClothingItem(userId: string, itemId: string, item: Partial<InsertClothingItem>): Promise<ClothingItem | undefined> {
    const { tags: tagNames, ...itemData } = item;
    
    const [updated] = await db
      .update(clothingItems)
      .set({ ...itemData, updatedAt: new Date() })
      .where(and(eq(clothingItems.id, itemId), eq(clothingItems.userId, userId)))
      .returning();
    
    if (!updated) return undefined;
    
    if (tagNames !== undefined) {
      await this.setItemTags(userId, itemId, tagNames || []);
    }
    
    const resolvedTags = await this.getTagNamesForItem(updated.id);
    return { ...updated, tags: resolvedTags };
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

  async getOutfits(userId: string): Promise<(Outfit & { itemIds: string[]; accessoryIds: string[] })[]> {
    const outfitsList = await db.select().from(outfits).where(eq(outfits.userId, userId));
    
    const outfitsWithItems = await Promise.all(
      outfitsList.map(async (outfit) => {
        const items = await db.select().from(outfitItems).where(eq(outfitItems.outfitId, outfit.id));
        const coreItems = items.filter((i) => i.itemType === "core").map((i) => i.clothingItemId);
        const accessoryItems = items.filter((i) => i.itemType === "accessory").map((i) => i.clothingItemId);
        const tagNames = await this.getTagNamesForOutfit(outfit.id);
        return { ...outfit, itemIds: coreItems, accessoryIds: accessoryItems, tags: tagNames };
      })
    );
    
    return outfitsWithItems;
  }

  async getOutfit(userId: string, outfitId: string): Promise<(Outfit & { itemIds: string[]; accessoryIds: string[] }) | undefined> {
    const [outfit] = await db
      .select()
      .from(outfits)
      .where(and(eq(outfits.id, outfitId), eq(outfits.userId, userId)));
    
    if (!outfit) return undefined;
    
    const items = await db.select().from(outfitItems).where(eq(outfitItems.outfitId, outfit.id));
    const coreItems = items.filter((i) => i.itemType === "core").map((i) => i.clothingItemId);
    const accessoryItems = items.filter((i) => i.itemType === "accessory").map((i) => i.clothingItemId);
    const tagNames = await this.getTagNamesForOutfit(outfit.id);
    return { ...outfit, itemIds: coreItems, accessoryIds: accessoryItems, tags: tagNames };
  }

  async createOutfit(userId: string, outfit: InsertOutfit): Promise<Outfit & { itemIds: string[]; accessoryIds: string[] }> {
    const { itemIds, accessoryIds, tags: tagNames, tempId, ...outfitData } = outfit as InsertOutfit & { tempId?: string };
    
    const [created] = await db
      .insert(outfits)
      .values({ ...outfitData, userId, tags: [] })
      .returning();
    
    const allItems: { outfitId: string; clothingItemId: string; itemType: "core" | "accessory" }[] = [];
    
    if (itemIds && itemIds.length > 0) {
      allItems.push(...itemIds.map((clothingItemId) => ({
        outfitId: created.id,
        clothingItemId,
        itemType: "core" as const,
      })));
    }
    
    if (accessoryIds && accessoryIds.length > 0) {
      allItems.push(...accessoryIds.map((clothingItemId) => ({
        outfitId: created.id,
        clothingItemId,
        itemType: "accessory" as const,
      })));
    }
    
    if (allItems.length > 0) {
      await db.insert(outfitItems).values(allItems);
    }
    
    if (tagNames && tagNames.length > 0) {
      await this.setOutfitTags(userId, created.id, tagNames);
    }
    
    const resolvedTags = await this.getTagNamesForOutfit(created.id);
    return { ...created, itemIds: itemIds || [], accessoryIds: accessoryIds || [], tags: resolvedTags };
  }

  async updateOutfit(userId: string, outfitId: string, outfit: Partial<InsertOutfit>): Promise<(Outfit & { itemIds: string[]; accessoryIds: string[] }) | undefined> {
    const { itemIds, accessoryIds, tags: tagNames, ...outfitData } = outfit;
    
    const [updated] = await db
      .update(outfits)
      .set({ ...outfitData, updatedAt: new Date() })
      .where(and(eq(outfits.id, outfitId), eq(outfits.userId, userId)))
      .returning();
    
    if (!updated) return undefined;
    
    if (itemIds !== undefined || accessoryIds !== undefined) {
      await db.delete(outfitItems).where(eq(outfitItems.outfitId, outfitId));
      
      const allItems: { outfitId: string; clothingItemId: string; itemType: "core" | "accessory" }[] = [];
      
      if (itemIds && itemIds.length > 0) {
        allItems.push(...itemIds.map((clothingItemId) => ({
          outfitId: updated.id,
          clothingItemId,
          itemType: "core" as const,
        })));
      }
      
      if (accessoryIds && accessoryIds.length > 0) {
        allItems.push(...accessoryIds.map((clothingItemId) => ({
          outfitId: updated.id,
          clothingItemId,
          itemType: "accessory" as const,
        })));
      }
      
      if (allItems.length > 0) {
        await db.insert(outfitItems).values(allItems);
      }
    }
    
    if (tagNames !== undefined) {
      await this.setOutfitTags(userId, outfitId, tagNames);
    }
    
    const items = await db.select().from(outfitItems).where(eq(outfitItems.outfitId, updated.id));
    const coreItems = items.filter((i) => i.itemType === "core").map((i) => i.clothingItemId);
    const accessoryItems = items.filter((i) => i.itemType === "accessory").map((i) => i.clothingItemId);
    const resolvedTags = await this.getTagNamesForOutfit(updated.id);
    return { ...updated, itemIds: coreItems, accessoryIds: accessoryItems, tags: resolvedTags };
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

  async deleteUser(userId: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, userId)).returning();
    return result.length > 0;
  }

  async getUserPreferences(userId: string): Promise<{ hasSeenWelcome: boolean; loveMessageLastSeen: string | null; email: string } | undefined> {
    const [user] = await db
      .select({ hasSeenWelcome: users.hasSeenWelcome, loveMessageLastSeen: users.loveMessageLastSeen, email: users.email })
      .from(users)
      .where(eq(users.id, userId));
    return user;
  }

  async markWelcomeSeen(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ hasSeenWelcome: true, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async updateLoveMessageLastSeen(userId: string, date: string): Promise<void> {
    await db
      .update(users)
      .set({ loveMessageLastSeen: date, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }
}

export const storage = new DatabaseStorage();

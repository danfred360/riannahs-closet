import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const clothingCategoryEnum = pgEnum("clothing_category", [
  "tops",
  "bottoms",
  "dresses",
  "outerwear",
  "shoes",
  "accessories",
]);

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  avatarUri: text("avatar_uri"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const clothingItems = pgTable("clothing_items", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: clothingCategoryEnum("category").notNull(),
  imageUri: text("image_uri").notNull(),
  tags: text("tags").array().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const outfits = pgTable("outfits", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  tags: text("tags").array().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const outfitItems = pgTable("outfit_items", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  outfitId: varchar("outfit_id")
    .notNull()
    .references(() => outfits.id, { onDelete: "cascade" }),
  clothingItemId: varchar("clothing_item_id")
    .notNull()
    .references(() => clothingItems.id, { onDelete: "cascade" }),
});

export const plannedOutfits = pgTable("planned_outfits", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  outfitId: varchar("outfit_id")
    .notNull()
    .references(() => outfits.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  clothingItems: many(clothingItems),
  outfits: many(outfits),
  plannedOutfits: many(plannedOutfits),
}));

export const clothingItemsRelations = relations(clothingItems, ({ one, many }) => ({
  user: one(users, {
    fields: [clothingItems.userId],
    references: [users.id],
  }),
  outfitItems: many(outfitItems),
}));

export const outfitsRelations = relations(outfits, ({ one, many }) => ({
  user: one(users, {
    fields: [outfits.userId],
    references: [users.id],
  }),
  outfitItems: many(outfitItems),
  plannedOutfits: many(plannedOutfits),
}));

export const outfitItemsRelations = relations(outfitItems, ({ one }) => ({
  outfit: one(outfits, {
    fields: [outfitItems.outfitId],
    references: [outfits.id],
  }),
  clothingItem: one(clothingItems, {
    fields: [outfitItems.clothingItemId],
    references: [clothingItems.id],
  }),
}));

export const plannedOutfitsRelations = relations(plannedOutfits, ({ one }) => ({
  user: one(users, {
    fields: [plannedOutfits.userId],
    references: [users.id],
  }),
  outfit: one(outfits, {
    fields: [plannedOutfits.outfitId],
    references: [outfits.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
});

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
}));

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

export const insertClothingItemSchema = createInsertSchema(clothingItems).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOutfitSchema = createInsertSchema(outfits).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  itemIds: z.array(z.string()),
  tags: z.array(z.string()).optional().default([]),
});

export const insertPlannedOutfitSchema = createInsertSchema(plannedOutfits).omit({
  id: true,
  userId: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type ClothingItem = typeof clothingItems.$inferSelect;
export type InsertClothingItem = z.infer<typeof insertClothingItemSchema>;
export type Outfit = typeof outfits.$inferSelect;
export type InsertOutfit = z.infer<typeof insertOutfitSchema>;
export type PlannedOutfit = typeof plannedOutfits.$inferSelect;
export type InsertPlannedOutfit = z.infer<typeof insertPlannedOutfitSchema>;
export type OutfitItem = typeof outfitItems.$inferSelect;

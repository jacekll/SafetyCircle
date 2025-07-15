import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  nickname: text("nickname").notNull(),
  sessionId: text("session_id").notNull().unique(),
});

export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  token: text("token").notNull().unique(),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const groupMembers = pgTable("group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  userId: integer("user_id").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  senderId: integer("sender_id").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // 'emergency' | 'resolved'
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertGroupSchema = createInsertSchema(groups).omit({
  id: true,
  token: true,
  createdAt: true,
});

export const insertGroupMemberSchema = createInsertSchema(groupMembers).omit({
  id: true,
  joinedAt: true,
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  sentAt: true,
});

export const joinGroupSchema = z.object({
  token: z.string().length(8, "Token must be 8 characters"),
  nickname: z.string().min(1, "Nickname is required").max(20, "Nickname too long"),
});

export const createGroupSchema = z.object({
  name: z.string().min(1, "Group name is required").max(30, "Group name too long"),
  nickname: z.string().min(1, "Nickname is required").max(20, "Nickname too long"),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type Group = typeof groups.$inferSelect;

export type InsertGroupMember = z.infer<typeof insertGroupMemberSchema>;
export type GroupMember = typeof groupMembers.$inferSelect;

export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;

export type JoinGroupRequest = z.infer<typeof joinGroupSchema>;
export type CreateGroupRequest = z.infer<typeof createGroupSchema>;

// Extended types for API responses
export type GroupWithDetails = Group & {
  memberCount: number;
  isAdmin: boolean;
};

export type AlertWithDetails = Alert & {
  senderName: string;
  groupName: string;
};

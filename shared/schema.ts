import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  nickname: text("nickname").notNull(),
  sessionId: text("session_id").notNull().unique(),
  pushSubscription: text("push_subscription"),
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
  latitude: text("latitude"), // GPS coordinates
  longitude: text("longitude"), // GPS coordinates
  locationAccuracy: text("location_accuracy"), // GPS accuracy in meters
  answeredBy: integer("answered_by"), // User ID who marked as answered
  answeredAt: timestamp("answered_at"), // When it was marked as answered
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

export const archivedAlerts = pgTable("archived_alerts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  alertId: integer("alert_id").notNull(),
  archivedAt: timestamp("archived_at").defaultNow().notNull(),
});

export const emergencyContacts = pgTable("emergency_contacts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  phoneNumber: text("phone_number").notNull(),
  email: text("email"),
  relationship: text("relationship"), // 'family', 'friend', 'colleague', 'other'
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

export const insertEmergencyContactSchema = createInsertSchema(emergencyContacts).omit({
  id: true,
  createdAt: true,
});

export const insertArchivedAlertSchema = createInsertSchema(archivedAlerts).omit({
  id: true,
  archivedAt: true,
});

export const createEmergencyContactSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name too long"),
  phoneNumber: z.string().min(1, "Phone number is required").max(20, "Phone number too long"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  relationship: z.enum(["family", "friend", "colleague", "other"]).optional(),
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

export type InsertEmergencyContact = z.infer<typeof insertEmergencyContactSchema>;
export type EmergencyContact = typeof emergencyContacts.$inferSelect;
export type CreateEmergencyContactRequest = z.infer<typeof createEmergencyContactSchema>;

export type InsertArchivedAlert = z.infer<typeof insertArchivedAlertSchema>;
export type ArchivedAlert = typeof archivedAlerts.$inferSelect;

// Extended types for API responses
export type GroupWithDetails = Group & {
  memberCount: number;
  token: string; // Always included for all group members
};

export type AlertWithDetails = Alert & {
  senderName: string;
  groupName: string;
  answeredByName?: string;
};

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

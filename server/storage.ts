import { 
  users, 
  groups, 
  groupMembers, 
  alerts,
  archivedAlerts,
  emergencyContacts,
  type User, 
  type InsertUser,
  type Group,
  type InsertGroup,
  type GroupMember,
  type InsertGroupMember,
  type Alert,
  type InsertAlert,
  type ArchivedAlert,
  type InsertArchivedAlert,
  type EmergencyContact,
  type InsertEmergencyContact,
  type GroupWithDetails,
  type AlertWithDetails
} from "@shared/schema";
import { db } from './db';
import { eq, desc, and, inArray, count, notInArray, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { randomBytes } from 'crypto';

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserBySessionId(sessionId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserNickname(sessionId: string, nickname: string): Promise<User | undefined>;
  updateUserPushSubscription(sessionId: string, pushSubscription: string | null): Promise<User | undefined>;

  // Group operations
  getGroup(id: number): Promise<Group | undefined>;
  getGroupByToken(token: string): Promise<Group | undefined>;
  createGroup(group: InsertGroup): Promise<Group>;
  getUserGroups(userId: number): Promise<GroupWithDetails[]>;

  // Group member operations
  addGroupMember(member: InsertGroupMember): Promise<GroupMember>;
  getGroupMembers(groupId: number): Promise<User[]>;
  isUserInGroup(userId: number, groupId: number): Promise<boolean>;
  getGroupMemberCount(groupId: number): Promise<number>;

  // Alert operations
  createAlert(alert: InsertAlert): Promise<Alert>;
  getAlert(alertId: number): Promise<Alert | undefined>;
  markAlertAnswered(userId: number, alertId: number): Promise<Alert>;
  getGroupAlerts(userId: number, limit?: number): Promise<AlertWithDetails[]>;
  
  // Archive operations
  archiveAlert(userId: number, alertId: number): Promise<ArchivedAlert>;
  getArchivedAlerts(userId: number, limit?: number): Promise<AlertWithDetails[]>;
  isAlertArchived(userId: number, alertId: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserBySessionId(sessionId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.sessionId, sessionId));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserNickname(sessionId: string, nickname: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ nickname })
      .where(eq(users.sessionId, sessionId))
      .returning();
    return user || undefined;
  }

  async updateUserPushSubscription(sessionId: string, pushSubscription: string | null): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ pushSubscription })
      .where(eq(users.sessionId, sessionId))
      .returning();
    return user || undefined;
  }

  async getGroup(id: number): Promise<Group | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.id, id));
    return group || undefined;
  }

  async getGroupByToken(token: string): Promise<Group | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.token, token));
    return group || undefined;
  }

  async createGroup(insertGroup: InsertGroup): Promise<Group> {
    const [group] = await db
      .insert(groups)
      .values({
        ...insertGroup,
        token: this.generateToken()
      })
      .returning();
    return group;
  }

  async getUserGroups(userId: number): Promise<GroupWithDetails[]> {
    // Create alias for filtering user's groups
    const userMembership = alias(groupMembers, 'user_membership');

    // Join twice: once to filter user's groups, once to count all members
    const userGroupsData = await db
      .select({
        id: groups.id,
        name: groups.name,
        token: groups.token,
        createdBy: groups.createdBy,
        createdAt: groups.createdAt,
        memberCount: count(groupMembers.id),
      })
      .from(groups)
      .innerJoin(userMembership, eq(groups.id, userMembership.groupId))
      .innerJoin(groupMembers, eq(groups.id, groupMembers.groupId))
      .where(eq(userMembership.userId, userId))
      .groupBy(groups.id, groups.name, groups.token, groups.createdBy, groups.createdAt);

    return userGroupsData.map((group: any) => ({
      ...group,
      memberCount: Number(group.memberCount)
    }));
  }

  async addGroupMember(member: InsertGroupMember): Promise<GroupMember> {
    const [groupMember] = await db
      .insert(groupMembers)
      .values(member)
      .returning();
    return groupMember;
  }

  async getGroupMembers(groupId: number): Promise<User[]> {
    const members = await db
      .select({
        id: users.id,
        nickname: users.nickname,
        sessionId: users.sessionId,
        pushSubscription: users.pushSubscription
      })
      .from(users)
      .innerJoin(groupMembers, eq(users.id, groupMembers.userId))
      .where(eq(groupMembers.groupId, groupId));

    return members;
  }

  async isUserInGroup(userId: number, groupId: number): Promise<boolean> {
    const [member] = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.userId, userId), eq(groupMembers.groupId, groupId)));
    return !!member;
  }

  async getGroupMemberCount(groupId: number): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId));
    return Number(result.count);
  }

  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const [alert] = await db
      .insert(alerts)
      .values(insertAlert)
      .returning();
    return alert;
  }

  async getAlert(alertId: number): Promise<Alert | undefined> {
    const [alert] = await db.select().from(alerts).where(eq(alerts.id, alertId));
    return alert || undefined;
  }

  async markAlertAnswered(userId: number, alertId: number): Promise<Alert> {
    const [alert] = await db
      .update(alerts)
      .set({ 
        answeredBy: userId, 
        answeredAt: new Date()
      })
      .where(eq(alerts.id, alertId))
      .returning();
    return alert;
  }

  async getGroupAlerts(userId: number, limit: number = 10): Promise<AlertWithDetails[]> {
    // Get user's groups
    const userGroupIds = await db
      .select({ groupId: groupMembers.groupId })
      .from(groupMembers)
      .where(eq(groupMembers.userId, userId));

    if (userGroupIds.length === 0) {
      return [];
    }

    // Get archived alerts for this user to filter them out
    const archivedAlertIds = await db
      .select({ alertId: archivedAlerts.alertId })
      .from(archivedAlerts)
      .where(eq(archivedAlerts.userId, userId));

    const groupIds = userGroupIds.map(ug => ug.groupId);
    const archivedIds = archivedAlertIds.map(aa => aa.alertId);

    // Create alias for answered by user
    const answeredByUser = users;

    let whereConditions = [inArray(alerts.groupId, groupIds)];
    
    if (archivedIds.length > 0) {
      whereConditions.push(notInArray(alerts.id, archivedIds));
    }

    const baseQuery = db
      .select({
        id: alerts.id,
        groupId: alerts.groupId,
        senderId: alerts.senderId,
        message: alerts.message,
        type: alerts.type,
        latitude: alerts.latitude,
        longitude: alerts.longitude,
        locationAccuracy: alerts.locationAccuracy,
        answeredBy: alerts.answeredBy,
        answeredAt: alerts.answeredAt,
        sentAt: alerts.sentAt,
        senderName: users.nickname,
        groupName: groups.name
      })
      .from(alerts)
      .innerJoin(users, eq(alerts.senderId, users.id))
      .innerJoin(groups, eq(alerts.groupId, groups.id))
      .where(and(...whereConditions))
      .orderBy(desc(alerts.sentAt))
      .limit(limit);

    const alertsData = await baseQuery;

    // Get answered by names separately to avoid complex joins
    const alertsWithDetails: AlertWithDetails[] = [];
    for (const alert of alertsData) {
      let answeredByName: string | undefined = undefined;
      if (alert.answeredBy) {
        const [answeredUser] = await db.select().from(users).where(eq(users.id, alert.answeredBy));
        answeredByName = answeredUser?.nickname;
      }

      alertsWithDetails.push({
        ...alert,
        senderName: alert.senderName || 'Unknown',
        groupName: alert.groupName || 'Unknown',
        answeredByName
      });
    }

    return alertsWithDetails;
  }

  async archiveAlert(userId: number, alertId: number): Promise<ArchivedAlert> {
    const [archivedAlert] = await db
      .insert(archivedAlerts)
      .values({
        userId,
        alertId,
        archivedAt: new Date()
      })
      .returning();
    return archivedAlert;
  }

  async getArchivedAlerts(userId: number, limit: number = 50): Promise<AlertWithDetails[]> {
    const archivedAlertsData = await db
      .select({
        id: alerts.id,
        groupId: alerts.groupId,
        senderId: alerts.senderId,
        message: alerts.message,
        type: alerts.type,
        latitude: alerts.latitude,
        longitude: alerts.longitude,
        locationAccuracy: alerts.locationAccuracy,
        answeredBy: alerts.answeredBy,
        answeredAt: alerts.answeredAt,
        sentAt: alerts.sentAt,
        senderName: users.nickname,
        groupName: groups.name
      })
      .from(archivedAlerts)
      .innerJoin(alerts, eq(archivedAlerts.alertId, alerts.id))
      .innerJoin(users, eq(alerts.senderId, users.id))
      .innerJoin(groups, eq(alerts.groupId, groups.id))
      .where(eq(archivedAlerts.userId, userId))
      .orderBy(desc(alerts.sentAt))
      .limit(limit);

    // Get answered by names separately
    const alertsWithDetails: AlertWithDetails[] = [];
    for (const alert of archivedAlertsData) {
      let answeredByName: string | undefined = undefined;
      if (alert.answeredBy) {
        const [answeredUser] = await db.select().from(users).where(eq(users.id, alert.answeredBy));
        answeredByName = answeredUser?.nickname;
      }

      alertsWithDetails.push({
        ...alert,
        senderName: alert.senderName || 'Unknown',
        groupName: alert.groupName || 'Unknown',
        answeredByName
      });
    }

    return alertsWithDetails;
  }

  async isAlertArchived(userId: number, alertId: number): Promise<boolean> {
    const [archived] = await db
      .select()
      .from(archivedAlerts)
      .where(and(eq(archivedAlerts.userId, userId), eq(archivedAlerts.alertId, alertId)));
    return !!archived;
  }

  private generateToken(): string {
    // Generate cryptographically secure random bytes
    const randomBuffer = randomBytes(6); // 6 bytes = 48 bits
    
    // Convert to base32-like encoding for readability (uppercase letters and numbers)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    
    // Use each byte to generate token characters
    for (let i = 0; i < randomBuffer.length; i++) {
      // Use modulo to map byte values to character set
      result += chars[randomBuffer[i] % chars.length];
    }
    
    // Add additional entropy with timestamp-based randomness
    const timestamp = Date.now();
    const timestampBytes = randomBytes(2);
    const extraChars = (timestamp + timestampBytes.readUInt16BE(0)) % (chars.length * chars.length);
    result += chars[Math.floor(extraChars / chars.length)];
    result += chars[extraChars % chars.length];
    
    return result;
  }
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private groups: Map<number, Group>;
  private groupMembers: Map<number, GroupMember>;
  private alerts: Map<number, Alert>;
  private archivedAlerts: Map<number, ArchivedAlert>;
  
  private currentUserId: number;
  private currentGroupId: number;
  private currentGroupMemberId: number;
  private currentAlertId: number;
  private currentArchivedAlertId: number;

  constructor() {
    this.users = new Map();
    this.groups = new Map();
    this.groupMembers = new Map();
    this.alerts = new Map();
    this.archivedAlerts = new Map();
    
    this.currentUserId = 1;
    this.currentGroupId = 1;
    this.currentGroupMemberId = 1;
    this.currentAlertId = 1;
    this.currentArchivedAlertId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserBySessionId(sessionId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.sessionId === sessionId);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id,
      pushSubscription: insertUser.pushSubscription || null
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserNickname(sessionId: string, nickname: string): Promise<User | undefined> {
    const user = await this.getUserBySessionId(sessionId);
    if (!user) return undefined;
    
    const updatedUser = { ...user, nickname };
    this.users.set(user.id, updatedUser);
    return updatedUser;
  }

  async updateUserPushSubscription(sessionId: string, pushSubscription: string | null): Promise<User | undefined> {
    const user = await this.getUserBySessionId(sessionId);
    if (!user) return undefined;
    
    const updatedUser = { ...user, pushSubscription };
    this.users.set(user.id, updatedUser);
    return updatedUser;
  }

  async getGroup(id: number): Promise<Group | undefined> {
    return this.groups.get(id);
  }

  async getGroupByToken(token: string): Promise<Group | undefined> {
    return Array.from(this.groups.values()).find(group => group.token === token);
  }

  async createGroup(insertGroup: InsertGroup): Promise<Group> {
    const id = this.currentGroupId++;
    const token = this.generateToken();
    const group: Group = { 
      ...insertGroup, 
      id, 
      token, 
      createdAt: new Date() 
    };
    this.groups.set(id, group);
    return group;
  }

  async getUserGroups(userId: number): Promise<GroupWithDetails[]> {
    const userGroupMemberships = Array.from(this.groupMembers.values())
      .filter(member => member.userId === userId);
    
    const groupsWithDetails: GroupWithDetails[] = [];
    
    for (const membership of userGroupMemberships) {
      const group = this.groups.get(membership.groupId);
      if (group) {
        const memberCount = await this.getGroupMemberCount(group.id);

        
        groupsWithDetails.push({
          ...group,
          memberCount,
          token: group.token // Always include token for all members
        });
      }
    }
    
    return groupsWithDetails;
  }

  async addGroupMember(member: InsertGroupMember): Promise<GroupMember> {
    const id = this.currentGroupMemberId++;
    const groupMember: GroupMember = { 
      ...member, 
      id, 
      joinedAt: new Date() 
    };
    this.groupMembers.set(id, groupMember);
    return groupMember;
  }

  async getGroupMembers(groupId: number): Promise<User[]> {
    const memberIds = Array.from(this.groupMembers.values())
      .filter(member => member.groupId === groupId)
      .map(member => member.userId);
    
    const members: User[] = [];
    for (const userId of memberIds) {
      const user = this.users.get(userId);
      if (user) {
        members.push(user);
      }
    }
    
    return members;
  }

  async isUserInGroup(userId: number, groupId: number): Promise<boolean> {
    return Array.from(this.groupMembers.values())
      .some(member => member.userId === userId && member.groupId === groupId);
  }

  async getGroupMemberCount(groupId: number): Promise<number> {
    return Array.from(this.groupMembers.values())
      .filter(member => member.groupId === groupId).length;
  }

  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const id = this.currentAlertId++;
    const alert: Alert = { 
      ...insertAlert, 
      id,
      latitude: insertAlert.latitude || null,
      longitude: insertAlert.longitude || null,
      locationAccuracy: insertAlert.locationAccuracy || null,
      answeredBy: null,
      answeredAt: null,
      sentAt: new Date() 
    };
    this.alerts.set(id, alert);
    return alert;
  }

  async getAlert(alertId: number): Promise<Alert | undefined> {
    return this.alerts.get(alertId);
  }

  async markAlertAnswered(userId: number, alertId: number): Promise<Alert> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error('Alert not found');
    }
    
    const updatedAlert: Alert = {
      ...alert,
      answeredBy: userId,
      answeredAt: new Date()
    };
    
    this.alerts.set(alertId, updatedAlert);
    return updatedAlert;
  }

  async getGroupAlerts(userId: number, limit: number = 10): Promise<AlertWithDetails[]> {
    const userGroups = await this.getUserGroups(userId);
    const userGroupIds = userGroups.map(group => group.id);
    
    // Get user's archived alert IDs
    const archivedAlertIds = Array.from(this.archivedAlerts.values())
      .filter(archived => archived.userId === userId)
      .map(archived => archived.alertId);
    
    const alerts = Array.from(this.alerts.values())
      .filter(alert => 
        userGroupIds.includes(alert.groupId) && 
        !archivedAlertIds.includes(alert.id)
      )
      .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime())
      .slice(0, limit);
    
    const alertsWithDetails: AlertWithDetails[] = [];
    
    for (const alert of alerts) {
      const sender = this.users.get(alert.senderId);
      const group = this.groups.get(alert.groupId);
      const answeredBy = alert.answeredBy ? this.users.get(alert.answeredBy) : null;
      
      if (sender && group) {
        alertsWithDetails.push({
          ...alert,
          senderName: sender.nickname,
          groupName: group.name,
          answeredByName: answeredBy?.nickname
        });
      }
    }
    
    return alertsWithDetails;
  }

  async archiveAlert(userId: number, alertId: number): Promise<ArchivedAlert> {
    const id = this.currentArchivedAlertId++;
    const archivedAlert: ArchivedAlert = {
      id,
      userId,
      alertId,
      archivedAt: new Date()
    };
    this.archivedAlerts.set(id, archivedAlert);
    return archivedAlert;
  }

  async getArchivedAlerts(userId: number, limit: number = 50): Promise<AlertWithDetails[]> {
    const userGroups = await this.getUserGroups(userId);
    const userGroupIds = userGroups.map(group => group.id);
    
    // Get user's archived alert IDs
    const archivedAlertIds = Array.from(this.archivedAlerts.values())
      .filter(archived => archived.userId === userId)
      .map(archived => archived.alertId);
    
    const alerts = Array.from(this.alerts.values())
      .filter(alert => 
        userGroupIds.includes(alert.groupId) && 
        archivedAlertIds.includes(alert.id)
      )
      .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime())
      .slice(0, limit);
    
    const alertsWithDetails: AlertWithDetails[] = [];
    
    for (const alert of alerts) {
      const sender = this.users.get(alert.senderId);
      const group = this.groups.get(alert.groupId);
      const answeredBy = alert.answeredBy ? this.users.get(alert.answeredBy) : null;
      
      if (sender && group) {
        alertsWithDetails.push({
          ...alert,
          senderName: sender.nickname,
          groupName: group.name,
          answeredByName: answeredBy?.nickname
        });
      }
    }
    
    return alertsWithDetails;
  }

  async isAlertArchived(userId: number, alertId: number): Promise<boolean> {
    return Array.from(this.archivedAlerts.values())
      .some(archived => archived.userId === userId && archived.alertId === alertId);
  }

  private generateToken(): string {
    // Generate cryptographically secure random bytes
    const randomBuffer = randomBytes(6); // 6 bytes = 48 bits
    
    // Convert to base32-like encoding for readability (uppercase letters and numbers)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    
    // Use each byte to generate token characters
    for (let i = 0; i < randomBuffer.length; i++) {
      // Use modulo to map byte values to character set
      result += chars[randomBuffer[i] % chars.length];
    }
    
    // Add additional entropy with timestamp-based randomness
    const timestamp = Date.now();
    const timestampBytes = randomBytes(2);
    const extraChars = (timestamp + timestampBytes.readUInt16BE(0)) % (chars.length * chars.length);
    result += chars[Math.floor(extraChars / chars.length)];
    result += chars[extraChars % chars.length];
    
    return result;
  }
}

export const storage = new DatabaseStorage();

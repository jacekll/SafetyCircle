import { 
  users, 
  groups, 
  groupMembers, 
  alerts,
  type User, 
  type InsertUser,
  type Group,
  type InsertGroup,
  type GroupMember,
  type InsertGroupMember,
  type Alert,
  type InsertAlert,
  type GroupWithDetails,
  type AlertWithDetails
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserBySessionId(sessionId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserNickname(sessionId: string, nickname: string): Promise<User | undefined>;

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
  getGroupAlerts(userId: number, limit?: number): Promise<AlertWithDetails[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private groups: Map<number, Group>;
  private groupMembers: Map<number, GroupMember>;
  private alerts: Map<number, Alert>;
  
  private currentUserId: number;
  private currentGroupId: number;
  private currentGroupMemberId: number;
  private currentAlertId: number;

  constructor() {
    this.users = new Map();
    this.groups = new Map();
    this.groupMembers = new Map();
    this.alerts = new Map();
    
    this.currentUserId = 1;
    this.currentGroupId = 1;
    this.currentGroupMemberId = 1;
    this.currentAlertId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserBySessionId(sessionId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.sessionId === sessionId);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
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
        const isAdmin = group.createdBy === userId;
        
        groupsWithDetails.push({
          ...group,
          memberCount,
          isAdmin
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
      sentAt: new Date() 
    };
    this.alerts.set(id, alert);
    return alert;
  }

  async getGroupAlerts(userId: number, limit: number = 10): Promise<AlertWithDetails[]> {
    const userGroups = await this.getUserGroups(userId);
    const userGroupIds = userGroups.map(group => group.id);
    
    const alerts = Array.from(this.alerts.values())
      .filter(alert => userGroupIds.includes(alert.groupId))
      .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime())
      .slice(0, limit);
    
    const alertsWithDetails: AlertWithDetails[] = [];
    
    for (const alert of alerts) {
      const sender = this.users.get(alert.senderId);
      const group = this.groups.get(alert.groupId);
      
      if (sender && group) {
        alertsWithDetails.push({
          ...alert,
          senderName: sender.nickname,
          groupName: group.name
        });
      }
    }
    
    return alertsWithDetails;
  }

  private generateToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

export const storage = new MemStorage();

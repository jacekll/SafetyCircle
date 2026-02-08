import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import webpush from 'web-push';
import { storage } from "./storage";
import {
  joinGroupSchema,
  createGroupSchema,
  type JoinGroupRequest,
  type CreateGroupRequest
} from "@shared/schema";
import type { IncomingMessage } from "http";

interface WebSocketWithUser extends WebSocket {
  userId?: number;
}

// Middleware to ensure user is authenticated
function requireAuth(req: Request, res: any, next: any) {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
}

// Parse session ID from cookie header
function getSessionIdFromCookie(cookieHeader: string | undefined, sessionName: string = 'connect.sid'): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);

  const sessionCookie = cookies[sessionName];
  if (!sessionCookie) return null;

  // Session ID is stored as s:sessionId.signature in signed cookies
  // We need to decode the URL-encoded cookie and extract the session ID
  try {
    const decoded = decodeURIComponent(sessionCookie);
    // Format is s:sessionId.signature
    if (decoded.startsWith('s:')) {
      return decoded.substring(2).split('.')[0];
    }
    return decoded;
  } catch (e) {
    return null;
  }
}

// VAPID configuration for push notifications
if (!process.env.VAPID_PUBLIC_KEY) {
  throw new Error("VAPID_PUBLIC_KEY environment variable is required");
}
if (!process.env.VAPID_PRIVATE_KEY) {
  throw new Error("VAPID_PRIVATE_KEY environment variable is required");
}
if (!process.env.VAPID_EMAIL) {
  throw new Error("VAPID_EMAIL environment variable is required");
}

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL;

// Configure web-push
webpush.setVapidDetails(
  VAPID_EMAIL,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for real-time alerts
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Store active WebSocket connections by user ID
  const userConnections = new Map<number, WebSocketWithUser>();

  wss.on('connection', async (ws: WebSocketWithUser, req: IncomingMessage) => {
    console.log('WebSocket connection established');

    // Authenticate using session cookie
    const sessionId = getSessionIdFromCookie(req.headers.cookie);
    if (sessionId) {
      const user = await storage.getUserBySessionId(sessionId);
      if (user) {
        ws.userId = user.id;
        userConnections.set(user.id, ws);

        ws.send(JSON.stringify({
          type: 'auth_success',
          userId: user.id
        }));

        console.log(`WebSocket authenticated for user ${user.id} (${user.nickname})`);
      } else {
        console.log('WebSocket connection - user not found for session:', sessionId);
        ws.close(1008, 'User not found');
      }
    } else {
      console.log('WebSocket connection - no session cookie found');
      ws.close(1008, 'Authentication required');
    }

    ws.on('close', () => {
      if (ws.userId) {
        userConnections.delete(ws.userId);
      }
      console.log('WebSocket connection closed');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  // Helper function to broadcast alerts to group members
  async function broadcastAlert(groupId: number, message: any) {
    const groupMembers = await storage.getGroupMembers(groupId);
    
    for (const member of groupMembers) {
      // Send WebSocket notification if user is online
      const memberWs = userConnections.get(member.id);
      if (memberWs && memberWs.readyState === WebSocket.OPEN) {
        memberWs.send(JSON.stringify(message));
      }
      
      // Send push notification if user has subscription and is not currently online
      if (member.pushSubscription && (!memberWs || memberWs.readyState !== WebSocket.OPEN)) {
        try {
          console.log(`Sending push notification to user ${member.id} (${member.nickname})`);
          const pushSubscription = JSON.parse(member.pushSubscription);
          
          // Only send push notifications for emergency alerts
          if (message.type === 'alert' && message.alert?.type === 'emergency') {
            const notificationPayload = JSON.stringify({
              title: "🚨 EMERGENCY ALERT",
              body: `${message.alert.senderName} from ${message.alert.groupName}${message.alert.latitude && message.alert.longitude ? ' (with location)' : ''}`,
              icon: '/icon-192x192.svg',
              badge: '/icon-192x192.svg',
              tag: 'emergency-alert',
              requireInteraction: true,
              vibrate: [200, 100, 200, 100, 200],
              data: {
                alertId: message.alert.id,
                groupId: message.alert.groupId,
                latitude: message.alert.latitude,
                longitude: message.alert.longitude,
                url: '/'
              }
            });

            const result = await webpush.sendNotification(pushSubscription, notificationPayload);
            console.log('Push notification sent successfully to user:', member.id, 'Result:', result);
          }
        } catch (error: any) {


          console.error('Failed to send push notification to user:', member.id, {
            error: error.message,
            statusCode: error.statusCode,
            body: error.body,
            stack: error.stack
          });
          
          // If push subscription is invalid, remove it
          if (error.statusCode === 410 || error.statusCode === 413) {
            console.log('Removing invalid push subscription for user:', member.id);
            await storage.updateUserPushSubscription(member.sessionId, null);
          }
        }
      } else {
        console.log(`User ${member.id} (${member.nickname}): WebSocket=${!!memberWs && memberWs.readyState === WebSocket.OPEN ? 'connected' : 'disconnected'}, PushSub=${!!member.pushSubscription ? 'yes' : 'no'}`);
      }
    }
  }

  // Get VAPID public key for push notifications
  app.get('/api/push/vapid-key', (req, res) => {
    res.json({ publicKey: VAPID_PUBLIC_KEY });
  });

  // Test push notification endpoint for debugging
  app.post('/api/push/test', requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      if (!user.pushSubscription) {
        return res.status(400).json({ message: 'No push subscription found for user' });
      }

      const pushSubscription = JSON.parse(user.pushSubscription);
      const testPayload = JSON.stringify({
        title: "🧪 Test Notification",
        body: "This is a test push notification from your emergency alert app",
        icon: '/icon-192x192.svg',
        badge: '/icon-192x192.svg',
        tag: 'test-notification',
        requireInteraction: false,
        data: { test: true }
      });

      await webpush.sendNotification(pushSubscription, testPayload);
      console.log('Test push notification sent to user:', user.id);
      res.json({ message: 'Test notification sent successfully' });
    } catch (error: any) {
      console.error('Failed to send test push notification:', error);
      res.status(500).json({
        message: 'Failed to send test notification',
        error: error.message
      });
    }
  });

  // Get or create user by session
  app.post('/api/auth', async (req, res) => {
    try {
      let user;

      // Check if user already exists in session
      if (req.session.userId) {
        user = await storage.getUser(req.session.userId);
      }

      // If no user in session or user not found, create new user
      if (!user) {
        user = await storage.createUser({
          nickname: 'Anonymous',
          sessionId: req.sessionID
        });
        req.session.userId = user.id;
      }

      res.json({ user });
    } catch (error) {
      console.error('Authentication failed:', error);
      res.status(500).json({ message: 'Authentication failed' });
    }
  });

  // Join group with token
  app.post('/api/groups/join', requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      const validatedData = joinGroupSchema.parse(req.body);

      const group = await storage.getGroupByToken(validatedData.token);
      if (!group) {
        return res.status(404).json({ message: 'Invalid token' });
      }

      const alreadyMember = await storage.isUserInGroup(user.id, group.id);
      if (alreadyMember) {
        return res.status(400).json({ message: 'Already a member of this group' });
      }

      // Update user nickname and add to group
      await storage.updateUserNickname(user.sessionId, validatedData.nickname);
      await storage.addGroupMember({
        groupId: group.id,
        userId: user.id
      });

      res.json({
        message: 'Successfully joined group',
        group: {
          id: group.id,
          name: group.name
        }
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Failed to join group' });
    }
  });

  // Create new group
  app.post('/api/groups/create', requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      const validatedData = createGroupSchema.parse(req.body);

      // Update user nickname
      await storage.updateUserNickname(user.sessionId, validatedData.nickname);

      // Create group
      const group = await storage.createGroup({
        name: validatedData.name,
        createdBy: user.id
      });

      // Add creator as first member
      await storage.addGroupMember({
        groupId: group.id,
        userId: user.id
      });

      res.json({
        message: 'Group created successfully',
        group: {
          id: group.id,
          name: group.name,
          token: group.token
        }
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Failed to create group' });
    }
  });

  // Get user's groups
  app.get('/api/groups', requireAuth, async (req, res) => {
    try {
      const groups = await storage.getUserGroups(req.session.userId!);
      res.json({ groups });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch groups' });
    }
  });

  // Get group members
  app.get('/api/groups/:id/members', requireAuth, async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      if (isNaN(groupId)) {
        return res.status(400).json({ message: 'Invalid group ID' });
      }

      // Check if user is a member of the group
      const isUserInGroup = await storage.isUserInGroup(req.session.userId!, groupId);
      if (!isUserInGroup) {
        return res.status(403).json({ message: 'Not a member of this group' });
      }

      const members = await storage.getGroupMembers(groupId);
      res.json({ members });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch group members' });
    }
  });

  // Send emergency alert
  app.post('/api/alerts/emergency', requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      const userGroups = await storage.getUserGroups(user.id);

      if (userGroups.length === 0) {
        return res.status(400).json({ message: 'You must be a member of at least one group to send alerts' });
      }

      // Extract location data from request body
      const { latitude, longitude, accuracy } = req.body;

      // Create alerts for all user's groups
      for (const group of userGroups) {
        const alert = await storage.createAlert({
          groupId: group.id,
          senderId: user.id,
          message: 'EMERGENCY ALERT',
          type: 'emergency',
          latitude: latitude ? String(latitude) : null,
          longitude: longitude ? String(longitude) : null,
          locationAccuracy: accuracy ? String(accuracy) : null,
        });

        // Broadcast to group members
        await broadcastAlert(group.id, {
          type: 'alert',
          alert: {
            id: alert.id,
            groupId: group.id,
            groupName: group.name,
            senderName: user.nickname,
            message: alert.message,
            type: alert.type,
            latitude: alert.latitude,
            longitude: alert.longitude,
            locationAccuracy: alert.locationAccuracy,
            sentAt: alert.sentAt
          }
        });
      }

      res.json({
        message: 'Emergency alerts sent successfully',
        groupCount: userGroups.length
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to send emergency alert' });
    }
  });

  // Get recent alerts
  app.get('/api/alerts', requireAuth, async (req, res) => {
    try {
      const alerts = await storage.getGroupAlerts(req.session.userId!, 10);
      res.json({ alerts });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch alerts' });
    }
  });

  // Mark an alert as answered
  app.post('/api/alerts/:alertId/answer', requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      const alertId = parseInt(req.params.alertId);
      if (isNaN(alertId)) {
        return res.status(400).json({ message: 'Invalid alert ID' });
      }

      // Check if alert exists and user has access to it
      const userGroups = await storage.getUserGroups(user.id);
      const userGroupIds = userGroups.map(group => group.id);
      const alert = await storage.getAlert(alertId);

      if (!alert || !userGroupIds.includes(alert.groupId)) {
        return res.status(404).json({ message: 'Alert not found or access denied' });
      }

      // Check if alert is already answered
      if (alert.answeredBy) {
        return res.status(400).json({ message: 'Alert already answered' });
      }

      // Mark alert as answered - this is the first answer
      const answeredAlert = await storage.markAlertAnswered(user.id, alertId);

      // Broadcast the first answer notification to all group members
      await broadcastAlert(alert.groupId, {
        type: 'alert-answered',
        alert: {
          ...answeredAlert,
          senderName: (await storage.getUser(answeredAlert.senderId))?.nickname,
          groupName: (await storage.getGroup(answeredAlert.groupId))?.name,
          answeredByName: user.nickname
        }
      });

      res.json({ success: true, alert: answeredAlert });
    } catch (error) {
      console.error('Error answering alert:', error);
      res.status(500).json({ message: 'Failed to answer alert' });
    }
  });

  // Archive an alert
  app.post('/api/alerts/:alertId/archive', requireAuth, async (req, res) => {
    try {
      const alertId = parseInt(req.params.alertId);
      if (isNaN(alertId)) {
        return res.status(400).json({ message: 'Invalid alert ID' });
      }

      // Check if alert exists and user has access to it
      const userGroups = await storage.getUserGroups(req.session.userId!);
      const userGroupIds = userGroups.map(group => group.id);
      const alert = await storage.getAlert(alertId);

      if (!alert || !userGroupIds.includes(alert.groupId)) {
        return res.status(404).json({ message: 'Alert not found or access denied' });
      }

      // Check if already archived
      const isArchived = await storage.isAlertArchived(req.session.userId!, alertId);
      if (isArchived) {
        return res.status(400).json({ message: 'Alert already archived' });
      }

      const archivedAlert = await storage.archiveAlert(req.session.userId!, alertId);
      res.json({ success: true, archived: archivedAlert });
    } catch (error) {
      res.status(500).json({ message: 'Failed to archive alert' });
    }
  });

  // Get archived alerts
  app.get('/api/alerts/archived', requireAuth, async (req, res) => {
    try {
      const archivedAlerts = await storage.getArchivedAlerts(req.session.userId!);
      res.json({ alerts: archivedAlerts });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch archived alerts' });
    }
  });

  // Subscribe to push notifications
  app.post('/api/push/subscribe', requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      const { subscription } = req.body;
      if (!subscription) {
        return res.status(400).json({ message: 'Subscription data required' });
      }

      // Validate subscription data
      try {
        const parsedSubscription = JSON.parse(subscription);
        if (!parsedSubscription.endpoint) {
          return res.status(400).json({ message: 'Invalid subscription data: missing endpoint' });
        }
      } catch (parseError) {
        return res.status(400).json({ message: 'Invalid subscription data: not valid JSON' });
      }

      await storage.updateUserPushSubscription(user.sessionId, subscription);
      console.log(`Push subscription updated for user ${user.id} (${user.nickname})`);
      res.json({ message: 'Push subscription updated successfully' });
    } catch (error: any) {
      console.error('Failed to update push subscription:', error);
      res.status(500).json({ message: 'Failed to update push subscription' });
    }
  });

  // Unsubscribe from push notifications
  app.post('/api/push/unsubscribe', requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      await storage.updateUserPushSubscription(user.sessionId, null);
      res.json({ message: 'Push subscription removed successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to remove push subscription' });
    }
  });

  return httpServer;
}

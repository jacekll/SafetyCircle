import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { 
  joinGroupSchema, 
  createGroupSchema,
  type JoinGroupRequest,
  type CreateGroupRequest 
} from "@shared/schema";

interface WebSocketWithUser extends WebSocket {
  userId?: number;
  sessionId?: string;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for real-time alerts
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Store active WebSocket connections by user ID
  const userConnections = new Map<number, WebSocketWithUser>();

  wss.on('connection', (ws: WebSocketWithUser, req) => {
    console.log('WebSocket connection established');

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'auth' && data.sessionId) {
          const user = await storage.getUserBySessionId(data.sessionId);
          if (user) {
            ws.userId = user.id;
            ws.sessionId = data.sessionId;
            userConnections.set(user.id, ws);
            
            ws.send(JSON.stringify({
              type: 'auth_success',
              userId: user.id
            }));
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      if (ws.userId) {
        userConnections.delete(ws.userId);
      }
      console.log('WebSocket connection closed');
    });
  });

  // Helper function to broadcast alerts to group members
  async function broadcastAlert(groupId: number, alert: any) {
    const groupMembers = await storage.getGroupMembers(groupId);
    
    for (const member of groupMembers) {
      const memberWs = userConnections.get(member.id);
      if (memberWs && memberWs.readyState === WebSocket.OPEN) {
        memberWs.send(JSON.stringify({
          type: 'alert',
          alert
        }));
      }
    }
  }

  // Get or create user by session
  app.post('/api/auth', async (req, res) => {
    try {
      const sessionId = req.body.sessionId || `session_${Date.now()}_${Math.random()}`;
      
      let user = await storage.getUserBySessionId(sessionId);
      
      if (!user) {
        user = await storage.createUser({
          nickname: 'Anonymous',
          sessionId
        });
      }

      res.json({ user, sessionId });
    } catch (error) {
      res.status(500).json({ message: 'Authentication failed' });
    }
  });

  // Join group with token
  app.post('/api/groups/join', async (req, res) => {
    try {
      const sessionId = req.headers['x-session-id'] as string;
      if (!sessionId) {
        return res.status(401).json({ message: 'Session ID required' });
      }

      const user = await storage.getUserBySessionId(sessionId);
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
      await storage.updateUserNickname(sessionId, validatedData.nickname);
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
  app.post('/api/groups/create', async (req, res) => {
    try {
      const sessionId = req.headers['x-session-id'] as string;
      if (!sessionId) {
        return res.status(401).json({ message: 'Session ID required' });
      }

      const user = await storage.getUserBySessionId(sessionId);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      const validatedData = createGroupSchema.parse(req.body);
      
      // Update user nickname
      await storage.updateUserNickname(sessionId, validatedData.nickname);
      
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
  app.get('/api/groups', async (req, res) => {
    try {
      const sessionId = req.headers['x-session-id'] as string;
      if (!sessionId) {
        return res.status(401).json({ message: 'Session ID required' });
      }

      const user = await storage.getUserBySessionId(sessionId);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      const groups = await storage.getUserGroups(user.id);
      res.json({ groups });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch groups' });
    }
  });

  // Send emergency alert
  app.post('/api/alerts/emergency', async (req, res) => {
    try {
      const sessionId = req.headers['x-session-id'] as string;
      if (!sessionId) {
        return res.status(401).json({ message: 'Session ID required' });
      }

      const user = await storage.getUserBySessionId(sessionId);
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
  app.get('/api/alerts', async (req, res) => {
    try {
      const sessionId = req.headers['x-session-id'] as string;
      if (!sessionId) {
        return res.status(401).json({ message: 'Session ID required' });
      }

      const user = await storage.getUserBySessionId(sessionId);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      const alerts = await storage.getGroupAlerts(user.id, 10);
      res.json({ alerts });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch alerts' });
    }
  });

  return httpServer;
}

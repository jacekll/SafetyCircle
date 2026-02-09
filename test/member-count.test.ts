import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestEnvironment, teardownTestEnvironment } from './setup.js';

let storage: typeof import('../server/storage.js')['storage'];

beforeAll(async () => {
  await setupTestEnvironment();
  const mod = await import('../server/storage.js');
  storage = mod.storage;
});

afterAll(async () => {
  await teardownTestEnvironment();
});

describe('group member count', () => {
  it('should return correct member count via getGroupMemberCount', async () => {
    const user1 = await storage.createUser({ nickname: 'User 1', sessionId: 'session-1' });
    const user2 = await storage.createUser({ nickname: 'User 2', sessionId: 'session-2' });
    const user3 = await storage.createUser({ nickname: 'User 3', sessionId: 'session-3' });

    const group = await storage.createGroup({ name: 'Test Group', createdBy: user1.id });

    await storage.addGroupMember({ userId: user1.id, groupId: group.id });
    await storage.addGroupMember({ userId: user2.id, groupId: group.id });
    await storage.addGroupMember({ userId: user3.id, groupId: group.id });

    const count = await storage.getGroupMemberCount(group.id);
    expect(count).toBe(3);
  });

  it('should return correct member count via getUserGroups', async () => {
    const user1 = await storage.createUser({ nickname: 'User A', sessionId: 'session-a' });
    const user2 = await storage.createUser({ nickname: 'User B', sessionId: 'session-b' });
    const user3 = await storage.createUser({ nickname: 'User C', sessionId: 'session-c' });

    const group = await storage.createGroup({ name: 'Count Group', createdBy: user1.id });

    await storage.addGroupMember({ userId: user1.id, groupId: group.id });
    await storage.addGroupMember({ userId: user2.id, groupId: group.id });
    await storage.addGroupMember({ userId: user3.id, groupId: group.id });

    for (const user of [user1, user2, user3]) {
      const userGroups = await storage.getUserGroups(user.id);
      const testGroup = userGroups.find(g => g.id === group.id);
      expect(testGroup).toBeDefined();
      expect(testGroup!.memberCount).toBe(3);
    }
  });
});

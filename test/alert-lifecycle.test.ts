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

describe('emergency alert lifecycle', () => {
  let alice: Awaited<ReturnType<typeof storage.createUser>>;
  let bob: Awaited<ReturnType<typeof storage.createUser>>;
  let charlie: Awaited<ReturnType<typeof storage.createUser>>;
  let group: Awaited<ReturnType<typeof storage.createGroup>>;
  let alertWithLocation: Awaited<ReturnType<typeof storage.createAlert>>;
  let alertWithoutLocation: Awaited<ReturnType<typeof storage.createAlert>>;

  describe('setup and alert creation', () => {
    it('should create users, a group, and memberships', async () => {
      alice = await storage.createUser({ nickname: 'Alice', sessionId: 'session-alice' });
      bob = await storage.createUser({ nickname: 'Bob', sessionId: 'session-bob' });
      charlie = await storage.createUser({ nickname: 'Charlie', sessionId: 'session-charlie' });

      group = await storage.createGroup({ name: 'Emergency Group', createdBy: alice.id });

      await storage.addGroupMember({ userId: alice.id, groupId: group.id });
      await storage.addGroupMember({ userId: bob.id, groupId: group.id });

      expect(alice.id).toBeDefined();
      expect(bob.id).toBeDefined();
      expect(charlie.id).toBeDefined();
      expect(group.id).toBeDefined();
      expect(group.token).toHaveLength(8);

      expect(await storage.isUserInGroup(alice.id, group.id)).toBe(true);
      expect(await storage.isUserInGroup(bob.id, group.id)).toBe(true);
      expect(await storage.isUserInGroup(charlie.id, group.id)).toBe(false);
    });

    it('should create an emergency alert with location data', async () => {
      alertWithLocation = await storage.createAlert({
        groupId: group.id,
        senderId: alice.id,
        message: 'EMERGENCY ALERT',
        type: 'emergency',
        latitude: '37.7749',
        longitude: '-122.4194',
        locationAccuracy: '10.5',
      });

      expect(alertWithLocation.id).toBeDefined();
      expect(alertWithLocation.groupId).toBe(group.id);
      expect(alertWithLocation.senderId).toBe(alice.id);
      expect(alertWithLocation.type).toBe('emergency');
      expect(alertWithLocation.latitude).toBe('37.7749');
      expect(alertWithLocation.longitude).toBe('-122.4194');
      expect(alertWithLocation.locationAccuracy).toBe('10.5');
      expect(alertWithLocation.answeredBy).toBeNull();
      expect(alertWithLocation.answeredAt).toBeNull();
      expect(alertWithLocation.sentAt).toBeInstanceOf(Date);
    });

    it('should create an emergency alert without location data', async () => {
      alertWithoutLocation = await storage.createAlert({
        groupId: group.id,
        senderId: alice.id,
        message: 'EMERGENCY ALERT',
        type: 'emergency',
      });

      expect(alertWithoutLocation.id).toBeDefined();
      expect(alertWithoutLocation.id).not.toBe(alertWithLocation.id);
      expect(alertWithoutLocation.latitude).toBeNull();
      expect(alertWithoutLocation.longitude).toBeNull();
      expect(alertWithoutLocation.locationAccuracy).toBeNull();
      expect(alertWithoutLocation.answeredBy).toBeNull();
      expect(alertWithoutLocation.answeredAt).toBeNull();
    });
  });

  describe('alert querying', () => {
    it('should retrieve alerts with sender and group details via getGroupAlerts', async () => {
      const alerts = await storage.getGroupAlerts(bob.id);

      expect(alerts).toHaveLength(2);
      // Most recent first
      expect(alerts[0].id).toBe(alertWithoutLocation.id);
      expect(alerts[1].id).toBe(alertWithLocation.id);

      // Alert with location
      expect(alerts[1].senderName).toBe('Alice');
      expect(alerts[1].groupName).toBe('Emergency Group');
      expect(alerts[1].latitude).toBe('37.7749');
      expect(alerts[1].longitude).toBe('-122.4194');
      expect(alerts[1].answeredByName).toBeUndefined();

      // Alert without location
      expect(alerts[0].senderName).toBe('Alice');
      expect(alerts[0].groupName).toBe('Emergency Group');
      expect(alerts[0].latitude).toBeNull();
      expect(alerts[0].longitude).toBeNull();
    });

    it('should return alerts via getAlert by ID', async () => {
      const fetched = await storage.getAlert(alertWithLocation.id);

      expect(fetched).toBeDefined();
      expect(fetched!.id).toBe(alertWithLocation.id);
      expect(fetched!.message).toBe('EMERGENCY ALERT');
      expect(fetched!.senderId).toBe(alice.id);
    });

    it('should not return alerts for a user outside the group', async () => {
      const charlieAlerts = await storage.getGroupAlerts(charlie.id);
      expect(charlieAlerts).toHaveLength(0);
    });
  });

  describe('alert answering', () => {
    it('should mark an alert as answered by another user', async () => {
      const answered = await storage.markAlertAnswered(bob.id, alertWithLocation.id);

      expect(answered.answeredBy).toBe(bob.id);
      expect(answered.answeredAt).toBeInstanceOf(Date);
      expect(answered.answeredAt).not.toBeNull();
    });

    it('should include answeredByName in group alerts after answering', async () => {
      const alerts = await storage.getGroupAlerts(alice.id);
      const answeredAlert = alerts.find(a => a.id === alertWithLocation.id);
      const unansweredAlert = alerts.find(a => a.id === alertWithoutLocation.id);

      expect(answeredAlert).toBeDefined();
      expect(answeredAlert!.answeredBy).toBe(bob.id);
      expect(answeredAlert!.answeredByName).toBe('Bob');

      expect(unansweredAlert).toBeDefined();
      expect(unansweredAlert!.answeredByName).toBeUndefined();
    });
  });

  describe('alert archiving', () => {
    it('should archive an alert for a specific user', async () => {
      const archived = await storage.archiveAlert(alice.id, alertWithLocation.id);

      expect(archived.id).toBeDefined();
      expect(archived.userId).toBe(alice.id);
      expect(archived.alertId).toBe(alertWithLocation.id);
      expect(archived.archivedAt).toBeInstanceOf(Date);
    });

    it('should report the alert as archived via isAlertArchived', async () => {
      expect(await storage.isAlertArchived(alice.id, alertWithLocation.id)).toBe(true);
      expect(await storage.isAlertArchived(alice.id, alertWithoutLocation.id)).toBe(false);
    });

    it('should exclude archived alerts from getGroupAlerts for the archiving user only', async () => {
      const aliceAlerts = await storage.getGroupAlerts(alice.id);
      const bobAlerts = await storage.getGroupAlerts(bob.id);

      // Alice archived one alert, so she only sees the other
      expect(aliceAlerts).toHaveLength(1);
      expect(aliceAlerts[0].id).toBe(alertWithoutLocation.id);

      // Bob did not archive anything, so he sees both
      expect(bobAlerts).toHaveLength(2);
      expect(bobAlerts.find(a => a.id === alertWithLocation.id)).toBeDefined();
    });

    it('should include archived alerts in getArchivedAlerts for the archiving user only', async () => {
      const aliceArchived = await storage.getArchivedAlerts(alice.id);
      const bobArchived = await storage.getArchivedAlerts(bob.id);

      expect(aliceArchived).toHaveLength(1);
      expect(aliceArchived[0].id).toBe(alertWithLocation.id);
      expect(aliceArchived[0].senderName).toBe('Alice');
      expect(aliceArchived[0].groupName).toBe('Emergency Group');
      expect(aliceArchived[0].answeredByName).toBe('Bob');

      expect(bobArchived).toHaveLength(0);
    });
  });
});

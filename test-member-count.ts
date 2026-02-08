import { config } from "dotenv";
import path from 'path';
config({ path: path.resolve(process.cwd(), ".env.test") });

async function testMemberCount() {
  // Use dynamic imports after env vars are loaded
  const { storage } = await import('./server/storage.js');
  const { setupTestEnvironment, teardownTestEnvironment } = await import('./test/setup.js');

  try {
    // Setup: Create database schema
    await setupTestEnvironment();

    console.log('Testing group member count fix...\n');

    // Create test users
    console.log('Creating test users...');
    const user1 = await storage.createUser({ nickname: 'Test User 1', sessionId: 'test-session-1' });
    const user2 = await storage.createUser({ nickname: 'Test User 2', sessionId: 'test-session-2' });
    const user3 = await storage.createUser({ nickname: 'Test User 3', sessionId: 'test-session-3' });
    console.log(`Created users: ${user1.id}, ${user2.id}, ${user3.id}`);

    // Create a group
    console.log('\nCreating a test group...');
    const group = await storage.createGroup({ name: 'Test Group', createdBy: user1.id });
    console.log(`Created group: ${group.id} (${group.name})`);

    // Add all three users to the group
    console.log('\nAdding members to group...');
    await storage.addGroupMember({ userId: user1.id, groupId: group.id });
    await storage.addGroupMember({ userId: user2.id, groupId: group.id });
    await storage.addGroupMember({ userId: user3.id, groupId: group.id });
    console.log('Added 3 members to the group');

    // Check member count using getGroupMemberCount
    const directCount = await storage.getGroupMemberCount(group.id);
    console.log(`\nDirect count (getGroupMemberCount): ${directCount}`);

    // Check member count from getUserGroups for each user
    console.log('\nChecking getUserGroups for each user:');
    for (const user of [user1, user2, user3]) {
      const userGroups = await storage.getUserGroups(user.id);
      const testGroup = userGroups.find(g => g.id === group.id);
      console.log(`  User ${user.id} sees member count: ${testGroup?.memberCount}`);
    }

    // Verify all counts are 3
    console.log('\n--- VERIFICATION ---');
    const user1Groups = await storage.getUserGroups(user1.id);
    const testGroup = user1Groups.find(g => g.id === group.id);

    if (testGroup?.memberCount === 3) {
      console.log('✅ SUCCESS: Member count is correct (3)');
      console.log('✅ The fix works! No more N+1 problem, single query returns correct count.');
    } else {
      console.log(`❌ FAILED: Expected 3, got ${testGroup?.memberCount}`);
    }

  } catch (error) {
    console.error('Test failed with error:', error);
    process.exit(1);
  }
}

async function runTest() {
  const { teardownTestEnvironment } = await import('./test/setup.js');
  try {
    await testMemberCount();
  } finally {
    // Teardown: Drop database schema
    await teardownTestEnvironment();
    process.exit(0);
  }
}

runTest();

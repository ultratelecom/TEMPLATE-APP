import { createClient, MatrixClient } from 'matrix-js-sdk';

const HOMESERVER_URL = 'https://matrix.awadx.lat';

// User credentials
const USER1 = {
  userId: '@u32:matrix.awadx.lat',
  password: 'ultra12!',
  deviceId: 'wyspr-device-u32'
};

const USER2 = {
  userId: '@u17:matrix.awadx.lat', 
  password: 'ultra12!',
  deviceId: 'wyspr-device-u17'
};

export async function runMatrixTest(): Promise<void> {
  console.log('🚀 Starting Matrix connection test...');
  console.log(`📡 Connecting to: ${HOMESERVER_URL}`);
  
  let client1: MatrixClient | null = null;
  let client2: MatrixClient | null = null;
  let roomId: string | null = null;

  try {
    // Create Matrix clients
    console.log('\n📱 Creating Matrix clients...');
    client1 = createClient({
      baseUrl: HOMESERVER_URL,
      userId: USER1.userId,
      deviceId: USER1.deviceId,
    });

    client2 = createClient({
      baseUrl: HOMESERVER_URL,
      userId: USER2.userId,
      deviceId: USER2.deviceId,
    });

    console.log('✅ Matrix clients created successfully');

    // Login User 1
    console.log(`\n🔐 Logging in User 1: ${USER1.userId}`);
    const loginResponse1 = await client1.login('m.login.password', {
      user: USER1.userId,
      password: USER1.password,
      device_id: USER1.deviceId,
    });
    console.log('✅ User 1 logged in successfully');
    console.log(`🎫 Access token: ${loginResponse1.access_token?.substring(0, 20)}...`);

    // Login User 2
    console.log(`\n🔐 Logging in User 2: ${USER2.userId}`);
    const loginResponse2 = await client2.login('m.login.password', {
      user: USER2.userId,
      password: USER2.password,
      device_id: USER2.deviceId,
    });
    console.log('✅ User 2 logged in successfully');
    console.log(`🎫 Access token: ${loginResponse2.access_token?.substring(0, 20)}...`);

    // Start clients
    console.log('\n🔄 Starting Matrix clients...');
    await client1.startClient({ initialSyncLimit: 10 });
    await client2.startClient({ initialSyncLimit: 10 });

    // Wait for initial sync
    console.log('⏳ Waiting for initial sync...');
    await new Promise((resolve) => {
      let syncCount = 0;
      const onSync = (state: string) => {
        if (state === 'PREPARED') {
          syncCount++;
          console.log(`📥 Client ${syncCount} synced`);
          if (syncCount === 2) {
            client1?.off('sync' as any, onSync);
            client2?.off('sync' as any, onSync);
            resolve(void 0);
          }
        }
      };
      client1!.on('sync' as any, onSync);
      client2!.on('sync' as any, onSync);
    });

    console.log('✅ Both clients synced successfully');

    // Create room from User 1
    console.log('\n🏠 Creating room from User 1...');
    const roomResponse = await client1.createRoom({
      name: 'WYSPR Test Room',
      topic: 'Test room for Matrix connectivity',
      visibility: 'private' as any,
      preset: 'private_chat' as any,
    });
    
    roomId = roomResponse.room_id;
    console.log(`✅ Room created: ${roomId}`);

    // Invite User 2 to the room
    console.log(`\n📨 Inviting User 2 to room...`);
    await client1.invite(roomId, USER2.userId);
    console.log('✅ Invitation sent');

    // User 2 joins the room
    console.log('\n🚪 User 2 joining room...');
    await client2.joinRoom(roomId);
    console.log('✅ User 2 joined room');

    // Set up message listener for User 2
    console.log('\n👂 Setting up message listener for User 2...');
    const messagePromise = new Promise<void>((resolve) => {
      const onTimeline = (event: any, room: any) => {
        if (room?.roomId === roomId && 
            event.getType() === 'm.room.message' && 
            event.getSender() === USER1.userId) {
          
          const content = event.getContent();
          console.log('📨 User 2 received message:');
          console.log(`   From: ${event.getSender()}`);
          console.log(`   Content: "${content.body}"`);
          console.log(`   Timestamp: ${new Date(event.getTs()).toISOString()}`);
          
          client2?.off('Room.timeline' as any, onTimeline);
          resolve();
        }
      };
      client2?.on('Room.timeline' as any, onTimeline);
    });

    // Send message from User 1
    console.log('\n💬 Sending message from User 1...');
    const messageContent = {
      msgtype: 'm.text',
      body: 'Hello from WYSPR! This is a test message from User 32 to User 17.',
    };

    const sendResponse = await client1.sendEvent(roomId, 'm.room.message' as any, messageContent);
    console.log(`✅ Message sent with event ID: ${sendResponse.event_id}`);

    // Wait for User 2 to receive the message
    console.log('⏳ Waiting for User 2 to receive message...');
    await messagePromise;
    console.log('✅ Message received successfully!');

    // Test additional room info
    console.log('\n📊 Room Information:');
    const room1 = client1.getRoom(roomId);
    const room2 = client2.getRoom(roomId);
    
    if (room1) {
      console.log(`   Room name (User 1 view): ${room1.name}`);
      console.log(`   Member count (User 1 view): ${room1.getJoinedMemberCount()}`);
    }
    
    if (room2) {
      console.log(`   Room name (User 2 view): ${room2.name}`);
      console.log(`   Member count (User 2 view): ${room2.getJoinedMemberCount()}`);
    }

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Stack trace:', error.stack);
    }
    throw error;
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    
    if (client1) {
      try {
        client1.stopClient();
        console.log('✅ Client 1 stopped');
      } catch (e) {
        console.warn('⚠️ Error stopping client 1:', e);
      }
    }
    
    if (client2) {
      try {
        client2.stopClient();
        console.log('✅ Client 2 stopped');
      } catch (e) {
        console.warn('⚠️ Error stopping client 2:', e);
      }
    }
    
    console.log('🏁 Cleanup complete');
  }
} 
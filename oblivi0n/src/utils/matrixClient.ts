import * as MatrixSDK from 'matrix-js-sdk';
import * as SecureStore from 'expo-secure-store';
import { Message } from '../types';

const MATRIX_SESSIONS_KEY = 'oblivi0n_matrix_sessions';
const ROOM_METADATA_KEY = 'oblivi0n_room_metadata';

export interface LoginResult {
  success: boolean;
  error?: string;
}

export interface RoomMetadata {
  roomId: string;
  alias?: string;
  isAdmin: boolean;
}

export interface SessionData {
  userId: string;
  deviceId: string;
  accessToken: string;
  serverPin: string;
}

export class OblivionMatrixClient {
  private static instance: OblivionMatrixClient;
  private client: MatrixSDK.MatrixClient | null = null;
  private isTestMode = false;
  private testUserId: string | null = null;
  private testMessages: { [roomId: string]: Message[] } = {};

  private constructor() {}

  static getInstance(): OblivionMatrixClient {
    if (!OblivionMatrixClient.instance) {
      OblivionMatrixClient.instance = new OblivionMatrixClient();
    }
    return OblivionMatrixClient.instance;
  }

  // Initialize client with existing session
  async initializeClient(): Promise<boolean> {
    try {
      const sessionData = await this.loadSessionData();
      if (!sessionData) {
        console.log('[Matrix Client] No session data found');
        return false;
      }

      const baseUrl = `https://matrix.${sessionData.serverPin}.zero`;
      
      this.client = MatrixSDK.createClient({
        baseUrl,
        accessToken: sessionData.accessToken,
        userId: sessionData.userId,
        deviceId: sessionData.deviceId,
      });

      await this.client.startClient({ initialSyncLimit: 10 });
      console.log('[Matrix Client] Client initialized successfully');
      return true;
    } catch (error) {
      console.error('[Matrix Client] Failed to initialize:', error);
      return false;
    }
  }

  // Login with credentials
  async login(userId: string, pin: string): Promise<LoginResult> {
    try {
      // This should be constructed from the new login form fields
      // For now, parsing existing userId format
      const baseUrl = userId.includes('@') ? 
        `https://matrix.${userId.split(':')[1]}` : 
        'https://matrix.oblivi0n.zero';

      const tempClient = MatrixSDK.createClient({ baseUrl });
      
      const response = await tempClient.login('m.login.password', {
        user: userId,
        password: pin,
      });

      this.client = MatrixSDK.createClient({
        baseUrl,
        accessToken: response.access_token,
        userId: response.user_id,
        deviceId: response.device_id,
      });

      // Save session data
      const sessionData: SessionData = {
        userId: response.user_id,
        deviceId: response.device_id,
        accessToken: response.access_token,
        serverPin: '0000', // Default for existing sessions
      };
      
      await this.saveSessionData(sessionData);
      await this.client.startClient({ initialSyncLimit: 10 });
      
      // Store room metadata after successful login
      await this.updateRoomMetadata();

      console.log('[Matrix Client] Login successful');
      return { success: true };
    } catch (error) {
      console.error('[Matrix Client] Login failed:', error);
      return { success: false, error: 'Login failed' };
    }
  }

  // New login method with specific field format
  async loginWithPinFormat(serverPin: string, userIdNumber: string, accessPin: string): Promise<LoginResult> {
    try {
      const baseUrl = `https://matrix.${serverPin}.zero`;
      const userId = `@u${userIdNumber}:matrix.${serverPin}.zero`;

      const tempClient = MatrixSDK.createClient({ baseUrl });
      
      const response = await tempClient.login('m.login.password', {
        user: userId,
        password: accessPin,
      });

      this.client = MatrixSDK.createClient({
        baseUrl,
        accessToken: response.access_token,
        userId: response.user_id,
        deviceId: response.device_id,
      });

      // Save session data with serverPin
      const sessionData: SessionData = {
        userId: response.user_id,
        deviceId: response.device_id,
        accessToken: response.access_token,
        serverPin,
      };
      
      await this.saveSessionData(sessionData);
      await this.client.startClient({ initialSyncLimit: 10 });
      
      // Store room metadata after successful login
      await this.updateRoomMetadata();

      console.log('[Matrix Client] PIN format login successful');
      return { success: true };
    } catch (error) {
      console.error('[Matrix Client] PIN format login failed:', error);
      return { success: false, error: 'Login failed' };
    }
  }

  // Update and persist room metadata
  async updateRoomMetadata(): Promise<void> {
    if (!this.client) return;

    try {
      const rooms = this.client.getRooms();
      const roomMetadata: RoomMetadata[] = [];

      for (const room of rooms) {
        const currentUserId = this.client.getUserId();
        const member = room.getMember(currentUserId || '');
        const powerLevel = member?.powerLevel || 0;

        roomMetadata.push({
          roomId: room.roomId,
          alias: room.getCanonicalAlias() || undefined,
          isAdmin: powerLevel >= 50,
        });
      }

      await SecureStore.setItemAsync(ROOM_METADATA_KEY, JSON.stringify(roomMetadata));
      console.log('[Matrix Client] Room metadata updated');
    } catch (error) {
      console.error('[Matrix Client] Failed to update room metadata:', error);
    }
  }

  // Get stored room metadata
  async getRoomMetadata(): Promise<RoomMetadata[]> {
    try {
      const metadataJson = await SecureStore.getItemAsync(ROOM_METADATA_KEY);
      return metadataJson ? JSON.parse(metadataJson) : [];
    } catch (error) {
      console.error('[Matrix Client] Failed to load room metadata:', error);
      return [];
    }
  }

  // Save session data securely
  private async saveSessionData(sessionData: SessionData): Promise<void> {
    try {
      await SecureStore.setItemAsync(MATRIX_SESSIONS_KEY, JSON.stringify(sessionData));
    } catch (error) {
      console.error('[Matrix Client] Failed to save session:', error);
      throw error;
    }
  }

  // Load session data
  private async loadSessionData(): Promise<SessionData | null> {
    try {
      const sessionJson = await SecureStore.getItemAsync(MATRIX_SESSIONS_KEY);
      return sessionJson ? JSON.parse(sessionJson) : null;
    } catch (error) {
      console.error('[Matrix Client] Failed to load session:', error);
      return null;
    }
  }

  // Clear session data
  async clearSessionData(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(MATRIX_SESSIONS_KEY);
      await SecureStore.deleteItemAsync(ROOM_METADATA_KEY);
    } catch (error) {
      console.error('[Matrix Client] Failed to clear session:', error);
    }
  }

  // Test mode methods
  async enableTestMode(userId: string): Promise<void> {
    this.isTestMode = true;
    this.testUserId = userId;
    this.setupTestData();
    console.log('[Matrix Client] Test mode enabled');
  }

  disableTestMode(): void {
    this.isTestMode = false;
    this.testUserId = null;
    this.testMessages = {};
    console.log('[Matrix Client] Test mode disabled');
  }

  isInTestMode(): boolean {
    return this.isTestMode;
  }

  private setupTestData(): void {
    // Create some test messages for demo purposes
    this.testMessages = {
      'test-room-20': [
        {
          id: 'test-msg-1',
          roomId: 'test-room-20',
          senderId: '@u20:matrix.0000.zero',
          senderPin: '20',
          content: 'Hello! This is a test message...',
          timestamp: new Date(Date.now() - 5 * 60 * 1000),
          isEncrypted: true,
          isDecrypted: true,
        },
      ],
      'test-room-21': [],
      'test-room-22': [
        {
          id: 'test-msg-2',
          roomId: 'test-room-22',
          senderId: '@u22:matrix.0000.zero',
          senderPin: '22',
          content: 'Another test conversation',
          timestamp: new Date(Date.now() - 60 * 60 * 1000),
          isEncrypted: true,
          isDecrypted: true,
        },
      ],
    };
  }

  getTestMessages(roomId: string): Message[] {
    return this.testMessages[roomId] || [];
  }

  // Matrix client wrapper methods
  getClient(): MatrixSDK.MatrixClient | null {
    return this.client;
  }

  getRooms(): any[] {
    if (this.isTestMode) {
      return []; // Test mode doesn't use real rooms
    }
    return this.client?.getRooms() || [];
  }

  async getCurrentUserId(): Promise<string | null> {
    if (this.isTestMode) {
      return this.testUserId;
    }
    return this.client?.getUserId() || null;
  }

  async sendMessage(roomId: string, content: string): Promise<LoginResult> {
    if (this.isTestMode) {
      // Add message to test data
      const newMessage: Message = {
        id: `test-msg-${Date.now()}`,
        roomId,
        senderId: this.testUserId || '@test:matrix.local',
        senderPin: '32', // Current user PIN
        content,
        timestamp: new Date(),
        isEncrypted: true,
        isDecrypted: true,
      };
      
      if (!this.testMessages[roomId]) {
        this.testMessages[roomId] = [];
      }
      this.testMessages[roomId].push(newMessage);
      
      return { success: true };
    }

    try {
      if (!this.client) {
        return { success: false, error: 'Client not initialized' };
      }
      
      await this.client.sendEvent(roomId, 'm.room.message' as any, {
        msgtype: 'm.text',
        body: content,
      });
      
      return { success: true };
    } catch (error) {
      console.error('[Matrix Client] Send message failed:', error);
      return { success: false, error: 'Failed to send message' };
    }
  }

  async createDirectMessageRoom(userId: string): Promise<string> {
    if (this.isTestMode) {
      return `test-room-${Date.now()}`;
    }

    if (!this.client) {
      throw new Error('Client not initialized');
    }

    const response = await this.client.createRoom({
      is_direct: true,
      invite: [userId],
    });

    await this.updateRoomMetadata();
    return response.room_id;
  }

  async isUserGroupAdmin(roomId: string): Promise<boolean> {
    if (this.isTestMode) {
      return roomId.includes('GR'); // Groups in test mode
    }

    if (!this.client) return false;

    const room = this.client.getRoom(roomId);
    if (!room) return false;

    const currentUserId = this.client.getUserId();
    const member = room.getMember(currentUserId || '');
    return (member?.powerLevel || 0) >= 50;
  }

  async inviteToGroup(roomId: string, pin: string): Promise<LoginResult> {
    // This would need PIN to userId mapping
    return { success: false, error: 'Not implemented' };
  }

  async removeFromGroup(roomId: string, pin: string): Promise<LoginResult> {
    // This would need PIN to userId mapping
    return { success: false, error: 'Not implemented' };
  }

  async logout(): Promise<void> {
    try {
      if (this.client && !this.isTestMode) {
        await this.client.logout();
      }
      
      await this.clearSessionData();
      this.client = null;
      this.disableTestMode();
      
      console.log('[Matrix Client] Logout successful');
    } catch (error) {
      console.error('[Matrix Client] Logout error:', error);
      // Still clear local data
      await this.clearSessionData();
      this.client = null;
      this.disableTestMode();
    }
  }
} 
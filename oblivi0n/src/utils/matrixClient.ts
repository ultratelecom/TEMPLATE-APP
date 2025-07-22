import * as MatrixSDK from 'matrix-js-sdk';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';
import { Message } from '../types';

const MATRIX_SESSIONS_KEY = 'wyspr_matrix_sessions';
const ROOM_METADATA_KEY = 'wyspr_room_metadata';

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

export class WysprMatrixClient {
  private static instance: WysprMatrixClient;
  private client: MatrixSDK.MatrixClient | null = null;
  private isTestMode = false;
  private testUserId: string | null = null;
  private testMessages: { [roomId: string]: Message[] } = {};

  private constructor() {}

  static getInstance(): WysprMatrixClient {
    if (!WysprMatrixClient.instance) {
      WysprMatrixClient.instance = new WysprMatrixClient();
    }
    return WysprMatrixClient.instance;
  }

  // Initialize client with existing session
  async initializeClient(): Promise<boolean> {
    try {
      const sessionData = await this.loadSessionData();
      if (!sessionData) {
        console.log('[Matrix Client] No session data found');
        return false;
      }

      const baseUrl = `https://matrix.awadx.lat`;
      
      this.client = MatrixSDK.createClient({
        baseUrl,
        accessToken: sessionData.accessToken,
        userId: sessionData.userId,
        deviceId: sessionData.deviceId,
      });

      // Start the client without waiting for sync to complete
      await this.client.startClient({ initialSyncLimit: 10 });
      
      // Enhanced sync event listener with room debugging
      this.client.on('sync' as any, (state: string, prevState: string, data: any) => {
        console.log(`[Matrix Client] Sync state: ${state}`);
        
        if (state === 'PREPARED') {
          console.log(`[Matrix Client] Client fully synced and ready`);
          if (this.client) {
            const rooms = this.client.getRooms() || [];
            console.log(`[Matrix Client] After PREPARED sync: ${rooms.length} rooms available`);
            
            // Log room details
            const userId = this.client.getUserId();
            if (userId) {
              rooms.forEach((room, index) => {
                const member = room.getMember(userId);
                console.log(`[Matrix Client] Room ${index}: ${room.roomId}, membership=${member?.membership}, name=${room.name || 'Unnamed'}`);
              });
            }
          }
        } else if (state === 'SYNCING') {
          console.log(`[Matrix Client] Sync state: SYNCING`);
          // Check rooms again during syncing
          if (this.client) {
            const rooms = this.client.getRooms() || [];
            console.log(`[Matrix Client] During SYNCING: ${rooms.length} rooms available`);
          }
        } else if (state === 'ERROR') {
          console.error('[Matrix Client] Sync error detected:', data?.error);
          
          // Handle token expiration during sync
          if (data?.error?.errcode === 'M_UNKNOWN_TOKEN') {
            console.error('[Matrix Client] Token expired during sync, clearing session');
            this.handleTokenExpiration();
          }
        }
      });

      // Room events for debugging
      this.client.on("Room" as any, (room: any) => {
        console.log(`[Matrix Client] Room event: ${room.roomId} added`);
        this.updateRoomMetadata();
      });

      this.client.on("Room.timeline" as any, (event: any, room: any) => {
        if (event.getType() === "m.room.member") {
          console.log(`[Matrix Client] Membership event in room ${room.roomId}: ${event.getContent().membership}`);
        }
      });

      // Enhanced HTTP error handling
      this.client.on('httpError' as any, (error: any) => {
        console.log(`[Matrix Client] HTTP error detected:`, error);
        
        if (error?.httpStatus === 401) {
          console.log(`[Matrix Client] 401 error on ${error?.url || 'unknown endpoint'}: ${error?.message || 'No message'}`);
          
          // Don't immediately handle token expiration for capabilities endpoint
          // as it might be a transient issue
          if (!error?.url?.includes('/capabilities')) {
            console.error('[Matrix Client] 401 error on critical endpoint - token expired, triggering session cleanup');
            this.handleTokenExpiration();
          } else {
            console.warn('[Matrix Client] 401 error on capabilities endpoint - monitoring but not triggering logout');
          }
        } else if (error?.errcode === 'M_UNKNOWN_TOKEN') {
          console.error('[Matrix Client] M_UNKNOWN_TOKEN error - token expired, triggering session cleanup');
          this.handleTokenExpiration();
        } else if (error && error.toString().includes('Invalid access token')) {
          console.error('[Matrix Client] Invalid access token error, triggering session cleanup');
          this.handleTokenExpiration();
        } else if (error && error.toString().includes('Unable to refresh token')) {
          console.error('[Matrix Client] Token refresh failed, triggering session cleanup');
          this.handleTokenExpiration();
        }
      });

      // Generic error handler
      this.client.on("error" as any, (error: any) => {
        console.log(`[Matrix Client] Client error: ${error.message}`);
        
        // Check for token-related errors
        if (error.errcode === 'M_UNKNOWN_TOKEN' || 
            error.httpStatus === 401 || 
            error.message?.includes('Invalid access token') ||
            error.message?.includes('Unable to refresh token')) {
          console.log(`[Matrix Client] Token error detected during operation: ${error.message}`);
          this.handleTokenExpiration();
        }
      });
      
      console.log('[Matrix Client] Client initialized successfully (sync in progress)');
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
              const baseUrl = 'https://matrix.awadx.lat';

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
    } catch (error: any) {
      console.error('[Matrix Client] Login failed:', error);
      
      // Handle specific Matrix errors
      if (error.errcode === 'M_LIMIT_EXCEEDED' || error.httpStatus === 429) {
        return { 
          success: false, 
          error: 'Too many login attempts. Please wait a few minutes before trying again.' 
        };
      }
      
      if (error.errcode === 'M_FORBIDDEN' || error.httpStatus === 403) {
        return { 
          success: false, 
          error: 'Invalid credentials. Please check your PIN and try again.' 
        };
      }
      
      if (error.errcode === 'M_UNKNOWN_TOKEN' || error.httpStatus === 401) {
        return { 
          success: false, 
          error: 'Authentication failed. Please check your credentials.' 
        };
      }
      
      // Network or server errors
      if (!error.httpStatus || error.httpStatus >= 500) {
        return { 
          success: false, 
          error: 'Server connection failed. Please check your internet connection.' 
        };
      }
      
      // Generic fallback
      return { 
        success: false, 
        error: error.message || 'Login failed. Please try again.' 
      };
    }
  }

  // New login method with flexible username
  async loginWithUsername(username: string, password: string): Promise<LoginResult> {
    try {
      const baseUrl = `https://matrix.awadx.lat`;
      const userId = `@${username}:matrix.awadx.lat`; // Full user ID for client creation

      const tempClient = MatrixSDK.createClient({ baseUrl });
      
      const response = await tempClient.login('m.login.password', {
        user: username, // Use the username directly
        password: password,
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
        serverPin: 'awadx', // Use domain identifier
      };
      
      await this.saveSessionData(sessionData);
      await this.client.startClient({ initialSyncLimit: 10 });
      
      // Store room metadata after successful login
      await this.updateRoomMetadata();

      console.log('[Matrix Client] Username login successful');
      return { success: true };
    } catch (error: any) {
      console.error('[Matrix Client] Username login failed:', error);
      
      // Handle specific Matrix errors
      if (error.errcode === 'M_LIMIT_EXCEEDED' || error.httpStatus === 429) {
        return { 
          success: false, 
          error: 'Too many login attempts. Please wait a few minutes before trying again.' 
        };
      }
      
      if (error.errcode === 'M_FORBIDDEN' || error.httpStatus === 403) {
        return { 
          success: false, 
          error: 'Invalid username or password. Please check your credentials.' 
        };
      }
      
      if (error.errcode === 'M_UNKNOWN_TOKEN' || error.httpStatus === 401) {
        return { 
          success: false, 
          error: 'Authentication failed. Please check your credentials.' 
        };
      }
      
      // Network or server errors
      if (!error.httpStatus || error.httpStatus >= 500) {
        return { 
          success: false, 
          error: 'Server connection failed. Please check your internet connection.' 
        };
      }
      
      // Generic fallback
      return { 
        success: false, 
        error: error.message || 'Login failed. Please try again.' 
      };
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

  isClientReady(): boolean {
    if (this.isTestMode) {
      return true;
    }
    // Consider client ready if it exists and is syncing or prepared
    if (!this.client) {
      return false;
    }
    const syncState = this.client.getSyncState();
    return syncState === 'SYNCING' || syncState === 'PREPARED';
  }

  async hasValidSession(): Promise<boolean> {
    try {
      console.log('[Matrix Client] hasValidSession: Loading session data...');
      const sessionData = await this.loadSessionData();
      console.log(`[Matrix Client] hasValidSession: Session data loaded, hasToken: ${!!sessionData?.accessToken}`);
      return !!sessionData?.accessToken;
    } catch (error) {
      console.error('[Matrix Client] hasValidSession: Error loading session:', error);
      return false;
    }
  }

  async waitForClientReady(timeoutMs: number = 10000): Promise<boolean> {
    if (this.isTestMode) {
      return true;
    }

    console.log(`[Matrix Client] Waiting for client readiness (timeout: ${timeoutMs}ms)`);

    // Quick check if client is null (possibly due to token expiration)
    if (!this.client) {
      console.warn('[Matrix Client] Client is null, cannot wait for readiness');
      return false;
    }

    return new Promise((resolve) => {
      const startTime = Date.now();
      const timeout = setTimeout(() => {
        const elapsed = Date.now() - startTime;
        console.warn(`[Matrix Client] Wait timeout after ${elapsed}ms, client exists: ${!!this.client}, user ID: ${this.client?.getUserId()}`);
        
        // If client became null during wait, it likely expired
        if (!this.client) {
          console.warn('[Matrix Client] Client became null during wait - possible token expiration');
          resolve(false);
        } else {
          resolve(!!this.client); // Return true if client exists, even if not fully synced
        }
      }, timeoutMs);

      const checkReady = () => {
        // Check if client became null (token expiration)
        if (!this.client) {
          console.warn('[Matrix Client] Client became null during readiness check');
          clearTimeout(timeout);
          resolve(false);
          return;
        }
        
        if (this.client && this.client.getUserId()) {
          const elapsed = Date.now() - startTime;
          console.log(`[Matrix Client] Client ready after ${elapsed}ms, user ID: ${this.client.getUserId()}`);
          clearTimeout(timeout);
          resolve(true);
        } else {
          setTimeout(checkReady, 100);
        }
      };

      checkReady();
    });
  }

  getRooms(): any[] {
    if (this.isTestMode) {
      return []; // Test mode doesn't use real rooms
    }
    
    if (!this.client) {
      console.log(`[Matrix Client] getRooms called but no client available`);
      return [];
    }
    
    // Check client state
    const clientState = this.client.getSyncState();
    const userId = this.client.getUserId();
    console.log(`[Matrix Client] getRooms called - clientState: ${clientState}, userId: ${userId}`);
    
    // Validate token before getting rooms
    const accessToken = this.client.getAccessToken();
    if (!accessToken) {
      console.log(`[Matrix Client] No access token available when getting rooms`);
      return [];
    }
    
    // Return rooms where the user is joined OR invited (exclude left/rejected rooms)
    const allRooms = this.client.getRooms() || [];
    const currentUserId = this.client.getUserId();
    
    console.log(`[Matrix Client] Processing ${allRooms.length} total rooms for user ${currentUserId}`);
    
    // Add detailed room logging
    allRooms.forEach((room, index) => {
      const member = room.getMember(currentUserId || '');
      console.log(`[Matrix Client] Room ${index}: ${room.roomId}, membership: ${member?.membership}, name: ${room.name || 'Unnamed'}`);
    });
    
    const accessibleRooms = allRooms.filter(room => {
      const member = room.getMember(currentUserId || '');
      const membership = member?.membership;
      
      console.log(`[Matrix Client] Room ${room.roomId} membership: ${membership}`);
      
      // Only include rooms where user is joined or invited (exclude 'leave', 'ban', etc.)
      const shouldInclude = member && (membership === 'join' || membership === 'invite');
      
      if (!shouldInclude) {
        console.log(`[Matrix Client] Excluding room ${room.roomId} with membership: ${membership}`);
      }
      
      return shouldInclude;
    });
    
    const joinedCount = accessibleRooms.filter(room => {
      const member = room.getMember(currentUserId || '');
      return member?.membership === 'join';
    }).length;
    
    const invitedCount = accessibleRooms.length - joinedCount;
    
    console.log(`[Matrix Client] Final result: ${joinedCount} joined, ${invitedCount} invited rooms (${accessibleRooms.length} total accessible)`);
    return accessibleRooms;
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
    } catch (error: any) {
      console.error('[Matrix Client] Send message failed:', error);
      
      // If user is not in room, try to rejoin
      if (error.errcode === 'M_FORBIDDEN' && error.message?.includes('not in room')) {
        console.log('[Matrix Client] User not in room, attempting to rejoin...');
        if (!this.client) {
          return { success: false, error: 'Client not initialized' };
        }
        
        try {
          await this.client.joinRoom(roomId);
          console.log('[Matrix Client] Successfully rejoined room, retrying message send...');
          
          // Retry sending the message
          await this.client.sendEvent(roomId, 'm.room.message' as any, {
            msgtype: 'm.text',
            body: content,
          });
          
          return { success: true };
        } catch (rejoinError: any) {
          console.error('[Matrix Client] Failed to rejoin room:', rejoinError);
          return { success: false, error: 'Could not join room. You may not have permission or the room may not exist.' };
        }
      }
      
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

  async createGroupRoom(groupName: string, participantUsernames: string[]): Promise<{success: boolean; roomId?: string; error?: string}> {
    try {
      if (this.isTestMode) {
        return { 
          success: true, 
          roomId: `test-group-${Date.now()}`,
        };
      }

      if (!this.client) {
        return { success: false, error: 'Client not initialized' };
      }

      // Convert usernames to Matrix user IDs
      const participantUserIds = participantUsernames.map(username => 
        `@${username}:matrix.awadx.lat`
      );

      console.log(`[Matrix Client] Creating group "${groupName}" with participants:`, participantUserIds);

      // Create the group room
      const response = await this.client.createRoom({
        name: groupName,
        topic: `Group chat: ${groupName}`,
        visibility: 'private' as any,
        preset: 'private_chat' as any,
        is_direct: false,
        invite: participantUserIds,
        initial_state: [
          {
            type: 'm.room.history_visibility',
            content: {
              history_visibility: 'shared'
            }
          }
        ]
      });

      // Explicitly join the room to ensure creator is a member
      try {
        await this.client.joinRoom(response.room_id);
        console.log(`[Matrix Client] Creator joined room: ${response.room_id}`);
      } catch (joinError: any) {
        console.log(`[Matrix Client] Creator already in room or join failed (this might be normal):`, joinError.message);
      }

      await this.updateRoomMetadata();
      
      console.log(`[Matrix Client] Group room created successfully: ${response.room_id}`);
      return { 
        success: true, 
        roomId: response.room_id,
      };

    } catch (error: any) {
      console.error('[Matrix Client] Failed to create group room:', error);
      
      // Handle specific Matrix errors
      if (error.errcode === 'M_FORBIDDEN' || error.httpStatus === 403) {
        return { 
          success: false, 
          error: 'One or more users could not be invited. They may not exist on this server.' 
        };
      }
      
      if (error.errcode === 'M_LIMIT_EXCEEDED' || error.httpStatus === 429) {
        return { 
          success: false, 
          error: 'Too many requests. Please wait a moment before creating another group.' 
        };
      }
      
      return { 
        success: false, 
        error: error.message || 'Failed to create group room' 
      };
    }
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

  async inviteToGroup(roomId: string, username: string): Promise<LoginResult> {
    try {
      if (this.isTestMode) {
        return { success: true };
      }

      if (!this.client) {
        return { success: false, error: 'Client not initialized' };
      }

      const userId = `@${username}:matrix.awadx.lat`;
      await this.client.invite(roomId, userId);
      
      console.log(`[Matrix Client] User ${username} invited to group ${roomId}`);
      return { success: true };
    } catch (error: any) {
      console.error('[Matrix Client] Failed to invite user to group:', error);
      
      if (error.errcode === 'M_FORBIDDEN' || error.httpStatus === 403) {
        return { success: false, error: `User ${username} could not be invited. They may not exist on this server.` };
      }
      
      return { success: false, error: error.message || 'Failed to invite user' };
    }
  }

  async removeFromGroup(roomId: string, username: string): Promise<LoginResult> {
    try {
      if (this.isTestMode) {
        return { success: true };
      }

      if (!this.client) {
        return { success: false, error: 'Client not initialized' };
      }

      const userId = `@${username}:matrix.awadx.lat`;
      await this.client.kick(roomId, userId);
      
      console.log(`[Matrix Client] User ${username} removed from group ${roomId}`);
      return { success: true };
    } catch (error: any) {
      console.error('[Matrix Client] Failed to remove user from group:', error);
      
      if (error.errcode === 'M_FORBIDDEN' || error.httpStatus === 403) {
        return { success: false, error: 'You do not have permission to remove users from this group.' };
      }
      
      return { success: false, error: error.message || 'Failed to remove user' };
    }
  }

  async acceptRoomInvitation(roomId: string): Promise<LoginResult> {
    try {
      if (this.isTestMode) {
        return { success: true };
      }

      if (!this.client) {
        return { success: false, error: 'Client not initialized' };
      }

      console.log(`[Matrix Client] Accepting invitation for room: ${roomId}`);
      await this.client.joinRoom(roomId);
      
      // Wait a moment for the join to be processed
      await new Promise(resolve => setTimeout(resolve, 200));
      
      await this.updateRoomMetadata();
      
      console.log(`[Matrix Client] Successfully joined room: ${roomId}`);
      return { success: true };
    } catch (error: any) {
      console.error('[Matrix Client] Failed to accept invitation:', error);
      
      if (error.errcode === 'M_FORBIDDEN' || error.httpStatus === 403) {
        return { success: false, error: 'You do not have permission to join this room.' };
      }
      
      return { success: false, error: error.message || 'Failed to join room' };
    }
  }

  async rejectRoomInvitation(roomId: string): Promise<LoginResult> {
    try {
      if (this.isTestMode) {
        return { success: true };
      }

      if (!this.client) {
        return { success: false, error: 'Client not initialized' };
      }

      console.log(`[Matrix Client] Rejecting invitation for room: ${roomId}`);
      
      // Check current membership before rejecting
      const room = this.client.getRoom(roomId);
      const currentUserId = this.client.getUserId();
      const member = room?.getMember(currentUserId || '');
      console.log(`[Matrix Client] Current membership before rejection: ${member?.membership}`);
      
      await this.client.leave(roomId);
      
      // Matrix will handle the sync automatically, no need to poll
      console.log(`[Matrix Client] Leave request sent for room: ${roomId}`);
      
      await this.updateRoomMetadata();
      
      console.log(`[Matrix Client] Successfully rejected invitation: ${roomId}`);
      return { success: true };
    } catch (error: any) {
      console.error('[Matrix Client] Failed to reject invitation:', error);
      return { success: false, error: error.message || 'Failed to reject invitation' };
    }
  }

  isRoomInvite(roomId: string): boolean {
    if (this.isTestMode) {
      return false;
    }

    if (!this.client) {
      return false;
    }

    const room = this.client.getRoom(roomId);
    if (!room) {
      console.log(`[Matrix Client] isRoomInvite: Room ${roomId} not found`);
      return false;
    }

    const currentUserId = this.client.getUserId();
    const member = room.getMember(currentUserId || '');
    const membership = member?.membership;
    const isInvite = membership === 'invite';
    
    console.log(`[Matrix Client] isRoomInvite: Room ${roomId} membership=${membership}, isInvite=${isInvite}`);
    return isInvite;
  }

  async leaveRoom(roomId: string): Promise<LoginResult> {
    try {
      if (this.isTestMode) {
        return { success: true };
      }

      if (!this.client) {
        return { success: false, error: 'Client not initialized' };
      }

      console.log(`[Matrix Client] Attempting to leave room: ${roomId}`);
      await this.client.leave(roomId);
      
      // Wait a moment for the leave to be processed
      await new Promise(resolve => setTimeout(resolve, 200));
      
      await this.updateRoomMetadata();
      
      console.log(`[Matrix Client] Successfully left room: ${roomId}`);
      return { success: true };
    } catch (error: any) {
      console.error('[Matrix Client] Failed to leave room:', error);
      
      if (error.errcode === 'M_FORBIDDEN' || error.httpStatus === 403) {
        return { success: false, error: 'You do not have permission to leave this room.' };
      }
      
      return { success: false, error: error.message || 'Failed to leave room' };
    }
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

  private async handleTokenExpiration(): Promise<void> {
    try {
      console.log('[Matrix Client] Handling token expiration');
      
      // Stop the client immediately to prevent further sync attempts
      if (this.client) {
        console.log('[Matrix Client] Stopping Matrix client');
        this.client.stopClient();
        this.client = null;
      }
      
      // Clear all session data
      console.log('[Matrix Client] Clearing session data');
      await this.clearSessionData();
      this.disableTestMode();
      
      console.log('[Matrix Client] Session fully cleared due to token expiration');
      
      // Force a complete logout by restarting the app
      Alert.alert(
        'Session Expired',
        'Your login session has expired. The app will close so you can log in again.',
        [
          {
            text: 'Close App',
            onPress: () => {
              console.log('[Matrix Client] Forcing app restart for fresh login');
              // On React Native, we can't truly restart the app, but we can simulate it
              // by clearing everything and showing the splash screen again
              this.forceAppRestart();
            }
          }
        ],
        { cancelable: false } // Prevent dismissing without action
      );
      
    } catch (error) {
      console.error('[Matrix Client] Error handling token expiration:', error);
      // Even if there's an error, still try to clear the client
      this.client = null;
    }
  }

  private forceAppRestart(): void {
    try {
      // Clear the instance to force complete reinitialization
      WysprMatrixClient.instance = new WysprMatrixClient();
      console.log('[Matrix Client] Forced instance reset for fresh start');
    } catch (error) {
      console.error('[Matrix Client] Error during forced restart:', error);
    }
  }

  // Helper method to get room member count
  getRoomMemberCount(roomId: string): number {
    if (this.isTestMode) {
      // Return test data based on room type
      if (roomId.includes('group') || roomId.includes('GR')) {
        return 3; // Test groups have 3 members
      }
      return 2; // Test DMs have 2 members
    }

    if (!this.client) {
      return 0;
    }

    const room = this.client.getRoom(roomId);
    return room ? room.getJoinedMemberCount() : 0;
  }

  // Helper method to check if room is a group
  isGroupRoom(roomId: string): boolean {
    if (this.isTestMode) {
      return roomId.includes('group') || roomId.includes('GR');
    }

    if (!this.client) {
      return false;
    }

    const room = this.client.getRoom(roomId);
    if (!room) {
      return false;
    }

    // Simple logic: if room has a name, it's probably a group
    // If it doesn't have a name, it's probably a DM
    const hasName = room.name && room.name.trim().length > 0;
    const memberCount = room.getJoinedMemberCount();
    
    // Consider it a group if:
    // 1. It has a name (groups are usually named), OR
    // 2. It has more than 2 members
    const isGroup = hasName || memberCount > 2;
    
    return isGroup;
  }

  async debugRoomAvailability(delayMs: number = 0): Promise<void> {
    if (this.isTestMode || !this.client) {
      return;
    }

    if (delayMs > 0) {
      console.log(`[Matrix Client] Waiting ${delayMs}ms before checking rooms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    const syncState = this.client.getSyncState();
    const userId = this.client.getUserId();
    const accessToken = this.client.getAccessToken();
    const rooms = this.client.getRooms() || [];

    console.log(`[Matrix Client] Room debug - syncState: ${syncState}, userId: ${userId}, hasToken: ${!!accessToken}, roomCount: ${rooms.length}`);

    if (rooms.length > 0) {
      rooms.forEach((room, index) => {
        const member = room.getMember(userId || '');
        const membership = member?.membership;
        const roomName = room.name || room.getCanonicalAlias() || 'Unnamed';
        console.log(`[Matrix Client] Debug Room ${index}: ${room.roomId}, membership: ${membership}, name: ${roomName}`);
      });
    } else {
      console.log(`[Matrix Client] No rooms found - sync may still be in progress or user has no rooms`);
    }
  }
} 
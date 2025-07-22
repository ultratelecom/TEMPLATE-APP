import AsyncStorage from '@react-native-async-storage/async-storage';
import { WysprMatrixClient } from './matrixClient';
import { PinMappingService } from './pinMapping';

const CONTACT_REQUESTS_KEY = 'wyspr_contact_requests';
const PIN_REGISTRY_KEY = 'wyspr_pin_registry';

export interface ContactRequest {
  id: string;
  fromPin: string;
  fromUserId: string;
  toPin: string;
  timestamp: number;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
}

// New interface for username-based contact requests
export interface UsernameContactRequest {
  id: string;
  fromUsername: string;
  fromUserId: string;
  toUsername: string;
  toUserId: string;
  timestamp: number;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
}

export interface PinRegistryEntry {
  pin: string;
  matrixUserId: string;
  timestamp: number;
}

export class ContactRequestService {
  private static instance: ContactRequestService;
  
  private constructor() {}
  
  static getInstance(): ContactRequestService {
    if (!ContactRequestService.instance) {
      ContactRequestService.instance = new ContactRequestService();
    }
    return ContactRequestService.instance;
  }

  // NEW: Check if a username is already in contacts
  async checkIfContactExists(username: string): Promise<boolean> {
    try {
      const matrixClient = WysprMatrixClient.getInstance();
      const rooms = matrixClient.getRooms();
      
      // Check if we have any direct message rooms with this user
      const targetUserId = `@${username}:matrix.awadx.lat`;
      
      for (const room of rooms) {
        try {
          // Safely get room members
          const members = room.getJoinedMembers ? room.getJoinedMembers() : [];
          const hasTargetUser = members.some((member: any) => 
            member.userId === targetUserId || member.user_id === targetUserId
          );
          if (hasTargetUser) {
            console.log(`[WYSPR Contacts] User ${username} already exists in contacts`);
            return true;
          }
        } catch (roomError) {
          // Skip this room if we can't get its members
          console.debug(`[WYSPR Contacts] Could not check members for room ${room.roomId}`);
          continue;
        }
      }
      
      return false;
    } catch (error) {
      console.error('[WYSPR Contacts] Failed to check if contact exists:', error);
      return false;
    }
  }

  // NEW: Send contact request by username
  async sendContactRequestByUsername(fromUsername: string, toUsername: string, message?: string): Promise<boolean> {
    try {
      console.log(`[WYSPR Contacts] Sending contact request from ${fromUsername} to ${toUsername}`);
      
      const matrixClient = WysprMatrixClient.getInstance();
      const currentUserId = await matrixClient.getCurrentUserId();
      
      if (!currentUserId) {
        console.error('[WYSPR Contacts] No current user ID');
        return false;
      }
      
      // Construct target user ID
      const targetUserId = `@${toUsername}:matrix.awadx.lat`;
      
      // Create contact request
      const request: UsernameContactRequest = {
        id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fromUsername,
        fromUserId: currentUserId,
        toUsername,
        toUserId: targetUserId,
        timestamp: Date.now(),
        status: 'pending',
        message
      };
      
      // Send request via Matrix (special contact request message)
      const requestMessage = {
        msgtype: 'org.wyspr.contact_request',
        body: `Contact request from ${fromUsername}`,
        fromUsername,
        toUsername,
        requestId: request.id,
        message: message || 'Would like to add you as a contact'
      };
      
      try {
        const roomId = await matrixClient.createDirectMessageRoom(targetUserId);
        if (!roomId) {
          console.error('[WYSPR Contacts] Failed to create DM room');
          return false;
        }
        
        const result = await matrixClient.sendMessage(roomId, JSON.stringify(requestMessage));
        
        if (result.success) {
          // Store the request locally
          await this.saveUsernameContactRequest(request);
          console.log(`[WYSPR Contacts] Contact request sent successfully to ${toUsername}`);
          return true;
        } else {
          console.error('[WYSPR Contacts] Failed to send contact request message:', result.error);
          return false;
        }
      } catch (matrixError: any) {
        // Check if it's a user not found error (M_FORBIDDEN or similar)
        if (matrixError.httpStatus === 403 || matrixError.errcode === 'M_FORBIDDEN') {
          console.error(`[WYSPR Contacts] User ${toUsername} not found on server`);
          return false;
        }
        throw matrixError;
      }
      
    } catch (error) {
      console.error('[WYSPR Contacts] Failed to send contact request:', error);
      return false;
    }
  }

  // Save username-based contact request
  private async saveUsernameContactRequest(request: UsernameContactRequest): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('wyspr_username_contact_requests');
      const requests: UsernameContactRequest[] = stored ? JSON.parse(stored) : [];
      requests.push(request);
      await AsyncStorage.setItem('wyspr_username_contact_requests', JSON.stringify(requests));
    } catch (error) {
      console.error('[WYSPR Contacts] Failed to save username contact request:', error);
    }
  }

  // Get all username-based contact requests
  private async getAllUsernameContactRequests(): Promise<UsernameContactRequest[]> {
    try {
      const stored = await AsyncStorage.getItem('wyspr_username_contact_requests');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('[WYSPR Contacts] Failed to get all username contact requests:', error);
      return [];
    }
  }

  // Save all username-based contact requests
  private async saveAllUsernameContactRequests(requests: UsernameContactRequest[]): Promise<void> {
    try {
      await AsyncStorage.setItem('wyspr_username_contact_requests', JSON.stringify(requests));
    } catch (error) {
      console.error('[WYSPR Contacts] Failed to save all username contact requests:', error);
    }
  }

  // Register current user's PIN for discovery
  async registerMyPin(pin: string, matrixUserId: string): Promise<boolean> {
    try {
      const registry = await this.getPinRegistry();
      registry[pin] = {
        pin,
        matrixUserId,
        timestamp: Date.now()
      };
      
      await AsyncStorage.setItem(PIN_REGISTRY_KEY, JSON.stringify(registry));
      console.log(`[WYSPR Contacts] Registered PIN ${pin} for ${matrixUserId}`);
      return true;
    } catch (error) {
      console.error('[WYSPR Contacts] Failed to register PIN:', error);
      return false;
    }
  }
  
  // Get PIN registry (for demo, this would be a shared service)
  private async getPinRegistry(): Promise<{ [pin: string]: PinRegistryEntry }> {
    try {
      const stored = await AsyncStorage.getItem(PIN_REGISTRY_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('[WYSPR Contacts] Failed to get PIN registry:', error);
      return {};
    }
  }
  
  // Lookup Matrix User ID by PIN
  async lookupMatrixUserByPin(pin: string): Promise<string | null> {
    try {
      const registry = await this.getPinRegistry();
      const entry = registry[pin];
      
      if (entry) {
        console.log(`[WYSPR Contacts] Found Matrix User ID for PIN ${pin}: ${entry.matrixUserId}`);
        return entry.matrixUserId;
      }
      
      // For demo purposes, create mock entries for testing
      const mockRegistry: { [pin: string]: string } = {
        '10': '@u32:matrix.awadx.lat',
        '11': '@u32:matrix.awadx.lat',
      };
      
      if (mockRegistry[pin]) {
        console.log(`[WYSPR Contacts] Found mock Matrix User ID for PIN ${pin}: ${mockRegistry[pin]}`);
        return mockRegistry[pin];
      }
      
      console.warn(`[WYSPR Contacts] No Matrix User ID found for PIN ${pin}`);
      return null;
    } catch (error) {
      console.error('[WYSPR Contacts] Failed to lookup PIN:', error);
      return null;
    }
  }
  
  // Send contact request to a PIN
  async sendContactRequest(fromPin: string, toPin: string, message?: string): Promise<boolean> {
    try {
      console.log(`[WYSPR Contacts] Sending contact request from PIN ${fromPin} to PIN ${toPin}`);
      
      // Lookup target user's Matrix ID
      const targetUserId = await this.lookupMatrixUserByPin(toPin);
      if (!targetUserId) {
        console.error(`[WYSPR Contacts] PIN ${toPin} not found`);
        return false;
      }
      
      // Get current user info
      const matrixClient = WysprMatrixClient.getInstance();
      const currentUserId = await matrixClient.getCurrentUserId();
      
      if (!currentUserId) {
        console.error('[WYSPR Contacts] No current user ID');
        return false;
      }
      
      // Create contact request
      const request: ContactRequest = {
        id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fromPin,
        fromUserId: currentUserId,
        toPin,
        timestamp: Date.now(),
        status: 'pending',
        message
      };
      
      // Send request via Matrix (special contact request message)
      const requestMessage = {
        msgtype: 'org.wyspr.contact_request',
        body: `Contact request from PIN ${fromPin}`,
        fromPin,
        toPin,
        requestId: request.id,
        message: message || 'Would like to add you as a contact'
      };
      
      const roomId = await matrixClient.createDirectMessageRoom(targetUserId);
      if (!roomId) {
        console.error('[WYSPR Contacts] Failed to create DM room');
        return false;
      }
      
      const result = await matrixClient.sendMessage(roomId, JSON.stringify(requestMessage));
      
      if (result.success) {
        // Save request locally
        await this.saveContactRequest(request);
        console.log(`[WYSPR Contacts] Contact request sent successfully`);
        return true;
      } else {
        console.error('[WYSPR Contacts] Failed to send contact request message');
        return false;
      }
      
    } catch (error) {
      console.error('[WYSPR Contacts] Failed to send contact request:', error);
      return false;
    }
  }
  
  // Get pending contact requests for current user
  async getPendingRequests(): Promise<ContactRequest[]> {
    try {
      // First try to get username-based requests
      const usernameRequests = await this.getPendingUsernameRequests();
      if (usernameRequests.length > 0) {
        // Convert username requests to old format for compatibility
        return usernameRequests.map(req => ({
          id: req.id,
          fromPin: req.fromUsername, // Use username as "pin" for display
          fromUserId: req.fromUserId,
          toPin: req.toUsername,
          timestamp: req.timestamp,
          status: req.status,
          message: req.message
        }));
      }

      // Fallback to old PIN-based requests (for backwards compatibility)
      const stored = await AsyncStorage.getItem(CONTACT_REQUESTS_KEY);
      const requests: ContactRequest[] = stored ? JSON.parse(stored) : [];
      
      // Get current user to filter requests properly
      const matrixClient = WysprMatrixClient.getInstance();
      const currentUserId = await matrixClient.getCurrentUserId();
      
      if (!currentUserId) {
        console.warn('[WYSPR Contacts] No current user ID found');
        return [];
      }
      
      // Extract current username from Matrix ID (@username:domain)
      const currentUsername = currentUserId.split(':')[0].substring(1); // Remove @ symbol
      
      // Filter requests: only show requests TO the current user that are pending
      const filteredRequests = requests.filter(req => 
        req.status === 'pending' && req.toPin === currentUsername
      );
      
      console.log(`[WYSPR Contacts] Found ${filteredRequests.length} pending requests for user ${currentUsername}`);
      return filteredRequests;
    } catch (error) {
      console.error('[WYSPR Contacts] Failed to get pending requests:', error);
      return [];
    }
  }

  // Get pending username-based contact requests
  async getPendingUsernameRequests(): Promise<UsernameContactRequest[]> {
    try {
      const stored = await AsyncStorage.getItem('wyspr_username_contact_requests');
      const requests: UsernameContactRequest[] = stored ? JSON.parse(stored) : [];
      
      // Get current user to filter requests properly
      const matrixClient = WysprMatrixClient.getInstance();
      const currentUserId = await matrixClient.getCurrentUserId();
      
      if (!currentUserId) {
        console.warn('[WYSPR Contacts] No current user ID found');
        return [];
      }
      
      // Extract current username from Matrix ID (@username:domain)
      const currentUsername = currentUserId.split(':')[0].substring(1); // Remove @ symbol
      
      // Filter requests: only show requests TO the current user that are pending
      const filteredRequests = requests.filter(req => 
        req.status === 'pending' && req.toUsername === currentUsername
      );
      
      console.log(`[WYSPR Contacts] Found ${filteredRequests.length} pending username requests for ${currentUsername}`);
      return filteredRequests;
    } catch (error) {
      console.error('[WYSPR Contacts] Failed to get pending username requests:', error);
      return [];
    }
  }
  
  // Accept contact request
  async acceptContactRequest(requestId: string): Promise<boolean> {
    try {
      console.log(`[WYSPR Contacts] Accepting contact request ${requestId}`);
      
      // First try to find in username-based requests
      const usernameRequests = await this.getAllUsernameContactRequests();
      const usernameRequest = usernameRequests.find((req: UsernameContactRequest) => req.id === requestId);
      
      if (usernameRequest) {
        // Handle username-based request
        console.log(`[WYSPR Contacts] Found username-based request: ${usernameRequest.fromUsername} -> ${usernameRequest.toUsername}`);
        
        // Update request status
        usernameRequest.status = 'accepted';
        await this.saveAllUsernameContactRequests(usernameRequests);
        
        // Send acceptance message via existing room (room was created when request was sent)
        const matrixClient = WysprMatrixClient.getInstance();
        const rooms = matrixClient.getRooms();
        
        // Find the room with the requesting user
        let roomId: string | null = null;
        for (const room of rooms) {
          try {
            const members = room.getJoinedMembers ? room.getJoinedMembers() : [];
            const hasRequestingUser = members.some((member: any) => 
              member.userId === usernameRequest.fromUserId || member.user_id === usernameRequest.fromUserId
            );
            if (hasRequestingUser) {
              roomId = room.roomId;
              break;
            }
          } catch (roomError) {
            continue;
          }
        }
        
        if (roomId) {
          const acceptanceMessage = {
            msgtype: 'org.wyspr.contact_accepted',
            body: `${usernameRequest.toUsername} accepted your contact request`,
            requestId,
            fromUsername: usernameRequest.toUsername,
            toUsername: usernameRequest.fromUsername
          };
          
          const result = await matrixClient.sendMessage(roomId, JSON.stringify(acceptanceMessage));
          if (result.success) {
            console.log(`[WYSPR Contacts] Username-based contact request accepted and notification sent`);
            return true;
          } else {
            console.error('[WYSPR Contacts] Failed to send acceptance notification:', result.error);
            return true; // Still consider it successful since the request was marked as accepted
          }
        } else {
          console.warn('[WYSPR Contacts] Could not find room for acceptance notification');
          return true; // Still successful, just no notification
        }
      }
      
      // Fallback to PIN-based requests (for backwards compatibility)
      const requests = await this.getAllContactRequests();
      const request = requests.find(req => req.id === requestId);
      
      if (!request) {
        console.error('[WYSPR Contacts] Request not found in either storage system');
        return false;
      }
      
      // Handle PIN-based request (legacy)
      request.status = 'accepted';
      await this.saveAllContactRequests(requests);
      
      // Add both users to each other's contact lists
      const pinService = PinMappingService.getInstance();
      await pinService.addMapping(request.fromPin, request.fromUserId);
      
      // Send acceptance message
      const matrixClient = WysprMatrixClient.getInstance();
      const roomId = await matrixClient.createDirectMessageRoom(request.fromUserId);
      
      if (roomId) {
        const acceptanceMessage = {
          msgtype: 'org.wyspr.contact_accepted',
          body: `${request.toPin} accepted your contact request`,
          requestId,
          fromPin: request.toPin,
          toPin: request.fromPin
        };
        
        await matrixClient.sendMessage(roomId, JSON.stringify(acceptanceMessage));
      }
      
      console.log(`[WYSPR Contacts] PIN-based contact request accepted and contacts added`);
      return true;
      
    } catch (error) {
      console.error('[WYSPR Contacts] Failed to accept contact request:', error);
      return false;
    }
  }
  
  // Reject contact request
  async rejectContactRequest(requestId: string): Promise<boolean> {
    try {
      console.log(`[WYSPR Contacts] Rejecting contact request ${requestId}`);
      
      const requests = await this.getAllContactRequests();
      const request = requests.find(req => req.id === requestId);
      
      if (!request) {
        console.error('[WYSPR Contacts] Request not found');
        return false;
      }
      
      // Update request status
      request.status = 'rejected';
      await this.saveAllContactRequests(requests);
      
      console.log(`[WYSPR Contacts] Contact request rejected`);
      return true;
      
    } catch (error) {
      console.error('[WYSPR Contacts] Failed to reject contact request:', error);
      return false;
    }
  }
  
  // Handle incoming contact request message
  async handleIncomingContactRequest(message: any, fromUserId: string): Promise<void> {
    try {
      if (message.msgtype === 'org.wyspr.contact_request') {
        console.log(`[WYSPR Contacts] Received contact request from PIN ${message.fromPin}`);
        
        const request: ContactRequest = {
          id: message.requestId,
          fromPin: message.fromPin,
          fromUserId,
          toPin: message.toPin,
          timestamp: Date.now(),
          status: 'pending',
          message: message.message
        };
        
        await this.saveContactRequest(request);
        
        // TODO: Show notification to user
        console.log(`[WYSPR Contacts] Contact request from PIN ${message.fromPin} saved`);
      }
    } catch (error) {
      console.error('[WYSPR Contacts] Failed to handle incoming contact request:', error);
    }
  }
  
  private async getAllContactRequests(): Promise<ContactRequest[]> {
    try {
      const stored = await AsyncStorage.getItem(CONTACT_REQUESTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('[WYSPR Contacts] Failed to get all requests:', error);
      return [];
    }
  }
  
  private async saveContactRequest(request: ContactRequest): Promise<void> {
    try {
      const requests = await this.getAllContactRequests();
      
      // Remove any existing request with same ID
      const filteredRequests = requests.filter(req => req.id !== request.id);
      filteredRequests.push(request);
      
      await this.saveAllContactRequests(filteredRequests);
    } catch (error) {
      console.error('[WYSPR Contacts] Failed to save contact request:', error);
    }
  }
  
  private async saveAllContactRequests(requests: ContactRequest[]): Promise<void> {
    try {
      await AsyncStorage.setItem(CONTACT_REQUESTS_KEY, JSON.stringify(requests));
    } catch (error) {
      console.error('[WYSPR Contacts] Failed to save all requests:', error);
    }
  }

  // Create test contact requests for demo
  async createTestContactRequests(): Promise<void> {
    try {
      console.log('[WYSPR Contacts] Creating test contact requests...');
      
      // Get current user to determine which test requests to create
      const matrixClient = WysprMatrixClient.getInstance();
      const currentUserId = await matrixClient.getCurrentUserId();
      
      if (!currentUserId) {
        console.warn('[WYSPR Contacts] No current user ID found, skipping test requests');
        return;
      }
      
      // Check if test requests already exist
      const existing = await this.getAllContactRequests();
      const existingUsername = await this.getPendingUsernameRequests();
      if (existing.length > 0 || existingUsername.length > 0) {
        console.log('[WYSPR Contacts] Test requests already exist, skipping creation');
        return;
      }

      // Extract current username from Matrix ID (@username:domain)
      const currentUsername = currentUserId.split(':')[0].substring(1); // Remove @ symbol
      
      console.log(`[WYSPR Contacts] Creating test requests for user: ${currentUsername}`);

      // Create test username-based requests
      const testRequests: UsernameContactRequest[] = [];
      
      // Create some sample test requests based on common test usernames
      if (currentUsername === 'u32') {
        // If user is u32, they receive a request from u17
        testRequests.push({
          id: `test_req_${Date.now()}_1`,
          fromUsername: 'u17',
          fromUserId: '@u17:matrix.awadx.lat',
          toUsername: 'u32',
          toUserId: '@u32:matrix.awadx.lat',
          timestamp: Date.now() - 300000, // 5 minutes ago
          status: 'pending',
          message: 'Hi from u17! Would like to connect securely.'
        });
      } else if (currentUsername === 'u17') {
        // If user is u17, they receive a request from u32
        testRequests.push({
          id: `test_req_${Date.now()}_2`,
          fromUsername: 'u32',
          fromUserId: '@u32:matrix.awadx.lat',
          toUsername: 'u17',
          toUserId: '@u17:matrix.awadx.lat',
          timestamp: Date.now() - 120000, // 2 minutes ago
          status: 'pending',
          message: 'Hi from u32! Adding you for secure messaging.'
        });
      }

      if (testRequests.length > 0) {
        // Save test username requests
        await this.saveUsernameContactRequest(testRequests[0]); // Save the first one
        console.log(`[WYSPR Contacts] Created ${testRequests.length} test contact requests for ${currentUsername}`);
      } else {
        console.log(`[WYSPR Contacts] No test requests created for user ${currentUsername}`);
      }
      
    } catch (error) {
      console.error('[WYSPR Contacts] Failed to create test requests:', error);
    }
  }

  // Clear test data (for development)
  async clearTestData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CONTACT_REQUESTS_KEY);
      await AsyncStorage.removeItem(PIN_REGISTRY_KEY);
      console.log('[WYSPR Contacts] Test data cleared');
    } catch (error) {
      console.error('[WYSPR Contacts] Failed to clear test data:', error);
    }
  }
} 
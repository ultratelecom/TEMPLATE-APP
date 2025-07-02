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
        '10': '@u32:193.135.116.56',
        '11': '@u32:193.135.116.56',
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
      const stored = await AsyncStorage.getItem(CONTACT_REQUESTS_KEY);
      const requests: ContactRequest[] = stored ? JSON.parse(stored) : [];
      
      // Get current user to filter requests properly
      const matrixClient = WysprMatrixClient.getInstance();
      const currentUserId = await matrixClient.getCurrentUserId();
      
      if (!currentUserId) {
        console.warn('[WYSPR Contacts] No current user ID found');
        return [];
      }
      
      // Find current user's PIN
      const TEST_PINS = {
        '10': '@u32:193.135.116.56',
        '11': '@u32:193.135.116.56',
      };
      
      const currentUserPin = Object.keys(TEST_PINS).find(
        pin => TEST_PINS[pin as keyof typeof TEST_PINS] === currentUserId
      );
      
      if (!currentUserPin) {
        console.warn('[WYSPR Contacts] Could not determine current user PIN');
        return [];
      }
      
      // Filter requests: only show requests TO the current user that are pending
      const filteredRequests = requests.filter(req => 
        req.status === 'pending' && req.toPin === currentUserPin
      );
      
      console.log(`[WYSPR Contacts] Found ${filteredRequests.length} pending requests for PIN ${currentUserPin}`);
      return filteredRequests;
    } catch (error) {
      console.error('[WYSPR Contacts] Failed to get pending requests:', error);
      return [];
    }
  }
  
  // Accept contact request
  async acceptContactRequest(requestId: string): Promise<boolean> {
    try {
      console.log(`[WYSPR Contacts] Accepting contact request ${requestId}`);
      
      const requests = await this.getAllContactRequests();
      const request = requests.find(req => req.id === requestId);
      
      if (!request) {
        console.error('[WYSPR Contacts] Request not found');
        return false;
      }
      
      // Update request status
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
          body: `PIN ${request.toPin} accepted your contact request`,
          requestId,
          fromPin: request.toPin,
          toPin: request.fromPin
        };
        
        await matrixClient.sendMessage(roomId, JSON.stringify(acceptanceMessage));
      }
      
      console.log(`[WYSPR Contacts] Contact request accepted and contacts added`);
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
      if (existing.length > 0) {
        console.log('[WYSPR Contacts] Test requests already exist, skipping creation');
        return;
      }

      // Determine current user's PIN
      const TEST_PINS = {
        '10': '@u32:193.135.116.56',
        '11': '@u32:193.135.116.56',
      };
      
      const currentUserPin = Object.keys(TEST_PINS).find(
        pin => TEST_PINS[pin as keyof typeof TEST_PINS] === currentUserId
      );
      
      if (!currentUserPin) {
        console.warn('[WYSPR Contacts] Could not determine current user PIN');
        return;
      }

      // Create test requests based on current user
      const testRequests: ContactRequest[] = [];
      
      if (currentUserPin === '10') {
        // If user is PIN 10, they receive requests from PIN 11
        testRequests.push({
          id: `test_req_${Date.now()}_1`,
          fromPin: '11',
          fromUserId: '@u32:193.135.116.56',
          toPin: '10',
          timestamp: Date.now() - 300000, // 5 minutes ago
          status: 'pending',
          message: 'Hi from PIN 11! Would like to connect securely.'
        });
      } else if (currentUserPin === '11') {
        // If user is PIN 11, they receive requests from PIN 10
        testRequests.push({
          id: `test_req_${Date.now()}_2`,
          fromPin: '10',
          fromUserId: '@u32:193.135.116.56',
          toPin: '11',
          timestamp: Date.now() - 120000, // 2 minutes ago
          status: 'pending',
          message: 'Hi from PIN 10! Adding you for secure messaging.'
        });
      }

      if (testRequests.length > 0) {
        // Save test requests
        await this.saveAllContactRequests(testRequests);
        console.log(`[WYSPR Contacts] Created ${testRequests.length} test contact requests for PIN ${currentUserPin}`);
      } else {
        console.log('[WYSPR Contacts] No test requests created - unknown user PIN');
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
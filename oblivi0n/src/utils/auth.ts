import * as SecureStore from 'expo-secure-store';
import { WysprMatrixClient } from './matrixClient';
import { PinMappingService } from './pinMapping';
import { NicknameService } from './nicknames';
import { ContactRequestService } from './contactRequests';

const AUTH_TOKEN_KEY = 'wyspr_secure_token';
const USER_ID_KEY = 'wyspr_secure_user_id';
const DEVICE_ID_KEY = 'wyspr_secure_device_id';
const ACCESS_TOKEN_KEY = 'wyspr_secure_access_token';
const SERVER_PIN_KEY = 'wyspr_secure_server_pin';
const SESSION_TIMESTAMP_KEY = 'wyspr_session_timestamp';

// Test mode configuration (dev only)
const DEV_MODE = __DEV__;
const TEST_PINS = {
  '10': { userId: '@u32:matrix.awadx.lat', pin: 'ultra12!' },
  '11': { userId: '@u17:matrix.awadx.lat', pin: 'test123!' },
  '12': { userId: '@admin:matrix.awadx.lat', pin: 'admin123!' },
};

export interface AuthState {
  isLoggedIn: boolean;
  userId: string | null;
  sessionTimestamp: number | null;
}

export interface LoginResult {
  success: boolean;
  error?: string;
  isTestMode?: boolean;
}

export interface SessionData {
  userId: string;
  deviceId: string;
  accessToken: string;
  serverPin: string;
}

export class SecureAuthManager {
  private static instance: SecureAuthManager;

  private constructor() {}

  static getInstance(): SecureAuthManager {
    if (!SecureAuthManager.instance) {
      SecureAuthManager.instance = new SecureAuthManager();
    }
    return SecureAuthManager.instance;
  }

  // Check if we have a valid stored session
  async getStoredSession(): Promise<AuthState> {
    try {
      const accessToken = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      const userId = await SecureStore.getItemAsync(USER_ID_KEY);
      const sessionTimestamp = await SecureStore.getItemAsync(SESSION_TIMESTAMP_KEY);

      if (accessToken && userId && sessionTimestamp) {
        const timestamp = parseInt(sessionTimestamp, 10);
        const now = Date.now();
        const sessionAge = now - timestamp;
        
        // Session expires after 30 days
        const SESSION_EXPIRY = 30 * 24 * 60 * 60 * 1000;
        
        if (sessionAge < SESSION_EXPIRY) {
          console.log('[WYSPR Auth] Valid session found for user:', userId);
          return {
            isLoggedIn: true,
            userId,
            sessionTimestamp: timestamp,
          };
        } else {
          console.log('[WYSPR Auth] Session expired, clearing stored data');
          await this.clearSession();
        }
      }

      return {
        isLoggedIn: false,
        userId: null,
        sessionTimestamp: null,
      };
    } catch (error) {
      console.error('[WYSPR Auth] Error checking stored session:', error);
      return {
        isLoggedIn: false,
        userId: null,
        sessionTimestamp: null,
      };
    }
  }

  // Attempt auto-login with stored credentials
  async autoLogin(): Promise<LoginResult> {
    try {
      const session = await this.getStoredSession();
      
      if (!session.isLoggedIn) {
        return { success: false, error: 'No valid session found' };
      }

      console.log('[WYSPR Auth] Attempting auto-login');
      
      // Check if this is a test mode session
      const isTestSession = session.userId && Object.values(TEST_PINS).some(
        testUser => testUser.userId === session.userId
      );
      
      if (DEV_MODE && isTestSession) {
        console.log('[WYSPR Auth] Test mode auto-login detected');
        
        // Enable test mode in Matrix client
        const matrixClient = WysprMatrixClient.getInstance();
        await matrixClient.enableTestMode(session.userId!);
        
        // For test mode, just load the test PIN mappings
        await this.createTestPinMappings();
        
        // Load nicknames
        const nicknameService = NicknameService.getInstance();
        await nicknameService.loadNicknames();
        
        // Register user's PIN for contact discovery
        const contactService = ContactRequestService.getInstance();
        const userPin = Object.keys(TEST_PINS).find(pin => TEST_PINS[pin as keyof typeof TEST_PINS].userId === session.userId);
        if (userPin) {
          await contactService.registerMyPin(userPin, session.userId!);
        }
        
        // Create test contact requests for demo
        await contactService.createTestContactRequests();
        
        console.log('[WYSPR Auth] Test mode auto-login successful');
        return { success: true, isTestMode: true };
      } else {
        // Regular auto-login with Matrix client
        const matrixClient = WysprMatrixClient.getInstance();
        const initialized = await matrixClient.initializeClient();
        
        if (initialized) {
          // Load PIN mappings
          const pinService = PinMappingService.getInstance();
          await pinService.loadMappings();
          
          // Load nicknames
          const nicknameService = NicknameService.getInstance();
          await nicknameService.loadNicknames();
          
          console.log('[WYSPR Auth] Auto-login successful');
          return { success: true };
        } else {
          console.error('[WYSPR Auth] Auto-login failed: Could not initialize client');
          await this.clearSession();
          return { success: false, error: 'Session invalid' };
        }
      }
    } catch (error) {
      console.error('[WYSPR Auth] Auto-login error:', error);
      await this.clearSession();
      return { success: false, error: 'Auto-login failed' };
    }
  }

  // Login with credentials
  async login(userId: string, pin: string): Promise<LoginResult> {
    try {
      // Check for test mode in development
      if (DEV_MODE && this.isTestPin(pin)) {
        return await this.handleTestLogin(pin);
      }

      console.log('[WYSPR Auth] Regular login attempt');
      
      const matrixClient = WysprMatrixClient.getInstance();
      const result = await matrixClient.login(userId, pin);
      
      if (result.success) {
        // Store session securely
        await this.storeSession(userId);
        
        // Load PIN mappings
        const pinService = PinMappingService.getInstance();
        await pinService.loadMappings();
        
        // Load nicknames
        const nicknameService = NicknameService.getInstance();
        await nicknameService.loadNicknames();
        
        console.log('[WYSPR Auth] Login successful, session stored');
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('[WYSPR Auth] Login error:', error);
      return { success: false, error: 'Login failed' };
    }
  }

  // Test mode login (dev only)
  private isTestPin(pin: string): boolean {
    return Object.keys(TEST_PINS).includes(pin);
  }

  private async handleTestLogin(pin: string): Promise<LoginResult> {
    if (!DEV_MODE) {
      return { success: false, error: 'Test mode disabled in production' };
    }

    const testUser = TEST_PINS[pin as keyof typeof TEST_PINS];
    if (!testUser) {
      return { success: false, error: 'Invalid test PIN' };
    }

    console.log('[WYSPR Auth] Test mode login for PIN:', pin);
    
    try {
      // Mock the test login - don't actually connect to Matrix server
      console.log('[WYSPR Auth] Using offline test mode - no Matrix connection required');
      
      // Store mock session data
      await this.storeSession(testUser.userId);
      
      // Enable test mode in Matrix client
      const matrixClient = WysprMatrixClient.getInstance();
      await matrixClient.enableTestMode(testUser.userId);
      
      // Create mock PIN mappings for test mode
      await this.createTestPinMappings();
      
      // Load nicknames
      const nicknameService = NicknameService.getInstance();
      await nicknameService.loadNicknames();
      
      // Register user's PIN for contact discovery
      const contactService = ContactRequestService.getInstance();
      await contactService.registerMyPin(pin, testUser.userId);
      
      // Create test contact requests for demo
      await contactService.createTestContactRequests();
      
      console.log('[WYSPR Auth] Test mode login successful (offline mode)');
      return { success: true, isTestMode: true };
      
    } catch (error) {
      console.error('[WYSPR Auth] Test mode login error:', error);
      return { success: false, error: 'Test login failed' };
    }
  }

  // Create test PIN mappings for offline test mode
  private async createTestPinMappings(): Promise<void> {
    try {
      const pinService = PinMappingService.getInstance();
      
              // Add some test contacts
        await pinService.addMapping('20', '@contact1:193.135.116.56');
        await pinService.addMapping('21', '@contact2:193.135.116.56'); 
        await pinService.addMapping('22', '@contact3:193.135.116.56');
      
      console.log('[WYSPR Auth] Test PIN mappings created');
      
      // Create some test nicknames
      const nicknameService = NicknameService.getInstance();
      await nicknameService.setNickname('20', 'JD'); // John Doe
      await nicknameService.setNickname('21', 'AB'); // Alice Bob
      // Leave PIN 22 without a nickname to test both scenarios
      
      console.log('[WYSPR Auth] Test nicknames created');
    } catch (error) {
      console.error('[WYSPR Auth] Failed to create test PIN mappings:', error);
    }
  }

  // New session management functions as per requirements
  async saveSession(sessionData: SessionData): Promise<void> {
    try {
      await SecureStore.setItemAsync(USER_ID_KEY, sessionData.userId);
      await SecureStore.setItemAsync(DEVICE_ID_KEY, sessionData.deviceId);
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, sessionData.accessToken);
      await SecureStore.setItemAsync(SERVER_PIN_KEY, sessionData.serverPin);
      await SecureStore.setItemAsync(SESSION_TIMESTAMP_KEY, Date.now().toString());
      
      console.log('[WYSPR Auth] Session data saved securely');
    } catch (error) {
      console.error('[WYSPR Auth] Failed to save session:', error);
      throw error;
    }
  }

  async loadSession(): Promise<SessionData | null> {
    try {
      const userId = await SecureStore.getItemAsync(USER_ID_KEY);
      const deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
      const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      const serverPin = await SecureStore.getItemAsync(SERVER_PIN_KEY);
      const timestamp = await SecureStore.getItemAsync(SESSION_TIMESTAMP_KEY);

      if (userId && deviceId && accessToken && serverPin && timestamp) {
        const sessionAge = Date.now() - parseInt(timestamp, 10);
        const SESSION_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days
        
        if (sessionAge < SESSION_EXPIRY) {
          return { userId, deviceId, accessToken, serverPin };
        } else {
          console.log('[WYSPR Auth] Session expired, clearing stored data');
          await this.clearSession();
        }
      }

      return null;
    } catch (error) {
      console.error('[WYSPR Auth] Failed to load session:', error);
      return null;
    }
  }

  async clearSession(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(USER_ID_KEY);
      await SecureStore.deleteItemAsync(DEVICE_ID_KEY);
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(SERVER_PIN_KEY);
      await SecureStore.deleteItemAsync(SESSION_TIMESTAMP_KEY);
      
      console.log('[WYSPR Auth] Session data cleared');
    } catch (error) {
      console.error('[WYSPR Auth] Error clearing session:', error);
    }
  }

  // Store session securely (legacy method, updated to use new format)
  private async storeSession(userId: string): Promise<void> {
    try {
      const timestamp = Date.now().toString();
      
      await SecureStore.setItemAsync(USER_ID_KEY, userId);
      await SecureStore.setItemAsync(SESSION_TIMESTAMP_KEY, timestamp);
      
      console.log('[WYSPR Auth] Session stored securely');
    } catch (error) {
      console.error('[WYSPR Auth] Failed to store session:', error);
      throw error;
    }
  }

  // Clear session and logout
  async logout(): Promise<void> {
    try {
      console.log('[WYSPR Auth] Logging out and clearing session');
      
      const matrixClient = WysprMatrixClient.getInstance();
      
      // Handle test mode differently
      if (matrixClient.isInTestMode()) {
        console.log('[WYSPR Auth] Test mode logout - disabling test mode');
        matrixClient.disableTestMode();
      } else {
        // Regular Matrix logout
        await matrixClient.logout();
      }
      
      // Clear secure storage
      await this.clearSession();
      
      // Clear PIN mappings
      const pinService = PinMappingService.getInstance();
      await pinService.clearAllMappings();
      
      // Clear nicknames
      const nicknameService = NicknameService.getInstance();
      await nicknameService.clearAllNicknames();
      
      console.log('[WYSPR Auth] Logout complete');
    } catch (error) {
      console.error('[WYSPR Auth] Logout error:', error);
      // Still clear local session even if Matrix logout fails
      await this.clearSession();
    }
  }

  // Clear stored session data (removed - using new clearSession method above)

  // Get current session info
  async getCurrentSession(): Promise<AuthState> {
    return await this.getStoredSession();
  }

  // Check if in test mode
  isTestModeAvailable(): boolean {
    return DEV_MODE;
  }

  // Get test PINs (dev only)
  getTestPins(): string[] {
    return DEV_MODE ? Object.keys(TEST_PINS) : [];
  }
} 
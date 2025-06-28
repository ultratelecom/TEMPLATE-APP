import * as SecureStore from 'expo-secure-store';

const REGISTERED_USERS_KEY = 'oblivi0n_registered_users';
const CURRENT_USER_KEY = 'oblivi0n_current_user';

interface RegisteredUser {
  pin: string;
  username: string;
  registrationDate: string;
  isOnline?: boolean;
}

interface UserRegistry {
  [pin: string]: RegisteredUser;
}

export class UserRegistrationService {
  private static instance: UserRegistrationService;
  private userRegistry: UserRegistry = {};

  static getInstance(): UserRegistrationService {
    if (!UserRegistrationService.instance) {
      UserRegistrationService.instance = new UserRegistrationService();
    }
    return UserRegistrationService.instance;
  }

  async initialize(): Promise<void> {
    try {
      await this.loadUserRegistry();
      await this.createTestUsers(); // Create some test users for demo
      console.log('[OBLIVI0N Registration] Service initialized');
    } catch (error) {
      console.error('[OBLIVI0N Registration] Failed to initialize service:', error);
    }
  }

  private async loadUserRegistry(): Promise<void> {
    try {
      const stored = await SecureStore.getItemAsync(REGISTERED_USERS_KEY);
      if (stored) {
        this.userRegistry = JSON.parse(stored);
      }
    } catch (error) {
      console.error('[OBLIVI0N Registration] Failed to load user registry:', error);
      this.userRegistry = {};
    }
  }

  private async saveUserRegistry(): Promise<void> {
    try {
      await SecureStore.setItemAsync(REGISTERED_USERS_KEY, JSON.stringify(this.userRegistry));
      console.log('[OBLIVI0N Registration] User registry saved');
    } catch (error) {
      console.error('[OBLIVI0N Registration] Failed to save user registry:', error);
    }
  }

  private async createTestUsers(): Promise<void> {
    // Create some test users if they don't exist
    const testUsers = [
      { pin: '20', username: 'crypto_hawk' },
      { pin: '21', username: 'shadow_runner' },
      { pin: '22', username: 'digital_ghost' },
      { pin: '23', username: 'neural_knight' },
      { pin: '24', username: 'quantum_wolf' },
      { pin: '25', username: 'cipher_blade' },
      { pin: '26', username: 'byte_storm' },
      { pin: '27', username: 'dark_cipher' },
      { pin: '28', username: 'void_walker' },
      { pin: '29', username: 'neon_viper' },
      { pin: '32', username: 'doc_man' }, // Current user from conversation
    ];

    let hasChanges = false;
    for (const testUser of testUsers) {
      if (!this.userRegistry[testUser.pin]) {
        this.userRegistry[testUser.pin] = {
          pin: testUser.pin,
          username: testUser.username,
          registrationDate: new Date().toISOString(),
          isOnline: Math.random() > 0.3, // Random online status for demo
        };
        hasChanges = true;
      }
    }

    if (hasChanges) {
      await this.saveUserRegistry();
      console.log('[OBLIVI0N Registration] Test users created');
    }
  }

  async generateAvailablePin(): Promise<string> {
    // Generate a random 2-digit PIN that's not taken
    let attempts = 0;
    while (attempts < 100) {
      const pin = Math.floor(10 + Math.random() * 90).toString(); // 10-99
      if (!this.userRegistry[pin]) {
        return pin;
      }
      attempts++;
    }
    throw new Error('Unable to generate available PIN');
  }

  async registerUser(pin: string, username: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if PIN is already taken
      if (this.userRegistry[pin]) {
        return { success: false, error: 'PIN is already registered' };
      }

      // Check if username is already taken
      const existingUser = Object.values(this.userRegistry).find(
        user => user.username.toLowerCase() === username.toLowerCase()
      );
      if (existingUser) {
        return { success: false, error: 'Username is already taken' };
      }

      // Validate username format
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return { success: false, error: 'Username can only contain letters, numbers, and underscores' };
      }

      if (username.length < 3 || username.length > 20) {
        return { success: false, error: 'Username must be between 3 and 20 characters' };
      }

      // Register the user
      const newUser: RegisteredUser = {
        pin,
        username: username.toLowerCase(),
        registrationDate: new Date().toISOString(),
        isOnline: true, // User is online when they register
      };

      this.userRegistry[pin] = newUser;
      await this.saveUserRegistry();

      console.log(`[OBLIVI0N Registration] User registered: ${pin} • ${username}`);
      return { success: true };
    } catch (error) {
      console.error('[OBLIVI0N Registration] Registration failed:', error);
      return { success: false, error: 'Registration failed' };
    }
  }

  async getUserByPin(pin: string): Promise<RegisteredUser | null> {
    await this.loadUserRegistry(); // Ensure we have latest data
    return this.userRegistry[pin] || null;
  }

  async getUsernameByPin(pin: string): Promise<string | null> {
    const user = await this.getUserByPin(pin);
    return user ? user.username : null;
  }

  async getDisplayNameByPin(pin: string): Promise<string> {
    const user = await this.getUserByPin(pin);
    if (user) {
      return `${pin} • ${user.username}`;
    }
    return pin; // Fallback to just PIN if user not found
  }

  async setUserOnlineStatus(pin: string, isOnline: boolean): Promise<void> {
    try {
      if (this.userRegistry[pin]) {
        this.userRegistry[pin].isOnline = isOnline;
        await this.saveUserRegistry();
      }
    } catch (error) {
      console.error(`[OBLIVI0N Registration] Failed to update online status for ${pin}:`, error);
    }
  }

  async isUserOnline(pin: string): Promise<boolean> {
    const user = await this.getUserByPin(pin);
    return user?.isOnline || false;
  }

  getAllUsers(): RegisteredUser[] {
    return Object.values(this.userRegistry);
  }

  async clearAllUsers(): Promise<void> {
    try {
      this.userRegistry = {};
      await SecureStore.deleteItemAsync(REGISTERED_USERS_KEY);
      console.log('[OBLIVI0N Registration] All users cleared');
    } catch (error) {
      console.error('[OBLIVI0N Registration] Failed to clear users:', error);
    }
  }

  // For test mode - simulate some users being online/offline
  async updateRandomOnlineStatuses(): Promise<void> {
    for (const pin in this.userRegistry) {
      this.userRegistry[pin].isOnline = Math.random() > 0.3; // 70% chance online
    }
    await this.saveUserRegistry();
  }
} 
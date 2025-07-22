import * as SecureStore from 'expo-secure-store';
import { encryptData, decryptData, getRandomDisplayName } from './encryption';

const DISPLAY_NAMES_KEY = 'wyspr_display_names';
const USER_DISPLAY_NAME_KEY = 'wyspr_user_display_name';

interface DisplayNameMap {
  [pin: string]: string; // PIN -> encrypted display name
}

export class DisplayNameService {
  private static instance: DisplayNameService;
  private displayNames: DisplayNameMap = {};
  private userDisplayName: string = '';

  static getInstance(): DisplayNameService {
    if (!DisplayNameService.instance) {
      DisplayNameService.instance = new DisplayNameService();
    }
    return DisplayNameService.instance;
  }

  async initialize(): Promise<void> {
    try {
      await this.loadDisplayNames();
      await this.loadUserDisplayName();
      console.log('[WYSPR DisplayNames] Service initialized');
    } catch (error) {
      console.error('[WYSPR DisplayNames] Failed to initialize service:', error);
    }
  }

  private async loadDisplayNames(): Promise<void> {
    try {
      const stored = await SecureStore.getItemAsync(DISPLAY_NAMES_KEY);
      if (stored) {
        this.displayNames = JSON.parse(stored);
      }
    } catch (error) {
      console.error('[WYSPR DisplayNames] Failed to load display names:', error);
      this.displayNames = {};
    }
  }

  private async saveDisplayNames(): Promise<void> {
    try {
      await SecureStore.setItemAsync(DISPLAY_NAMES_KEY, JSON.stringify(this.displayNames));
      console.log('[WYSPR DisplayNames] Saved display names to storage');
    } catch (error) {
      console.error('[WYSPR DisplayNames] Failed to save display names:', error);
    }
  }

  private async loadUserDisplayName(): Promise<void> {
    try {
      const stored = await SecureStore.getItemAsync(USER_DISPLAY_NAME_KEY);
      if (stored) {
        this.userDisplayName = await decryptData(stored);
      } else {
        // Set a random display name for new users
        this.userDisplayName = getRandomDisplayName();
        await this.setUserDisplayName(this.userDisplayName);
      }
    } catch (error) {
      console.error('[WYSPR DisplayNames] Failed to load user display name:', error);
      this.userDisplayName = getRandomDisplayName();
    }
  }

  async setUserDisplayName(displayName: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (displayName.length > 20) {
        return { success: false, error: 'Display name must be 20 characters or less' };
      }

      if (displayName.trim().length === 0) {
        return { success: false, error: 'Display name cannot be empty' };
      }

      const encrypted = await encryptData(displayName.trim());
      await SecureStore.setItemAsync(USER_DISPLAY_NAME_KEY, encrypted);
      this.userDisplayName = displayName.trim();
      
      console.log('[WYSPR DisplayNames] Updated user display name');
      return { success: true };
    } catch (error) {
      console.error('[WYSPR DisplayNames] Failed to set user display name:', error);
      return { success: false, error: 'Failed to save display name' };
    }
  }

  getUserDisplayName(): string {
    return this.userDisplayName;
  }

  async setDisplayNameForPin(pin: string, displayName: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (displayName.length > 20) {
        return { success: false, error: 'Display name must be 20 characters or less' };
      }

      const encrypted = await encryptData(displayName.trim());
      this.displayNames[pin] = encrypted;
      await this.saveDisplayNames();
      
      console.log(`[WYSPR DisplayNames] Set display name for PIN ${pin}`);
      return { success: true };
    } catch (error) {
      console.error(`[WYSPR DisplayNames] Failed to set display name for PIN ${pin}:`, error);
      return { success: false, error: 'Failed to save display name' };
    }
  }

  async getDisplayNameForPin(pin: string): Promise<string | null> {
    try {
      const encrypted = this.displayNames[pin];
      if (!encrypted) {
        return null;
      }
      return await decryptData(encrypted);
    } catch (error) {
      console.error(`[WYSPR DisplayNames] Failed to get display name for PIN ${pin}:`, error);
      return null;
    }
  }

  async removeDisplayNameForPin(pin: string): Promise<void> {
    try {
      delete this.displayNames[pin];
      await this.saveDisplayNames();
      console.log(`[WYSPR DisplayNames] Removed display name for PIN ${pin}`);
    } catch (error) {
      console.error(`[WYSPR DisplayNames] Failed to remove display name for PIN ${pin}:`, error);
    }
  }

  async getDisplayNameOrFallback(pin: string): Promise<string> {
    const displayName = await this.getDisplayNameForPin(pin);
    if (displayName) {
      return displayName;
    }
    
    // Fallback to random name based on PIN for consistency
    const randomIndex = parseInt(pin) % getRandomDisplayName().length;
    return getRandomDisplayName();
  }

  getAllDisplayNames(): { [pin: string]: string } {
    const result: { [pin: string]: string } = {};
    Object.keys(this.displayNames).forEach(async (pin) => {
      const decrypted = await this.getDisplayNameForPin(pin);
      if (decrypted) {
        result[pin] = decrypted;
      }
    });
    return result;
  }

  async clearAllDisplayNames(): Promise<void> {
    try {
      this.displayNames = {};
      await SecureStore.deleteItemAsync(DISPLAY_NAMES_KEY);
      console.log('[WYSPR DisplayNames] Cleared all display names');
    } catch (error) {
      console.error('[WYSPR DisplayNames] Failed to clear display names:', error);
    }
  }
} 
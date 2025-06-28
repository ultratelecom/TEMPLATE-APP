import AsyncStorage from '@react-native-async-storage/async-storage';

const NICKNAMES_KEY = 'oblivi0n_local_nicknames';

export interface ContactNickname {
  pin: string;
  nickname: string; // 2-character initials like "JD", "AB", etc.
  createdAt: Date;
  updatedAt: Date;
}

export class NicknameService {
  private static instance: NicknameService;
  private nicknames: { [pin: string]: ContactNickname } = {};
  private isLoaded = false;

  private constructor() {}

  static getInstance(): NicknameService {
    if (!NicknameService.instance) {
      NicknameService.instance = new NicknameService();
    }
    return NicknameService.instance;
  }

  // Load nicknames from storage
  async loadNicknames(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(NICKNAMES_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        // Convert date strings back to Date objects
        this.nicknames = Object.keys(parsed).reduce((acc, pin) => {
          acc[pin] = {
            ...parsed[pin],
            createdAt: new Date(parsed[pin].createdAt),
            updatedAt: new Date(parsed[pin].updatedAt),
          };
          return acc;
        }, {} as { [pin: string]: ContactNickname });
        
        console.log('[OBLIVI0N Nicknames] Loaded', Object.keys(this.nicknames).length, 'nicknames');
      }
      this.isLoaded = true;
    } catch (error) {
      console.error('[OBLIVI0N Nicknames] Failed to load nicknames:', error);
      this.nicknames = {};
      this.isLoaded = true;
    }
  }

  // Save nicknames to storage
  private async saveNicknames(): Promise<void> {
    try {
      await AsyncStorage.setItem(NICKNAMES_KEY, JSON.stringify(this.nicknames));
      console.log('[OBLIVI0N Nicknames] Saved nicknames to storage');
    } catch (error) {
      console.error('[OBLIVI0N Nicknames] Failed to save nicknames:', error);
    }
  }

  // Set nickname for a PIN
  async setNickname(pin: string, nickname: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Ensure nicknames are loaded
      if (!this.isLoaded) {
        await this.loadNicknames();
      }

      // Validate nickname (2 characters, letters only)
      if (!/^[A-Za-z]{2}$/.test(nickname)) {
        return { success: false, error: 'Nickname must be exactly 2 letters (e.g., JD, AB)' };
      }

      // Check if nickname is already used by another PIN
      const existingPin = Object.keys(this.nicknames).find(
        p => p !== pin && this.nicknames[p].nickname.toLowerCase() === nickname.toLowerCase()
      );
      if (existingPin) {
        return { success: false, error: `Nickname "${nickname.toUpperCase()}" is already used for PIN ${existingPin}` };
      }

      const now = new Date();
      const isUpdate = this.nicknames[pin] !== undefined;

      this.nicknames[pin] = {
        pin,
        nickname: nickname.toUpperCase(),
        createdAt: isUpdate ? this.nicknames[pin].createdAt : now,
        updatedAt: now,
      };

      await this.saveNicknames();
      
      console.log('[OBLIVI0N Nicknames]', isUpdate ? 'Updated' : 'Set', 'nickname for PIN', pin, ':', nickname.toUpperCase());
      return { success: true };
    } catch (error) {
      console.error('[OBLIVI0N Nicknames] Failed to set nickname:', error);
      return { success: false, error: 'Failed to save nickname' };
    }
  }

  // Get nickname for a PIN
  getNickname(pin: string): string | null {
    if (!this.isLoaded) {
      console.warn('[OBLIVI0N Nicknames] Nicknames not loaded yet');
      return null;
    }
    return this.nicknames[pin]?.nickname || null;
  }

  // Remove nickname for a PIN
  async removeNickname(pin: string): Promise<void> {
    try {
      if (!this.isLoaded) {
        await this.loadNicknames();
      }

      if (this.nicknames[pin]) {
        delete this.nicknames[pin];
        await this.saveNicknames();
        console.log('[OBLIVI0N Nicknames] Removed nickname for PIN:', pin);
      }
    } catch (error) {
      console.error('[OBLIVI0N Nicknames] Failed to remove nickname:', error);
    }
  }

  // Get all nicknames
  getAllNicknames(): ContactNickname[] {
    if (!this.isLoaded) {
      console.warn('[OBLIVI0N Nicknames] Nicknames not loaded yet');
      return [];
    }
    return Object.values(this.nicknames);
  }

  // Get formatted display name (PIN + nickname if available)
  getDisplayName(pin: string): string {
    const nickname = this.getNickname(pin);
    return nickname ? `${pin} (${nickname})` : pin;
  }

  // Get short display name (just nickname if available, otherwise PIN)
  getShortDisplayName(pin: string): string {
    const nickname = this.getNickname(pin);
    return nickname || pin;
  }

  // Check if a PIN has a nickname
  hasNickname(pin: string): boolean {
    return this.getNickname(pin) !== null;
  }

  // Clear all nicknames (for logout)
  async clearAllNicknames(): Promise<void> {
    try {
      this.nicknames = {};
      await AsyncStorage.removeItem(NICKNAMES_KEY);
      console.log('[OBLIVI0N Nicknames] Cleared all nicknames');
    } catch (error) {
      console.error('[OBLIVI0N Nicknames] Failed to clear nicknames:', error);
    }
  }

  // Get usage statistics
  getStats(): { total: number; recentlyUsed: number } {
    const total = Object.keys(this.nicknames).length;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentlyUsed = Object.values(this.nicknames).filter(
      nickname => nickname.updatedAt > thirtyDaysAgo
    ).length;

    return { total, recentlyUsed };
  }
} 
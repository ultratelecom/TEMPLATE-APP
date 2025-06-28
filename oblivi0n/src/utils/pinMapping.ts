import AsyncStorage from '@react-native-async-storage/async-storage';

const PIN_MAPPING_KEY = 'oblivi0n_pin_mapping';
const REMOTE_PIN_MAP_URL = 'https://secure-config.oblivi0n.gov.local/pinMap.json';
const LAST_FETCH_KEY = 'oblivi0n_last_pin_fetch';
const FETCH_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

export interface PinMapping {
  [pin: string]: string; // PIN -> Matrix User ID
}

export class PinMappingService {
  private static instance: PinMappingService;
  private mappings: PinMapping = {};

  private constructor() {}

  static getInstance(): PinMappingService {
    if (!PinMappingService.instance) {
      PinMappingService.instance = new PinMappingService();
    }
    return PinMappingService.instance;
  }

  async loadMappings(): Promise<void> {
    try {
      console.log('[OBLIVI0N PIN] Loading PIN mappings...');
      
      // Check if we need to fetch from remote
      const shouldFetchRemote = await this.shouldFetchRemoteMappings();
      
      if (shouldFetchRemote) {
        const remoteFetched = await this.fetchRemoteMappings();
        if (remoteFetched) {
          console.log('[OBLIVI0N PIN] Remote mappings fetched successfully');
          await this.updateLastFetchTime();
        } else {
          console.log('[OBLIVI0N PIN] Remote fetch failed, using local mappings');
        }
      }
      
      // Load from local storage (either updated from remote or existing)
      const stored = await AsyncStorage.getItem(PIN_MAPPING_KEY);
      if (stored) {
        this.mappings = JSON.parse(stored);
        console.log('[OBLIVI0N PIN] Loaded', Object.keys(this.mappings).length, 'PIN mappings');
      } else {
        console.log('[OBLIVI0N PIN] No local mappings found');
        this.mappings = {};
      }
    } catch (error) {
      console.error('[OBLIVI0N PIN] Failed to load PIN mappings:', error);
      this.mappings = {};
    }
  }

  private async shouldFetchRemoteMappings(): Promise<boolean> {
    try {
      const lastFetch = await AsyncStorage.getItem(LAST_FETCH_KEY);
      if (!lastFetch) {
        return true; // Never fetched before
      }
      
      const lastFetchTime = parseInt(lastFetch, 10);
      const now = Date.now();
      
      return (now - lastFetchTime) > FETCH_INTERVAL;
    } catch (error) {
      console.error('[OBLIVI0N PIN] Error checking fetch time:', error);
      return true; // Default to fetching on error
    }
  }

  private async fetchRemoteMappings(): Promise<boolean> {
    try {
      console.log('[OBLIVI0N PIN] Fetching remote PIN mappings from:', REMOTE_PIN_MAP_URL);
      
      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 10000);
      });

      // Race the fetch against the timeout
      const response = await Promise.race([
        fetch(REMOTE_PIN_MAP_URL, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
          },
        }),
        timeoutPromise
      ]);
      
      if (!response.ok) {
        console.error('[OBLIVI0N PIN] Remote fetch failed with status:', response.status);
        return false;
      }
      
      const remoteMappings: PinMapping = await response.json();
      
      // Validate the remote data
      if (!this.validateMappings(remoteMappings)) {
        console.error('[OBLIVI0N PIN] Remote mappings validation failed');
        return false;
      }
      
      // Merge with local mappings (prioritize local user-added mappings)
      const localMappings = await this.getLocalMappings();
      const mergedMappings = { ...remoteMappings, ...localMappings };
      
      // Save the merged mappings
      await AsyncStorage.setItem(PIN_MAPPING_KEY, JSON.stringify(mergedMappings));
      
      console.log('[OBLIVI0N PIN] Remote mappings fetched and merged successfully');
      return true;
    } catch (error) {
      console.error('[OBLIVI0N PIN] Failed to fetch remote mappings:', error);
      return false;
    }
  }

  private async getLocalMappings(): Promise<PinMapping> {
    try {
      const stored = await AsyncStorage.getItem(PIN_MAPPING_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('[OBLIVI0N PIN] Failed to get local mappings:', error);
      return {};
    }
  }

  private validateMappings(mappings: any): boolean {
    if (!mappings || typeof mappings !== 'object') {
      return false;
    }
    
    for (const [pin, userId] of Object.entries(mappings)) {
      // Validate PIN format (2 digits)
      if (!/^\d{2}$/.test(pin)) {
        console.error('[OBLIVI0N PIN] Invalid PIN format:', pin);
        return false;
      }
      
      // Validate Matrix User ID format
      if (typeof userId !== 'string' || !userId.startsWith('@') || !userId.includes(':')) {
        console.error('[OBLIVI0N PIN] Invalid Matrix User ID:', userId);
        return false;
      }
    }
    
    return true;
  }

  private async updateLastFetchTime(): Promise<void> {
    try {
      await AsyncStorage.setItem(LAST_FETCH_KEY, Date.now().toString());
    } catch (error) {
      console.error('[OBLIVI0N PIN] Failed to update last fetch time:', error);
    }
  }

  async saveMappings(): Promise<void> {
    try {
      await AsyncStorage.setItem(PIN_MAPPING_KEY, JSON.stringify(this.mappings));
    } catch (error) {
      console.error('Failed to save PIN mappings:', error);
    }
  }

  async addMapping(pin: string, matrixUserId: string): Promise<boolean> {
    // Validate PIN format (2 digits)
    if (!/^\d{2}$/.test(pin)) {
      return false;
    }

    // Check if PIN is already mapped
    if (this.mappings[pin]) {
      return false;
    }

    this.mappings[pin] = matrixUserId;
    await this.saveMappings();
    return true;
  }

  getMatrixUserId(pin: string): string | null {
    const userId = this.mappings[pin] || null;
    if (userId) {
      console.log('[OBLIVI0N PIN] Resolved PIN', pin, 'to Matrix User ID:', userId);
    } else {
      console.warn('[OBLIVI0N PIN] No mapping found for PIN:', pin);
    }
    return userId;
  }

  // Reliable PIN to User ID resolution with validation
  async resolveMatrixUserId(pin: string): Promise<{ userId: string | null; error?: string }> {
    try {
      // Validate PIN format
      if (!/^\d{2}$/.test(pin)) {
        return { userId: null, error: 'Invalid PIN format' };
      }

      // Check if mappings are loaded
      if (Object.keys(this.mappings).length === 0) {
        console.log('[OBLIVI0N PIN] Mappings not loaded, attempting to load...');
        await this.loadMappings();
      }

      const userId = this.getMatrixUserId(pin);
      
      if (!userId) {
        // Try to refresh mappings once more
        console.log('[OBLIVI0N PIN] PIN not found, refreshing mappings...');
        await this.loadMappings();
        const retryUserId = this.getMatrixUserId(pin);
        
        if (!retryUserId) {
          return { userId: null, error: `No contact found for PIN ${pin}` };
        }
        
        return { userId: retryUserId };
      }

      return { userId };
    } catch (error) {
      console.error('[OBLIVI0N PIN] Error resolving PIN to User ID:', error);
      return { userId: null, error: 'Failed to resolve PIN' };
    }
  }

  getPin(matrixUserId: string): string | null {
    for (const [pin, userId] of Object.entries(this.mappings)) {
      if (userId === matrixUserId) {
        return pin;
      }
    }
    return null;
  }

  getAllMappings(): PinMapping {
    return { ...this.mappings };
  }

  async removeMapping(pin: string): Promise<void> {
    delete this.mappings[pin];
    await this.saveMappings();
  }

  async clearAllMappings(): Promise<void> {
    this.mappings = {};
    await this.saveMappings();
  }

  // Generate a random available PIN
  generateAvailablePin(): string | null {
    for (let i = 10; i <= 99; i++) {
      const pin = i.toString();
      if (!this.mappings[pin]) {
        return pin;
      }
    }
    return null; // All PINs are taken
  }
} 
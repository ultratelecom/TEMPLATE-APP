import { useEffect, useState } from 'react';
import { Platform, Alert, AppState } from 'react-native';

// Import screenshot detector
let ScreenshotDetector: any = null;
try {
  ScreenshotDetector = require('react-native-screenshot-detector');
  console.log('[WYSPR Screenshot] Detector imported successfully');
} catch (error: any) {
  console.warn('[WYSPR Screenshot] Detector not available (this is normal in development):', error?.message || 'Unknown error');
}

export interface ScreenshotEvent {
  timestamp: Date;
  roomId?: string;
  detected: boolean;
  blurred: boolean;
}

export class ScreenshotProtectionService {
  private static instance: ScreenshotProtectionService;
  private isEnabled = true;
  private isBlurred = false;
  private detectionCallbacks: Array<(event: ScreenshotEvent) => void> = [];
  private blurCallbacks: Array<(shouldBlur: boolean) => void> = [];
  private currentRoomId: string | null = null;
  private appStateSubscription: any = null;

  private constructor() {
    this.initializeProtection();
    console.log('[WYSPR Screenshot] Protection service initialized');
  }

  static getInstance(): ScreenshotProtectionService {
    if (!ScreenshotProtectionService.instance) {
      ScreenshotProtectionService.instance = new ScreenshotProtectionService();
    }
    return ScreenshotProtectionService.instance;
  }

  private initializeProtection(): void {
    try {
      if (ScreenshotDetector && typeof ScreenshotDetector.startScreenshotDetection === 'function') {
        // Set up screenshot detection
        ScreenshotDetector.startScreenshotDetection(() => {
          this.handleScreenshotDetected();
        });

        console.log('[WYSPR Screenshot] Detection started');
      } else {
        console.warn('[WYSPR Screenshot] Native detection not available, using fallback');
        this.setupFallbackDetection();
      }

      // Monitor app state changes for additional protection
      const subscription = AppState.addEventListener('change', this.handleAppStateChange);
      this.appStateSubscription = subscription;
    } catch (error) {
      console.error('[WYSPR Screenshot] Failed to initialize protection:', error);
      this.setupFallbackDetection();
    }
  }

  private setupFallbackDetection(): void {
    // Fallback: Blur on app state changes (when user might be taking screenshots)
    console.log('[WYSPR Screenshot] Using fallback detection method');
  }

  private handleScreenshotDetected = (): void => {
    console.log('[WYSPR Screenshot] Screenshot detected!');

    const event: ScreenshotEvent = {
      timestamp: new Date(),
      roomId: this.currentRoomId || undefined,
      detected: true,
      blurred: false,
    };

    try {
      // Immediately blur the interface
      this.activateBlur();
      event.blurred = true;

      // Show security alert
      this.showSecurityAlert();

      // Notify callbacks
      this.detectionCallbacks.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('[WYSPR Screenshot] Callback error:', error);
        }
      });

      // Auto-remove blur after 2 seconds
      setTimeout(() => {
        this.deactivateBlur();
      }, 2000);

    } catch (error) {
      console.error('[WYSPR Screenshot] Failed to handle detection:', error);
    }
  };

  private handleAppStateChange = (nextAppState: string): void => {
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      // Blur when app goes to background (potential screenshot scenario)
      this.activateBlur();
      
      // Auto-remove blur when app becomes active again
      setTimeout(() => {
        if (AppState.currentState === 'active') {
          this.deactivateBlur();
        }
      }, 500);
    } else if (nextAppState === 'active') {
      // Remove blur when app becomes active
      setTimeout(() => {
        this.deactivateBlur();
      }, 200);
    }
  };

  private activateBlur(): void {
    if (!this.isBlurred) {
      this.isBlurred = true;
      console.log('[WYSPR Screenshot] Blur activated');
      
      // Notify all blur callbacks
      this.blurCallbacks.forEach(callback => {
        try {
          callback(true);
        } catch (error) {
          console.error('[WYSPR Screenshot] Blur callback error:', error);
        }
      });
    }
  }

  private deactivateBlur(): void {
    if (this.isBlurred) {
      this.isBlurred = false;
      console.log('[WYSPR Screenshot] Blur deactivated');
      
      // Notify all blur callbacks
      this.blurCallbacks.forEach(callback => {
        try {
          callback(false);
        } catch (error) {
          console.error('[WYSPR Screenshot] Blur callback error:', error);
        }
      });
    }
  }

  private showSecurityAlert(): void {
    Alert.alert(
      '🔒 Security Alert',
      'Screenshot detected! The interface has been temporarily blurred for your privacy.',
      [{ text: 'OK' }],
      { cancelable: true }
    );
  }

  // Public API
  setCurrentRoom(roomId: string | null): void {
    this.currentRoomId = roomId;
  }

  isProtectionActive(): boolean {
    return this.isEnabled;
  }

  isCurrentlyBlurred(): boolean {
    return this.isBlurred;
  }

  // Manually trigger blur (for testing or additional security)
  manualBlur(duration: number = 1000): void {
    this.activateBlur();
    setTimeout(() => {
      this.deactivateBlur();
    }, duration);
  }

  // Event subscription
  onScreenshotDetected(callback: (event: ScreenshotEvent) => void): () => void {
    this.detectionCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.detectionCallbacks.indexOf(callback);
      if (index >= 0) {
        this.detectionCallbacks.splice(index, 1);
      }
    };
  }

  onBlurStateChanged(callback: (shouldBlur: boolean) => void): () => void {
    this.blurCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.blurCallbacks.indexOf(callback);
      if (index >= 0) {
        this.blurCallbacks.splice(index, 1);
      }
    };
  }

  // Cleanup
  cleanup(): void {
    try {
      if (ScreenshotDetector && typeof ScreenshotDetector.stopScreenshotDetection === 'function') {
        ScreenshotDetector.stopScreenshotDetection();
      } else if (ScreenshotDetector) {
        console.log('[WYSPR Screenshot] stopScreenshotDetection method not available, skipping');
      }
      
      if (this.appStateSubscription) {
        this.appStateSubscription.remove();
        this.appStateSubscription = null;
      }
      
      this.detectionCallbacks = [];
      this.blurCallbacks = [];
      this.currentRoomId = null;
      this.isBlurred = false;
      
      console.log('[WYSPR Screenshot] Protection service cleaned up');
    } catch (error) {
      console.error('[WYSPR Screenshot] Cleanup error:', error);
    }
  }
}

// React Hook for easy component integration
export const useScreenshotProtection = (roomId?: string) => {
  const [isBlurred, setIsBlurred] = useState(false);
  const [detectionCount, setDetectionCount] = useState(0);

  useEffect(() => {
    const service = ScreenshotProtectionService.getInstance();
    
    // Set current room
    if (roomId) {
      service.setCurrentRoom(roomId);
    }

    // Subscribe to blur state changes
    const unsubscribeBlur = service.onBlurStateChanged((shouldBlur) => {
      setIsBlurred(shouldBlur);
    });

    // Subscribe to screenshot detection
    const unsubscribeDetection = service.onScreenshotDetected((event) => {
      setDetectionCount(prev => prev + 1);
      console.log('[WYSPR Screenshot] Hook detected screenshot:', event);
    });

    // Cleanup on unmount
    return () => {
      unsubscribeBlur();
      unsubscribeDetection();
      if (roomId) {
        service.setCurrentRoom(null);
      }
    };
  }, [roomId]);

  return {
    isBlurred,
    detectionCount,
    service: ScreenshotProtectionService.getInstance(),
  };
}; 
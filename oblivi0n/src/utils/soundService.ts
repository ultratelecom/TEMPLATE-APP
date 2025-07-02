import { Audio } from 'expo-av';

export class SoundService {
  private static instance: SoundService;
  private sendSound: Audio.Sound | null = null;
  private receiveSound: Audio.Sound | null = null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): SoundService {
    if (!SoundService.instance) {
      SoundService.instance = new SoundService();
    }
    return SoundService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Set audio mode for optimal playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Create send sound (satisfying "swoosh" effect)
      const { sound: sendSound } = await Audio.Sound.createAsync(
        // Using a built-in system sound frequency for now
        // In production, you'd load actual sound files
        { uri: this.generateSendSoundDataUri() },
        { 
          shouldPlay: false,
          volume: 0.7,
          rate: 1.0,
        }
      );
      this.sendSound = sendSound;

      // Create receive sound (gentle notification)
      const { sound: receiveSound } = await Audio.Sound.createAsync(
        { uri: this.generateReceiveSoundDataUri() },
        { 
          shouldPlay: false,
          volume: 0.5,
          rate: 1.0,
        }
      );
      this.receiveSound = receiveSound;

      this.isInitialized = true;
      console.log('[WYSPR Sound] Service initialized');
    } catch (error) {
      console.error('[WYSPR Sound] Failed to initialize:', error);
    }
  }

  async playSendSound(): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (this.sendSound) {
        await this.sendSound.replayAsync();
        console.log('[WYSPR Sound] Send sound played');
      }
    } catch (error) {
      console.error('[WYSPR Sound] Failed to play send sound:', error);
    }
  }

  async playReceiveSound(): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (this.receiveSound) {
        await this.receiveSound.replayAsync();
        console.log('[WYSPR Sound] Receive sound played');
      }
    } catch (error) {
      console.error('[WYSPR Sound] Failed to play receive sound:', error);
    }
  }

  // Generate a satisfying "swoosh" sound for sending messages
  private generateSendSoundDataUri(): string {
    // Create a satisfying swoosh sound using Web Audio API data
    const sampleRate = 44100;
    const duration = 0.3; // 300ms
    const samples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples * 2, true);

    // Generate swoosh sound - frequency sweep with envelope
    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      const progress = i / samples;
      
      // Frequency sweep from 800Hz to 200Hz (swoosh effect)
      const frequency = 800 - (600 * progress);
      
      // Envelope: quick attack, exponential decay
      const envelope = Math.exp(-progress * 8) * (1 - Math.exp(-progress * 50));
      
      // Generate wave with some harmonics for richness
      const wave = Math.sin(2 * Math.PI * frequency * t) * 0.7 +
                   Math.sin(2 * Math.PI * frequency * 2 * t) * 0.2 +
                   Math.sin(2 * Math.PI * frequency * 3 * t) * 0.1;
      
      const sample = Math.floor(wave * envelope * 32767 * 0.8);
      view.setInt16(44 + i * 2, sample, true);
    }

    // Convert to base64 data URI
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return 'data:audio/wav;base64,' + btoa(binary);
  }

  // Generate a gentle notification sound for receiving messages
  private generateReceiveSoundDataUri(): string {
    const sampleRate = 44100;
    const duration = 0.2; // 200ms
    const samples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(buffer);

    // WAV header (same as above)
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples * 2, true);

    // Generate gentle notification - soft bell-like tone
    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      const progress = i / samples;
      
      // Gentle bell frequencies
      const frequency1 = 660; // E5
      const frequency2 = 880; // A5
      
      // Soft envelope
      const envelope = Math.exp(-progress * 6) * Math.sin(progress * Math.PI);
      
      // Bell-like harmonics
      const wave = Math.sin(2 * Math.PI * frequency1 * t) * 0.6 +
                   Math.sin(2 * Math.PI * frequency2 * t) * 0.4;
      
      const sample = Math.floor(wave * envelope * 32767 * 0.5);
      view.setInt16(44 + i * 2, sample, true);
    }

    // Convert to base64 data URI
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return 'data:audio/wav;base64,' + btoa(binary);
  }

  async cleanup(): Promise<void> {
    try {
      if (this.sendSound) {
        await this.sendSound.unloadAsync();
        this.sendSound = null;
      }
      if (this.receiveSound) {
        await this.receiveSound.unloadAsync();
        this.receiveSound = null;
      }
      this.isInitialized = false;
      console.log('[WYSPR Sound] Service cleaned up');
    } catch (error) {
      console.error('[WYSPR Sound] Cleanup error:', error);
    }
  }
} 
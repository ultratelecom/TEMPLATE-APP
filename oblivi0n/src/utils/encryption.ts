import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ENCRYPTION_KEY = 'WYSPR_DISPLAY_NAME_KEY';

// Generate or retrieve device-specific encryption key
const getEncryptionKey = async (): Promise<string> => {
  try {
    let key = await SecureStore.getItemAsync(ENCRYPTION_KEY);
    if (!key) {
      // Generate a new key if none exists
      key = generateRandomKey();
      await SecureStore.setItemAsync(ENCRYPTION_KEY, key);
    }
    return key;
  } catch (error) {
    console.error('[WYSPR Encryption] Failed to get/set encryption key:', error);
    // Fallback to a default key (not ideal for production)
    return 'wyspr_fallback_key_' + Date.now();
  }
};

// Simple key generation (in production, use crypto.getRandomValues or similar)
const generateRandomKey = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Simple XOR encryption (for demo - in production use proper AES)
const xorEncrypt = (text: string, key: string): string => {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    result += String.fromCharCode(charCode);
  }
  return btoa(result); // Base64 encode
};

const xorDecrypt = (encryptedText: string, key: string): string => {
  try {
    const decoded = atob(encryptedText); // Base64 decode
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch (error) {
    console.error('[WYSPR Encryption] Failed to decrypt:', error);
    return '';
  }
};

export const encryptData = async (data: string): Promise<string> => {
  try {
    const key = await getEncryptionKey();
    return xorEncrypt(data, key);
  } catch (error) {
    console.error('[WYSPR Encryption] Encryption failed:', error);
    return data; // Return original data if encryption fails
  }
};

export const decryptData = async (cipherText: string): Promise<string> => {
  try {
    const key = await getEncryptionKey();
    return xorDecrypt(cipherText, key);
  } catch (error) {
    console.error('[WYSPR Encryption] Decryption failed:', error);
    return ''; // Return empty string if decryption fails
  }
};

// Random display names for fallback
export const randomDisplayNames = [
  'Echo', 'Nimbus', 'Zephyr', 'Orion', 'Drift', 'Vanta', 'Quartz', 'Falcon', 
  'Nova', 'Bolt', 'Cipher', 'Ghost', 'Raven', 'Storm', 'Void', 'Shade',
  'Spark', 'Flux', 'Prism', 'Nexus', 'Pulse', 'Vapor', 'Matrix', 'Quantum'
];

export const getRandomDisplayName = (): string => {
  return randomDisplayNames[Math.floor(Math.random() * randomDisplayNames.length)];
}; 
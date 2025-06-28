import { Room, MatrixEvent } from 'matrix-js-sdk';

export interface ChatThread {
  roomId: string;
  pin: string;
  lastMessage?: string;
  lastActivity: Date;
  unreadCount: number;
  isGroup: boolean;
  groupAlias?: string;
  participantCount?: number;
  isAdmin?: boolean;
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  senderPin: string;
  content: string;
  timestamp: Date;
  isEncrypted: boolean;
  isDecrypted: boolean;
}

export interface User {
  id: string;
  pin: string;
  isOnline?: boolean;
}

export interface AuthState {
  isLoggedIn: boolean;
  userId: string | null;
  accessToken: string | null;
}

export interface AppState {
  isLoading: boolean;
  error: string | null;
  currentScreen: 'login' | 'home' | 'chat' | 'addContact';
}

export interface ContactRequest {
  pin: string;
  userId: string;
}

// Navigation types
export type RootStackParamList = {
  Splash: undefined;
  Signup: undefined;
  Login: undefined;
  Home: undefined;
  Chat: {
    roomId: string;
    pin: string;
    isGroup?: boolean;
    groupAlias?: string;
  };
  AddContact: undefined;
  GroupCreation: undefined;
  Profile: {
    pin: string;
    isGroup?: boolean;
  };
};

// Group-related types
export interface GroupCreationData {
  groupPin: string;
  groupAlias?: string;
  participantPins: string[];
}

export interface GroupParticipant {
  pin: string;
  userId: string;
  powerLevel: number;
  isAdmin: boolean;
}

export interface GroupMetadata {
  roomId: string;
  groupPin: string;
  groupAlias?: string;
  createdBy: string;
  createdAt: Date;
  participants: GroupParticipant[];
  isEncrypted: boolean;
}

// Message decryption state
export interface MessageDecryptionState {
  [messageId: string]: {
    isDecrypted: boolean;
    decryptedContent?: string;
  };
}

// PIN validation
export interface PinValidationResult {
  isValid: boolean;
  error?: string;
}

// Matrix room state
export interface RoomState {
  room: Room;
  messages: Message[];
  isLoading: boolean;
  hasMore: boolean;
} 
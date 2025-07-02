// ReadReceiptService - Ephemeral read receipt management
// All data stored in memory only for maximum privacy

export interface ReadReceipt {
  messageId: string;
  roomId: string;
  readBy: string; // User ID who read the message
  readAt: Date;
  isEphemeral: true; // Always true - no persistent storage
}

export interface TypingIndicator {
  roomId: string;
  userPin: string; // PIN for group display, empty for 1-on-1
  isTyping: boolean;
  timestamp: Date;
}

export class ReadReceiptService {
  private static instance: ReadReceiptService;
  private readReceipts: Map<string, ReadReceipt[]> = new Map(); // roomId -> receipts
  private typingIndicators: Map<string, TypingIndicator[]> = new Map(); // roomId -> typing users
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map(); // userId -> timeout

  private constructor() {
    console.log('[WYSPR ReadReceipts] Service initialized (ephemeral mode)');
  }

  static getInstance(): ReadReceiptService {
    if (!ReadReceiptService.instance) {
      ReadReceiptService.instance = new ReadReceiptService();
    }
    return ReadReceiptService.instance;
  }

  // Read Receipt Management
  markMessageAsRead(messageId: string, roomId: string, userId: string): void {
    try {
      const receipt: ReadReceipt = {
        messageId,
        roomId,
        readBy: userId,
        readAt: new Date(),
        isEphemeral: true,
      };

      if (!this.readReceipts.has(roomId)) {
        this.readReceipts.set(roomId, []);
      }

      const roomReceipts = this.readReceipts.get(roomId)!;
      
      // Remove existing receipt for this user/message to avoid duplicates
      const existingIndex = roomReceipts.findIndex(
        r => r.messageId === messageId && r.readBy === userId
      );
      
      if (existingIndex >= 0) {
        roomReceipts[existingIndex] = receipt;
      } else {
        roomReceipts.push(receipt);
      }

      console.log('[WYSPR ReadReceipts] Message marked as read:', {
        messageId: messageId.substring(0, 8),
        roomId: roomId.substring(0, 8),
        userId: userId.substring(0, 8),
      });

      // Clean up old receipts (keep only last 100 per room)
      if (roomReceipts.length > 100) {
        roomReceipts.splice(0, roomReceipts.length - 100);
      }
    } catch (error) {
      console.error('[WYSPR ReadReceipts] Failed to mark message as read:', error);
    }
  }

  getReadReceipts(messageId: string, roomId: string): ReadReceipt[] {
    const roomReceipts = this.readReceipts.get(roomId) || [];
    return roomReceipts.filter(r => r.messageId === messageId);
  }

  isMessageReadBy(messageId: string, roomId: string, userId: string): boolean {
    const receipts = this.getReadReceipts(messageId, roomId);
    return receipts.some(r => r.readBy === userId);
  }

  getReadCount(messageId: string, roomId: string): number {
    return this.getReadReceipts(messageId, roomId).length;
  }

  // Typing Indicator Management
  setTyping(roomId: string, userPin: string, isGroup: boolean): void {
    try {
      const displayPin = isGroup ? userPin : ''; // Anonymous for 1-on-1
      
      if (!this.typingIndicators.has(roomId)) {
        this.typingIndicators.set(roomId, []);
      }

      const roomTyping = this.typingIndicators.get(roomId)!;
      const existingIndex = roomTyping.findIndex(t => t.userPin === displayPin);

      const indicator: TypingIndicator = {
        roomId,
        userPin: displayPin,
        isTyping: true,
        timestamp: new Date(),
      };

      if (existingIndex >= 0) {
        roomTyping[existingIndex] = indicator;
      } else {
        roomTyping.push(indicator);
      }

      // Clear existing timeout
      const timeoutKey = `${roomId}-${userPin}`;
      const existingTimeout = this.typingTimeouts.get(timeoutKey);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Set new timeout to stop typing after 3 seconds
      const timeout = setTimeout(() => {
        this.stopTyping(roomId, userPin, isGroup);
      }, 3000);

      this.typingTimeouts.set(timeoutKey, timeout);

      console.log('[WYSPR ReadReceipts] Typing started:', {
        roomId: roomId.substring(0, 8),
        userPin: isGroup ? userPin : '[anonymous]',
        isGroup,
      });
    } catch (error) {
      console.error('[WYSPR ReadReceipts] Failed to set typing:', error);
    }
  }

  stopTyping(roomId: string, userPin: string, isGroup: boolean): void {
    try {
      const displayPin = isGroup ? userPin : '';
      const roomTyping = this.typingIndicators.get(roomId);
      
      if (roomTyping) {
        const index = roomTyping.findIndex(t => t.userPin === displayPin);
        if (index >= 0) {
          roomTyping.splice(index, 1);
        }
      }

      // Clear timeout
      const timeoutKey = `${roomId}-${userPin}`;
      const existingTimeout = this.typingTimeouts.get(timeoutKey);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        this.typingTimeouts.delete(timeoutKey);
      }

      console.log('[WYSPR ReadReceipts] Typing stopped:', {
        roomId: roomId.substring(0, 8),
        userPin: isGroup ? userPin : '[anonymous]',
        isGroup,
      });
    } catch (error) {
      console.error('[WYSPR ReadReceipts] Failed to stop typing:', error);
    }
  }

  getTypingUsers(roomId: string): TypingIndicator[] {
    const roomTyping = this.typingIndicators.get(roomId) || [];
    const now = new Date();
    
    // Filter out stale typing indicators (older than 5 seconds)
    return roomTyping.filter(t => {
      const age = now.getTime() - t.timestamp.getTime();
      return age < 5000; // 5 seconds
    });
  }

  getTypingText(roomId: string, isGroup: boolean, excludeUserPin?: string): string {
    const typingUsers = this.getTypingUsers(roomId);
    
    // Filter out the current user's typing indicator
    const filteredTypingUsers = excludeUserPin 
      ? typingUsers.filter(t => t.userPin !== excludeUserPin && t.userPin !== '')
      : typingUsers;
    
    if (filteredTypingUsers.length === 0) {
      return '';
    }

    if (!isGroup) {
      // Anonymous for 1-on-1
      return 'typing...';
    }

    // Group chat - show PINs
    if (filteredTypingUsers.length === 1) {
      return `PIN ${filteredTypingUsers[0].userPin} is typing...`;
    } else if (filteredTypingUsers.length === 2) {
      return `PIN ${filteredTypingUsers[0].userPin} and PIN ${filteredTypingUsers[1].userPin} are typing...`;
    } else {
      return `PIN ${filteredTypingUsers[0].userPin} and ${filteredTypingUsers.length - 1} others are typing...`;
    }
  }

  // Memory cleanup
  clearRoomData(roomId: string): void {
    this.readReceipts.delete(roomId);
    this.typingIndicators.delete(roomId);
    
    // Clear related timeouts
    for (const [key, timeout] of this.typingTimeouts.entries()) {
      if (key.startsWith(roomId)) {
        clearTimeout(timeout);
        this.typingTimeouts.delete(key);
      }
    }

    console.log('[WYSPR ReadReceipts] Cleared ephemeral data for room:', roomId.substring(0, 8));
  }

  // Clear all data (logout)
  clearAllData(): void {
    this.readReceipts.clear();
    this.typingIndicators.clear();
    
    // Clear all timeouts
    for (const timeout of this.typingTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.typingTimeouts.clear();

    console.log('[WYSPR ReadReceipts] Cleared all ephemeral data');
  }

  // Get statistics (for debugging)
  getStats(): { rooms: number; receipts: number; typingUsers: number } {
    let totalReceipts = 0;
    let totalTypingUsers = 0;

    for (const receipts of this.readReceipts.values()) {
      totalReceipts += receipts.length;
    }

    for (const typing of this.typingIndicators.values()) {
      totalTypingUsers += typing.length;
    }

    return {
      rooms: this.readReceipts.size,
      receipts: totalReceipts,
      typingUsers: totalTypingUsers,
    };
  }
} 
import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { globalStyles, colors, spacing } from '../utils/theme';
import { RootStackParamList, Message } from '../types';
import { WysprMatrixClient } from '../utils/matrixClient';
import { PinMappingService } from '../utils/pinMapping';
import { NicknameService } from '../utils/nicknames';
import { UserRegistrationService } from '../utils/userRegistration';
import { ReadReceiptService } from '../utils/readReceipts';
import { SoundService } from '../utils/soundService';
import { useScreenshotProtection } from '../utils/screenshotProtection';
import BlurToRevealMessage from '../components/BlurToRevealMessage';
import MessageSendingAnimation from '../components/MessageSendingAnimation';
import BlurOverlay from '../components/BlurOverlay';
import { useFocusEffect } from '@react-navigation/native';

type ChatScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Chat'>;
type ChatScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>;

interface Props {
  navigation: ChatScreenNavigationProp;
  route: ChatScreenRouteProp;
}

export default function ChatScreen({ navigation, route }: Props) {
  const { roomId, pin, isGroup = false, groupAlias } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isGroupAdmin, setIsGroupAdmin] = useState(false);
  const [showAdminActions, setShowAdminActions] = useState(false);
  const [showSendingAnimation, setShowSendingAnimation] = useState(false);
  const [sendingMessage, setSendingMessage] = useState('');
  const [displayName, setDisplayName] = useState(pin);
  const [isOnline, setIsOnline] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [typingText, setTypingText] = useState('');
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const textInputRef = useRef<TextInput>(null);
  
  // Safe area insets for proper UI spacing
  const insets = useSafeAreaInsets();
  
  // Screenshot protection
  const { isBlurred } = useScreenshotProtection(roomId);
  
  // Screen transition animation
  const slideInAnimation = useRef(new Animated.Value(50)).current;
  const fadeInAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Initialize sound service
    const soundService = SoundService.getInstance();
    soundService.initialize().catch(console.error);
    
    // Start entrance animation
    Animated.parallel([
      Animated.timing(slideInAnimation, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fadeInAnimation, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    loadMessages();
    setupMessageListener();
    
    if (isGroup) {
      checkAdminStatus();
    }

    // Keyboard event listeners for better UX
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (event) => {
        setKeyboardHeight(event.endCoordinates.height);
        // Scroll to bottom when keyboard appears with delay
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 250);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    const keyboardWillShowListener = Keyboard.addListener(
      'keyboardWillShow',
      (event) => {
        // Pre-scroll for smoother experience
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 50);
      }
    );
    
    return () => {
      // Cleanup listeners
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
      keyboardWillShowListener?.remove();
      
      // Cleanup sound service
      const soundService = SoundService.getInstance();
      soundService.cleanup().catch(console.error);
    };
  }, [roomId, isGroup, messages.length]);

  useEffect(() => {
    const loadUserData = async () => {
      const userRegistrationService = UserRegistrationService.getInstance();
      const name = await userRegistrationService.getDisplayNameByPin(pin);
      setDisplayName(name);
      
      if (!isGroup) {
        const online = await userRegistrationService.isUserOnline(pin);
        setIsOnline(online);
      }
    };
    
    loadUserData();
  }, [pin, isGroup]);

  // Typing indicator polling
  useEffect(() => {
    const readReceiptService = ReadReceiptService.getInstance();
    const pinService = PinMappingService.getInstance();
    
    const updateTypingIndicator = () => {
      // Get current user's PIN to exclude from typing display
      const currentUserPin = currentUserId ? pinService.getPin(currentUserId) || '??' : '';
      const typing = readReceiptService.getTypingText(roomId, isGroup, currentUserPin);
      setTypingText(typing);
    };

    // Update immediately
    updateTypingIndicator();

    // Poll for typing updates every 500ms
    const interval = setInterval(updateTypingIndicator, 500);

    return () => {
      clearInterval(interval);
    };
  }, [roomId, isGroup, currentUserId]);

  // Update navigation title dynamically
  useLayoutEffect(() => {
    if (displayName && displayName !== pin) {
      // Only update if we have the actual username loaded
      const title = isGroup 
        ? `Group: ${pin}${groupAlias ? ` (${groupAlias})` : ''}`
        : displayName; // displayName is already in "PIN • username" format
      
      navigation.setOptions({
        title: title,
        headerLeft: undefined, // Don't override the default back button, allowing it to show
        // Add online indicator for direct messages
        ...(!isGroup && {
          headerRight: () => (
            <View style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: isOnline ? '#00FF00' : '#666666',
              marginRight: 10,
              borderWidth: 1,
              borderColor: colors.background,
            }} />
          ),
        }),
      });
    }
  }, [navigation, displayName, pin, isGroup, groupAlias, isOnline]);

  useFocusEffect(
    useCallback(() => {
      // Cleanup listeners
    }, [])
  );

  const loadMessages = async () => {
    try {
      setIsLoading(true);
      const matrixClient = WysprMatrixClient.getInstance();
      
      // Get current user ID for message rendering
      const userId = await matrixClient.getCurrentUserId();
      console.log('[WYSPR Chat] Current user ID:', userId);
      if (userId) {
        setCurrentUserId(userId);
        console.log('[WYSPR Chat] Set current user ID state:', userId);
      } else {
        console.warn('[WYSPR Chat] No current user ID found');
      }
      
      // Handle test mode
      if (matrixClient.isInTestMode()) {
        console.log('[WYSPR Chat] Loading test messages for room:', roomId);
        const testMessages = matrixClient.getTestMessages(roomId);
        setMessages(testMessages);
        console.log('[WYSPR Chat] Loaded', testMessages.length, 'test messages');
        return;
      }
      
      // Regular Matrix client mode
      const client = matrixClient.getClient();
      if (!client) return;
      
      const room = client.getRoom(roomId);
      if (!room) return;

      const timeline = room.getLiveTimeline().getEvents();
      const pinService = PinMappingService.getInstance();
      
      const chatMessages: Message[] = timeline
        .filter(event => event.getType() === 'm.room.message')
        .map(event => {
          const senderId = event.getSender();
          // Extract username from Matrix ID format (@username:domain -> username)
          let senderPin = '??';
          if (senderId) {
            // First try the pin mapping service
            senderPin = pinService.getPin(senderId) || '';
            
            // If mapping doesn't exist, extract directly from Matrix ID
            if (!senderPin) {
              const match = senderId.match(/^@([^:]+):/);
              senderPin = match ? match[1] : '??';
            }
          }
          
          console.log(`[WYSPR Chat] Extracting senderPin from ${senderId} -> ${senderPin}`);
          
          return {
            id: event.getId() || '',
            roomId,
            senderId: senderId || '',
            senderPin,
            content: event.getContent().body || '',
            timestamp: new Date(event.getTs()),
            isEncrypted: event.isEncrypted(),
            isDecrypted: false,
          };
        })
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()); // Sort chronologically: oldest first, newest last

      setMessages(chatMessages);
      
    } catch (error) {
      console.error('[WYSPR Chat] Failed to load messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setupMessageListener = () => {
    const matrixClient = WysprMatrixClient.getInstance();
    
    // Skip listeners in test mode
    if (matrixClient.isInTestMode()) {
      console.log('[WYSPR Chat] Test mode: Skipping message listeners');
      return () => {}; // Return empty cleanup function
    }
    
    const client = matrixClient.getClient();
    if (!client) return;

    const onTimeline = (event: any, room: any) => {
      if (room?.roomId === roomId && event.getType() === 'm.room.message') {
        // Check if this is not our own message
        const senderId = event.getSender();
        if (senderId !== currentUserId) {
          // Play receive sound for incoming messages
          const soundService = SoundService.getInstance();
          soundService.playReceiveSound().catch(console.error);
        }
        
        loadMessages(); // Reload messages when new ones arrive
      }
    };

    (client as any).on('Room.timeline', onTimeline);
    
    return () => {
      (client as any).off('Room.timeline', onTimeline);
    };
  };

  const checkAdminStatus = async () => {
    try {
      const matrixClient = WysprMatrixClient.getInstance();
      const admin = await matrixClient.isUserGroupAdmin(roomId);
      setIsGroupAdmin(admin);
      console.log('[WYSPR Chat] Group admin status:', admin);
    } catch (error) {
      console.error('[WYSPR Chat] Failed to check admin status:', error);
    }
  };

  const handleMessageDecrypt = (messageId: string) => {
    console.log('[WYSPR Chat] Message decrypted:', messageId);
    
    // Mark message as read when decrypted
    if (currentUserId) {
      const readReceiptService = ReadReceiptService.getInstance();
      readReceiptService.markMessageAsRead(messageId, roomId, currentUserId);
    }
  };

  const handleMessageBlur = (messageId: string) => {
    console.log('[WYSPR Chat] Message blurred:', messageId);
    // No persistent state - messages auto-blur
  };

  const handleTypingIndicator = (text: string) => {
    const readReceiptService = ReadReceiptService.getInstance();
    const pinService = PinMappingService.getInstance();
    
    if (text.length > 0 && currentUserId) {
      // Get current user's PIN
      const currentUserPin = pinService.getPin(currentUserId) || '??';
      
      // Set typing indicator
      readReceiptService.setTyping(roomId, currentUserPin, isGroup);
      
      // Clear existing timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      
      // Set new timeout to stop typing after 1 second of inactivity
      const timeout = setTimeout(() => {
        readReceiptService.stopTyping(roomId, currentUserPin, isGroup);
      }, 1000);
      
      setTypingTimeout(timeout);
    } else if (currentUserId) {
      // Stop typing immediately if text is empty
      const currentUserPin = pinService.getPin(currentUserId) || '??';
      readReceiptService.stopTyping(roomId, currentUserPin, isGroup);
      
      if (typingTimeout) {
        clearTimeout(typingTimeout);
        setTypingTimeout(null);
      }
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    // Store message for animation and clear input immediately
    const messageToSend = messageText.trim();
    setSendingMessage(messageToSend);
    setMessageText('');
    setShowSendingAnimation(true);
    setIsSending(true);
    
    // Play satisfying send sound immediately for instant feedback
    const soundService = SoundService.getInstance();
    soundService.playSendSound().catch(console.error);
    
    try {
      console.log('[WYSPR Chat] Sending message to room:', roomId);
      
      // Small delay to show the animation
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const matrixClient = WysprMatrixClient.getInstance();
      const result = await matrixClient.sendMessage(roomId, messageToSend);
      
      if (result.success) {
        console.log('[WYSPR Chat] Message sent successfully');
        
        // Reload messages to show the sent message
        setTimeout(() => {
          loadMessages();
        }, 500);
      } else {
        console.error('[WYSPR Chat] Message send failed:', result.error);
        Alert.alert('Send Failed', result.error || 'Failed to send message');
        // Restore message text on failure
        setMessageText(messageToSend);
      }
      
    } catch (error) {
      console.error('[WYSPR Chat] Send message error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
      // Restore message text on error
      setMessageText(messageToSend);
    } finally {
      setIsSending(false);
    }
  };

  const handleAnimationComplete = () => {
    setShowSendingAnimation(false);
    setSendingMessage('');
  };

  const handleInviteParticipant = () => {
    Alert.prompt(
      'Invite to Group',
      'Enter the username of the person to invite:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Invite',
          onPress: async (username) => {
            if (username && username.trim().length >= 2) {
              const matrixClient = WysprMatrixClient.getInstance();
              const result = await matrixClient.inviteToGroup(roomId, username.trim());
              
              if (result.success) {
                Alert.alert('Success', `${username} has been invited to the group.`);
              } else {
                Alert.alert('Invite Failed', result.error || 'Failed to invite participant');
              }
            } else {
              Alert.alert('Invalid Username', 'Please enter a valid username (at least 2 characters)');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const handleRemoveParticipant = () => {
    Alert.prompt(
      'Remove from Group',
      'Enter the username of the person to remove:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async (username) => {
            if (username && username.trim().length >= 2) {
              Alert.alert(
                'Confirm Removal',
                `Are you sure you want to remove ${username} from the group?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                      const matrixClient = WysprMatrixClient.getInstance();
                      const result = await matrixClient.removeFromGroup(roomId, username.trim());
                      
                      if (result.success) {
                        Alert.alert('Success', `${username} has been removed from the group.`);
                      } else {
                        Alert.alert('Remove Failed', result.error || 'Failed to remove participant');
                      }
                    },
                  },
                ]
              );
            } else {
              Alert.alert('Invalid Username', 'Please enter a valid username (at least 2 characters)');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const handleSetNickname = () => {
    if (isGroup) return; // Don't set nicknames for groups
    
    Alert.prompt(
      'Set Nickname',
      `Enter 2-letter initials for PIN ${pin}:`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: clearNickname },
        {
          text: 'Set',
          onPress: async (nickname) => {
            if (nickname) {
              const nicknameService = NicknameService.getInstance();
              const result = await nicknameService.setNickname(pin, nickname);
              
              if (result.success) {
                Alert.alert('Success', `Nickname "${nickname.toUpperCase()}" set for PIN ${pin}`);
              } else {
                Alert.alert('Error', result.error || 'Failed to set nickname');
              }
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const clearNickname = async () => {
    const nicknameService = NicknameService.getInstance();
    await nicknameService.removeNickname(pin);
    Alert.alert('Success', `Nickname cleared for PIN ${pin}`);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    console.log('[WYSPR Chat] Rendering message:', {
      messageId: item.id,
      senderId: item.senderId,
      currentUserIdState: currentUserId,
      senderPin: item.senderPin
    });
    
    return (
      <BlurToRevealMessage
        message={item}
        currentUserId={currentUserId}
        onDecrypt={() => handleMessageDecrypt(item.id)}
        onBlur={() => handleMessageBlur(item.id)}
      />
    );
  };

  const renderEmptyState = () => (
    <View style={[globalStyles.centered, { flex: 1, paddingVertical: spacing.xxl }]}>
      <Text style={[globalStyles.textSecondary, { textAlign: 'center' }]}>
        No messages yet
      </Text>
      <Text style={[globalStyles.textSecondary, { textAlign: 'center', fontSize: 12, marginTop: spacing.sm }]}>
        {isGroup 
          ? `Start the conversation in group ${pin}` 
          : `Send the first message to PIN ${pin}`
        }
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
        enabled={true}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <Animated.View style={[
            globalStyles.container,
            {
              transform: [{ translateY: slideInAnimation }],
              opacity: fadeInAnimation,
            }
          ]}>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ 
                padding: spacing.md,
                paddingTop: Math.max(spacing.md, insets.top), // Account for status bar/notch
                paddingBottom: Math.max(spacing.md, keyboardHeight > 0 ? 20 : spacing.md),
                flexGrow: 1,
              }}
              ListEmptyComponent={renderEmptyState}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => {
                setTimeout(() => {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }, 100);
              }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              maintainVisibleContentPosition={{
                minIndexForVisible: 0,
                autoscrollToTopThreshold: 10,
              }}
            />

            {/* Typing Indicator */}
            {typingText && (
              <View style={{
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs,
                backgroundColor: colors.background,
              }}>
                <Text style={[
                  globalStyles.textSecondary,
                  { 
                    fontSize: 12,
                    fontStyle: 'italic',
                    opacity: 0.8,
                  }
                ]}>
                  {typingText}
                </Text>
              </View>
            )}

            {/* Clean input area with WhatsApp-style spacing */}
            <View style={{
              flexDirection: 'row',
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              paddingBottom: Math.max(spacing.md, insets.bottom + spacing.xs), // Ensure enough space above home indicator/nav bar
              backgroundColor: colors.background,
              alignItems: 'flex-end',
              gap: spacing.sm, // Clean gap between input and send button
            }}>
              {/* Message input container */}
              <View style={{
                flex: 1,
                backgroundColor: colors.surface,
                borderRadius: 22, // More rounded for modern look
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                minHeight: 44, // Standard touch target
                maxHeight: 120, // Taller max for longer messages
                justifyContent: 'center', // Center content vertically
              }}>
                <TextInput
                  ref={textInputRef}
                  style={{
                    color: colors.text,
                    fontSize: 16,
                    lineHeight: 20,
                    maxHeight: 88, // Account for padding
                    minHeight: 20,
                    textAlignVertical: 'center', // Center text vertically on Android
                    paddingTop: 0, // Remove default padding
                    paddingBottom: 0, // Remove default padding
                  }}
                  value={messageText}
                  onChangeText={(text) => {
                    setMessageText(text);
                    handleTypingIndicator(text);
                  }}
                  placeholder={isGroup ? "Message to group..." : "Type encrypted message..."}
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  maxLength={1000}
                  editable={!isSending}
                  scrollEnabled={true}
                  returnKeyType="send"
                  onSubmitEditing={() => {
                    if (messageText.trim() && !isSending) {
                      handleSendMessage();
                    }
                  }}
                  blurOnSubmit={false}
                  onFocus={() => {
                    // Scroll to bottom when input is focused
                    setTimeout(() => {
                      flatListRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                    // Additional scroll after keyboard animation
                    setTimeout(() => {
                      flatListRef.current?.scrollToEnd({ animated: true });
                    }, 400);
                  }}
                />
              </View>
              
              {/* Send button with proper WhatsApp-style icon */}
              <TouchableOpacity
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: messageText.trim() ? '#007AFF' : colors.surface,
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowOpacity: messageText.trim() ? 0.3 : 0.1,
                  shadowRadius: 3,
                  shadowColor: '#007AFF',
                  shadowOffset: { width: 0, height: 2 },
                  elevation: messageText.trim() ? 4 : 2,
                }}
                onPress={handleSendMessage}
                disabled={isSending || !messageText.trim()}
              >
                {isSending ? (
                  <Text style={{
                    fontSize: 16,
                    color: '#FFFFFF',
                  }}>
                    ⏳
                  </Text>
                ) : (
                  // Proper send arrow pointing up-right like WhatsApp
                  <View style={{
                    transform: [{ rotate: '-45deg' }],
                  }}>
                    <Text style={{
                      fontSize: 20,
                      fontWeight: 'bold',
                      color: messageText.trim() ? '#FFFFFF' : colors.textSecondary,
                      textAlign: 'center',
                      marginTop: -2, // Fine-tune positioning
                    }}>
                      →
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

                    {/* Message Sending Animation */}
        <MessageSendingAnimation
          isVisible={showSendingAnimation}
          message={sendingMessage}
          onAnimationComplete={handleAnimationComplete}
        />

        {/* Screenshot Protection Blur Overlay */}
        <BlurOverlay 
          isVisible={isBlurred}
          message="🔒 Screenshot Protection"
        />
      </Animated.View>
    </TouchableWithoutFeedback>
  </KeyboardAvoidingView>
</SafeAreaView>
  );
} 
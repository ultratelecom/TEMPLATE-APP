import React, { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { globalStyles, colors, spacing } from '../utils/theme';
import { RootStackParamList, Message } from '../types';
import { OblivionMatrixClient } from '../utils/matrixClient';
import { PinMappingService } from '../utils/pinMapping';
import { NicknameService } from '../utils/nicknames';
import { UserRegistrationService } from '../utils/userRegistration';
import BlurToRevealMessage from '../components/BlurToRevealMessage';
import MessageSendingAnimation from '../components/MessageSendingAnimation';
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
  const flatListRef = useRef<FlatList>(null);
  
  // Screen transition animation
  const slideInAnimation = useRef(new Animated.Value(50)).current;
  const fadeInAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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
    
    return () => {
      // Cleanup listeners
    };
  }, [roomId, isGroup]);

  useEffect(() => {
    const userRegistrationService = UserRegistrationService.getInstance();
    userRegistrationService.getDisplayNameByPin(pin).then(setDisplayName);
  }, [pin]);

  useFocusEffect(
    useCallback(() => {
      // Cleanup listeners
    }, [])
  );

  const loadMessages = async () => {
    try {
      setIsLoading(true);
      const matrixClient = OblivionMatrixClient.getInstance();
      
      // Get current user ID for message rendering
      const userId = await matrixClient.getCurrentUserId();
      console.log('[OBLIVI0N Chat] Current user ID:', userId);
      if (userId) {
        setCurrentUserId(userId);
        console.log('[OBLIVI0N Chat] Set current user ID state:', userId);
      } else {
        console.warn('[OBLIVI0N Chat] No current user ID found');
      }
      
      // Handle test mode
      if (matrixClient.isInTestMode()) {
        console.log('[OBLIVI0N Chat] Loading test messages for room:', roomId);
        const testMessages = matrixClient.getTestMessages(roomId);
        setMessages(testMessages);
        console.log('[OBLIVI0N Chat] Loaded', testMessages.length, 'test messages');
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
          const senderPin = pinService.getPin(senderId || '') || '??';
          
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
        .reverse(); // Most recent last

      setMessages(chatMessages);
      
    } catch (error) {
      console.error('[OBLIVI0N Chat] Failed to load messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setupMessageListener = () => {
    const matrixClient = OblivionMatrixClient.getInstance();
    
    // Skip listeners in test mode
    if (matrixClient.isInTestMode()) {
      console.log('[OBLIVI0N Chat] Test mode: Skipping message listeners');
      return () => {}; // Return empty cleanup function
    }
    
    const client = matrixClient.getClient();
    if (!client) return;

    const onTimeline = (event: any, room: any) => {
      if (room?.roomId === roomId && event.getType() === 'm.room.message') {
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
      const matrixClient = OblivionMatrixClient.getInstance();
      const admin = await matrixClient.isUserGroupAdmin(roomId);
      setIsGroupAdmin(admin);
      console.log('[OBLIVI0N Chat] Group admin status:', admin);
    } catch (error) {
      console.error('[OBLIVI0N Chat] Failed to check admin status:', error);
    }
  };

  const handleMessageDecrypt = (messageId: string) => {
    console.log('[OBLIVI0N Chat] Message decrypted:', messageId);
    // No persistent state - messages are decrypted temporarily only
  };

  const handleMessageBlur = (messageId: string) => {
    console.log('[OBLIVI0N Chat] Message blurred:', messageId);
    // No persistent state - messages auto-blur
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    // Store message for animation and clear input immediately
    const messageToSend = messageText.trim();
    setSendingMessage(messageToSend);
    setMessageText('');
    setShowSendingAnimation(true);
    setIsSending(true);
    
    try {
      console.log('[OBLIVI0N Chat] Sending message to room:', roomId);
      
      // Small delay to show the animation
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const matrixClient = OblivionMatrixClient.getInstance();
      const result = await matrixClient.sendMessage(roomId, messageToSend);
      
      if (result.success) {
        console.log('[OBLIVI0N Chat] Message sent successfully');
        
        // Reload messages to show the sent message
        setTimeout(() => {
          loadMessages();
        }, 500);
      } else {
        console.error('[OBLIVI0N Chat] Message send failed:', result.error);
        Alert.alert('Send Failed', result.error || 'Failed to send message');
        // Restore message text on failure
        setMessageText(messageToSend);
      }
      
    } catch (error) {
      console.error('[OBLIVI0N Chat] Send message error:', error);
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
      'Enter the 2-digit PIN of the person to invite:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Invite',
          onPress: async (pin) => {
            if (pin && /^\d{2}$/.test(pin)) {
              const matrixClient = OblivionMatrixClient.getInstance();
              const result = await matrixClient.inviteToGroup(roomId, pin);
              
              if (result.success) {
                Alert.alert('Success', `PIN ${pin} has been invited to the group.`);
              } else {
                Alert.alert('Invite Failed', result.error || 'Failed to invite participant');
              }
            } else {
              Alert.alert('Invalid PIN', 'Please enter a valid 2-digit PIN');
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
      'Enter the 2-digit PIN of the person to remove:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async (pin) => {
            if (pin && /^\d{2}$/.test(pin)) {
              Alert.alert(
                'Confirm Removal',
                `Are you sure you want to remove PIN ${pin} from the group?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                      const matrixClient = OblivionMatrixClient.getInstance();
                      const result = await matrixClient.removeFromGroup(roomId, pin);
                      
                      if (result.success) {
                        Alert.alert('Success', `PIN ${pin} has been removed from the group.`);
                      } else {
                        Alert.alert('Remove Failed', result.error || 'Failed to remove participant');
                      }
                    },
                  },
                ]
              );
            } else {
              Alert.alert('Invalid PIN', 'Please enter a valid 2-digit PIN');
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
    console.log('[OBLIVI0N Chat] Rendering message:', {
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
      <Animated.View style={[
        globalStyles.container,
        {
          transform: [{ translateY: slideInAnimation }],
          opacity: fadeInAnimation,
        }
      ]}>
        {/* Direct Message Header */}
        {!isGroup && (
          <TouchableOpacity 
            style={[globalStyles.messageContainer, { margin: spacing.md, marginBottom: spacing.sm }]}
            onPress={() => navigation.navigate('Profile', { pin, isGroup: false })}
            onLongPress={handleSetNickname}
          >
            <View style={globalStyles.row}>
              {/* PIN Badge with Online Indicator */}
              <View style={{ position: 'relative', marginRight: spacing.sm }}>
                <View style={globalStyles.pinBadge}>
                  <Text style={globalStyles.pinText}>{pin}</Text>
                </View>
                
                {/* Online Status Indicator */}
                <View style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: Math.random() > 0.3 ? '#00FF00' : '#666666', // Simulate online status
                  borderWidth: 1,
                  borderColor: colors.background,
                }} />
              </View>
              
              <View style={{ flex: 1 }}>
                <Text style={[globalStyles.text, { fontSize: 16 }]}>
                  {displayName}
                </Text>
                <Text style={[globalStyles.textSecondary, { fontSize: 10, marginTop: spacing.xs }]}>
                  • Tap for profile • Long press to set nickname
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        
        {/* Group Info Header */}
        {isGroup && (
          <TouchableOpacity
            style={[globalStyles.messageContainer, { margin: spacing.md, marginBottom: spacing.sm }]}
            onPress={() => navigation.navigate('Profile', { pin, isGroup: true })}
            onLongPress={() => isGroupAdmin && setShowAdminActions(!showAdminActions)}
          >
            <View style={[globalStyles.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
              <View style={globalStyles.row}>
                {/* Group PIN Badge */}
                <View style={{ marginRight: spacing.sm }}>
                  <View style={[globalStyles.pinBadge, { backgroundColor: colors.button }]}>
                    <Text style={globalStyles.pinText}>{pin}</Text>
                  </View>
                </View>
                
                <View style={{ flex: 1 }}>
                  <Text style={[globalStyles.text, { fontSize: 16 }]}>
                    Group: {pin}
                  </Text>
                  {groupAlias && (
                    <Text style={[globalStyles.textSecondary, { fontSize: 12, marginTop: spacing.xs }]}>
                      {groupAlias}
                    </Text>
                  )}
                  <Text style={[globalStyles.textSecondary, { fontSize: 10, marginTop: spacing.xs }]}>
                    • Tap for profile {isGroupAdmin ? '• Long press for admin' : ''}
                  </Text>
                </View>
              </View>
              
              {isGroupAdmin && showAdminActions && (
                <View style={{ alignItems: 'center' }}>
                  <Text style={[globalStyles.textSecondary, { fontSize: 8 }]}>ADMIN</Text>
                </View>
              )}
            </View>
            
            {/* Admin Actions */}
            {isGroupAdmin && showAdminActions && (
              <View style={[globalStyles.row, { marginTop: spacing.sm, gap: spacing.sm }]}>
                <TouchableOpacity
                  style={[globalStyles.button, { flex: 1, paddingVertical: spacing.xs }]}
                  onPress={handleInviteParticipant}
                >
                  <Text style={[globalStyles.buttonText, { fontSize: 11 }]}>
                    ADD PIN
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[globalStyles.button, { flex: 1, paddingVertical: spacing.xs }]}
                  onPress={handleRemoveParticipant}
                >
                  <Text style={[globalStyles.buttonText, { fontSize: 11 }]}>
                    REMOVE PIN
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        )}
        
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ 
            padding: spacing.md,
            paddingTop: spacing.xs, // Always reduced padding since we now have headers
            flexGrow: 1,
          }}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            if (messages.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: true });
            }
          }}
        />

        {/* Clean input area with WhatsApp-style spacing */}
        <View style={{
          flexDirection: 'row',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          paddingBottom: spacing.md,
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
              onChangeText={setMessageText}
              placeholder={isGroup ? "Message to group..." : "Type encrypted message..."}
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={1000}
              editable={!isSending}
              scrollEnabled={true}
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
      </Animated.View>
    </SafeAreaView>
  );
} 
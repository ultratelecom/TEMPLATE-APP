import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  RefreshControl,
  Alert,
  Pressable,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import { globalStyles, colors, spacing } from '../utils/theme';
import { RootStackParamList, ChatThread } from '../types';
import { WysprMatrixClient } from '../utils/matrixClient';
import { PinMappingService } from '../utils/pinMapping';
import { UserRegistrationService } from '../utils/userRegistration';
import FloatingContactRequests from '../components/FloatingContactRequests';

type ChatsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: ChatsScreenNavigationProp;
}

// Separate component for chat thread items
const ChatThreadItem = ({ item, navigation, onChatPress, onDelete, isSelectionMode, isSelected, onLongPress, onAcceptInvitation, onRejectInvitation }: { 
  item: ChatThread, 
  navigation: ChatsScreenNavigationProp,
  onChatPress: (thread: ChatThread) => void,
  onDelete: (thread: ChatThread) => void,
  isSelectionMode: boolean,
  isSelected: boolean,
  onLongPress: (thread: ChatThread) => void,
  onAcceptInvitation?: (thread: ChatThread) => void,
  onRejectInvitation?: (thread: ChatThread) => void
}) => {
  const [displayName, setDisplayName] = useState(item.pin);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const loadDisplayData = async () => {
      const userRegistrationService = UserRegistrationService.getInstance();
      const name = await userRegistrationService.getDisplayNameByPin(item.pin);
      setDisplayName(name);
      
      if (!item.isGroup) {
        const online = await userRegistrationService.isUserOnline(item.pin);
        setIsOnline(online);
      }
    };
    
    // Debug logging for invitations
    if (item.isInvite) {
      console.log(`[WYSPR UI] ChatThreadItem for invitation: ${item.roomId}, isInvite: ${item.isInvite}`);
    }
    
    loadDisplayData();
  }, [item.pin, item.isGroup, item.isInvite]);

  const handlePinPress = () => {
    navigation.navigate('Profile', {
      pin: item.pin,
      isGroup: item.isGroup,
    });
  };

  return (
    <TouchableOpacity
      style={[
        globalStyles.messageContainer, 
        { marginBottom: spacing.sm },
        isSelected && { backgroundColor: colors.surface, borderColor: colors.button, borderWidth: 2 },
        item.isInvite && { borderColor: colors.button, borderWidth: 1, borderStyle: 'dashed' }
      ]}
      onPress={() => onChatPress(item)}
      onLongPress={() => !isSelectionMode && !item.isInvite && onLongPress(item)}
    >
      <View style={[globalStyles.row, { justifyContent: 'space-between' }]}>
        <View style={globalStyles.row}>
          {/* Selection Checkbox */}
          {isSelectionMode && (
            <View style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              borderWidth: 2,
              borderColor: isSelected ? colors.button : colors.border,
              backgroundColor: isSelected ? colors.button : 'transparent',
              marginRight: spacing.sm,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {isSelected && (
                <Text style={{ color: colors.background, fontSize: 14, fontWeight: 'bold' }}>
                  ✓
                </Text>
              )}
            </View>
          )}
          
          {/* Clickable PIN Badge with Online Indicator */}
          <TouchableOpacity 
            onPress={handlePinPress}
            style={{ position: 'relative' }}
          >
            <View style={[
              globalStyles.pinBadge,
              item.isGroup && { backgroundColor: colors.button }
            ]}>
              <Text style={globalStyles.pinText}>{item.pin}</Text>
            </View>
            
            {/* Online Status Indicator */}
            {!item.isGroup && (
              <View style={{
                position: 'absolute',
                top: -2,
                right: -2,
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: isOnline ? '#00FF00' : '#666666',
                borderWidth: 1,
                borderColor: colors.background,
              }} />
            )}
          </TouchableOpacity>
          
          <View style={{ marginLeft: spacing.md }}>
            <View style={globalStyles.row}>
              <Text style={globalStyles.text}>
                {item.isGroup ? `Group: ${item.pin}` : displayName}
              </Text>
              {item.isGroup && item.groupAlias && (
                <Text style={[globalStyles.textSecondary, { marginLeft: spacing.xs }]}>
                  ({item.groupAlias})
                </Text>
              )}
              {item.isGroup && item.isAdmin && (
                <Text style={[globalStyles.textSecondary, { marginLeft: spacing.xs, fontSize: 10 }]}>
                  • Admin
                </Text>
              )}
              {/* Online Status Text */}
              {!item.isGroup && (
                <Text style={[globalStyles.textSecondary, { marginLeft: spacing.xs, fontSize: 10 }]}>
                  • {isOnline ? 'Online' : 'Offline'}
                </Text>
              )}
            </View>
            {/* SECURITY FIX: No message preview, just secure status */}
            {item.isInvite ? (
              <Text style={[globalStyles.textSecondary, { marginTop: spacing.xs, color: colors.button }]}>
                🔔 {item.isGroup ? 'Group invitation' : 'Chat invitation'}
              </Text>
            ) : (
              <Text style={[globalStyles.textSecondary, { marginTop: spacing.xs }]}>
                {item.unreadCount > 0 ? '🔒 New encrypted messages' : '🔒 Encrypted conversation'}
              </Text>
            )}
            {item.isGroup && item.participantCount && (
              <Text style={[globalStyles.textSecondary, { fontSize: 10, marginTop: spacing.xs }]}>
                {item.participantCount} participants
              </Text>
            )}
          </View>
        </View>
        
        <View style={{ alignItems: 'flex-end' }}>
          {item.isInvite ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => onRejectInvitation?.(item)}
                style={{
                  backgroundColor: '#EF4444',
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs,
                  borderRadius: 4,
                  marginRight: spacing.xs,
                }}
              >
                <Text style={{ color: 'white', fontSize: 12, fontWeight: '500' }}>
                  Reject
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onAcceptInvitation?.(item)}
                style={{
                  backgroundColor: colors.button,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs,
                  borderRadius: 4,
                }}
              >
                <Text style={{ color: colors.background, fontSize: 12, fontWeight: '500' }}>
                  Accept
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={[globalStyles.textSecondary, { fontSize: 12 }]}>
                {item.lastActivity.toLocaleDateString()}
              </Text>
              {item.unreadCount > 0 && (
                <View style={[globalStyles.pinBadge, { marginTop: spacing.xs, minWidth: 20 }]}>
                  <Text style={[globalStyles.pinText, { fontSize: 10 }]}>
                    {item.unreadCount}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function ChatsScreen({ navigation }: Props) {
  console.error(`🚨🚨🚨 CHATS SCREEN FUNCTION CALLED 🚨🚨🚨`);
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedThreads, setSelectedThreads] = useState<Set<string>>(new Set());
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const [mountCount, setMountCount] = useState(0);
  const [componentId] = useState(() => Math.random().toString(36).substr(2, 9));

  console.log(`[WYSPR Chats] ChatsScreen rendered - ID: ${componentId}, mountCount: ${mountCount}, hasInitiallyLoaded: ${hasInitiallyLoaded}`);
  
  // Add a regular useEffect to ensure we see mounting logs
  useEffect(() => {
    console.log(`[WYSPR Chats] useEffect mount triggered - ID: ${componentId}`);
    setMountCount(prev => {
      const newCount = prev + 1;
      console.log(`[WYSPR Chats] ChatsScreen mounted for the ${newCount} time - ID: ${componentId}, hasInitiallyLoaded: ${hasInitiallyLoaded}`);
      return newCount;
    });

    // Listen for Matrix sync events to reload when rooms become available
    const matrixClient = WysprMatrixClient.getInstance();
    const client = matrixClient.getClient();
    
    const handleSyncStateChange = (state: string) => {
      console.log(`[WYSPR Chats] Sync state changed to: ${state} - ID: ${componentId}`);
      
      if (state === 'PREPARED') {
        console.log(`[WYSPR Chats] Sync completed - reloading chats - ID: ${componentId}`);
        // Small delay to ensure rooms are fully available
        setTimeout(() => {
          loadChatThreads(5000); // Shorter timeout since client should be ready
        }, 500);
      }
    };

    if (client && !matrixClient.isInTestMode()) {
      console.log(`[WYSPR Chats] Adding sync listener - ID: ${componentId}`);
      client.on('sync' as any, handleSyncStateChange);
    }

    return () => {
      console.log(`[WYSPR Chats] ChatsScreen unmounting - ID: ${componentId}`);
      if (client && !matrixClient.isInTestMode()) {
        console.log(`[WYSPR Chats] Removing sync listener - ID: ${componentId}`);
        client.off('sync' as any, handleSyncStateChange);
      }
    };
  }, [componentId]); // Only depend on componentId, not hasInitiallyLoaded



    // Use useFocusEffect for reliable loading - always load, but track if it's the first time
  useFocusEffect(
    useCallback(() => {
      console.log(`[WYSPR Chats] *** useFocusEffect TRIGGERED *** - ID: ${componentId}, hasInitiallyLoaded: ${hasInitiallyLoaded}, mountCount: ${mountCount}`);
      
      const performLoad = async () => {
        try {
          const matrixClient = WysprMatrixClient.getInstance();
          const client = matrixClient.getClient();
          
          // Check if client is null (possibly due to token expiration)
          if (!client && !matrixClient.isInTestMode()) {
            console.warn(`[WYSPR Chats] Matrix client is null - likely token expired, staying on empty state`);
            setChatThreads([]);
            return;
          }
          
          // Always load chats when screen comes into focus
          console.log(`[WYSPR Chats] Loading chats - ID: ${componentId}, loadCount: ${mountCount}, isFirstLoad: ${!hasInitiallyLoaded}`);
          await loadChatThreads(10000);
          
          if (!hasInitiallyLoaded) {
            console.log(`[WYSPR Chats] Marking as initially loaded - ID: ${componentId}`);
            setHasInitiallyLoaded(true);
          }
          
          console.log(`[WYSPR Chats] Load completed successfully - ID: ${componentId}`);
        } catch (error) {
          console.error(`[WYSPR Chats] Load failed - ID: ${componentId}:`, error);
          
          // If it's a token error, clear the chat threads to show empty state
          if (error && typeof error === 'object' && 'message' in error) {
            const errorMessage = (error as any).message || '';
            if (errorMessage.includes('M_UNKNOWN_TOKEN') || errorMessage.includes('401')) {
              console.warn(`[WYSPR Chats] Token error detected, clearing chats`);
              setChatThreads([]);
            }
          }
        }
      };

      performLoad();
    }, [componentId, hasInitiallyLoaded, mountCount])
  );

  const loadChatThreads = async (timeoutMs: number = 10000) => {
    console.warn(`🚀 LOAD CHAT THREADS ENTRY POINT - timeout: ${timeoutMs}ms`);
    try {
      console.log(`[WYSPR Chats] === loadChatThreads START === timeout: ${timeoutMs}ms`);
      const startTime = Date.now();
      console.warn(`🚀 About to setIsLoading(true)`);
      setIsLoading(true);
      console.warn(`🚀 setIsLoading(true) completed`);
      const matrixClient = WysprMatrixClient.getInstance();
      
      // Detailed state logging before waiting
      const client = matrixClient.getClient();
      const userId = client?.getUserId();
      console.log(`[WYSPR Chats] loadChatThreads called - timeout: ${timeoutMs}ms, client exists: ${!!client}, userId: ${userId}, isTestMode: ${matrixClient.isInTestMode()}`);
      
      // Wait for Matrix client to be available
      console.log('[WYSPR Chats] Waiting for Matrix client...');
      const isReady = await matrixClient.waitForClientReady(timeoutMs);
      console.log(`[WYSPR Chats] Client ready result: ${isReady}, testMode: ${matrixClient.isInTestMode()}`);
      
      if (!isReady && !matrixClient.isInTestMode()) {
        console.warn('[WYSPR Chats] Matrix client not ready - likely token expired or connection issue');
        setChatThreads([]);
        setIsLoading(false);
        console.log('[WYSPR Chats] === loadChatThreads END (client not ready) ===');
        return;
      }
      
      if (isReady || matrixClient.isInTestMode()) {
        console.log('[WYSPR Chats] Matrix client available, loading rooms');
        
        // Additional check to ensure client is actually functional
        const client = matrixClient.getClient();
        if (!client && !matrixClient.isInTestMode()) {
          console.warn('[WYSPR Chats] Matrix client ready but getClient() returns null - token likely expired');
          setChatThreads([]);
          setIsLoading(false);
          console.log('[WYSPR Chats] === loadChatThreads END (client null) ===');
          return;
        }
        
        console.log('[WYSPR Chats] About to debug room availability...');
        // Debug room availability immediately
        await matrixClient.debugRoomAvailability(0);
        console.log('[WYSPR Chats] Completed immediate room debug');
        
        // Also check after a small delay to see if rooms appear
        setTimeout(() => {
          console.log('[WYSPR Chats] Running 1s delayed room debug...');
          matrixClient.debugRoomAvailability(0);
        }, 1000);
        
        setTimeout(() => {
          console.log('[WYSPR Chats] Running 3s delayed room debug...');
          matrixClient.debugRoomAvailability(0);
        }, 3000);
      }
      
      const pinService = PinMappingService.getInstance();
      console.log(`[WYSPR Chats] PinService obtained, testMode: ${matrixClient.isInTestMode()}`);
      
      // Handle test mode
      if (matrixClient.isInTestMode()) {
        console.log('[WYSPR Chats] Loading test chat threads');
        
        const testThreads: ChatThread[] = [
          // Direct messages - NO MESSAGE PREVIEWS FOR SECURITY
          {
            roomId: 'test-room-20',
            pin: '20',
            lastMessage: '', // SECURITY: No preview
            lastActivity: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
            unreadCount: 2,
            isGroup: false,
          },
          {
            roomId: 'test-room-21',
            pin: '21',
            lastMessage: '', // SECURITY: No preview
            lastActivity: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
            unreadCount: 0,
            isGroup: false,
          },
          {
            roomId: 'test-room-22',
            pin: '22',
            lastMessage: '', // SECURITY: No preview
            lastActivity: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
            unreadCount: 1,
            isGroup: false,
          },
          // Group chat
          {
            roomId: 'test-group-GR17',
            pin: 'GR17',
            lastMessage: '', // SECURITY: No preview
            lastActivity: new Date(Date.now() - 90 * 60 * 1000), // 90 minutes ago
            unreadCount: 3,
            isGroup: true,
            groupAlias: 'Dev Team',
            participantCount: 3,
            isAdmin: true,
          },
        ];
        
        setChatThreads(testThreads);
        console.log('[WYSPR Chats] Loaded', testThreads.length, 'test chat threads');
        console.log('[WYSPR Chats] === loadChatThreads END (test mode) ===');
        return;
      }

      console.log('[WYSPR Chats] About to call matrixClient.getRooms()...');
      // Regular Matrix client mode with group membership persistence
      const rooms = matrixClient.getRooms();
      console.log(`[WYSPR Chats] Got ${rooms.length} rooms from matrixClient.getRooms()`);
      
      const roomMetadata = await matrixClient.getRoomMetadata();
      console.log(`[WYSPR Chats] Got room metadata: ${roomMetadata.length} entries`);
      
      const threads: ChatThread[] = [];
      const currentUserId = await matrixClient.getCurrentUserId();
      console.log(`[WYSPR Chats] Current user ID: ${currentUserId}`);

      console.log(`[WYSPR Chats] Processing ${rooms.length} rooms...`);
      for (const room of rooms) {
        const metadata = roomMetadata.find((rm: any) => rm.roomId === room.roomId);
        
        // Check if it's a group or direct message using the helper method
        const isGroupRoom = matrixClient.isGroupRoom(room.roomId);
        const memberCount = matrixClient.getRoomMemberCount(room.roomId);
        const isInvite = matrixClient.isRoomInvite(room.roomId);
        
        console.log(`[WYSPR Chats] Processing room ${room.roomId}: isGroup=${isGroupRoom}, memberCount=${memberCount}, isInvite=${isInvite}`);
        
        if (isGroupRoom) {
          // Handle group room - NO MESSAGE PREVIEW
          const roomName = room.name || (room.getCanonicalAlias ? room.getCanonicalAlias() : null) || metadata?.alias;
          const groupPin = roomName || `GR${room.roomId.substring(1, 4)}`;
          
          threads.push({
            roomId: room.roomId,
            pin: groupPin,
            lastMessage: '', // SECURITY: No preview
            lastActivity: new Date(),
            unreadCount: room.getUnreadNotificationCount ? room.getUnreadNotificationCount() : 0,
            isGroup: true,
            groupAlias: roomName,
            participantCount: memberCount,
            isAdmin: metadata?.isAdmin || false,
            isInvite: isInvite,
          });
        } else {
          // Handle direct message - NO MESSAGE PREVIEW
          const members = room.getJoinedMembers ? room.getJoinedMembers() : [];
          const otherMember = members.find((member: any) => member.userId !== currentUserId);
          
          if (otherMember) {
            // Extract username from Matrix ID (@username:domain -> username)
            const username = otherMember.userId.split(':')[0].substring(1);
            
            if (username) {
              const timeline = room.getLiveTimeline ? room.getLiveTimeline().getEvents() : [];
              const lastEvent = timeline[timeline.length - 1];
              
              threads.push({
                roomId: room.roomId,
                pin: username,
                lastMessage: '', // SECURITY: No preview
                lastActivity: lastEvent ? new Date(lastEvent.getTs()) : new Date(),
                unreadCount: room.getUnreadNotificationCount ? room.getUnreadNotificationCount() : 0,
                isGroup: false,
                isInvite: isInvite,
              });
            }
          }
        }
      }

      console.log('[WYSPR Chats] Loaded', threads.length, 'chat threads:', threads.map(t => ({ pin: t.pin, isGroup: t.isGroup, isInvite: t.isInvite, roomId: t.roomId })));

      // Sort by last activity
      threads.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
      setChatThreads(threads);
      
      const endTime = Date.now();
      console.log(`[WYSPR Chats] loadChatThreads completed in ${endTime - startTime}ms`);
      console.log('[WYSPR Chats] === loadChatThreads END (success) ===');
    } catch (error) {
      console.error('[WYSPR Chats] Failed to load chat threads:', error);
      console.log('[WYSPR Chats] === loadChatThreads END (error) ===');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadChatThreads();
  };

  const handleChatPress = (thread: ChatThread) => {
    if (isSelectionMode) {
      toggleThreadSelection(thread.roomId);
    } else if (thread.isInvite) {
      // For invitations, show accept/reject options instead of opening chat
      const title = thread.isGroup ? 'Group Invitation' : 'Chat Invitation';
      const message = thread.isGroup 
        ? `You've been invited to join the group "${thread.groupAlias || thread.pin}". Would you like to accept?`
        : `You've been invited to chat with ${thread.pin}. Would you like to accept?`;

      Alert.alert(
        title,
        message,
        [
          {
            text: 'Reject',
            style: 'destructive',
            onPress: () => handleRejectInvitation(thread),
          },
          {
            text: 'Accept',
            onPress: () => handleAcceptInvitation(thread),
          },
        ]
      );
    } else {
      navigation.navigate('Chat', {
        roomId: thread.roomId,
        pin: thread.pin,
        isGroup: thread.isGroup,
        groupAlias: thread.groupAlias,
      });
    }
  };

  const toggleThreadSelection = (roomId: string) => {
    setSelectedThreads(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(roomId)) {
        newSelection.delete(roomId);
      } else {
        newSelection.add(roomId);
      }
      return newSelection;
    });
  };

  const enterSelectionMode = (initialThreadId?: string) => {
    setIsSelectionMode(true);
    if (initialThreadId) {
      setSelectedThreads(new Set([initialThreadId]));
    }
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedThreads(new Set());
  };

  const selectAll = () => {
    setSelectedThreads(new Set(chatThreads.map(thread => thread.roomId)));
  };

  const deselectAll = () => {
    setSelectedThreads(new Set());
  };

  const handleAcceptInvitation = async (thread: ChatThread) => {
    try {
      const startTime = Date.now();
      console.log(`[WYSPR Chats] Starting invitation acceptance for ${thread.roomId}`);
      const matrixClient = WysprMatrixClient.getInstance();
      const result = await matrixClient.acceptRoomInvitation(thread.roomId);
      
      if (result.success) {
        // Immediately refresh since Matrix handles sync automatically
        console.log('[WYSPR Chats] Invitation accepted, refreshing chat list');
        await loadChatThreads();
        const endTime = Date.now();
        console.log(`[WYSPR Chats] Invitation acceptance completed in ${endTime - startTime}ms`);
      } else {
        Alert.alert('Error', result.error || 'Failed to accept invitation');
      }
    } catch (error) {
      console.error('[WYSPR Chats] Accept invitation failed:', error);
      Alert.alert('Error', 'Failed to accept invitation');
    }
  };

  const handleRejectInvitation = (thread: ChatThread) => {
    const title = thread.isGroup ? 'Reject Group Invitation' : 'Reject Chat Invitation';
    const message = thread.isGroup 
      ? `Are you sure you want to reject the invitation to join "${thread.groupAlias || thread.pin}"?`
      : `Are you sure you want to reject the chat invitation from ${thread.pin}?`;

    Alert.alert(
      title,
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              const startTime = Date.now();
              console.log(`[WYSPR Chats] Starting invitation rejection for ${thread.roomId}`);
              const matrixClient = WysprMatrixClient.getInstance();
              const result = await matrixClient.rejectRoomInvitation(thread.roomId);
              
              if (result.success) {
                // Immediately refresh the chat list since rejection method now waits for sync
                console.log('[WYSPR Chats] Invitation rejected, refreshing chat list');
                await loadChatThreads();
                const endTime = Date.now();
                console.log(`[WYSPR Chats] Invitation rejection completed in ${endTime - startTime}ms`);
              } else {
                Alert.alert('Error', result.error || 'Failed to reject invitation');
              }
            } catch (error) {
              console.error('[WYSPR Chats] Reject invitation failed:', error);
              Alert.alert('Error', 'Failed to reject invitation');
            }
          },
        },
      ]
    );
  };

  const handleDeleteChat = (thread: ChatThread) => {
    const title = thread.isGroup ? `Delete Group Chat` : `Delete Conversation`;
    const message = thread.isGroup 
      ? `Are you sure you want to leave the group "${thread.groupAlias || thread.pin}"? You will no longer receive messages from this group.`
      : `Are you sure you want to delete your conversation with ${thread.pin}? This will remove the chat from your conversations list.`;

    Alert.alert(
      title,
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: thread.isGroup ? 'Leave Group' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const matrixClient = WysprMatrixClient.getInstance();
              const result = await matrixClient.leaveRoom(thread.roomId);
              
              if (result.success) {
                // Small delay to allow Matrix client to sync the room leave
                setTimeout(() => {
                  loadChatThreads();
                }, 500);
              } else {
                Alert.alert('Error', result.error || 'Failed to delete conversation');
              }
            } catch (error) {
              console.error('[WYSPR Chats] Delete failed:', error);
              Alert.alert('Error', 'Failed to delete conversation');
            }
          },
        },
      ]
    );
  };

  const handleBulkDelete = () => {
    const selectedCount = selectedThreads.size;
    if (selectedCount === 0) return;

    const selectedThreadsList = chatThreads.filter(thread => selectedThreads.has(thread.roomId));
    const groupCount = selectedThreadsList.filter(thread => thread.isGroup).length;
    const dmCount = selectedCount - groupCount;
    
    let title = 'Delete Selected Conversations';
    let message = `Are you sure you want to delete ${selectedCount} conversation${selectedCount > 1 ? 's' : ''}?`;
    
    if (groupCount > 0 && dmCount > 0) {
      message = `Are you sure you want to delete ${dmCount} conversation${dmCount > 1 ? 's' : ''} and leave ${groupCount} group${groupCount > 1 ? 's' : ''}?`;
    } else if (groupCount > 0) {
      title = `Leave Selected Group${groupCount > 1 ? 's' : ''}`;
      message = `Are you sure you want to leave ${groupCount} group${groupCount > 1 ? 's' : ''}? You will no longer receive messages from these groups.`;
    }

    Alert.alert(
      title,
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: groupCount > 0 && dmCount === 0 ? 'Leave Groups' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const matrixClient = WysprMatrixClient.getInstance();
              const deletePromises = Array.from(selectedThreads).map(roomId => 
                matrixClient.leaveRoom(roomId)
              );
              
              const results = await Promise.all(deletePromises);
              const failures = results.filter(result => !result.success);
              
              if (failures.length === 0) {
                exitSelectionMode();
                // Small delay to allow Matrix client to sync the room leaves
                setTimeout(() => {
                  loadChatThreads();
                }, 500);
              } else {
                Alert.alert('Partial Success', `${results.length - failures.length} conversations deleted successfully. ${failures.length} failed to delete.`);
                exitSelectionMode();
                // Small delay to allow Matrix client to sync the room leaves
                setTimeout(() => {
                  loadChatThreads();
                }, 500);
              }
            } catch (error) {
              console.error('[WYSPR Chats] Bulk delete failed:', error);
              Alert.alert('Error', 'Failed to delete conversations');
            }
          },
        },
      ]
    );
  };

  const renderChatThread = ({ item }: { item: ChatThread }) => {
    return (
      <ChatThreadItem 
        item={item} 
        navigation={navigation} 
        onChatPress={handleChatPress}
        onDelete={handleDeleteChat}
        isSelectionMode={isSelectionMode}
        isSelected={selectedThreads.has(item.roomId)}
        onLongPress={(thread) => enterSelectionMode(thread.roomId)}
        onAcceptInvitation={handleAcceptInvitation}
        onRejectInvitation={handleRejectInvitation}
      />
    );
  };

  const renderEmptyState = () => {
    const matrixClient = WysprMatrixClient.getInstance();
    const hasClient = matrixClient.getClient() !== null;
    
    return (
      <View style={[globalStyles.centered, { flex: 1, paddingVertical: spacing.xxl }]}>
        <Text style={[globalStyles.textSecondary, { textAlign: 'center', marginBottom: spacing.lg }]}>
          {!hasClient && !matrixClient.isInTestMode() 
            ? 'Connecting to secure servers...' 
            : 'No active conversations'}
        </Text>
        <Text style={[globalStyles.textSecondary, { textAlign: 'center', fontSize: 12 }]}>
          {!hasClient && !matrixClient.isInTestMode()
            ? 'Please wait while we establish secure connections'
            : 'Use the Contacts tab to add someone using their username'}
        </Text>
      </View>
    );
  };

  const handleContactRequestsUpdated = () => {
    // Optional: Refresh the chat list when contact requests are updated
    // This could add new chats to the list
    loadChatThreads();
  };

  const renderSelectionHeader = () => {
    if (!isSelectionMode) return null;
    
    const selectedCount = selectedThreads.size;
    const allSelected = selectedCount === chatThreads.length && chatThreads.length > 0;
    
    return (
      <View style={{
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={exitSelectionMode}>
            <Text style={[globalStyles.text, { color: colors.button }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[globalStyles.text, { marginLeft: spacing.md }]}>
            {selectedCount} selected
          </Text>
        </View>
        
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity 
            onPress={allSelected ? deselectAll : selectAll}
            style={{ marginRight: spacing.md }}
          >
            <Text style={[globalStyles.text, { color: colors.button }]}>
              {allSelected ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={handleBulkDelete}
            disabled={selectedCount === 0}
            style={{
              backgroundColor: selectedCount > 0 ? '#EF4444' : colors.border,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
              borderRadius: 6,
            }}
          >
            <Text style={{
              color: selectedCount > 0 ? 'white' : colors.textSecondary,
              fontWeight: '500',
            }}>
              Delete ({selectedCount})
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <View style={globalStyles.container}>
        {renderSelectionHeader()}
        <FlatList
          data={chatThreads}
          renderItem={renderChatThread}
          keyExtractor={(item) => item.roomId}
          contentContainerStyle={{ 
            padding: spacing.md,
            flexGrow: 1,
            paddingBottom: spacing.xxl, // Extra padding for floating cards
          }}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.text}
              colors={[colors.text]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
        
        {/* Floating Contact Request Cards */}
        <FloatingContactRequests onRequestsUpdated={handleContactRequestsUpdated} />
      </View>
    </SafeAreaView>
  );
} 
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  RefreshControl,
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
const ChatThreadItem = ({ item, navigation, onChatPress }: { 
  item: ChatThread, 
  navigation: ChatsScreenNavigationProp,
  onChatPress: (thread: ChatThread) => void 
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
    
    loadDisplayData();
  }, [item.pin, item.isGroup]);

  const handlePinPress = () => {
    navigation.navigate('Profile', {
      pin: item.pin,
      isGroup: item.isGroup,
    });
  };

  return (
    <TouchableOpacity
      style={[globalStyles.messageContainer, { marginBottom: spacing.sm }]}
      onPress={() => onChatPress(item)}
    >
      <View style={[globalStyles.row, { justifyContent: 'space-between' }]}>
        <View style={globalStyles.row}>
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
            <Text style={[globalStyles.textSecondary, { marginTop: spacing.xs }]}>
              {item.unreadCount > 0 ? '🔒 New encrypted messages' : '🔒 Encrypted conversation'}
            </Text>
            {item.isGroup && item.participantCount && (
              <Text style={[globalStyles.textSecondary, { fontSize: 10, marginTop: spacing.xs }]}>
                {item.participantCount} participants
              </Text>
            )}
          </View>
        </View>
        
        <View style={{ alignItems: 'flex-end' }}>
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
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function ChatsScreen({ navigation }: Props) {
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadChatThreads();
    }, [])
  );

  const loadChatThreads = async () => {
    try {
      setIsLoading(true);
      const matrixClient = WysprMatrixClient.getInstance();
      const pinService = PinMappingService.getInstance();
      
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
        return;
      }
      
      // Regular Matrix client mode with group membership persistence
      const rooms = matrixClient.getRooms();
      const roomMetadata = await matrixClient.getRoomMetadata();
      const threads: ChatThread[] = [];

      for (const room of rooms) {
        const metadata = roomMetadata.find((rm: any) => rm.roomId === room.roomId);
        
        // Check if it's a group or direct message
        const isGroupRoom = room.getJoinedMemberCount() > 2;
        
        if (isGroupRoom) {
          // Handle group room - NO MESSAGE PREVIEW
          threads.push({
            roomId: room.roomId,
            pin: metadata?.alias || room.roomId.substring(0, 8),
            lastMessage: '', // SECURITY: No preview
            lastActivity: new Date(),
            unreadCount: room.getUnreadNotificationCount() || 0,
            isGroup: true,
            groupAlias: metadata?.alias,
            participantCount: room.getJoinedMemberCount(),
            isAdmin: metadata?.isAdmin || false,
          });
        } else {
          // Handle direct message - NO MESSAGE PREVIEW
          const members = room.getJoinedMembers();
          const currentUserId = await matrixClient.getCurrentUserId();
          const otherMember = members.find((member: any) => member.userId !== currentUserId);
          
          if (otherMember) {
            const pin = pinService.getPin(otherMember.userId);
            if (pin) {
              const timeline = room.getLiveTimeline().getEvents();
              const lastEvent = timeline[timeline.length - 1];
              
              threads.push({
                roomId: room.roomId,
                pin,
                lastMessage: '', // SECURITY: No preview
                lastActivity: lastEvent ? new Date(lastEvent.getTs()) : new Date(),
                unreadCount: room.getUnreadNotificationCount() || 0,
                isGroup: false,
              });
            }
          }
        }
      }

      // Sort by last activity
      threads.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
      setChatThreads(threads);
    } catch (error) {
      console.error('[WYSPR Chats] Failed to load chat threads:', error);
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
    navigation.navigate('Chat', {
      roomId: thread.roomId,
      pin: thread.pin,
      isGroup: thread.isGroup,
      groupAlias: thread.groupAlias,
    });
  };

  const renderChatThread = ({ item }: { item: ChatThread }) => {
    return (
      <ChatThreadItem 
        item={item} 
        navigation={navigation} 
        onChatPress={handleChatPress} 
      />
    );
  };

  const renderEmptyState = () => (
    <View style={[globalStyles.centered, { flex: 1, paddingVertical: spacing.xxl }]}>
      <Text style={[globalStyles.textSecondary, { textAlign: 'center', marginBottom: spacing.lg }]}>
        No active conversations
      </Text>
      <Text style={[globalStyles.textSecondary, { textAlign: 'center', fontSize: 12 }]}>
        Use the Contacts tab to add someone using their 2-digit PIN
      </Text>
    </View>
  );

  const handleContactRequestsUpdated = () => {
    // Optional: Refresh the chat list when contact requests are updated
    // This could add new chats to the list
    loadChatThreads();
  };

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <View style={globalStyles.container}>
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
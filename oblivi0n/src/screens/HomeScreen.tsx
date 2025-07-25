import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Alert,
  RefreshControl,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import { globalStyles, colors, spacing } from '../utils/theme';
import { RootStackParamList, ChatThread } from '../types';
import { WysprMatrixClient } from '../utils/matrixClient';
import { PinMappingService } from '../utils/pinMapping';
import { SecureAuthManager } from '../utils/auth';
import { NicknameService } from '../utils/nicknames';
import { UserRegistrationService } from '../utils/userRegistration';
import AnimatedButton from '../components/AnimatedButton';
import AnimatedContainer from '../components/AnimatedContainer';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

// Separate component for chat thread items
const ChatThreadItem = ({ item, navigation, onChatPress, index }: { 
  item: ChatThread, 
  navigation: HomeScreenNavigationProp,
  onChatPress: (thread: ChatThread) => void,
  index: number
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
    <AnimatedContainer 
      variant="message" 
      style={{ marginBottom: spacing.sm }}
      delay={index * 100}
    >
      <TouchableOpacity onPress={() => onChatPress(item)}>
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
              <Text style={[globalStyles.textSecondary, { marginTop: spacing.xs }]}>
                {item.lastMessage}
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
    </AnimatedContainer>
  );
};

export default function HomeScreen({ navigation }: Props) {
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
          console.log('[WYSPR Home] Loading test chat threads');
          
          const testThreads: ChatThread[] = [
            // Direct messages
            {
              roomId: 'test-room-20',
              pin: '20',
              lastMessage: 'Hello! This is a test message...',
              lastActivity: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
              unreadCount: 2,
              isGroup: false,
            },
            {
              roomId: 'test-room-21',
              pin: '21',
              lastMessage: 'No messages yet',
              lastActivity: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
              unreadCount: 0,
              isGroup: false,
            },
            {
              roomId: 'test-room-22',
              pin: '22',
              lastMessage: 'Another test conversation',
              lastActivity: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
              unreadCount: 1,
              isGroup: false,
            },
            // Group chat
            {
              roomId: 'test-group-GR17',
              pin: 'GR17',
              lastMessage: 'Looking forward to working together!',
              lastActivity: new Date(Date.now() - 90 * 60 * 1000), // 90 minutes ago
              unreadCount: 3,
              isGroup: true,
              groupAlias: 'Dev Team',
              participantCount: 3,
              isAdmin: true,
            },
          ];
          
          setChatThreads(testThreads);
          console.log('[WYSPR Home] Loaded', testThreads.length, 'test chat threads');
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
          // Handle group room
          threads.push({
            roomId: room.roomId,
            pin: metadata?.alias || room.roomId.substring(0, 8),
            lastMessage: 'Group conversation',
            lastActivity: new Date(),
            unreadCount: room.getUnreadNotificationCount() || 0,
            isGroup: true,
            groupAlias: metadata?.alias,
            participantCount: room.getJoinedMemberCount(),
            isAdmin: metadata?.isAdmin || false,
          });
        } else {
          // Handle direct message
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
                lastMessage: lastEvent ? 'New message' : 'No messages',
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
      console.error('[WYSPR Home] Failed to load chat threads:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadChatThreads();
  };

  const handleAddContact = () => {
    navigation.navigate('AddContact');
  };

  const handleCreateGroup = () => {
    navigation.navigate('GroupCreation');
  };

  const handleChatPress = (thread: ChatThread) => {
    navigation.navigate('Chat', {
      roomId: thread.roomId,
      pin: thread.pin,
      isGroup: thread.isGroup,
      groupAlias: thread.groupAlias,
    });
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout? This will clear all session data and PIN mappings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[WYSPR Home] Logging out...');
              
              const authManager = SecureAuthManager.getInstance();
              await authManager.logout();
              
              console.log('[WYSPR Home] Logout complete, navigating to Login');
              navigation.replace('Login');
            } catch (error) {
              console.error('[WYSPR Home] Logout failed:', error);
              Alert.alert('Logout Error', 'Failed to logout completely. Some data may remain.');
              // Still navigate to login even if logout partially failed
              navigation.replace('Login');
            }
          },
        },
      ]
    );
  };

  const renderChatThread = ({ item, index }: { item: ChatThread; index: number }) => {
    return (
      <ChatThreadItem 
        item={item} 
        navigation={navigation} 
        onChatPress={handleChatPress}
        index={index}
      />
    );
  };

  const renderEmptyState = () => (
    <View style={[globalStyles.centered, { flex: 1, paddingVertical: spacing.xxl }]}>
      <Text style={[globalStyles.textSecondary, { textAlign: 'center', marginBottom: spacing.lg }]}>
        No active conversations
      </Text>
      <Text style={[globalStyles.textSecondary, { textAlign: 'center', fontSize: 12 }]}>
        Add a contact using their 2-digit PIN to start chatting
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <View style={globalStyles.container}>
        <View style={{ padding: spacing.md }}>
          {/* Action Buttons Row */}
          <View style={[globalStyles.row, { marginBottom: spacing.md, gap: spacing.sm }]}>
            <AnimatedButton
              title="Add Contact"
              onPress={handleAddContact}
              style={{ flex: 1 }}
              variant="primary"
              size="medium"
            />
            
            <AnimatedButton
              title="Create Group"
              onPress={handleCreateGroup}
              style={{ flex: 1 }}
              variant="secondary"
              size="medium"
            />
          </View>
          
          {/* Logout Button */}
          <View style={[globalStyles.row, { justifyContent: 'flex-end' }]}>
            <AnimatedButton
              title="Logout"
              onPress={handleLogout}
              variant="accent"
              size="small"
            />
          </View>
        </View>

        <View style={globalStyles.separator} />

        <FlatList
          data={chatThreads}
          renderItem={renderChatThread}
          keyExtractor={(item) => item.roomId}
          contentContainerStyle={{ 
            padding: spacing.md,
            flexGrow: 1,
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
      </View>
    </SafeAreaView>
  );
} 
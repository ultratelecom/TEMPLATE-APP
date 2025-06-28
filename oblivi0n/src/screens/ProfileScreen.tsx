import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  PanResponder,
  Animated,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { globalStyles, colors, spacing } from '../utils/theme';
import { RootStackParamList } from '../types';
import { NicknameService } from '../utils/nicknames';
import { DisplayNameService } from '../utils/displayNames';

type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Profile'>;
type ProfileScreenRouteProp = RouteProp<RootStackParamList, 'Profile'>;

interface Props {
  navigation: ProfileScreenNavigationProp;
  route: ProfileScreenRouteProp;
}

interface GroupMember {
  pin: string;
  isOnline: boolean;
  nickname?: string;
}

export default function ProfileScreen({ navigation, route }: Props) {
  const { pin, isGroup } = route.params;
  
  // Contact nickname reveal states
  const [isNicknameRevealed, setIsNicknameRevealed] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const holdProgress = useRef(new Animated.Value(0)).current;
  const [isPressed, setIsPressed] = useState(false);

  // Group states
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [groupNickname, setGroupNickname] = useState('');
  const [isEditingGroupNickname, setIsEditingGroupNickname] = useState(false);

  // Display name states
  const [userDisplayName, setUserDisplayName] = useState('');
  const [contactDisplayName, setContactDisplayName] = useState('');
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
  const [isEditingContactDisplayName, setIsEditingContactDisplayName] = useState(false);

  useEffect(() => {
    loadDisplayNames();
    if (isGroup) {
      loadGroupMembers();
      loadGroupNickname();
    }
  }, [isGroup, pin]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isNicknameRevealed && countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setIsNicknameRevealed(false);
            setIsPressed(false);
            return 3;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isNicknameRevealed, countdown]);

  const loadGroupMembers = () => {
    // Simulate group members with online status
    const mockMembers: GroupMember[] = [
      { pin: '20', isOnline: true, nickname: 'FA' },
      { pin: '21', isOnline: false, nickname: 'JD' },
      { pin: '22', isOnline: true },
      { pin: '23', isOnline: false },
      { pin: '32', isOnline: true }, // Current user
    ];
    setGroupMembers(mockMembers);
  };

  const loadGroupNickname = () => {
    // Load existing group nickname
    setGroupNickname('DEV'); // Example - this would come from storage
  };

  const loadDisplayNames = async () => {
    try {
      const displayNameService = DisplayNameService.getInstance();
      await displayNameService.initialize();
      
      // Load user's own display name
      const userDisplayName = displayNameService.getUserDisplayName();
      setUserDisplayName(userDisplayName);
      
      // Load contact's display name if this is a contact profile
      if (!isGroup) {
        const contactDisplayName = await displayNameService.getDisplayNameForPin(pin);
        setContactDisplayName(contactDisplayName || '');
      }
    } catch (error) {
      console.error('[OBLIVI0N Profile] Failed to load display names:', error);
    }
  };

  const saveGroupNickname = (nickname: string) => {
    const upperNickname = nickname.toUpperCase().slice(0, 4);
    setGroupNickname(upperNickname);
    // Save to storage here
    Alert.alert('Success', `Group nickname set to "${upperNickname}"`);
  };

  const saveUserDisplayName = async (displayName: string) => {
    try {
      const displayNameService = DisplayNameService.getInstance();
      const result = await displayNameService.setUserDisplayName(displayName);
      
      if (result.success) {
        setUserDisplayName(displayName);
        Alert.alert('Success', 'Your display name has been updated');
      } else {
        Alert.alert('Error', result.error || 'Failed to save display name');
      }
    } catch (error) {
      console.error('[OBLIVI0N Profile] Failed to save user display name:', error);
      Alert.alert('Error', 'Failed to save display name');
    }
  };

  const saveContactDisplayName = async (displayName: string) => {
    try {
      const displayNameService = DisplayNameService.getInstance();
      const result = await displayNameService.setDisplayNameForPin(pin, displayName);
      
      if (result.success) {
        setContactDisplayName(displayName);
        Alert.alert('Success', `Display name set for PIN ${pin}`);
      } else {
        Alert.alert('Error', result.error || 'Failed to save display name');
      }
    } catch (error) {
      console.error('[OBLIVI0N Profile] Failed to save contact display name:', error);
      Alert.alert('Error', 'Failed to save display name');
    }
  };

  // Handle nickname reveal with progress bar
  const handleNicknameReveal = () => {
    if (isGroup) return; // Only for contacts, not groups
    
    setIsPressed(true);
    
    Animated.timing(holdProgress, {
      toValue: 1,
      duration: 800,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        setIsNicknameRevealed(true);
        setCountdown(3);
      }
    });
  };

  const handleNicknameHide = () => {
    setIsPressed(false);
    setIsNicknameRevealed(false);
    setCountdown(3);
    
    Animated.timing(holdProgress, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => false,
    onPanResponderGrant: handleNicknameReveal,
    onPanResponderRelease: handleNicknameHide,
    onPanResponderTerminate: handleNicknameHide,
  });

  const nicknameService = NicknameService.getInstance();
  const contactNickname = !isGroup ? nicknameService.getNickname(pin) : null;
  const isOnline = Math.random() > 0.3; // Simulate online status

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <View style={globalStyles.container}>
        {/* Fixed Header with Better Proportions */}
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          minHeight: 60, // Consistent header height
        }}>
          <TouchableOpacity
            style={[
              globalStyles.button, 
              { 
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                minWidth: 80, // Minimum width for proportional look
                minHeight: 40, // Consistent touch target
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: 8, // Cleaner corners
              }
            ]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[globalStyles.buttonText, { fontSize: 14 }]}>← Back</Text>
          </TouchableOpacity>
          
          <Text style={[globalStyles.text, { fontSize: 18, fontWeight: '600', flex: 1, textAlign: 'center', marginHorizontal: spacing.md }]}>
            Profile
          </Text>
          
          {/* Invisible placeholder for visual balance */}
          <View style={{ minWidth: 80 }} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.md }}>
          {/* User's Display Name Section (Shows on all profiles) */}
          <View style={[globalStyles.messageContainer, { marginBottom: spacing.lg }]}>
            <View style={[globalStyles.row, { justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }]}>
              <Text style={[globalStyles.text, { fontSize: 16 }]}>
                Your Display Name
              </Text>
              <TouchableOpacity
                style={[globalStyles.button, { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }]}
                onPress={() => setIsEditingDisplayName(!isEditingDisplayName)}
              >
                <Text style={[globalStyles.buttonText, { fontSize: 12 }]}>
                  {isEditingDisplayName ? 'CANCEL' : 'EDIT'}
                </Text>
              </TouchableOpacity>
            </View>
            
            {isEditingDisplayName ? (
              <View style={globalStyles.row}>
                <TextInput
                  style={[globalStyles.input, { flex: 1, marginRight: spacing.sm }]}
                  value={userDisplayName}
                  onChangeText={setUserDisplayName}
                  placeholder="Your display name"
                  placeholderTextColor={colors.textSecondary}
                  maxLength={20}
                />
                <TouchableOpacity
                  style={[globalStyles.button, { paddingHorizontal: spacing.sm }]}
                  onPress={() => {
                    saveUserDisplayName(userDisplayName);
                    setIsEditingDisplayName(false);
                  }}
                >
                  <Text style={globalStyles.buttonText}>SAVE</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={[globalStyles.text, { fontSize: 16, textAlign: 'center', fontStyle: userDisplayName ? 'normal' : 'italic' }]}>
                {userDisplayName || 'No display name set'}
              </Text>
            )}
            
            <Text style={[globalStyles.textSecondary, { fontSize: 10, textAlign: 'center', marginTop: spacing.xs }]}>
              Others see this name when you send messages
            </Text>
          </View>

          {/* Contact Profile */}
          {!isGroup && (
            <>
              {/* PIN Badge with Online Status */}
              <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
                <View style={{ position: 'relative' }}>
                  <View style={[globalStyles.pinBadge, { width: 80, height: 80 }]}>
                    <Text style={[globalStyles.pinText, { fontSize: 24 }]}>{pin}</Text>
                  </View>
                  
                  {/* Online Status Indicator */}
                  <View style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: isOnline ? '#00FF00' : '#666666',
                    borderWidth: 2,
                    borderColor: colors.background,
                  }} />
                </View>
                
                <Text style={[globalStyles.text, { fontSize: 20, marginTop: spacing.md }]}>
                  PIN {pin}
                </Text>
                <Text style={[globalStyles.textSecondary, { fontSize: 12, marginTop: spacing.xs }]}>
                  {isOnline ? '🟢 Online' : '⚫ Offline'}
                </Text>
              </View>

              {/* Nickname Section */}
              <View style={[globalStyles.messageContainer, { marginBottom: spacing.lg }]}>
                <Text style={[globalStyles.text, { fontSize: 16, marginBottom: spacing.sm }]}>
                  Nickname
                </Text>
                
                {contactNickname ? (
                  <View {...panResponder.panHandlers}>
                    <View style={{
                      backgroundColor: colors.surface,
                      borderRadius: 12,
                      padding: spacing.md,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}>
                      <Text style={[globalStyles.text, { fontSize: 18, textAlign: 'center' }]}>
                        {isNicknameRevealed && isPressed ? contactNickname : '••'}
                      </Text>
                      
                      {isNicknameRevealed && isPressed ? (
                        <Text style={[globalStyles.textSecondary, { fontSize: 10, textAlign: 'center', marginTop: spacing.xs }]}>
                          Auto-hide in {countdown}s
                        </Text>
                      ) : (
                        <>
                          <Text style={[globalStyles.textSecondary, { fontSize: 10, textAlign: 'center', marginTop: spacing.xs }]}>
                            Hold to reveal nickname
                          </Text>
                          
                          {/* Progress bar */}
                          {isPressed && (
                            <View style={{
                              height: 2,
                              backgroundColor: 'rgba(255,255,255,0.3)',
                              borderRadius: 1,
                              marginTop: spacing.xs,
                              overflow: 'hidden',
                            }}>
                              <Animated.View style={{
                                height: '100%',
                                backgroundColor: '#007AFF',
                                width: holdProgress.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: ['0%', '100%'],
                                }),
                              }} />
                            </View>
                          )}
                        </>
                      )}
                    </View>
                  </View>
                ) : (
                  <Text style={[globalStyles.textSecondary, { textAlign: 'center', fontStyle: 'italic' }]}>
                    No nickname set
                  </Text>
                )}
              </View>

              {/* Contact Display Name Section */}
              <View style={[globalStyles.messageContainer, { marginBottom: spacing.lg }]}>
                <View style={[globalStyles.row, { justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }]}>
                  <Text style={[globalStyles.text, { fontSize: 16 }]}>
                    Display Name for PIN {pin}
                  </Text>
                  <TouchableOpacity
                    style={[globalStyles.button, { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }]}
                    onPress={() => setIsEditingContactDisplayName(!isEditingContactDisplayName)}
                  >
                    <Text style={[globalStyles.buttonText, { fontSize: 12 }]}>
                      {isEditingContactDisplayName ? 'CANCEL' : 'EDIT'}
                    </Text>
                  </TouchableOpacity>
                </View>
                
                {isEditingContactDisplayName ? (
                  <View style={globalStyles.row}>
                    <TextInput
                      style={[globalStyles.input, { flex: 1, marginRight: spacing.sm }]}
                      value={contactDisplayName}
                      onChangeText={setContactDisplayName}
                      placeholder="Contact display name"
                      placeholderTextColor={colors.textSecondary}
                      maxLength={20}
                    />
                    <TouchableOpacity
                      style={[globalStyles.button, { paddingHorizontal: spacing.sm }]}
                      onPress={() => {
                        saveContactDisplayName(contactDisplayName);
                        setIsEditingContactDisplayName(false);
                      }}
                    >
                      <Text style={globalStyles.buttonText}>SAVE</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={[globalStyles.text, { fontSize: 16, textAlign: 'center', fontStyle: contactDisplayName ? 'normal' : 'italic' }]}>
                    {contactDisplayName || 'No display name set'}
                  </Text>
                )}
                
                <Text style={[globalStyles.textSecondary, { fontSize: 10, textAlign: 'center', marginTop: spacing.xs }]}>
                  Custom name for this contact (local only)
                </Text>
              </View>
            </>
          )}

          {/* Group Profile */}
          {isGroup && (
            <>
              {/* Group Header */}
              <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
                <View style={[globalStyles.pinBadge, { width: 80, height: 80, backgroundColor: colors.button }]}>
                  <Text style={[globalStyles.pinText, { fontSize: 24 }]}>{pin}</Text>
                </View>
                
                <Text style={[globalStyles.text, { fontSize: 20, marginTop: spacing.md }]}>
                  Group {pin}
                </Text>
              </View>

              {/* Group Nickname Section */}
              <View style={[globalStyles.messageContainer, { marginBottom: spacing.lg }]}>
                <View style={[globalStyles.row, { justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }]}>
                  <Text style={[globalStyles.text, { fontSize: 16 }]}>
                    Group Nickname
                  </Text>
                  <TouchableOpacity
                    style={[globalStyles.button, { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }]}
                    onPress={() => setIsEditingGroupNickname(!isEditingGroupNickname)}
                  >
                    <Text style={[globalStyles.buttonText, { fontSize: 12 }]}>
                      {isEditingGroupNickname ? 'CANCEL' : 'EDIT'}
                    </Text>
                  </TouchableOpacity>
                </View>
                
                {isEditingGroupNickname ? (
                  <View style={globalStyles.row}>
                    <TextInput
                      style={[globalStyles.input, { flex: 1, marginRight: spacing.sm }]}
                      value={groupNickname}
                      onChangeText={(text) => setGroupNickname(text.toUpperCase().slice(0, 4))}
                      placeholder="Max 4 chars"
                      placeholderTextColor={colors.textSecondary}
                      maxLength={4}
                      autoCapitalize="characters"
                    />
                    <TouchableOpacity
                      style={[globalStyles.button, { paddingHorizontal: spacing.sm }]}
                      onPress={() => {
                        saveGroupNickname(groupNickname);
                        setIsEditingGroupNickname(false);
                      }}
                    >
                      <Text style={globalStyles.buttonText}>SAVE</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={[globalStyles.text, { fontSize: 18, textAlign: 'center', fontWeight: '600' }]}>
                    {groupNickname || 'No nickname set'}
                  </Text>
                )}
              </View>

              {/* Group Members Section */}
              <View style={[globalStyles.messageContainer, { marginBottom: spacing.lg }]}>
                <Text style={[globalStyles.text, { fontSize: 16, marginBottom: spacing.md }]}>
                  Group Members ({groupMembers.length})
                </Text>
                
                {groupMembers.map((member, index) => (
                  <View key={member.pin} style={[
                    globalStyles.row, 
                    { 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      paddingVertical: spacing.sm,
                      borderBottomWidth: index < groupMembers.length - 1 ? 1 : 0,
                      borderBottomColor: colors.border,
                    }
                  ]}>
                    <View style={globalStyles.row}>
                      {/* PIN Badge */}
                      <View style={{ position: 'relative', marginRight: spacing.sm }}>
                        <View style={[globalStyles.pinBadge, { width: 40, height: 40 }]}>
                          <Text style={[globalStyles.pinText, { fontSize: 14 }]}>{member.pin}</Text>
                        </View>
                        
                        {/* Online Status */}
                        <View style={{
                          position: 'absolute',
                          top: -2,
                          right: -2,
                          width: 12,
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: member.isOnline ? '#00FF00' : '#666666',
                          borderWidth: 1,
                          borderColor: colors.background,
                        }} />
                      </View>
                      
                      <View>
                        <Text style={[globalStyles.text, { fontSize: 14 }]}>
                          PIN {member.pin}
                          {member.pin === '32' && ' (You)'}
                        </Text>
                        {member.nickname && (
                          <Text style={[globalStyles.textSecondary, { fontSize: 10 }]}>
                            ••
                          </Text>
                        )}
                      </View>
                    </View>
                    
                    <Text style={[
                      globalStyles.textSecondary, 
                      { 
                        fontSize: 10,
                        color: member.isOnline ? '#00FF00' : colors.textSecondary 
                      }
                    ]}>
                      {member.isOnline ? 'Online' : 'Offline'}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Security Information */}
          <View style={[globalStyles.messageContainer]}>
            <Text style={[globalStyles.text, { fontSize: 16, marginBottom: spacing.sm }]}>
              Security
            </Text>
            <Text style={[globalStyles.textSecondary, { fontSize: 12, marginBottom: spacing.xs }]}>
              • End-to-end encrypted
            </Text>
            <Text style={[globalStyles.textSecondary, { fontSize: 12, marginBottom: spacing.xs }]}>
              • Messages auto-blur for privacy
            </Text>
            <Text style={[globalStyles.textSecondary, { fontSize: 12 }]}>
              • No persistent message storage
            </Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
} 
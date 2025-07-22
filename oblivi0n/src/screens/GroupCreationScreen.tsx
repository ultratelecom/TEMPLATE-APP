import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { globalStyles, colors, spacing } from '../utils/theme';
import { RootStackParamList } from '../types';

type GroupCreationScreenNavigationProp = StackNavigationProp<RootStackParamList, 'GroupCreation'>;

interface Props {
  navigation: GroupCreationScreenNavigationProp;
}

export default function GroupCreationScreen({ navigation }: Props) {
  const [groupName, setGroupName] = useState('');
  const [participantUsernames, setParticipantUsernames] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    if (!participantUsernames.trim()) {
      Alert.alert('Error', 'Please enter at least one participant username');
      return;
    }

    setIsLoading(true);

    try {
      const { WysprMatrixClient } = require('../utils/matrixClient');
      const matrixClient = WysprMatrixClient.getInstance();
      
      // Parse participant usernames (comma-separated)
      const usernames = participantUsernames
        .split(',')
        .map(username => username.trim())
        .filter(username => username.length > 0);

      if (usernames.length === 0) {
        Alert.alert('Error', 'Please enter valid participant usernames');
        setIsLoading(false);
        return;
      }

      // Validate usernames
      for (const username of usernames) {
        if (username.length < 2) {
          Alert.alert('Error', `Username "${username}" must be at least 2 characters`);
          setIsLoading(false);
          return;
        }
        
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
          Alert.alert('Error', `Username "${username}" can only contain letters, numbers, and underscores`);
          setIsLoading(false);
          return;
        }
      }

      // Get current user
      const currentUserId = await matrixClient.getCurrentUserId();
      if (!currentUserId) {
        Alert.alert('Error', 'Could not determine your user ID. Please restart the app.');
        setIsLoading(false);
        return;
      }

      const currentUsername = currentUserId.split(':')[0].substring(1); // Remove @ symbol

      // Check if current user is trying to add themselves
      if (usernames.includes(currentUsername)) {
        Alert.alert('Error', 'You cannot add yourself to the group');
        setIsLoading(false);
        return;
      }

      console.log(`[Group Creation] Creating group "${groupName}" with participants:`, usernames);

      // Create the group
      const result = await matrixClient.createGroupRoom(groupName, usernames);
      
      if (result.success) {
        Alert.alert(
          'Group Created!',
          `Group "${groupName}" has been created successfully with ${usernames.length} participants.`,
          [
            {
              text: 'Start Chatting',
              onPress: () => {
                navigation.replace('Chat', {
                  roomId: result.roomId,
                  pin: groupName, // Use group name as identifier
                  isGroup: true,
                  groupAlias: groupName,
                });
              },
            },
            {
              text: 'OK',
              onPress: () => {
                navigation.goBack();
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to create group');
      }
      
    } catch (error) {
      console.error('[Group Creation] Error:', error);
      Alert.alert('Error', 'Failed to create group. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <KeyboardAvoidingView
        style={globalStyles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={globalStyles.screen}>
          {/* Header Section */}
          <View style={{ marginBottom: spacing.xl }}>
            <Text style={[globalStyles.text, { fontSize: 20, textAlign: 'center' }]}>
              Create Group
            </Text>
            <Text style={[globalStyles.textSecondary, { textAlign: 'center', marginTop: spacing.sm }]}>
              Create a secure group chat with your contacts
            </Text>
          </View>

          {/* Group Name Input */}
          <View style={{ marginBottom: spacing.lg }}>
            <Text style={[globalStyles.text, { marginBottom: spacing.sm }]}>
              Group Name
            </Text>
            <TextInput
              style={globalStyles.input}
              value={groupName}
              onChangeText={setGroupName}
              placeholder="Enter group name (e.g., Dev Team, Friends)"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="words"
              editable={!isLoading}
            />
            <Text style={[globalStyles.textSecondary, { fontSize: 11, marginTop: spacing.xs }]}>
              A friendly name for your group chat
            </Text>
          </View>

          {/* Participant Usernames Input */}
          <View style={{ marginBottom: spacing.xl }}>
            <Text style={[globalStyles.text, { marginBottom: spacing.sm }]}>
              Participant Usernames (comma separated)
            </Text>
            <TextInput
              style={[globalStyles.input, { minHeight: 80, textAlignVertical: 'top' }]}
              value={participantUsernames}
              onChangeText={setParticipantUsernames}
              placeholder="u17, alice, bob, charlie..."
              placeholderTextColor={colors.textSecondary}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
            <Text style={[globalStyles.textSecondary, { fontSize: 11, marginTop: spacing.xs }]}>
              Enter the usernames of people to add to the group
            </Text>
          </View>

          {/* Create Button */}
          <TouchableOpacity
            style={[
              globalStyles.button,
              { 
                backgroundColor: isLoading ? colors.buttonPressed : colors.button,
                marginBottom: spacing.lg,
              }
            ]}
            onPress={handleCreateGroup}
            disabled={isLoading}
          >
            <Text style={globalStyles.buttonText}>
              {isLoading ? 'CREATING...' : 'CREATE GROUP'}
            </Text>
          </TouchableOpacity>

          {/* Info Section */}
          <View style={[globalStyles.messageContainer, { backgroundColor: colors.surface }]}>
            <Text style={[globalStyles.textSecondary, { fontSize: 12 }]}>
              <Text style={{ color: colors.text }}>Group Security:</Text> {'\n'}
              • All group messages are end-to-end encrypted{'\n'}
              • Only add usernames of people you trust{'\n'}
              • Group creators can add/remove participants{'\n'}
              • Messages auto-blur for privacy
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
} 
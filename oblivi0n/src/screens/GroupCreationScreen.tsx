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
  const [groupAlias, setGroupAlias] = useState('');
  const [participantPins, setParticipantPins] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateGroup = async () => {
    if (!groupAlias.trim()) {
      Alert.alert('Error', 'Please enter a group alias');
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Implement group creation logic
      Alert.alert('Success', 'Group creation feature coming soon');
      navigation.goBack();
    } catch (error) {
      console.error('[Group Creation] Error:', error);
      Alert.alert('Error', 'Failed to create group');
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

          {/* Group Alias Input */}
          <View style={{ marginBottom: spacing.lg }}>
            <Text style={[globalStyles.text, { marginBottom: spacing.sm }]}>
              Group Alias
            </Text>
            <TextInput
              style={globalStyles.input}
              value={groupAlias}
              onChangeText={setGroupAlias}
              placeholder="Enter group name"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="words"
              editable={!isLoading}
            />
            <Text style={[globalStyles.textSecondary, { fontSize: 11, marginTop: spacing.xs }]}>
              A friendly name for your group
            </Text>
          </View>

          {/* Participant PINs Input */}
          <View style={{ marginBottom: spacing.xl }}>
            <Text style={[globalStyles.text, { marginBottom: spacing.sm }]}>
              Participant PINs (comma separated)
            </Text>
            <TextInput
              style={[globalStyles.input, { minHeight: 80, textAlignVertical: 'top' }]}
              value={participantPins}
              onChangeText={setParticipantPins}
              placeholder="20, 21, 22..."
              placeholderTextColor={colors.textSecondary}
              multiline
              editable={!isLoading}
            />
            <Text style={[globalStyles.textSecondary, { fontSize: 11, marginTop: spacing.xs }]}>
              Enter the 2-digit PINs of contacts to add to the group
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
              • Only use PINs of contacts you trust{'\n'}
              • Group admins can add/remove participants{'\n'}
              • Messages auto-blur for privacy
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
} 
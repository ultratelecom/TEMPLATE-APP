import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { globalStyles, colors, spacing } from '../utils/theme';
import { RootStackParamList } from '../types';
import { ContactRequestService } from '../utils/contactRequests';
import { WysprMatrixClient } from '../utils/matrixClient';

type AddContactScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AddContact'>;

interface Props {
  navigation: AddContactScreenNavigationProp;
}

export default function AddContactScreen({ navigation }: Props) {
  const [targetUsername, setTargetUsername] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Safe area insets for proper UI spacing
  const insets = useSafeAreaInsets();

  const handleSendContactRequest = async () => {
    if (!targetUsername.trim()) {
      Alert.alert('Error', 'Please enter the username you want to add');
      return;
    }

    if (targetUsername.length < 2) {
      Alert.alert('Error', 'Username must be at least 2 characters');
      return;
    }

    // Basic username validation
    if (!/^[a-zA-Z0-9_]+$/.test(targetUsername)) {
      Alert.alert('Error', 'Username can only contain letters, numbers, and underscores');
      return;
    }

    setIsLoading(true);

    try {
      const matrixClient = WysprMatrixClient.getInstance();
      const currentUserId = await matrixClient.getCurrentUserId();
      
      if (!currentUserId) {
        Alert.alert('Error', 'Could not determine your user ID. Please restart the app.');
        setIsLoading(false);
        return;
      }
      
      // Extract current username from Matrix ID (@username:domain)
      const currentUsername = currentUserId.split(':')[0].substring(1); // Remove @ symbol
      
      if (targetUsername.toLowerCase() === currentUsername.toLowerCase()) {
        Alert.alert('Error', 'You cannot add yourself as a contact');
        setIsLoading(false);
        return;
      }

      // Check if user is already in contacts
      const contactService = ContactRequestService.getInstance();
      const existingContact = await contactService.checkIfContactExists(targetUsername);
      if (existingContact) {
        Alert.alert('Already Connected', `${targetUsername} is already in your contacts`);
        setIsLoading(false);
        return;
      }

      // Send contact request
      const success = await contactService.sendContactRequestByUsername(
        currentUsername,
        targetUsername,
        message.trim() || undefined
      );
      
      if (success) {
        Alert.alert(
          'Contact Request Sent',
          `Contact request sent to ${targetUsername}. They will receive a notification and can accept or decline.`,
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.goBack();
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', `Failed to send contact request. User ${targetUsername} may not exist on this server.`);
      }
    } catch (error) {
      console.error('Send contact request error:', error);
      Alert.alert('Error', 'Failed to send contact request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <KeyboardAvoidingView
        style={globalStyles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <View style={globalStyles.screen}>
          <View style={{ marginBottom: spacing.xl }}>
            <Text style={[globalStyles.text, { fontSize: 20, textAlign: 'center' }]}>
              Add Contact by Username
            </Text>
            <Text style={[globalStyles.textSecondary, { textAlign: 'center', marginTop: spacing.sm }]}>
              Send a contact request to another user's username
            </Text>
          </View>

          <View style={{ marginBottom: spacing.lg }}>
            <Text style={[globalStyles.text, { marginBottom: spacing.sm }]}>
              Username
            </Text>
            <TextInput
              style={globalStyles.input}
              value={targetUsername}
              onChangeText={setTargetUsername}
              placeholder="Enter username (e.g., u17, alice, bob)"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
            <Text style={[globalStyles.textSecondary, { fontSize: 11, marginTop: spacing.xs }]}>
              The username of the person you want to add as a contact
            </Text>
          </View>

          <View style={{ marginBottom: spacing.xl }}>
            <Text style={[globalStyles.text, { marginBottom: spacing.sm }]}>
              Optional Message
            </Text>
            <TextInput
              style={[globalStyles.input, { height: 80 }]}
              value={message}
              onChangeText={setMessage}
              placeholder="Would like to add you as a contact"
              placeholderTextColor={colors.textSecondary}
              multiline
              textAlignVertical="top"
              editable={!isLoading}
            />
            <Text style={[globalStyles.textSecondary, { fontSize: 11, marginTop: spacing.xs }]}>
              Optional message to include with your contact request
            </Text>
          </View>

          <TouchableOpacity
            style={[
              globalStyles.button,
              { 
                backgroundColor: isLoading ? colors.buttonPressed : colors.button,
                marginBottom: spacing.lg,
              }
            ]}
            onPress={handleSendContactRequest}
            disabled={isLoading}
          >
            <Text style={globalStyles.buttonText}>
              {isLoading ? 'SENDING REQUEST...' : 'SEND CONTACT REQUEST'}
            </Text>
          </TouchableOpacity>

          <View style={[globalStyles.messageContainer, { backgroundColor: colors.surface }]}>
            <Text style={[globalStyles.textSecondary, { fontSize: 12 }]}>
              <Text style={{ color: colors.text }}>How it works:</Text> {'\n'}
              • Enter the username of someone you want to chat with{'\n'}
              • They'll receive your contact request and can accept/decline{'\n'}
              • Once accepted, you can chat securely{'\n'}
              • All messages are end-to-end encrypted
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
} 
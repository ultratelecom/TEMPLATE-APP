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
import { StackNavigationProp } from '@react-navigation/stack';
import { globalStyles, colors, spacing } from '../utils/theme';
import { RootStackParamList } from '../types';
import { ContactRequestService } from '../utils/contactRequests';
import { PinMappingService } from '../utils/pinMapping';

type AddContactScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AddContact'>;

interface Props {
  navigation: AddContactScreenNavigationProp;
}

export default function AddContactScreen({ navigation }: Props) {
  const [targetPin, setTargetPin] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendContactRequest = async () => {
    if (!targetPin.trim()) {
      Alert.alert('Error', 'Please enter the PIN you want to add');
      return;
    }

    if (!/^\d{2}$/.test(targetPin)) {
      Alert.alert('Error', 'PIN must be exactly 2 digits');
      return;
    }

    setIsLoading(true);

    try {
      const contactService = ContactRequestService.getInstance();
      const pinService = PinMappingService.getInstance();
      
      // Check if PIN is already in contacts
      const existingUserId = pinService.getMatrixUserId(targetPin);
      if (existingUserId) {
        Alert.alert('Already Connected', `PIN ${targetPin} is already in your contacts`);
        setIsLoading(false);
        return;
      }

      // Get current user's PIN (from test mode configuration)
      const { WysprMatrixClient } = require('../utils/matrixClient');
      const matrixClient = WysprMatrixClient.getInstance();
      const currentUserId = await matrixClient.getCurrentUserId();
      
      // Map userId to PIN for test mode
      const TEST_PINS = {
        '@u32:193.135.116.56': '10', // PIN 10
        '@u17:193.135.116.56': '11', // PIN 11
      };
      
      const currentPin = TEST_PINS[currentUserId as keyof typeof TEST_PINS];
      
      if (!currentPin) {
        Alert.alert('Error', 'Could not determine your PIN. Please restart the app.');
        setIsLoading(false);
        return;
      }
      
      if (targetPin === currentPin) {
        Alert.alert('Error', 'You cannot add yourself as a contact');
        setIsLoading(false);
        return;
      }

      // Send contact request
      const success = await contactService.sendContactRequest(
        currentPin,
        targetPin,
        message.trim() || undefined
      );
      
      if (success) {
        Alert.alert(
          'Contact Request Sent',
          `Contact request sent to PIN ${targetPin}. They will receive a notification and can accept or decline.`,
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
        Alert.alert('Error', `Failed to send contact request. PIN ${targetPin} may not exist or be offline.`);
      }
    } catch (error) {
      console.error('Send contact request error:', error);
      Alert.alert('Error', 'Failed to send contact request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const generateRandomPin = () => {
    const pinService = PinMappingService.getInstance();
    const availablePin = pinService.generateAvailablePin();
    
    if (availablePin) {
      setTargetPin(availablePin);
    } else {
      Alert.alert('Error', 'All PINs are currently in use');
    }
  };

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <KeyboardAvoidingView
        style={globalStyles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={globalStyles.screen}>
          <View style={{ marginBottom: spacing.xl }}>
            <Text style={[globalStyles.text, { fontSize: 20, textAlign: 'center' }]}>
              Add Contact by PIN
            </Text>
            <Text style={[globalStyles.textSecondary, { textAlign: 'center', marginTop: spacing.sm }]}>
              Send a contact request to another user's 2-digit PIN
            </Text>
          </View>

          <View style={{ marginBottom: spacing.lg }}>
            <View style={[globalStyles.row, { justifyContent: 'space-between', alignItems: 'flex-end' }]}>
              <Text style={[globalStyles.text, { marginBottom: spacing.sm }]}>
                Target PIN
              </Text>
              <TouchableOpacity
                style={[globalStyles.button, { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm }]}
                onPress={generateRandomPin}
              >
                <Text style={[globalStyles.buttonText, { fontSize: 12 }]}>
                  Random
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={globalStyles.input}
              value={targetPin}
              onChangeText={setTargetPin}
              placeholder="XX"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              maxLength={2}
              editable={!isLoading}
            />
            <Text style={[globalStyles.textSecondary, { fontSize: 11, marginTop: spacing.xs }]}>
              The PIN of the person you want to add as a contact
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
              • Enter the 2-digit PIN of someone you want to chat with{'\n'}
              • They'll receive your contact request and can accept/decline{'\n'}
              • Once accepted, you can chat anonymously using PINs{'\n'}
              • All messages are end-to-end encrypted
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
} 
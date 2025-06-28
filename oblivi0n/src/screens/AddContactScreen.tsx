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
import { OblivionMatrixClient } from '../utils/matrixClient';
import { PinMappingService } from '../utils/pinMapping';

type AddContactScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AddContact'>;

interface Props {
  navigation: AddContactScreenNavigationProp;
}

export default function AddContactScreen({ navigation }: Props) {
  const [pin, setPin] = useState('');
  const [matrixUserId, setMatrixUserId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAddContact = async () => {
    if (!pin.trim() || !matrixUserId.trim()) {
      Alert.alert('Error', 'Please enter both PIN and Matrix User ID');
      return;
    }

    if (!/^\d{2}$/.test(pin)) {
      Alert.alert('Error', 'PIN must be exactly 2 digits');
      return;
    }

    if (!matrixUserId.startsWith('@') || !matrixUserId.includes(':')) {
      Alert.alert('Error', 'Matrix User ID must be in format @username:domain.com');
      return;
    }

    setIsLoading(true);

    try {
      const pinService = PinMappingService.getInstance();
      const matrixClient = OblivionMatrixClient.getInstance();

      // Check if PIN is already taken
      const existingUserId = pinService.getMatrixUserId(pin);
      if (existingUserId) {
        Alert.alert('Error', `PIN ${pin} is already assigned to another contact`);
        setIsLoading(false);
        return;
      }

      // Check if Matrix User ID is already mapped
      const existingPin = pinService.getPin(matrixUserId);
      if (existingPin) {
        Alert.alert('Error', `This Matrix user already has PIN ${existingPin}`);
        setIsLoading(false);
        return;
      }

      // Create direct message room with the user
      const roomId = await matrixClient.createDirectMessageRoom(matrixUserId);
      
      if (!roomId) {
        Alert.alert('Error', 'Failed to create chat room. User may not exist or has blocked invites.');
        setIsLoading(false);
        return;
      }

      // Add the PIN mapping
      const success = await pinService.addMapping(pin, matrixUserId);
      
      if (success) {
        Alert.alert(
          'Contact Added',
          `Contact ${pin} added successfully`,
          [
            {
              text: 'Start Chat',
              onPress: () => {
                navigation.replace('Chat', {
                  roomId,
                  pin,
                });
              },
            },
            {
              text: 'Go to Home',
              onPress: () => {
                navigation.goBack();
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to save contact mapping');
      }
    } catch (error) {
      console.error('Add contact error:', error);
      Alert.alert('Error', 'Failed to add contact. Please check the Matrix User ID.');
    } finally {
      setIsLoading(false);
    }
  };

  const generateRandomPin = () => {
    const pinService = PinMappingService.getInstance();
    const availablePin = pinService.generateAvailablePin();
    
    if (availablePin) {
      setPin(availablePin);
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
              Add New Contact
            </Text>
            <Text style={[globalStyles.textSecondary, { textAlign: 'center', marginTop: spacing.sm }]}>
              Assign a 2-digit PIN to a Matrix user for anonymous chatting
            </Text>
          </View>

          <View style={{ marginBottom: spacing.lg }}>
            <View style={[globalStyles.row, { justifyContent: 'space-between', alignItems: 'flex-end' }]}>
              <Text style={[globalStyles.text, { marginBottom: spacing.sm }]}>
                2-Digit PIN
              </Text>
              <TouchableOpacity
                style={[globalStyles.button, { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm }]}
                onPress={generateRandomPin}
              >
                <Text style={[globalStyles.buttonText, { fontSize: 12 }]}>
                  Generate
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={globalStyles.input}
              value={pin}
              onChangeText={setPin}
              placeholder="XX"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              maxLength={2}
              editable={!isLoading}
            />
            <Text style={[globalStyles.textSecondary, { fontSize: 11, marginTop: spacing.xs }]}>
              Must be exactly 2 digits (10-99)
            </Text>
          </View>

          <View style={{ marginBottom: spacing.xl }}>
            <Text style={[globalStyles.text, { marginBottom: spacing.sm }]}>
              Matrix User ID
            </Text>
            <TextInput
              style={globalStyles.input}
              value={matrixUserId}
              onChangeText={setMatrixUserId}
              placeholder="@username:your-matrix-domain.com"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
            <Text style={[globalStyles.textSecondary, { fontSize: 11, marginTop: spacing.xs }]}>
              The Matrix ID of the person you want to add
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
            onPress={handleAddContact}
            disabled={isLoading}
          >
            <Text style={globalStyles.buttonText}>
              {isLoading ? 'ADDING CONTACT...' : 'ADD CONTACT'}
            </Text>
          </TouchableOpacity>

          <View style={[globalStyles.messageContainer, { backgroundColor: colors.surface }]}>
            <Text style={[globalStyles.textSecondary, { fontSize: 12 }]}>
              <Text style={{ color: colors.text }}>Security Note:</Text> {'\n'}
              • PINs replace usernames for anonymity{'\n'}
              • Only you will see this PIN mapping{'\n'}
              • The other person won't see your PIN{'\n'}
              • All messages are end-to-end encrypted
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
} 
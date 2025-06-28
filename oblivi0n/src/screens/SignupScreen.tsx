import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ScrollView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { globalStyles, colors, spacing } from '../utils/theme';
import { RootStackParamList } from '../types';
import { UserRegistrationService } from '../utils/userRegistration';

type SignupScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Signup'>;

interface Props {
  navigation: SignupScreenNavigationProp;
}

export default function SignupScreen({ navigation }: Props) {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [availablePin, setAvailablePin] = useState<string | null>(null);

  const generateAvailablePin = async () => {
    setIsLoading(true);
    try {
      const registrationService = UserRegistrationService.getInstance();
      const pin = await registrationService.generateAvailablePin();
      setAvailablePin(pin);
      Alert.alert('PIN Generated', `Your assigned PIN is: ${pin}\n\nNow choose your permanent username.`);
    } catch (error) {
      console.error('[OBLIVI0N Signup] Failed to generate PIN:', error);
      Alert.alert('Error', 'Failed to generate PIN. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!availablePin) {
      Alert.alert('Generate PIN First', 'Please generate your PIN before choosing a username.');
      return;
    }

    if (!username.trim()) {
      Alert.alert('Username Required', 'Please enter a username.');
      return;
    }

    if (username.length < 3 || username.length > 20) {
      Alert.alert('Invalid Username', 'Username must be between 3 and 20 characters.');
      return;
    }

    // Only allow alphanumeric and underscores
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      Alert.alert('Invalid Username', 'Username can only contain letters, numbers, and underscores.');
      return;
    }

    setIsLoading(true);
    try {
      const registrationService = UserRegistrationService.getInstance();
      const result = await registrationService.registerUser(availablePin, username.toLowerCase());
      
      if (result.success) {
        Alert.alert(
          'Registration Successful!', 
          `Welcome to OBLIVI0N!\n\nYour PIN: ${availablePin}\nYour Username: ${username.toLowerCase()}\n\nOthers will see you as "${availablePin} • ${username.toLowerCase()}"`,
          [
            {
              text: 'Continue to Login',
              onPress: () => navigation.navigate('Login')
            }
          ]
        );
      } else {
        Alert.alert('Registration Failed', result.error || 'Failed to register user');
      }
    } catch (error) {
      console.error('[OBLIVI0N Signup] Registration failed:', error);
      Alert.alert('Error', 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <ScrollView style={globalStyles.container} contentContainerStyle={{ flexGrow: 1 }}>
        <View style={[globalStyles.screen, globalStyles.centered]}>
          {/* Header */}
          <View style={{ marginBottom: spacing.xxl, alignItems: 'center' }}>
            <Text style={[globalStyles.textMono, { fontSize: 32, textAlign: 'center' }]}>
              OBLIVI0N
            </Text>
            <Text style={[globalStyles.textSecondary, { textAlign: 'center', marginTop: spacing.sm }]}>
              Secure Registration
            </Text>
          </View>

          {/* Registration Form */}
          <View style={{ width: '100%', maxWidth: 320 }}>
            {/* Step 1: Generate PIN */}
            <View style={{ marginBottom: spacing.lg }}>
              <Text style={[globalStyles.text, { marginBottom: spacing.sm, fontSize: 16 }]}>
                Step 1: Get Your PIN
              </Text>
              
              {!availablePin ? (
                <TouchableOpacity
                  style={[globalStyles.button, { marginBottom: spacing.sm }]}
                  onPress={generateAvailablePin}
                  disabled={isLoading}
                >
                  <Text style={globalStyles.buttonText}>
                    {isLoading ? 'Generating...' : 'Generate My PIN'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={[globalStyles.messageContainer, { marginBottom: spacing.sm }]}>
                  <Text style={[globalStyles.text, { textAlign: 'center', fontSize: 18, fontWeight: 'bold' }]}>
                    Your PIN: {availablePin}
                  </Text>
                  <Text style={[globalStyles.textSecondary, { textAlign: 'center', fontSize: 10, marginTop: spacing.xs }]}>
                    Remember this PIN - you'll need it to login
                  </Text>
                </View>
              )}
            </View>

            {/* Step 2: Choose Username */}
            {availablePin && (
              <View style={{ marginBottom: spacing.lg }}>
                <Text style={[globalStyles.text, { marginBottom: spacing.sm, fontSize: 16 }]}>
                  Step 2: Choose Your Username
                </Text>
                
                <TextInput
                  style={[globalStyles.input, { marginBottom: spacing.sm }]}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="your_username"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={20}
                  editable={!isLoading}
                />
                
                <Text style={[globalStyles.textSecondary, { fontSize: 12, marginBottom: spacing.sm }]}>
                  • 3-20 characters • Letters, numbers, underscores only
                </Text>
                
                {username.length >= 3 && (
                  <View style={[globalStyles.messageContainer, { backgroundColor: colors.surface }]}>
                    <Text style={[globalStyles.textSecondary, { textAlign: 'center', fontSize: 12 }]}>
                      Others will see you as:
                    </Text>
                    <Text style={[globalStyles.text, { textAlign: 'center', fontSize: 16, marginTop: spacing.xs }]}>
                      {availablePin} • {username.toLowerCase()}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Register Button */}
            {availablePin && username.length >= 3 && (
              <TouchableOpacity
                style={[globalStyles.button]}
                onPress={handleSignup}
                disabled={isLoading}
              >
                <Text style={globalStyles.buttonText}>
                  {isLoading ? 'Registering...' : 'Complete Registration'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Footer */}
          <View style={{ marginTop: spacing.xl, alignItems: 'center' }}>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={[globalStyles.textSecondary, { fontSize: 12 }]}>
                Already have an account? Login
              </Text>
            </TouchableOpacity>
          </View>

          {/* Security Info */}
          <View style={{ marginTop: spacing.lg, alignItems: 'center' }}>
            <Text style={[globalStyles.textSecondary, { textAlign: 'center', fontSize: 12, marginBottom: spacing.xs }]}>
              • Your username is permanent and visible to others
            </Text>
            <Text style={[globalStyles.textSecondary, { textAlign: 'center', fontSize: 12, marginBottom: spacing.xs }]}>
              • Your PIN is your private login credential
            </Text>
            <Text style={[globalStyles.textSecondary, { textAlign: 'center', fontSize: 12 }]}>
              • All messages are end-to-end encrypted
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 
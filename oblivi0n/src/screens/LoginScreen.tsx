import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { globalStyles, colors, spacing } from '../utils/theme';
import { RootStackParamList } from '../types';
import { SecureAuthManager } from '../utils/auth';
import { OblivionMatrixClient } from '../utils/matrixClient';

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

export default function LoginScreen({ navigation }: Props) {
  const [serverPin, setServerPin] = useState('0000');
  const [userIdNumber, setUserIdNumber] = useState('32');
  const [accessPin, setAccessPin] = useState('1947');
  const [isLoading, setIsLoading] = useState(false);
  const [showTestMode, setShowTestMode] = useState(false);

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      console.log('[OBLIVI0N Login] Checking for existing session...');
      
      const authManager = SecureAuthManager.getInstance();
      const result = await authManager.autoLogin();
      
      if (result.success) {
        console.log('[OBLIVI0N Login] Auto-login successful');
        if (result.isTestMode) {
          // Show test mode indicator
          console.log('[OBLIVI0N Login] Test mode session restored');
        }
        navigation.replace('Home');
      } else {
        console.log('[OBLIVI0N Login] No valid session found:', result.error);
      }
    } catch (error) {
      console.error('[OBLIVI0N Login] Session check failed:', error);
    }
  };

  const handleLogin = async () => {
    const authManager = SecureAuthManager.getInstance();
    
    // Check for test mode first (test PINs are: 10, 11, 12)
    const testPins = authManager.getTestPins();
    const isTestMode = __DEV__ && (
      testPins.includes(serverPin) || 
      testPins.includes(userIdNumber) || 
      testPins.includes(accessPin)
    );

    if (isTestMode) {
      // Use legacy test mode login
      setIsLoading(true);
      try {
        console.log('[OBLIVI0N Login] Test mode detected, using legacy auth...');
        
        // Find which field has the test PIN
        let testPin = '';
        if (testPins.includes(serverPin)) testPin = serverPin;
        else if (testPins.includes(userIdNumber)) testPin = userIdNumber;
        else if (testPins.includes(accessPin)) testPin = accessPin;
        
        const result = await authManager.login('@test:matrix.oblivi0n.gov.local', testPin);
        
        if (result.success) {
          console.log('[OBLIVI0N Login] Test mode login successful');
          
          if (result.isTestMode) {
            Alert.alert(
              'Test Mode',
              'Logged in using test credentials. This is for development only.',
              [{ text: 'Continue', onPress: () => navigation.replace('Home') }]
            );
          } else {
            navigation.replace('Home');
          }
        } else {
          Alert.alert('Login Failed', result.error || 'Invalid test credentials');
        }
      } catch (error) {
        console.error('[OBLIVI0N Login] Test mode login error:', error);
        Alert.alert('Login Failed', 'Test mode authentication failed');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Regular PIN format validation for production mode
    if (!/^\d{4}$/.test(serverPin)) {
      Alert.alert('Error', 'Server PIN must be 4 digits');
      return;
    }
    
    if (!/^\d{2}$/.test(userIdNumber)) {
      Alert.alert('Error', 'User ID must be 2 digits');
      return;
    }
    
    if (!/^\d{4}$/.test(accessPin)) {
      Alert.alert('Error', 'Access PIN must be 4 digits');
      return;
    }

    setIsLoading(true);

    try {
      console.log('[OBLIVI0N Login] Attempting production login with PIN format...');
      
      // Construct Matrix base URL and user ID
      const baseUrl = `https://matrix.${serverPin}.zero`;
      const userId = `@u${userIdNumber}:matrix.${serverPin}.zero`;
      
      // Try login with new PIN format (using matrixClient directly)
      const matrixClient = OblivionMatrixClient.getInstance();
      const result = await matrixClient.loginWithPinFormat(serverPin, userIdNumber, accessPin);

      if (result.success) {
        console.log('[OBLIVI0N Login] Production login successful');
        
        // Save session data using auth manager
        const sessionData = {
          userId,
          deviceId: 'device-' + Date.now(), // Temporary device ID
          accessToken: 'temp-token', // Will be updated by Matrix client
          serverPin,
        };
        
        await authManager.saveSession(sessionData);
        navigation.replace('Home');
      } else {
        Alert.alert('Login Failed', result.error || 'Invalid credentials');
      }
    } catch (error) {
      console.error('[OBLIVI0N Login] Production login error:', error);
      Alert.alert('Login Failed', 'Unable to connect to server');
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
        <View style={[globalStyles.screen, globalStyles.centered]}>
          {/* Header Section */}
          <View style={{ marginBottom: spacing.xxl, alignItems: 'center' }}>
            <Text style={[globalStyles.textMono, { fontSize: 32, textAlign: 'center' }]}>
              OBLIVI0N
            </Text>
            <Text style={[globalStyles.textSecondary, { textAlign: 'center', marginTop: spacing.sm }]}>
              Secure Matrix Chat
            </Text>
          </View>

          {/* Login Form */}
          <View style={{ width: '100%', maxWidth: 320, alignSelf: 'center' }}>
            <Text style={[globalStyles.text, { marginBottom: spacing.sm }]}>
              Server PIN (4 digits)
            </Text>
            <TextInput
              style={globalStyles.input}
              value={serverPin}
              onChangeText={setServerPin}
              placeholder="0000"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              maxLength={4}
              editable={!isLoading}
            />

            <Text style={[globalStyles.text, { marginTop: spacing.lg, marginBottom: spacing.sm }]}>
              User ID (2 digits)
            </Text>
            <TextInput
              style={globalStyles.input}
              value={userIdNumber}
              onChangeText={setUserIdNumber}
              placeholder="32"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              maxLength={2}
              editable={!isLoading}
            />

            <Text style={[globalStyles.text, { marginTop: spacing.lg, marginBottom: spacing.sm }]}>
              Access PIN (4 digits)
            </Text>
            <TextInput
              style={globalStyles.input}
              value={accessPin}
              onChangeText={setAccessPin}
              placeholder="1947"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              keyboardType="numeric"
              maxLength={4}
              editable={!isLoading}
            />

            <TouchableOpacity
              style={[
                globalStyles.button,
                { 
                  marginTop: spacing.xl,
                  backgroundColor: isLoading ? colors.buttonPressed : colors.button 
                }
              ]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Text style={globalStyles.buttonText}>
                {isLoading ? 'CONNECTING...' : 'LOGIN'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Signup Link */}
          <View style={{ marginTop: spacing.xl, alignItems: 'center' }}>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={[globalStyles.textSecondary, { fontSize: 14, textDecorationLine: 'underline' }]}>
                Don't have an account? Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          {/* Security Features */}
          <View style={{ marginTop: spacing.md, alignItems: 'center' }}>
            <Text style={[globalStyles.textSecondary, { textAlign: 'center', fontSize: 12, marginBottom: spacing.xs }]}>
              • Permanent usernames visible to others
            </Text>
            <Text style={[globalStyles.textSecondary, { textAlign: 'center', fontSize: 12, marginBottom: spacing.xs }]}>
              • Messages auto-blur for privacy
            </Text>
            <Text style={[globalStyles.textSecondary, { textAlign: 'center', fontSize: 12 }]}>
              • End-to-end encrypted
            </Text>
          </View>

          {/* Test Mode UI (Development Only) */}
          {__DEV__ && (
            <View style={{ marginTop: spacing.lg }}>
              <TouchableOpacity 
                onPress={() => setShowTestMode(!showTestMode)}
                style={{ alignItems: 'center' }}
              >
                <Text style={[globalStyles.textSecondary, { fontSize: 10 }]}>
                  🧪 {showTestMode ? 'Hide' : 'Show'} Test Mode
                </Text>
              </TouchableOpacity>
              
              {showTestMode && (
                <View style={{ marginTop: spacing.sm, alignItems: 'center' }}>
                  <Text style={[globalStyles.textSecondary, { fontSize: 10, marginBottom: spacing.xs }]}>
                    Test PINs (enter in any field):
                  </Text>
                  {SecureAuthManager.getInstance().getTestPins().map(testPin => (
                    <TouchableOpacity
                      key={testPin}
                      onPress={() => {
                        // Set the test PIN in the Access PIN field for convenience
                        setAccessPin(testPin);
                        setServerPin('0000');
                        setUserIdNumber('32');
                      }}
                      style={[globalStyles.pinBadge, { marginVertical: 2 }]}
                    >
                      <Text style={globalStyles.pinText}>{testPin}</Text>
                    </TouchableOpacity>
                  ))}
                  <Text style={[globalStyles.textSecondary, { fontSize: 9, marginTop: spacing.xs, textAlign: 'center' }]}>
                    Tap a test PIN above to auto-fill, or manually enter{'\n'}
                    10, 11, or 12 in any field to activate test mode
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
} 
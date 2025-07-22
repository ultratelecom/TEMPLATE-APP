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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { globalStyles, colors, spacing } from '../utils/theme';
import { RootStackParamList } from '../types';
import { SecureAuthManager } from '../utils/auth';
import { WysprMatrixClient } from '../utils/matrixClient';
import AnimatedButton from '../components/AnimatedButton';
import AnimatedContainer from '../components/AnimatedContainer';

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

export default function LoginScreen({ navigation }: Props) {
  const [username, setUsername] = useState('u32');
  const [password, setPassword] = useState('ultra12!');
  const [isLoading, setIsLoading] = useState(false);
  const [showTestMode, setShowTestMode] = useState(false);
  
  // Safe area insets for proper UI spacing
  const insets = useSafeAreaInsets();

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      console.log('[WYSPR Login] Checking for existing session...');
      
      const authManager = SecureAuthManager.getInstance();
      const result = await authManager.autoLogin();
      
      if (result.success) {
        console.log('[WYSPR Login] Auto-login successful');
        if (result.isTestMode) {
          // Show test mode indicator
          console.log('[WYSPR Login] Test mode session restored');
        }
        navigation.replace('Home');
      } else {
        console.log('[WYSPR Login] No valid session found:', result.error);
      }
    } catch (error) {
      console.error('[WYSPR Login] Session check failed:', error);
    }
  };

  const handleLogin = async () => {
    const authManager = SecureAuthManager.getInstance();
    
    // Check for test mode first (test PINs are: 10, 11, 12)
    const testPins = authManager.getTestPins();
    const isTestMode = __DEV__ && (
      testPins.includes(username) || 
      testPins.includes(password)
    );

    if (isTestMode) {
      // Use legacy test mode login
      setIsLoading(true);
      try {
        console.log('[WYSPR Login] Test mode detected, using legacy auth...');
        
        // Find which field has the test PIN
        let testPin = '';
        if (testPins.includes(username)) testPin = username;
        else if (testPins.includes(password)) testPin = password;
        
        const result = await authManager.login('@test:matrix.wyspr.gov.local', testPin);
        
        if (result.success) {
          console.log('[WYSPR Login] Test mode login successful');
          
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
        console.error('[WYSPR Login] Test mode login error:', error);
        Alert.alert('Login Failed', 'Test mode authentication failed');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Regular validation for production mode
    if (!username.trim()) {
      Alert.alert('Error', 'Username is required');
      return;
    }
    
    if (username.length < 2) {
      Alert.alert('Error', 'Username must be at least 2 characters');
      return;
    }
    
    if (!password.trim()) {
      Alert.alert('Error', 'Password is required');
      return;
    }

    setIsLoading(true);

    try {
      console.log('[WYSPR Login] Attempting production login with username...');
      
      // Try login with username (using matrixClient directly)
      const matrixClient = WysprMatrixClient.getInstance();
      const result = await matrixClient.loginWithUsername(username, password);

      if (result.success) {
        console.log('[WYSPR Login] Production login successful');
        
        // Save session data using auth manager
        const sessionData = {
          userId: `@${username}:matrix.awadx.lat`,
          deviceId: 'device-' + Date.now(), // Temporary device ID
          accessToken: 'temp-token', // Will be updated by Matrix client
          serverPin: 'awadx',
        };
        
        await authManager.saveSession(sessionData);
        navigation.replace('Home');
      } else {
        Alert.alert('Login Failed', result.error || 'Invalid credentials');
      }
    } catch (error) {
      console.error('[WYSPR Login] Production login error:', error);
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
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
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
          <AnimatedContainer 
            variant="surface" 
            style={{ width: '100%', maxWidth: 320, alignSelf: 'center' }}
            delay={200}
          >
            <Text style={[globalStyles.text, { marginBottom: spacing.sm }]}>
              Username
            </Text>
            <TextInput
              style={globalStyles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="u32"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />

            <Text style={[globalStyles.text, { marginTop: spacing.lg, marginBottom: spacing.sm }]}>
              Password
            </Text>
            <TextInput
              style={globalStyles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              editable={!isLoading}
            />

            <AnimatedButton
              title={isLoading ? 'CONNECTING...' : 'LOGIN'}
              onPress={handleLogin}
              disabled={isLoading}
              style={{ marginTop: spacing.xl }}
              variant="primary"
              size="large"
            />
          </AnimatedContainer>

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
              • Your username is visible to contacts
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
                        // Set the test PIN in the password field for convenience
                        setPassword(testPin);
                        setUsername('u32');
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
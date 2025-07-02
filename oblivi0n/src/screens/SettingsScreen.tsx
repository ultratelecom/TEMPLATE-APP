import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { globalStyles, colors, spacing } from '../utils/theme';
import { RootStackParamList } from '../types';
import { SecureAuthManager } from '../utils/auth';
import { ReadReceiptService } from '../utils/readReceipts';
import { ScreenshotProtectionService } from '../utils/screenshotProtection';

type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: SettingsScreenNavigationProp;
}

export default function SettingsScreen({ navigation }: Props) {
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
              console.log('[WYSPR Settings] Logging out...');
              
              // Clear all ephemeral data
              const readReceiptService = ReadReceiptService.getInstance();
              readReceiptService.clearAllData();
              
              const screenshotService = ScreenshotProtectionService.getInstance();
              screenshotService.cleanup();
              
              const authManager = SecureAuthManager.getInstance();
              await authManager.logout();
              
              console.log('[WYSPR Settings] Logout complete, navigating to Login');
              navigation.replace('Login');
            } catch (error) {
              console.error('[WYSPR Settings] Logout failed:', error);
              Alert.alert('Logout Error', 'Failed to logout completely. Some data may remain.');
              // Still navigate to login even if logout partially failed
              navigation.replace('Login');
            }
          },
        },
      ]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      'About WYSPR',
      'WYSPR is a secure messaging app that uses end-to-end encryption and a 2-digit PIN system for maximum privacy.\n\nVersion: 1.0.0\nBuilt with React Native & Matrix Protocol',
      [{ text: 'OK' }]
    );
  };

  const handlePrivacy = () => {
    Alert.alert(
      'Privacy & Security',
      'WYSPR is designed with privacy-first principles:\n\n• End-to-end encryption for all messages\n• No message previews stored\n• 2-digit PIN system for anonymity\n• No personal data collection\n• Local data storage only',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <ScrollView style={globalStyles.container} contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ padding: spacing.lg }}>
          {/* Header */}
          <View style={{ marginBottom: spacing.xl }}>
            <Text style={[globalStyles.text, { fontSize: 24, fontWeight: 'bold', marginBottom: spacing.sm }]}>
              Settings
            </Text>
            <Text style={[globalStyles.textSecondary, { fontSize: 14 }]}>
              Manage your account and app preferences
            </Text>
          </View>

          {/* Settings Options */}
          <View style={{ gap: spacing.xs }}>
            {/* Privacy & Security */}
            <TouchableOpacity
              style={[
                globalStyles.messageContainer,
                {
                  padding: spacing.lg,
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                }
              ]}
              onPress={handlePrivacy}
            >
              <View style={globalStyles.row}>
                <View style={[
                  globalStyles.pinBadge,
                  { 
                    backgroundColor: '#34C759',
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                  }
                ]}>
                  <Text style={[globalStyles.pinText, { fontSize: 16 }]}>🔒</Text>
                </View>
                <View style={{ marginLeft: spacing.md, flex: 1 }}>
                  <Text style={[globalStyles.text, { fontSize: 16, fontWeight: '600' }]}>
                    Privacy & Security
                  </Text>
                  <Text style={[globalStyles.textSecondary, { fontSize: 14, marginTop: spacing.xs }]}>
                    Learn about our privacy practices
                  </Text>
                </View>
                <Text style={[globalStyles.textSecondary, { fontSize: 18 }]}>›</Text>
              </View>
            </TouchableOpacity>

            {/* About */}
            <TouchableOpacity
              style={[
                globalStyles.messageContainer,
                {
                  padding: spacing.lg,
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                }
              ]}
              onPress={handleAbout}
            >
              <View style={globalStyles.row}>
                <View style={[
                  globalStyles.pinBadge,
                  { 
                    backgroundColor: '#007AFF',
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                  }
                ]}>
                  <Text style={[globalStyles.pinText, { fontSize: 16 }]}>ℹ️</Text>
                </View>
                <View style={{ marginLeft: spacing.md, flex: 1 }}>
                  <Text style={[globalStyles.text, { fontSize: 16, fontWeight: '600' }]}>
                    About WYSPR
                  </Text>
                  <Text style={[globalStyles.textSecondary, { fontSize: 14, marginTop: spacing.xs }]}>
                    Version and app information
                  </Text>
                </View>
                <Text style={[globalStyles.textSecondary, { fontSize: 18 }]}>›</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Logout Section */}
          <View style={{ marginTop: spacing.xl }}>
            <TouchableOpacity
              style={[
                globalStyles.messageContainer,
                {
                  padding: spacing.lg,
                  backgroundColor: colors.background,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#FF3B30',
                }
              ]}
              onPress={handleLogout}
            >
              <View style={globalStyles.row}>
                <View style={[
                  globalStyles.pinBadge,
                  { 
                    backgroundColor: '#FF3B30',
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                  }
                ]}>
                  <Text style={[globalStyles.pinText, { fontSize: 16 }]}>🚪</Text>
                </View>
                <View style={{ marginLeft: spacing.md, flex: 1 }}>
                  <Text style={[globalStyles.text, { fontSize: 16, fontWeight: '600', color: '#FF3B30' }]}>
                    Logout
                  </Text>
                  <Text style={[globalStyles.textSecondary, { fontSize: 14, marginTop: spacing.xs }]}>
                    Sign out and clear all data
                  </Text>
                </View>
                <Text style={[{ color: '#FF3B30', fontSize: 18 }]}>›</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* App Info */}
          <View style={{
            marginTop: spacing.xl,
            padding: spacing.lg,
            backgroundColor: colors.background,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
          }}>
            <Text style={[globalStyles.text, { fontSize: 18, fontWeight: 'bold', marginBottom: spacing.sm }]}>
              WYSPR
            </Text>
            <Text style={[globalStyles.textSecondary, { fontSize: 12, textAlign: 'center', lineHeight: 16 }]}>
              Secure messaging with end-to-end encryption{'\n'}
              Built with privacy in mind
            </Text>
            <Text style={[globalStyles.textSecondary, { fontSize: 10, marginTop: spacing.sm }]}>
              v1.0.0
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 
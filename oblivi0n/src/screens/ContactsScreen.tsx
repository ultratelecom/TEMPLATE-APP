import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { globalStyles, colors, spacing } from '../utils/theme';
import { RootStackParamList } from '../types';

type ContactsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: ContactsScreenNavigationProp;
}

export default function ContactsScreen({ navigation }: Props) {
  const handleAddContact = () => {
    navigation.navigate('AddContact');
  };

  const handleCreateGroup = () => {
    navigation.navigate('GroupCreation');
  };

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <ScrollView style={globalStyles.container} contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ padding: spacing.lg }}>
          {/* Header */}
          <View style={{ marginBottom: spacing.xl }}>
            <Text style={[globalStyles.text, { fontSize: 24, fontWeight: 'bold', marginBottom: spacing.sm }]}>
              Contacts
            </Text>
            <Text style={[globalStyles.textSecondary, { fontSize: 14 }]}>
              Add contacts and create groups for secure communication
            </Text>
          </View>

          {/* Action Cards */}
          <View style={{ gap: spacing.md }}>
            {/* Add Contact Card */}
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
              onPress={handleAddContact}
            >
              <View style={globalStyles.row}>
                <View style={[
                  globalStyles.pinBadge,
                  { 
                    backgroundColor: '#007AFF',
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                  }
                ]}>
                  <Text style={[globalStyles.pinText, { fontSize: 20 }]}>+</Text>
                </View>
                <View style={{ marginLeft: spacing.md, flex: 1 }}>
                  <Text style={[globalStyles.text, { fontSize: 16, fontWeight: '600' }]}>
                    Add Contact
                  </Text>
                  <Text style={[globalStyles.textSecondary, { fontSize: 14, marginTop: spacing.xs }]}>
                    Add someone using their 2-digit PIN to start chatting securely
                  </Text>
                </View>
                <Text style={[globalStyles.textSecondary, { fontSize: 18 }]}>›</Text>
              </View>
            </TouchableOpacity>

            {/* Create Group Card */}
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
              onPress={handleCreateGroup}
            >
              <View style={globalStyles.row}>
                <View style={[
                  globalStyles.pinBadge,
                  { 
                    backgroundColor: '#34C759',
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                  }
                ]}>
                  <Text style={[globalStyles.pinText, { fontSize: 16 }]}>👥</Text>
                </View>
                <View style={{ marginLeft: spacing.md, flex: 1 }}>
                  <Text style={[globalStyles.text, { fontSize: 16, fontWeight: '600' }]}>
                    Create Group
                  </Text>
                  <Text style={[globalStyles.textSecondary, { fontSize: 14, marginTop: spacing.xs }]}>
                    Start a secure group conversation with multiple contacts
                  </Text>
                </View>
                <Text style={[globalStyles.textSecondary, { fontSize: 18 }]}>›</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Security Info */}
          <View style={{
            marginTop: spacing.xl,
            padding: spacing.lg,
            backgroundColor: colors.background,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
          }}>
            <View style={globalStyles.row}>
              <Text style={{ fontSize: 20, marginRight: spacing.sm }}>🔒</Text>
              <View style={{ flex: 1 }}>
                <Text style={[globalStyles.text, { fontSize: 14, fontWeight: '600', marginBottom: spacing.xs }]}>
                  End-to-End Encryption
                </Text>
                <Text style={[globalStyles.textSecondary, { fontSize: 12, lineHeight: 16 }]}>
                  All conversations are encrypted and secured. Only you and the recipient can read the messages.
                </Text>
              </View>
            </View>
          </View>

          {/* PIN Info */}
          <View style={{
            marginTop: spacing.md,
            padding: spacing.lg,
            backgroundColor: colors.background,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
          }}>
            <View style={globalStyles.row}>
              <Text style={{ fontSize: 20, marginRight: spacing.sm }}>🏷️</Text>
              <View style={{ flex: 1 }}>
                <Text style={[globalStyles.text, { fontSize: 14, fontWeight: '600', marginBottom: spacing.xs }]}>
                  2-Digit PIN System
                </Text>
                <Text style={[globalStyles.textSecondary, { fontSize: 12, lineHeight: 16 }]}>
                  OBLIVI0N uses a secure 2-digit PIN system for contact identification. No personal information is shared.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 
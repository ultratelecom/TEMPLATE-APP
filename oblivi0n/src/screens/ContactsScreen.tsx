import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { globalStyles, colors, spacing } from '../utils/theme';
import { RootStackParamList } from '../types';
import { ContactRequestService } from '../utils/contactRequests';

type ContactsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: ContactsScreenNavigationProp;
}

export default function ContactsScreen({ navigation }: Props) {
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  useEffect(() => {
    loadPendingRequests();
  }, []);

  const loadPendingRequests = async () => {
    try {
      const contactService = ContactRequestService.getInstance();
      const requests = await contactService.getPendingRequests();
      setPendingRequestsCount(requests.length);
    } catch (error) {
      console.error('Failed to load pending requests:', error);
    }
  };

  const handleContactRequests = () => {
    navigation.navigate('ContactRequests');
  };

  const handleCreateGroup = () => {
    navigation.navigate('GroupCreation');
  };

  const handleAddContact = () => {
    navigation.navigate('AddContact');
  };

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <ScrollView style={globalStyles.container} contentContainerStyle={{ flexGrow: 1 }}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Contacts</Text>
            <Text style={styles.subtitle}>
              Secure messaging with username-based contacts
            </Text>
          </View>

          {/* Contact Requests */}
          <TouchableOpacity
            style={[
              styles.actionCard, 
              styles.glassCard,
              pendingRequestsCount > 0 && styles.priorityCard
            ]}
            onPress={handleContactRequests}
          >
            <View style={styles.cardContent}>
              <View style={[
                styles.iconContainer, 
                pendingRequestsCount > 0 ? styles.requestIcon : styles.primaryIcon
              ]}>
                <Text style={styles.iconText}>📥</Text>
                {pendingRequestsCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.badgeText}>{pendingRequestsCount}</Text>
                  </View>
                )}
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Contact Requests</Text>
                <Text style={styles.cardSubtitle}>
                  {pendingRequestsCount === 0 
                    ? 'No pending requests' 
                    : `${pendingRequestsCount} pending request${pendingRequestsCount > 1 ? 's' : ''}`
                  }
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>

          {/* Add Contact Card - For Testing */}
          <TouchableOpacity
            style={[styles.actionCard, styles.glassCard]}
            onPress={handleAddContact}
          >
            <View style={styles.cardContent}>
              <View style={[styles.iconContainer, styles.primaryIcon]}>
                <Text style={styles.iconText}>➕</Text>
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Send Contact Request</Text>
                <Text style={styles.cardSubtitle}>
                  Send a contact request using someone's username
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>

          {/* Create Group Card */}
          <TouchableOpacity
            style={[styles.actionCard, styles.glassCard]}
            onPress={handleCreateGroup}
          >
            <View style={styles.cardContent}>
              <View style={[styles.iconContainer, styles.secondaryIcon]}>
                <Text style={styles.iconText}>👥</Text>
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Create Group</Text>
                <Text style={styles.cardSubtitle}>
                  Start a secure group conversation with multiple contacts
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>

          {/* Security Info Cards */}
          <View style={styles.infoSection}>
            <View style={[styles.infoCard, styles.glassCard]}>
              <View style={styles.infoContent}>
                <Text style={styles.infoIcon}>🔒</Text>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoTitle}>End-to-End Encryption</Text>
                  <Text style={styles.infoText}>
                    All conversations are encrypted and secured. Only you and the recipient can read messages.
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.infoCard, styles.glassCard]}>
              <View style={styles.infoContent}>
                <Text style={styles.infoIcon}>🏷️</Text>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoTitle}>Username-Based System</Text>
                  <Text style={styles.infoText}>
                    OBLIVI0N uses secure usernames for contact identification. Your real identity stays private.
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.infoCard, styles.glassCard]}>
              <View style={styles.infoContent}>
                <Text style={styles.infoIcon}>💬</Text>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoTitle}>Confide-Style Experience</Text>
                  <Text style={styles.infoText}>
                    Contact requests appear directly in your chats for seamless communication flow.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  actionCard: {
    marginBottom: spacing.md,
    borderRadius: 16,
    overflow: 'hidden',
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  priorityCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  primaryIcon: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  secondaryIcon: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  requestIcon: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  iconText: {
    fontSize: 20,
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  badgeText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardTextContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  chevron: {
    fontSize: 20,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  infoSection: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  infoCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.lg,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: spacing.md,
    marginTop: 2,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
}); 
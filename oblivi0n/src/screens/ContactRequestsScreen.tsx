import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  FlatList,
  RefreshControl,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { globalStyles, colors, spacing } from '../utils/theme';
import { RootStackParamList } from '../types';
import { ContactRequestService, ContactRequest } from '../utils/contactRequests';

type ContactRequestsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ContactRequests'>;

interface Props {
  navigation: ContactRequestsScreenNavigationProp;
}

export default function ContactRequestsScreen({ navigation }: Props) {
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadRequests = async () => {
    try {
      const contactService = ContactRequestService.getInstance();
      const pendingRequests = await contactService.getPendingRequests();
      setRequests(pendingRequests);
    } catch (error) {
      console.error('Failed to load contact requests:', error);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  };

  const handleAcceptRequest = async (request: ContactRequest) => {
    setIsLoading(true);
    
    try {
      const contactService = ContactRequestService.getInstance();
      const success = await contactService.acceptContactRequest(request.id);
      
      if (success) {
        Alert.alert(
          'Contact Added',
          `PIN ${request.fromPin} has been added to your contacts!`,
          [
            {
              text: 'Start Chat',
              onPress: () => {
                // Navigate to chat with the new contact
                // TODO: Get roomId for the contact
                navigation.navigate('Chat', {
                  roomId: `chat-${request.fromPin}`,
                  pin: request.fromPin,
                });
              },
            },
            {
              text: 'OK',
              onPress: () => {
                loadRequests(); // Refresh the list
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to accept contact request');
      }
    } catch (error) {
      console.error('Failed to accept request:', error);
      Alert.alert('Error', 'Failed to accept contact request');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectRequest = async (request: ContactRequest) => {
    Alert.alert(
      'Reject Contact Request',
      `Are you sure you want to reject the contact request from PIN ${request.fromPin}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            
            try {
              const contactService = ContactRequestService.getInstance();
              const success = await contactService.rejectContactRequest(request.id);
              
              if (success) {
                Alert.alert('Request Rejected', 'Contact request has been rejected');
                loadRequests(); // Refresh the list
              } else {
                Alert.alert('Error', 'Failed to reject contact request');
              }
            } catch (error) {
              console.error('Failed to reject request:', error);
              Alert.alert('Error', 'Failed to reject contact request');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderRequest = ({ item }: { item: ContactRequest }) => (
    <View style={[globalStyles.messageContainer, { marginBottom: spacing.md }]}>
      <View style={[globalStyles.row, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
        <View style={{ flex: 1 }}>
          <Text style={[globalStyles.text, { fontSize: 16, fontWeight: 'bold' }]}>
            Contact Request from PIN {item.fromPin}
          </Text>
          <Text style={[globalStyles.textSecondary, { fontSize: 12, marginTop: spacing.xs }]}>
            {formatTimestamp(item.timestamp)}
          </Text>
          {item.message && (
            <Text style={[globalStyles.text, { marginTop: spacing.sm, fontSize: 14 }]}>
              "{item.message}"
            </Text>
          )}
        </View>
      </View>
      
      <View style={[globalStyles.row, { marginTop: spacing.md, justifyContent: 'space-between' }]}>
        <TouchableOpacity
          style={[
            globalStyles.button,
            { 
              backgroundColor: colors.error,
              flex: 0.45,
              paddingVertical: spacing.sm,
            }
          ]}
          onPress={() => handleRejectRequest(item)}
          disabled={isLoading}
        >
          <Text style={[globalStyles.buttonText, { fontSize: 14 }]}>
            REJECT
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            globalStyles.button,
            { 
              backgroundColor: colors.success || colors.button,
              flex: 0.45,
              paddingVertical: spacing.sm,
            }
          ]}
          onPress={() => handleAcceptRequest(item)}
          disabled={isLoading}
        >
          <Text style={[globalStyles.buttonText, { fontSize: 14 }]}>
            ACCEPT
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <View style={globalStyles.container}>
        <View style={globalStyles.screen}>
          <View style={{ marginBottom: spacing.xl }}>
            <Text style={[globalStyles.text, { fontSize: 20, textAlign: 'center' }]}>
              Contact Requests
            </Text>
            <Text style={[globalStyles.textSecondary, { textAlign: 'center', marginTop: spacing.sm }]}>
              {requests.length === 0 ? 'No pending requests' : `${requests.length} pending request${requests.length > 1 ? 's' : ''}`}
            </Text>
          </View>

          {requests.length === 0 ? (
            <View style={[globalStyles.messageContainer, { backgroundColor: colors.surface }]}>
              <Text style={[globalStyles.textSecondary, { textAlign: 'center' }]}>
                No contact requests at the moment.{'\n'}
                When someone sends you a contact request using your PIN, it will appear here.
              </Text>
            </View>
          ) : (
            <FlatList
              data={requests}
              renderItem={renderRequest}
              keyExtractor={(item) => item.id}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.text}
                />
              }
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
} 
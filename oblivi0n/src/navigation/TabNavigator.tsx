import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import { colors } from '../utils/theme';
import ChatsScreen from '../screens/ChatsScreen';
import ContactsScreen from '../screens/ContactsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { ContactRequestService } from '../utils/contactRequests';
import { WysprMatrixClient } from '../utils/matrixClient';
import { useFocusEffect } from '@react-navigation/native';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  
  console.error('🔥🔥🔥 TAB NAVIGATOR RENDERED 🔥🔥🔥');
  console.log('[TabNavigator] TabNavigator component rendered');

  // Initialize Matrix client when TabNavigator mounts
  useEffect(() => {
    const initializeMatrixClient = async () => {
      try {
        const startTime = Date.now();
        const matrixClient = WysprMatrixClient.getInstance();
        console.log('[TabNavigator] Starting Matrix client initialization...');
        
        const initialized = await matrixClient.initializeClient();
        const elapsed = Date.now() - startTime;
        
        if (initialized) {
          console.log(`[TabNavigator] Matrix client initialized successfully in ${elapsed}ms`);
          const client = matrixClient.getClient();
          const userId = client?.getUserId();
          console.log(`[TabNavigator] Client details - exists: ${!!client}, userId: ${userId}`);
        } else {
          console.log(`[TabNavigator] Matrix client initialization failed after ${elapsed}ms - user may need to log in`);
        }
      } catch (error) {
        console.error('[TabNavigator] Failed to initialize Matrix client:', error);
      }
    };

    console.log('[TabNavigator] Component mounted, starting initialization');
    initializeMatrixClient();
  }, []);

  const loadPendingRequests = async () => {
    try {
      const contactService = ContactRequestService.getInstance();
      const requests = await contactService.getPendingRequests();
      setPendingRequestsCount(requests.length);
    } catch (error) {
      console.error('Failed to load pending requests for badge:', error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadPendingRequests();
      // Set up interval to check for new requests
      const interval = setInterval(loadPendingRequests, 5000); // Check every 5 seconds
      return () => clearInterval(interval);
    }, [])
  );

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontFamily: 'SF Pro Text',
          fontSize: 18,
          fontWeight: '500',
        },
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingBottom: 8,
          paddingTop: 8,
          height: 88,
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginBottom: 4,
        },
      }}
    >
      <Tab.Screen
        name="Chats"
        component={ChatsScreen}
        options={{
          title: 'WYSPR',
          tabBarLabel: 'Chats',
          tabBarIcon: ({ color, size }) => (
            <TabIcon icon="💬" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Contacts"
        component={ContactsScreen}
        options={{
          title: 'Contacts',
          tabBarLabel: 'Contacts',
          tabBarIcon: ({ color, size }) => (
            <TabIconWithBadge 
              icon="👥" 
              color={color} 
              size={size} 
              badgeCount={pendingRequestsCount}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <TabIcon icon="⚙️" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Simple tab icon component
const TabIcon = ({ icon, color, size }: { icon: string; color: string; size: number }) => {
  return (
    <Text style={{ fontSize: size - 4, color, textAlign: 'center' }}>
      {icon}
    </Text>
  );
};

// Tab icon with badge component
const TabIconWithBadge = ({ icon, color, size, badgeCount }: { 
  icon: string; 
  color: string; 
  size: number; 
  badgeCount: number;
}) => {
  return (
    <View style={{ position: 'relative' }}>
      <Text style={{ fontSize: size - 4, color, textAlign: 'center' }}>
        {icon}
      </Text>
      {badgeCount > 0 && (
        <View style={{
          position: 'absolute',
          top: -8,
          right: -8,
          backgroundColor: '#EF4444',
          borderRadius: 10,
          minWidth: 20,
          height: 20,
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 2,
          borderColor: colors.background,
        }}>
          <Text style={{
            color: colors.text,
            fontSize: 12,
            fontWeight: 'bold',
          }}>
            {badgeCount > 99 ? '99+' : badgeCount}
          </Text>
        </View>
      )}
    </View>
  );
}; 
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors } from '../utils/theme';
import ChatsScreen from '../screens/ChatsScreen';
import ContactsScreen from '../screens/ContactsScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
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
          title: 'OBLIVI0N',
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
            <TabIcon icon="👥" color={color} size={size} />
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
  const { Text } = require('react-native');
  return (
    <Text style={{ fontSize: size - 4, color, textAlign: 'center' }}>
      {icon}
    </Text>
  );
}; 
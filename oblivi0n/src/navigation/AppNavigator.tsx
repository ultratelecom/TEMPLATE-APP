import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../utils/theme';
import { RootStackParamList } from '../types';

// Import screens
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import ChatScreen from '../screens/ChatScreen';
import AddContactScreen from '../screens/AddContactScreen';
import GroupCreationScreen from '../screens/GroupCreationScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SignupScreen from '../screens/SignupScreen';

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <>
      <StatusBar style="light" backgroundColor={colors.background} />
      <NavigationContainer
        theme={{
          dark: true,
          colors: {
            primary: colors.text,
            background: colors.background,
            card: colors.surface,
            text: colors.text,
            border: colors.border,
            notification: colors.text,
          },
          fonts: {
            regular: {
              fontFamily: 'SF Pro Text',
              fontWeight: '400',
            },
            medium: {
              fontFamily: 'SF Pro Text',
              fontWeight: '500',
            },
            bold: {
              fontFamily: 'SF Pro Text',
              fontWeight: '700',
            },
            heavy: {
              fontFamily: 'SF Pro Text',
              fontWeight: '900',
            },
          },
        }}
      >
        <Stack.Navigator
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
            headerBackTitle: '',
            cardStyle: {
              backgroundColor: colors.background,
            },
          }}
        >
          <Stack.Screen
            name="Splash"
            component={SplashScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="Signup"
            component={SignupScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{
              title: 'OBLIVI0N',
              headerLeft: () => null, // Disable back button
            }}
          />
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={({ route }) => ({
              title: `PIN: ${route.params.pin}`,
            })}
          />
          <Stack.Screen
            name="AddContact"
            component={AddContactScreen}
            options={{
              title: 'Add Contact',
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="GroupCreation"
            component={GroupCreationScreen}
            options={{
              title: 'Create Group',
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={({ route }) => ({
              title: `Profile: ${route.params.pin}`,
              presentation: 'modal',
            })}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
} 
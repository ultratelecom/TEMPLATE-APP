import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  Animated,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { globalStyles, colors, spacing } from '../utils/theme';
import { RootStackParamList } from '../types';
import { WysprMatrixClient } from '../utils/matrixClient';

type SplashScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Splash'>;

interface Props {
  navigation: SplashScreenNavigationProp;
}

export default function SplashScreen({ navigation }: Props) {
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const titleScaleAnimation = useRef(new Animated.Value(0.8)).current;
  const titleOpacityAnimation = useRef(new Animated.Value(0)).current;
  
  console.log('[SplashScreen] SplashScreen component rendered');
  
  const animationLines = [
    'Initializing Secure Environment…',
    'Verifying Integrity and Cipher Handshake…',
    'Launching Encrypted Session Layer…',
    'Zero Comm Protocol Bootstrapped.'
  ];

  useEffect(() => {
    // Start title animations with consistent native driver usage
    Animated.parallel([
      Animated.timing(titleScaleAnimation, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(titleOpacityAnimation, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    let currentLineIndex = 0;
    
    const showNextLine = () => {
      if (currentLineIndex < animationLines.length) {
        setDisplayedLines(prev => [...prev, animationLines[currentLineIndex]]);
        currentLineIndex++;
        
        // Schedule next line after 800ms
        setTimeout(showNextLine, 800);
      } else {
        // After all lines are shown, wait 1 second then check session and navigate
        setTimeout(async () => {
          try {
            console.log('[SplashScreen] Animation complete, checking session...');
            const matrixClient = WysprMatrixClient.getInstance();
            console.log('[SplashScreen] Got Matrix client instance');
            
            // Force clear any potentially corrupted session
            const client = matrixClient.getClient();
            if (client) {
              console.log('[SplashScreen] Found existing client, checking if functional...');
              // If we detect token issues, clear the session immediately
              try {
                const userId = client.getUserId();
                console.log(`[SplashScreen] Client userId: ${userId}`);
              } catch (clientError) {
                console.warn('[SplashScreen] Client appears corrupted, clearing session');
                await matrixClient.clearSessionData();
              }
            }
            
            const hasValidSession = await matrixClient.hasValidSession();
            console.log(`[SplashScreen] Session check result: ${hasValidSession}`);
            
            if (hasValidSession) {
              console.log('[SplashScreen] *** Valid session found, navigating to Home ***');
              navigation.replace('Home');
            } else {
              console.log('[SplashScreen] *** No valid session, navigating to Login ***');
              navigation.replace('Login');
            }
          } catch (error) {
            console.error('[SplashScreen] Error checking session:', error);
            console.log('[SplashScreen] *** Error occurred, navigating to Login ***');
            navigation.replace('Login');
          }
        }, 1000);
      }
    };

    // Start text animation after 500ms delay
    const startTimer = setTimeout(showNextLine, 500);

    return () => {
      clearTimeout(startTimer);
    };
  }, [navigation, titleScaleAnimation, titleOpacityAnimation]);

  return (
    <SafeAreaView style={[globalStyles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[globalStyles.container, globalStyles.centered]}>
        <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <Animated.Text 
            style={[
              globalStyles.textMono, 
              { 
                fontSize: 32, 
                marginBottom: spacing.xxl, 
                color: colors.text,
                textShadowColor: colors.text,
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 10,
                transform: [{ scale: titleScaleAnimation }],
                opacity: titleOpacityAnimation,
              }
            ]}
          >
            WYSPR
          </Animated.Text>
          
          <View style={{ minHeight: 120, justifyContent: 'flex-start' }}>
            {displayedLines.map((line, index) => (
              <View
                key={index}
                style={{
                  opacity: 1,
                }}
              >
                <Text
                  style={[
                    globalStyles.textMono,
                    {
                      fontSize: 14,
                      color: colors.text,
                      marginBottom: spacing.sm,
                      opacity: 0.9,
                      textAlign: 'left',
                      fontFamily: 'monospace',
                    }
                  ]}
                >
                  {`> ${line}`}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
} 
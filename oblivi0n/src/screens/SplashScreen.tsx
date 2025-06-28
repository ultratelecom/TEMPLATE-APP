import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { globalStyles, colors, spacing } from '../utils/theme';
import { RootStackParamList } from '../types';

type SplashScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Splash'>;

interface Props {
  navigation: SplashScreenNavigationProp;
}

export default function SplashScreen({ navigation }: Props) {
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  
  const animationLines = [
    'Initializing Secure Environment…',
    'Verifying Integrity and Cipher Handshake…',
    'Launching Encrypted Session Layer…',
    'Zero Comm Protocol Bootstrapped.'
  ];

  useEffect(() => {
    let currentLineIndex = 0;
    
    const showNextLine = () => {
      if (currentLineIndex < animationLines.length) {
        setDisplayedLines(prev => [...prev, animationLines[currentLineIndex]]);
        currentLineIndex++;
        
        // Schedule next line after 800ms
        setTimeout(showNextLine, 800);
      } else {
        // After all lines are shown, wait 1 second then navigate
        setTimeout(() => {
          navigation.replace('Login');
        }, 1000);
      }
    };

    // Start animation after 500ms delay
    const startTimer = setTimeout(showNextLine, 500);

    return () => {
      clearTimeout(startTimer);
    };
  }, [navigation]);

  return (
    <SafeAreaView style={[globalStyles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[globalStyles.container, globalStyles.centered]}>
        <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <Text style={[
            globalStyles.textMono, 
            { 
              fontSize: 24, 
              marginBottom: spacing.xxl, 
              color: colors.text 
            }
          ]}>
            OBLIVI0N
          </Text>
          
          <View style={{ minHeight: 120, justifyContent: 'flex-start' }}>
            {displayedLines.map((line, index) => (
              <Text
                key={index}
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
            ))}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
} 
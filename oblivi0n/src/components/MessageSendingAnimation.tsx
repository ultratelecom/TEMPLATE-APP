import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, Dimensions } from 'react-native';
import { colors, spacing } from '../utils/theme';

interface MessageSendingAnimationProps {
  isVisible: boolean;
  message: string;
  onAnimationComplete: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

export default function MessageSendingAnimation({
  isVisible,
  message,
  onAnimationComplete,
}: MessageSendingAnimationProps) {
  // Animation values
  const slideUp = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const lockRotate = useRef(new Animated.Value(0)).current;
  const encryptProgress = useRef(new Animated.Value(0)).current;
  const sendProgress = useRef(new Animated.Value(0)).current;
  const bubbleScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (isVisible) {
      startSendingAnimation();
    } else {
      resetAnimation();
    }
  }, [isVisible]);

  const startSendingAnimation = () => {
    // Phase 1: Show message bubble rising up
    Animated.sequence([
      // Initial appearance
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideUp, {
          toValue: -50,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(bubbleScale, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      
      // Phase 2: Encryption animation
      Animated.parallel([
        Animated.timing(lockRotate, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(encryptProgress, {
          toValue: 1,
          duration: 800,
          useNativeDriver: false,
        }),
      ]),
      
      // Phase 3: Send animation
      Animated.parallel([
        Animated.timing(sendProgress, {
          toValue: 1,
          duration: 500,
          useNativeDriver: false,
        }),
        Animated.timing(slideUp, {
          toValue: -100,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          delay: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      onAnimationComplete();
    });
  };

  const resetAnimation = () => {
    slideUp.setValue(0);
    opacity.setValue(0);
    lockRotate.setValue(0);
    encryptProgress.setValue(0);
    sendProgress.setValue(0);
    bubbleScale.setValue(0.8);
  };

  if (!isVisible) return null;

  const lockRotation = lockRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const encryptWidth = encryptProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const sendTrail = sendProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, screenWidth],
  });

  return (
    <View style={{
      position: 'absolute',
      bottom: 80,
      right: 16,
      zIndex: 1000,
    }}>
      <Animated.View
        style={{
          transform: [
            { translateY: slideUp },
            { scale: bubbleScale }
          ],
          opacity: opacity,
        }}
      >
        {/* Message bubble */}
        <View style={{
          backgroundColor: '#007AFF',
          borderRadius: 18,
          paddingHorizontal: 12,
          paddingVertical: 8,
          maxWidth: 250,
          shadowOpacity: 0.3,
          shadowRadius: 4,
          shadowColor: '#007AFF',
          shadowOffset: { width: 0, height: 2 },
          elevation: 5,
        }}>
          <Text style={{
            color: '#FFFFFF',
            fontSize: 14,
            lineHeight: 18,
          }}>
            {message}
          </Text>

          {/* Encryption progress bar */}
          <View style={{
            height: 2,
            backgroundColor: 'rgba(255,255,255,0.3)',
            borderRadius: 1,
            marginTop: 6,
            overflow: 'hidden',
          }}>
            <Animated.View style={{
              height: '100%',
              backgroundColor: '#FFFFFF',
              width: encryptWidth,
            }} />
          </View>

          {/* Status text */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 4,
          }}>
            <Animated.View style={{
              transform: [{ rotate: lockRotation }]
            }}>
              <Text style={{ fontSize: 10, color: '#FFFFFF' }}>🔒</Text>
            </Animated.View>
            <Text style={{
              fontSize: 9,
              color: 'rgba(255,255,255,0.8)',
              marginLeft: 4,
            }}>
              Encrypting...
            </Text>
          </View>
        </View>

        {/* Send trail effect */}
        <Animated.View style={{
          position: 'absolute',
          top: '50%',
          left: '100%',
          width: sendTrail,
          height: 2,
          backgroundColor: '#007AFF',
          opacity: 0.6,
        }} />
      </Animated.View>
    </View>
  );
} 
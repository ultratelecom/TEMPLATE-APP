import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  PanResponder,
  Animated,
  Alert,
  Platform,
  Easing,
} from 'react-native';
import { globalStyles, colors, spacing, animations } from '../utils/theme';
import { Message } from '../types';
import { NicknameService } from '../utils/nicknames';
import { UserRegistrationService } from '../utils/userRegistration';
import { ReadReceiptService } from '../utils/readReceipts';

interface BlurToRevealMessageProps {
  message: Message;
  currentUserId: string;
  onDecrypt?: (messageId: string) => void;
  onBlur?: (messageId: string) => void;
}

const REVEAL_TIMEOUT = 7000; // 7 seconds
const BLUR_OVERLAY_CHARS = '████████████████████';

export default function BlurToRevealMessage({
  message,
  currentUserId,
  onDecrypt,
  onBlur,
}: BlurToRevealMessageProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [countdown, setCountdown] = useState(REVEAL_TIMEOUT / 1000);
  const revealTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Animation values
  const blurOpacity = useRef(new Animated.Value(1)).current;
  const revealProgress = useRef(new Animated.Value(0)).current;
  const messageScale = useRef(new Animated.Value(1)).current;
  const slideY = useRef(new Animated.Value(0)).current;
  const lockOpacity = useRef(new Animated.Value(0.7)).current;
  const decryptProgress = useRef(new Animated.Value(0)).current;
  const holdProgress = useRef(new Animated.Value(0)).current;
  
  const isOwnMessage = message.senderId === currentUserId;
  
  // Get display name and online status for sender
  const [displayName, setDisplayName] = useState(message.senderPin);
  const [isOnline, setIsOnline] = useState(false);
  const [readCount, setReadCount] = useState(0);
  
  useEffect(() => {
    const loadSenderInfo = async () => {
      const registrationService = UserRegistrationService.getInstance();
      await registrationService.initialize();
      
      const userDisplayName = await registrationService.getDisplayNameByPin(message.senderPin);
      const userOnlineStatus = await registrationService.isUserOnline(message.senderPin);
      
      setDisplayName(userDisplayName);
      setIsOnline(userOnlineStatus);
    };
    
    loadSenderInfo();
  }, [message.senderPin]);

  // Update read receipts
  useEffect(() => {
    const readReceiptService = ReadReceiptService.getInstance();
    const count = readReceiptService.getReadCount(message.id, message.roomId);
    setReadCount(count);
    
    // Poll for read receipt updates every 2 seconds
    const interval = setInterval(() => {
      const updatedCount = readReceiptService.getReadCount(message.id, message.roomId);
      setReadCount(updatedCount);
    }, 2000);
    
    return () => clearInterval(interval);
  }, [message.id, message.roomId]);
  
  // Debug logging for message positioning
  console.log('[WYSPR Message]', {
    messageId: message.id,
    senderId: message.senderId,
    currentUserId: currentUserId,
    isOwnMessage: isOwnMessage,
    senderPin: message.senderPin
  });

  // Clear any existing timeouts on unmount
  useEffect(() => {
    return () => {
      if (revealTimeoutRef.current) {
        clearTimeout(revealTimeoutRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // Screenshot detection warning (iOS only for now)
  const warnScreenshot = () => {
    if (Platform.OS === 'ios' && isRevealed) {
      Alert.alert(
        'Security Warning',
        'Screenshots may compromise message security',
        [{ text: 'Understood', style: 'default' }]
      );
    }
  };

  // Handle reveal timeout with countdown
  const startRevealTimeout = () => {
    if (revealTimeoutRef.current) {
      clearTimeout(revealTimeoutRef.current);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    
    // Reset countdown
    setCountdown(REVEAL_TIMEOUT / 1000);
    
    // Start countdown interval
    let timeLeft = REVEAL_TIMEOUT / 1000;
    countdownIntervalRef.current = setInterval(() => {
      timeLeft -= 1;
      setCountdown(Math.max(0, timeLeft));
      
      if (timeLeft <= 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
      }
    }, 1000);
    
    // Set main timeout
    revealTimeoutRef.current = setTimeout(() => {
      handleBlur();
    }, REVEAL_TIMEOUT);
  };

  // Handle message reveal with buttery smooth Confide-style animation
  const handleReveal = () => {
    console.log('[WYSPR Message] Revealing message:', message.id);
    
    setIsPressed(true);
    
    // Start buttery smooth hold progress animation
    Animated.timing(holdProgress, {
      toValue: 1,
      duration: 400, // Shorter - 400ms for snappier feel
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic), // Smooth easing
    }).start(({ finished }) => {
      if (finished) {
        setIsRevealed(true);
        onDecrypt?.(message.id);
        startRevealTimeout();
        
        // Buttery smooth reveal sequence 
        Animated.parallel([
          // Smooth blur fade with custom timing
          Animated.timing(blurOpacity, {
            toValue: 0,
            duration: 200, // Quick and smooth
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          // Gentle scale with bounce
          Animated.spring(messageScale, {
            toValue: 1.02,
            tension: 300,
            friction: 20,
            useNativeDriver: true,
          }),
          // Subtle upward float
          Animated.timing(slideY, {
            toValue: -1,
            duration: 250,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          // Lock icon glow
          Animated.timing(lockOpacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start();
      }
    });
  };

  // Handle message blur
  const handleBlur = () => {
    console.log('[WYSPR Message] Blurring message:', message.id);
    
    setIsRevealed(false);
    setIsPressed(false);
    onBlur?.(message.id);
    
    // Clear timeouts
    if (revealTimeoutRef.current) {
      clearTimeout(revealTimeoutRef.current);
      revealTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    
    // Stop any ongoing animations
    holdProgress.stopAnimation();
    decryptProgress.stopAnimation();
    
    // Reset all animation values
    Animated.parallel([
      // Fade blur back in
      Animated.timing(blurOpacity, {
        toValue: 1,
        duration: animations.medium,
        useNativeDriver: true,
      }),
      // Scale back to normal
      Animated.timing(messageScale, {
        toValue: 1,
        duration: animations.fast,
        useNativeDriver: true,
      }),
      // Reset position
      Animated.timing(slideY, {
        toValue: 0,
        duration: animations.fast,
        useNativeDriver: true,
      }),
      // Reset lock opacity
      Animated.timing(lockOpacity, {
        toValue: 0.7,
        duration: animations.medium,
        useNativeDriver: true,
      }),
      // Reset progress animations
      Animated.timing(holdProgress, {
        toValue: 0,
        duration: animations.fast,
        useNativeDriver: false,
      }),
      Animated.timing(decryptProgress, {
        toValue: 0,
        duration: animations.fast,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => false,
      
      onPanResponderGrant: () => {
        handleReveal();
      },
      
      onPanResponderRelease: () => {
        handleBlur();
      },
      
      onPanResponderTerminate: () => {
        handleBlur();
      },
    })
  ).current;

  // Generate blur overlay that EXACTLY matches text spacing
  const generateBlurOverlay = (content: string): string => {
    return content.replace(/\S/g, '█'); // Replace every non-whitespace character with █
    // This preserves exact spacing, word breaks, and character count
  };

  return (
    <View style={{ 
      alignSelf: isOwnMessage ? 'flex-end' : 'flex-start',
      maxWidth: '75%',
      marginVertical: spacing.sm,
      marginLeft: isOwnMessage ? spacing.xl : spacing.xs,
      marginRight: isOwnMessage ? spacing.xs : spacing.xl,
    }}>
      {/* Sender name with online status for incoming messages only */}
      {!isOwnMessage && (
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 2,
          marginLeft: spacing.sm,
        }}>
          {/* Online status indicator */}
          <View style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: isOnline ? '#00FF00' : '#666666',
            marginRight: 6,
          }} />
          
          <Text style={[
            globalStyles.textSecondary, 
            { 
              fontSize: 11, 
              fontWeight: '500'
            }
          ]}>
            {displayName}
          </Text>
        </View>
      )}

      {/* Message bubble */}
      <Animated.View 
        style={[
                     {
             backgroundColor: isOwnMessage ? '#007AFF' : colors.surface,
             borderRadius: 18,
             paddingHorizontal: 14,
             paddingVertical: 10,
             shadowOpacity: 0.1,
             shadowRadius: 2,
             shadowColor: '#000',
             shadowOffset: { width: 0, height: 1 },
             elevation: 2,
             position: 'relative',
             transform: [
               { scale: messageScale },
               { translateY: slideY }
             ],
           }
        ]}
        {...panResponder.panHandlers}
      >
        {/* Message content with perfect size matching */}
        {isRevealed && isPressed ? (
          // Revealed content
          <Text style={[
            globalStyles.text, 
            { 
              fontSize: 16, 
              lineHeight: 22,
              color: isOwnMessage ? '#FFFFFF' : colors.text,
            }
          ]}>
            {message.content}
          </Text>
        ) : (
          // Blurred content with same exact styling
          <Text style={[
            globalStyles.text, 
            { 
              fontSize: 16, 
              lineHeight: 22,
              color: isOwnMessage ? 'rgba(255,255,255,0.4)' : 'rgba(128,128,128,0.6)',
              letterSpacing: 0.5, // Slightly spread the blur characters
            }
          ]}>
            {generateBlurOverlay(message.content)}
          </Text>
        )}
        
        {/* Status text below message */}
        {isRevealed && isPressed ? (
          <Text style={[
            globalStyles.textSecondary, 
            { 
              fontSize: 9, 
              fontStyle: 'italic',
              color: isOwnMessage ? 'rgba(255,255,255,0.6)' : colors.textSecondary,
              marginTop: 6,
              textAlign: 'center'
            }
          ]}>
            Auto-blur in {Math.ceil(countdown)}s
          </Text>
        ) : (
          <View>
            {/* Hold progress bar */}
            {isPressed && (
              <View style={{
                height: 2,
                backgroundColor: 'rgba(255,255,255,0.3)',
                borderRadius: 1,
                marginTop: 6,
                overflow: 'hidden',
              }}>
                <Animated.View style={{
                  height: '100%',
                  backgroundColor: isOwnMessage ? '#FFFFFF' : '#007AFF',
                  width: holdProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                }} />
              </View>
            )}
            
            {/* Decryption progress indicator */}
            {isPressed && (
              <Animated.View style={{
                opacity: decryptProgress.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, 1, 0],
                }),
                marginTop: 4,
              }}>
                <Text style={[
                  globalStyles.textSecondary, 
                  { 
                    fontSize: 9, 
                    fontStyle: 'italic',
                    color: isOwnMessage ? 'rgba(255,255,255,0.8)' : colors.textSecondary,
                    textAlign: 'center',
                  }
                ]}>
                  🔓 Decrypting...
                </Text>
              </Animated.View>
            )}
            
            {/* Interaction hint - padded to avoid lock clash */}
            {!isPressed && (
              <Text style={[
                globalStyles.textSecondary, 
                { 
                  fontSize: 9, 
                  fontStyle: 'italic',
                  color: isOwnMessage ? 'rgba(255,255,255,0.5)' : colors.textSecondary,
                  textAlign: 'center',
                  marginTop: 4,
                  paddingRight: 25, // Padding to avoid lock icon clash
                }
              ]}>
                Hold to reveal
              </Text>
            )}
          </View>
        )}

        {/* Lock icon in lower right corner (replaces E2E text) */}
        <Animated.View style={{
          position: 'absolute',
          bottom: 4,
          right: 6,
          opacity: lockOpacity,
        }}>
          <Text style={{ 
            fontSize: 10,
            color: isOwnMessage ? 'rgba(255,255,255,0.8)' : colors.textSecondary 
          }}>
            {message.isEncrypted ? '🔒' : '⚠️'}
          </Text>
        </Animated.View>
      </Animated.View>

      {/* Timestamp and read receipts below the bubble (like iMessage) */}
      <View style={{
        flexDirection: 'row',
        justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
        alignItems: 'center',
        marginTop: 2,
        gap: spacing.xs,
      }}>
        <Text style={[
          globalStyles.textSecondary, 
          { 
            fontSize: 11, 
            color: colors.textSecondary,
          }
        ]}>
          {message.timestamp.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          })}
        </Text>
        
        {/* Read receipts for own messages only */}
        {isOwnMessage && readCount > 0 && (
          <Text style={[
            globalStyles.textSecondary,
            {
              fontSize: 10,
              color: colors.textSecondary,
            }
          ]}>
            👁️ {readCount}
          </Text>
        )}
      </View>
    </View>
  );
} 
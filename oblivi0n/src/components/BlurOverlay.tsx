import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { colors, spacing } from '../utils/theme';

// Try to import blur view, fallback to regular view if not available
let BlurView: any;
try {
  BlurView = require('@react-native-community/blur').BlurView;
} catch (error) {
  console.warn('[WYSPR BlurOverlay] BlurView not available, using fallback');
  BlurView = null;
}

interface Props {
  isVisible: boolean;
  intensity?: number;
  message?: string;
}

const { width, height } = Dimensions.get('window');

export default function BlurOverlay({ 
  isVisible, 
  intensity = 15, 
  message = '🔒 Privacy Protection Active' 
}: Props) {
  if (!isVisible) {
    return null;
  }

  // Use native blur if available, otherwise use semi-transparent overlay
  if (BlurView) {
    return (
      <View style={styles.container}>
        <BlurView
          style={styles.blurView}
          blurType="dark"
          blurAmount={intensity}
          reducedTransparencyFallbackColor={colors.background}
        />
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>{message}</Text>
          <Text style={styles.subText}>
            Screenshot protection enabled
          </Text>
        </View>
      </View>
    );
  }

  // Fallback overlay without native blur
  return (
    <View style={styles.container}>
      <View style={styles.fallbackOverlay} />
      <View style={styles.messageContainer}>
        <Text style={styles.messageText}>{message}</Text>
        <Text style={styles.subText}>
          Screenshot protection enabled
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width,
    height,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  fallbackOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    width: '100%',
    height: '100%',
  },
  messageContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
}); 
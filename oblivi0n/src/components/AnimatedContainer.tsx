import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { colors, spacing, borderRadius } from '../utils/theme';

interface AnimatedContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  delay?: number;
  glowEnabled?: boolean;
  variant?: 'surface' | 'message' | 'input';
}

export default function AnimatedContainer({
  children,
  style,
  delay = 0,
  glowEnabled = true,
  variant = 'surface',
}: AnimatedContainerProps) {
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const slideAnimation = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Entry animation
    Animated.parallel([
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 600,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnimation, {
        toValue: 0,
        duration: 600,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, fadeAnimation, slideAnimation]);

  const containerStyle = [
    styles.container,
    styles[variant],
    style,
  ];

  return (
    <Animated.View
      style={[
        containerStyle,
        {
          opacity: fadeAnimation,
          transform: [{ translateY: slideAnimation }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  surface: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    padding: spacing.md,
  },
  message: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    padding: spacing.sm,
    marginVertical: spacing.xs,
  },
  input: {
    backgroundColor: colors.input,
    borderColor: colors.border,
    padding: spacing.md,
  },
}); 
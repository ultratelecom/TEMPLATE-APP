import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../utils/theme';

interface AnimatedButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  variant?: 'primary' | 'secondary' | 'accent';
  size?: 'small' | 'medium' | 'large';
}

export default function AnimatedButton({
  title,
  onPress,
  disabled = false,
  style,
  textStyle,
  variant = 'primary',
  size = 'medium',
}: AnimatedButtonProps) {
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const opacityAnimation = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    
    Animated.parallel([
      Animated.timing(scaleAnimation, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnimation, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    
    Animated.parallel([
      Animated.timing(scaleAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const getButtonStyles = () => {
    const baseStyles = styles[size];
    const variantStyles = styles[variant];
    
    return [
      baseStyles,
      variantStyles,
      style,
    ];
  };

  const getTextStyles = () => {
    const baseTextStyles = textStyles[size];
    const variantTextStyles = textStyles[variant];
    
    return [
      baseTextStyles,
      variantTextStyles,
      textStyle,
    ];
  };

  return (
    <Animated.View
      style={[
        {
          transform: [{ scale: scaleAnimation }],
          opacity: opacityAnimation,
        },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={0.9}
      >
        <View
          style={[
            ...getButtonStyles(),
            {
              opacity: disabled ? 0.5 : 1,
            },
          ]}
        >
          <Text style={getTextStyles()}>
            {title}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Size variants
  small: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 36,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  medium: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  large: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 56,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Variant styles
  primary: {
    backgroundColor: colors.button,
  },
  secondary: {
    backgroundColor: colors.surface,
  },
  accent: {
    backgroundColor: '#1a1a1a',
  },
});

const textStyles = StyleSheet.create({
  // Size variants
  small: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.system,
    fontWeight: typography.fontWeight.medium,
  },
  medium: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.system,
    fontWeight: typography.fontWeight.medium,
  },
  large: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.system,
    fontWeight: typography.fontWeight.bold,
  },
  
  // Variant styles
  primary: {
    color: colors.text,
  },
  secondary: {
    color: colors.text,
  },
  accent: {
    color: colors.text,
  },
}); 
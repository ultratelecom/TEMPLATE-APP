import { StyleSheet } from 'react-native';

// Oblivi0n theme - strict black and white only
export const colors = {
  background: '#000000',
  surface: '#111111',
  text: '#FFFFFF',
  textSecondary: '#CCCCCC',
  border: '#333333',
  input: '#1A1A1A',
  button: '#222222',
  buttonPressed: '#333333',
  blur: '#666666',
  transparent: 'transparent',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
  },
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    bold: '700' as const,
  },
  fontFamily: {
    mono: 'SF Mono',
    system: 'SF Pro Text',
  },
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
};

// Global styles
export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    color: colors.text,
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.system,
  },
  textMono: {
    color: colors.text,
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.mono,
  },
  textSecondary: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.system,
  },
  input: {
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    color: colors.text,
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.mono,
    padding: spacing.md,
    minHeight: 48,
  },
  button: {
    backgroundColor: colors.button,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: colors.text,
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.system,
    fontWeight: typography.fontWeight.medium,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  blurredBox: {
    backgroundColor: colors.blur,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    margin: spacing.xs,
  },
  messageContainer: {
    padding: spacing.sm,
    marginVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
  },
  pinBadge: {
    backgroundColor: colors.button,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 32,
    alignItems: 'center',
  },
  pinText: {
    color: colors.text,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.mono,
    fontWeight: typography.fontWeight.bold,
  },
});

// Animation timings
export const animations = {
  fast: 150,
  medium: 300,
  slow: 500,
}; 
export const colors = {
  primary: '#007AFF',
  secondary: '#5856D6',
  success: '#34C759',
  danger: '#FF3B30',
  warning: '#FF9500',
  info: '#5856D6',
  background: '#FFFFFF',
  card: '#F2F2F7',
  text: '#000000',
  textSecondary: '#8E8E93',
  border: '#C6C6C8',
  white: '#FFFFFF',
  black: '#000000',
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
  h1: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: colors.text,
  },
  h2: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: colors.text,
  },
  h3: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: colors.text,
  },
  body1: {
    fontSize: 16,
    color: colors.text,
  },
  body2: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  caption: {
    fontSize: 12,
    color: colors.textSecondary,
  },
}; 
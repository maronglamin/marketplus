import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
}: ButtonProps) {
  const getBackgroundColor = () => {
    if (disabled) return '#E5E7EB';
    switch (variant) {
      case 'primary':
        return '#2563EB';
      case 'secondary':
        return '#F3F4F6';
      case 'outline':
        return 'transparent';
      default:
        return '#2563EB';
    }
  };

  const getTextColor = () => {
    if (disabled) return '#9CA3AF';
    switch (variant) {
      case 'primary':
        return '#FFFFFF';
      case 'secondary':
        return '#111827';
      case 'outline':
        return '#2563EB';
      default:
        return '#FFFFFF';
    }
  };

  const getBorderColor = () => {
    if (disabled) return '#E5E7EB';
    switch (variant) {
      case 'outline':
        return '#2563EB';
      default:
        return 'transparent';
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'small':
        return { vertical: 8, horizontal: 16 };
      case 'large':
        return { vertical: 16, horizontal: 24 };
      default:
        return { vertical: 12, horizontal: 20 };
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'small':
        return 14;
      case 'large':
        return 18;
      default:
        return 16;
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          paddingVertical: getPadding().vertical,
          paddingHorizontal: getPadding().horizontal,
          width: fullWidth ? '100%' : 'auto',
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text
            style={[
              styles.label,
              {
                color: getTextColor(),
                fontSize: getFontSize(),
              },
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  label: {
    fontWeight: '600',
  },
}); 
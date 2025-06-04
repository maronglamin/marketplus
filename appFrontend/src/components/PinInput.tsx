import React, { useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  ViewStyle,
  TextInputProps,
} from 'react-native';
import { colors, spacing } from '../theme';

interface PinInputProps extends TextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  maxLength?: number;
  style?: ViewStyle;
}

const PinInput = ({
  value,
  onChangeText,
  maxLength = 4,
  style,
  ...props
}: PinInputProps) => {
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Focus input when component mounts
    inputRef.current?.focus();
  }, []);

  const handleChangeText = (text: string) => {
    // Only allow numbers
    const numbersOnly = text.replace(/[^0-9]/g, '');
    onChangeText(numbersOnly.slice(0, maxLength));
  };

  return (
    <View style={[styles.container, style]}>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChangeText}
        maxLength={maxLength}
        keyboardType="number-pad"
        secureTextEntry
        style={styles.input}
        {...props}
      />
      <View style={styles.dotsContainer}>
        {Array.from({ length: maxLength }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index < value.length && styles.dotFilled,
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  input: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 50,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
  dotFilled: {
    backgroundColor: colors.primary,
  },
});

export default PinInput; 
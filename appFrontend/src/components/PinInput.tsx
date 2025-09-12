import React, { useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextInputProps,
  Platform,
} from 'react-native';
import { colors, spacing } from '../theme';

interface PinInputProps {
  value: string;
  onChangeText: (text: string) => void;
  maxLength?: number;
  style?: StyleProp<ViewStyle>;
  onComplete?: (pin: string) => void;
  editable?: boolean;
  placeholder?: string;
}

const PinInput = ({
  value,
  onChangeText,
  maxLength = 4,
  style,
  onComplete,
  ...props
}: PinInputProps) => {
  const inputRef = useRef<TextInput>(null);
  const hasCompletedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  // Update the ref when onComplete changes
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    // Focus input when component mounts. On Android, delay ensures keyboard opens.
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, Platform.OS === 'android' ? 300 : 0);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Reset completion flag when value changes
    if (value.length < maxLength) {
      hasCompletedRef.current = false;
    }
    
    // Auto-complete when PIN is fully entered (only once)
    if (value.length === maxLength && onCompleteRef.current && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      onCompleteRef.current(value);
    }
  }, [value, maxLength]);

  const handleChangeText = (text: string) => {
    // Only allow numbers
    const numbersOnly = text.replace(/[^0-9]/g, '');
    const newValue = numbersOnly.slice(0, maxLength);
    onChangeText(newValue);
  };

  return (
    <View
      style={[styles.container, style]}
      onLayout={() => {
        // Ensure focus after layout on Android
        if (Platform.OS === 'android') {
          setTimeout(() => inputRef.current?.focus(), 0);
        }
      }}
    >
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChangeText}
        maxLength={maxLength}
        keyboardType="number-pad"
        secureTextEntry
        style={styles.input}
        autoFocus
        showSoftInputOnFocus
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
          >
            {index < value.length && <View style={styles.dotInner} />}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
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
    paddingHorizontal: 10,
    gap: 8,
  },
  dot: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dotFilled: {
    backgroundColor: '#FFFFFF',
    borderColor: '#2563EB',
    borderWidth: 2,
    shadowColor: '#2563EB',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  dotInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    alignSelf: 'center',
    marginTop: 12,
  },
});

export default PinInput; 
import React, { useRef, useEffect } from 'react';
import { View, TextInput, StyleSheet, ViewStyle } from 'react-native';

interface OTPInputProps {
  value: string;
  onChangeText: (text: string) => void;
  length?: number;
  style?: ViewStyle;
}

export const OTPInput: React.FC<OTPInputProps> = ({
  value,
  onChangeText,
  length = 6,
  style,
}) => {
  const inputRefs = useRef<TextInput[]>([]);

  useEffect(() => {
    // Focus the first empty input
    const emptyIndex = value.split('').findIndex(char => !char);
    if (emptyIndex !== -1) {
      inputRefs.current[emptyIndex]?.focus();
    }
  }, [value]);

  const handleChange = (text: string, index: number) => {
    const newValue = value.split('');
    newValue[index] = text;
    onChangeText(newValue.join(''));

    // Move to next input if character entered
    if (text && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Move to previous input on backspace if current input is empty
    if (e.nativeEvent.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={[styles.container, style]}>
      {Array.from({ length }).map((_, index) => (
        <TextInput
          key={index}
          ref={ref => {
            if (ref) inputRefs.current[index] = ref;
          }}
          style={styles.input}
          maxLength={1}
          keyboardType="number-pad"
          value={value[index] || ''}
          onChangeText={text => handleChange(text, index)}
          onKeyPress={e => handleKeyPress(e, index)}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  input: {
    width: 40,
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 20,
    marginHorizontal: 5,
  },
}); 
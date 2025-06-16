import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SelectItem {
  label: string;
  value: string;
}

interface SelectProps {
  label: string;
  value: string | string[];
  onValueChange: (value: string | string[]) => void;
  items: SelectItem[];
  error?: string;
  style?: ViewStyle;
  labelStyle?: TextStyle;
  selectStyle?: ViewStyle;
  multiple?: boolean;
}

export function Select({
  label,
  value,
  onValueChange,
  items,
  error,
  style,
  labelStyle,
  selectStyle,
  multiple = false,
}: SelectProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [tempValue, setTempValue] = useState<string | string[]>(value);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  const selectedItems = multiple
    ? items.filter(item => (value as string[]).includes(item.value))
    : [items.find(item => item.value === value)].filter(Boolean);

  const getDisplayText = () => {
    if (multiple) {
      if (selectedItems.length === 0) return 'Select countries';
      if (selectedItems.length === 1) return selectedItems[0].label;
      return `${selectedItems.length} countries selected`;
    }
    return selectedItems[0]?.label || 'Select an option';
  };

  const handleSelect = (itemValue: string) => {
    if (multiple) {
      const currentValue = tempValue as string[];
      const newValue = currentValue.includes(itemValue)
        ? currentValue.filter(v => v !== itemValue)
        : [...currentValue, itemValue];
      setTempValue(newValue);
    } else {
      onValueChange(itemValue);
      setModalVisible(false);
    }
  };

  const handleConfirm = () => {
    onValueChange(tempValue);
    setModalVisible(false);
  };

  const handleCancel = () => {
    setTempValue(value);
    setModalVisible(false);
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.label, labelStyle]}>{label}</Text>
      <TouchableOpacity
        style={[styles.select, selectStyle, error && styles.selectError]}
        onPress={() => {
          setTempValue(value);
          setModalVisible(true);
        }}
      >
        <Text style={[styles.selectText, !selectedItems.length && styles.placeholder]}>
          {getDisplayText()}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#6B7280" />
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity
                onPress={handleCancel}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={items}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.option,
                    (multiple ? (tempValue as string[]).includes(item.value) : tempValue === item.value) && styles.selectedOption,
                  ]}
                  onPress={() => handleSelect(item.value)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      (multiple ? (tempValue as string[]).includes(item.value) : tempValue === item.value) && styles.selectedOptionText,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {(multiple ? (tempValue as string[]).includes(item.value) : tempValue === item.value) && (
                    <Ionicons name="checkmark" size={20} color="#2563EB" />
                  )}
                </TouchableOpacity>
              )}
            />

            {multiple && (
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.footerButton, styles.cancelButton]}
                  onPress={handleCancel}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.footerButton, styles.confirmButton]}
                  onPress={handleConfirm}
                >
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  select: {
    height: 48,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  selectError: {
    borderColor: '#EF4444',
  },
  selectText: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
  placeholder: {
    color: '#9CA3AF',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  selectedOption: {
    backgroundColor: '#EFF6FF',
  },
  optionText: {
    fontSize: 16,
    color: '#111827',
  },
  selectedOptionText: {
    color: '#2563EB',
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  footerButton: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  confirmButton: {
    backgroundColor: '#2563EB',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
}); 
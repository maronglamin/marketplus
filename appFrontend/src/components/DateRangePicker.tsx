import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

interface DateRangePickerProps {
  startDate: Date;
  endDate: Date;
  onDateRangeChange: (startDate: Date, endDate: Date) => void;
  visible: boolean;
  onClose: () => void;
}

export function DateRangePicker({
  startDate,
  endDate,
  onDateRangeChange,
  visible,
  onClose,
}: DateRangePickerProps) {
  const [tempStartDate, setTempStartDate] = useState(startDate);
  const [tempEndDate, setTempEndDate] = useState(endDate);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Reset temp dates when modal opens
  useEffect(() => {
    if (visible) {
      setTempStartDate(startDate);
      setTempEndDate(endDate);
    }
  }, [visible, startDate, endDate]);

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    console.log('Start date change:', event.type, selectedDate);
    
    if (Platform.OS === 'android') {
      setShowStartPicker(false);
    }
    
    if (selectedDate) {
      setTempStartDate(selectedDate);
      // If start date is after end date, update end date
      if (selectedDate > tempEndDate) {
        setTempEndDate(selectedDate);
      }
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    console.log('End date change:', event.type, selectedDate);
    
    if (Platform.OS === 'android') {
      setShowEndPicker(false);
    }
    
    if (selectedDate) {
      setTempEndDate(selectedDate);
    }
  };

  const handleStartDatePress = () => {
    console.log('Opening start date picker');
    setShowStartPicker(true);
  };

  const handleEndDatePress = () => {
    console.log('Opening end date picker');
    setShowEndPicker(true);
  };

  const handleConfirm = () => {
    if (tempStartDate > tempEndDate) {
      Alert.alert('Invalid Date Range', 'Start date cannot be after end date');
      return;
    }
    console.log('Confirming date range:', tempStartDate, tempEndDate);
    onDateRangeChange(tempStartDate, tempEndDate);
    onClose();
  };

  const handleCancel = () => {
    setTempStartDate(startDate);
    setTempEndDate(endDate);
    setShowStartPicker(false);
    setShowEndPicker(false);
    onClose();
  };

  const handleQuickOption = (days: number) => {
    const today = new Date();
    let startDate: Date;
    
    if (days === 0) {
      // Today only - set both start and end to today
      startDate = new Date(today);
      startDate.setHours(0, 0, 0, 0); // Start of today
      today.setHours(23, 59, 59, 999); // End of today
    } else {
      // Last N days
      startDate = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);
    }
    
    console.log('Quick option selected:', days, 'days');
    setTempStartDate(startDate);
    setTempEndDate(today);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.title}>Select Date Range</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.dateSection}>
              <Text style={styles.sectionTitle}>Start Date</Text>
              <TouchableOpacity
                style={[styles.dateButton, showStartPicker && styles.dateButtonActive]}
                onPress={handleStartDatePress}
              >
                <Ionicons name="calendar-outline" size={20} color="#2563EB" />
                <Text style={styles.dateText}>{formatDate(tempStartDate)}</Text>
                <Ionicons name="chevron-down" size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.dateSection}>
              <Text style={styles.sectionTitle}>End Date</Text>
              <TouchableOpacity
                style={[styles.dateButton, showEndPicker && styles.dateButtonActive]}
                onPress={handleEndDatePress}
              >
                <Ionicons name="calendar-outline" size={20} color="#2563EB" />
                <Text style={styles.dateText}>{formatDate(tempEndDate)}</Text>
                <Ionicons name="chevron-down" size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.quickOptions}>
              <Text style={styles.quickOptionsTitle}>Quick Options</Text>
              <View style={styles.quickButtons}>
                <TouchableOpacity
                  style={styles.quickButton}
                  onPress={() => handleQuickOption(0)}
                >
                  <Text style={styles.quickButtonText}>Today</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickButton}
                  onPress={() => handleQuickOption(2)}
                >
                  <Text style={styles.quickButtonText}>Last 2 Days</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.quickButtons}>
                <TouchableOpacity
                  style={styles.quickButton}
                  onPress={() => handleQuickOption(3)}
                >
                  <Text style={styles.quickButtonText}>Last 3 Days</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickButton}
                  onPress={() => handleQuickOption(7)}
                >
                  <Text style={styles.quickButtonText}>Last 7 Days</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.quickButtons}>
                <TouchableOpacity
                  style={styles.quickButton}
                  onPress={() => handleQuickOption(30)}
                >
                  <Text style={styles.quickButtonText}>Last 30 Days</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickButton}
                  onPress={() => handleQuickOption(90)}
                >
                  <Text style={styles.quickButtonText}>Last 3 Months</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.quickButtons}>
                <TouchableOpacity
                  style={styles.quickButton}
                  onPress={() => handleQuickOption(365)}
                >
                  <Text style={styles.quickButtonText}>Last Year</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Android Date Pickers */}
      {Platform.OS === 'android' && showStartPicker && (
        <DateTimePicker
          value={tempStartDate}
          mode="date"
          display="default"
          onChange={handleStartDateChange}
          maximumDate={tempEndDate}
        />
      )}

      {Platform.OS === 'android' && showEndPicker && (
        <DateTimePicker
          value={tempEndDate}
          mode="date"
          display="default"
          onChange={handleEndDateChange}
          minimumDate={tempStartDate}
          maximumDate={new Date()}
        />
      )}

      {/* iOS Date Pickers */}
      {Platform.OS === 'ios' && showStartPicker && (
        <Modal
          visible={showStartPicker}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.iosPickerOverlay}>
            <View style={styles.iosPickerContainer}>
              <View style={styles.iosPickerHeader}>
                <TouchableOpacity onPress={() => setShowStartPicker(false)}>
                  <Text style={styles.iosPickerButton}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.iosPickerTitle}>Select Start Date</Text>
                <TouchableOpacity onPress={() => setShowStartPicker(false)}>
                  <Text style={styles.iosPickerButton}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempStartDate}
                mode="date"
                display="spinner"
                onChange={handleStartDateChange}
                maximumDate={tempEndDate}
              />
            </View>
          </View>
        </Modal>
      )}

      {Platform.OS === 'ios' && showEndPicker && (
        <Modal
          visible={showEndPicker}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.iosPickerOverlay}>
            <View style={styles.iosPickerContainer}>
              <View style={styles.iosPickerHeader}>
                <TouchableOpacity onPress={() => setShowEndPicker(false)}>
                  <Text style={styles.iosPickerButton}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.iosPickerTitle}>Select End Date</Text>
                <TouchableOpacity onPress={() => setShowEndPicker(false)}>
                  <Text style={styles.iosPickerButton}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempEndDate}
                mode="date"
                display="spinner"
                onChange={handleEndDateChange}
                minimumDate={tempStartDate}
                maximumDate={new Date()}
              />
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  dateSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateButtonActive: {
    backgroundColor: '#EFF6FF',
  },
  dateText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#111827',
  },
  quickOptions: {
    marginBottom: 24,
  },
  quickOptionsTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 12,
  },
  quickButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  quickButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    alignItems: 'center',
  },
  quickButtonText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    padding: 16,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  iosPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  iosPickerContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    paddingBottom: 40,
  },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  iosPickerButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
  },
  iosPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
}); 
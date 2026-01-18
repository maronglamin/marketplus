import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';

interface DateRangePickerProps {
  startDate: Date;
  endDate: Date;
  onDateRangeChange: (startDate: Date, endDate: Date) => void;
  visible: boolean;
  onClose: () => void;
  onOpen: () => void; // reopen the modal when bottom sheet is done/cancelled
}

export function DateRangePicker({
  startDate,
  endDate,
  onDateRangeChange,
  visible,
  onClose,
  onOpen,
}: DateRangePickerProps) {
  const [tempStartDate, setTempStartDate] = useState(startDate);
  const [tempEndDate, setTempEndDate] = useState(endDate);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [activePicker, setActivePicker] = useState<'start' | 'end' | null>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['50%', '90%'], []);
  const skipResetOnOpenRef = useRef(false);
  const sheetStartSnapshotRef = useRef<Date | null>(null);
  const sheetEndSnapshotRef = useRef<Date | null>(null);

  // Reset temp dates when modal opens
  useEffect(() => {
    if (visible) {
      if (skipResetOnOpenRef.current) {
        // Skip resetting temp values when returning from bottom sheet
        skipResetOnOpenRef.current = false;
        return;
      }
      setTempStartDate(startDate);
      setTempEndDate(endDate);
    }
  }, [visible, startDate, endDate]);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      onClose();
    }
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    []
  );

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
    // Ensure only one picker is open at a time
    setShowEndPicker(false);
    setShowStartPicker(true);
    setActivePicker('start');
    // Snapshot current start date to allow cancel restore
    sheetStartSnapshotRef.current = tempStartDate;
    bottomSheetRef.current?.snapToIndex(0);
    // Close the main modal while the bottom sheet is active
    onClose();
  };

  const handleEndDatePress = () => {
    console.log('Opening end date picker');
    // Ensure only one picker is open at a time
    setShowStartPicker(false);
    setShowEndPicker(true);
    setActivePicker('end');
    // Snapshot current end date to allow cancel restore
    sheetEndSnapshotRef.current = tempEndDate;
    bottomSheetRef.current?.snapToIndex(0);
    // Close the main modal while the bottom sheet is active
    onClose();
  };

  const handleConfirm = () => {
    if (tempStartDate > tempEndDate) {
      Alert.alert('Invalid Date Range', 'Start date cannot be after end date');
      return;
    }
    console.log('Confirming date range:', tempStartDate, tempEndDate);
    // Close any open picker before finalizing
    setShowStartPicker(false);
    setShowEndPicker(false);
    setActivePicker(null);
    onDateRangeChange(tempStartDate, tempEndDate);
    // Close bottom sheet; parent onClose will be triggered via onChange when closed
    bottomSheetRef.current?.close();
    // Stagger closing of the main modal slightly for iOS safety
    setTimeout(() => {
      onClose();
    }, 150);
  };

  const handleCancel = () => {
    setTempStartDate(startDate);
    setTempEndDate(endDate);
    setShowStartPicker(false);
    setShowEndPicker(false);
    setActivePicker(null);
    bottomSheetRef.current?.close();
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
        presentationStyle="overFullScreen"
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

      {/* Bottom sheet solely for selecting dates; rendered within the modal overlay to ensure proper stacking */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        style={styles.bottomSheetWrapper}
        snapPoints={snapPoints}
        enablePanDownToClose
        onChange={(index) => {
          if (index === -1) {
            setShowStartPicker(false);
            setShowEndPicker(false);
            setActivePicker(null);
          }
        }}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <BottomSheetView style={styles.sheetContent}>
          <View style={styles.iosPickerHeader}>
            <TouchableOpacity
              onPress={() => {
                // Restore snapshot for the active picker on cancel
                if (activePicker === 'start' && sheetStartSnapshotRef.current) {
                  setTempStartDate(sheetStartSnapshotRef.current);
                } else if (activePicker === 'end' && sheetEndSnapshotRef.current) {
                  setTempEndDate(sheetEndSnapshotRef.current);
                }
                setShowStartPicker(false);
                setShowEndPicker(false);
                setActivePicker(null);
                bottomSheetRef.current?.close();
                // Reopen the main modal without resetting temp values
                skipResetOnOpenRef.current = true;
                onOpen();
              }}
            >
              <Text style={styles.iosPickerButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.iosPickerTitle}>
              {activePicker === 'start' ? 'Select Start Date' : 'Select End Date'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setShowStartPicker(false);
                setShowEndPicker(false);
                setActivePicker(null);
                bottomSheetRef.current?.close();
                // Reopen the main modal reflecting the selected date(s)
                skipResetOnOpenRef.current = true;
                onOpen();
              }}
            >
              <Text style={styles.iosPickerButton}>Done</Text>
            </TouchableOpacity>
          </View>

          {activePicker === 'start' && (
            <DateTimePicker
              value={tempStartDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
              onChange={handleStartDateChange}
              maximumDate={tempEndDate}
            />
          )}

          {activePicker === 'end' && (
            <DateTimePicker
              value={tempEndDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
              onChange={handleEndDateChange}
              minimumDate={tempStartDate}
              maximumDate={new Date()}
            />
          )}
        </BottomSheetView>
      </BottomSheet>
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
  bottomSheetBackground: {
    backgroundColor: '#FFFFFF',
  },
  bottomSheetWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    zIndex: 9999,
    elevation: 9999, // Android stacking
  },
  handleIndicator: {
    backgroundColor: '#D1D5DB',
    width: 40,
    height: 4,
  },
  sheetContent: {
    flex: 1,
    padding: 16,
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
  iosInlinePickerContainer: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
}); 
import React, { useMemo, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Linking, Image } from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';

interface AppUpdateBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  message?: string;
  mandatory?: boolean;
  storeUrl?: string;
  latestVersion?: string;
}

export function AppUpdateBottomSheet({
  isVisible,
  onClose,
  message,
  mandatory = false,
  storeUrl,
  latestVersion,
}: AppUpdateBottomSheetProps) {
  const modalRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['35%'], []);

  useEffect(() => {
    if (isVisible) {
      modalRef.current?.present();
    } else {
      modalRef.current?.dismiss();
    }
  }, [isVisible]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior={mandatory ? 'none' : 'close'}
      />
    ),
    [mandatory]
  );

  const handleUpdate = async () => {
    if (!storeUrl) return;
    try {
      const supported = await Linking.canOpenURL(storeUrl);
      if (supported) {
        await Linking.openURL(storeUrl);
      } else {
        await Linking.openURL(storeUrl);
      }
    } catch {
      // no-op
    }
    if (!mandatory) {
      onClose();
    }
  };

  return (
    <BottomSheetModal
      ref={modalRef}
      snapPoints={snapPoints}
      enablePanDownToClose={!mandatory}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.bottomSheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
      onDismiss={onClose}
    >
      <BottomSheetView style={styles.content}>
        {/* App logo and version */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/adaptive-icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.title}>
          {mandatory ? 'Update required' : 'Update available'}
        </Text>
        {latestVersion ? (
          <Text style={styles.versionText}>Version {latestVersion}</Text>
        ) : null}
        <Text style={styles.message}>
          {message ||
            (mandatory
              ? 'Please update to continue using the app.'
              : 'A new version is available. Update now for the best experience.')}
        </Text>
        <View style={styles.actions}>
          {!mandatory && (
            <TouchableOpacity style={styles.laterButton} onPress={onClose}>
              <Text style={styles.laterText}>Later</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.updateButton} onPress={handleUpdate}>
            <Text style={styles.updateText}>
              {Platform.OS === 'ios' ? 'Update on App Store' : 'Update on Play Store'}
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  handleIndicator: {
    backgroundColor: '#E5E7EB',
    width: 40,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32, // extra bottom padding so buttons don't crowd the bottom
    gap: 10,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  versionText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 2,
  },
  message: {
    fontSize: 14,
    color: '#374151',
    marginTop: 6,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
    paddingBottom: 8, // a bit more space before the sheet edge
  },
  laterButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  laterText: {
    color: '#374151',
    fontWeight: '600',
  },
  updateButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#111827',
  },
  updateText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});



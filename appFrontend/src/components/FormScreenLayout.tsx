import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface FormScreenLayoutProps {
  header: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollStyle?: StyleProp<ViewStyle>;
  /** Extra offset when the keyboard opens (e.g. stack navigator header height). */
  keyboardVerticalOffset?: number;
}

export function FormScreenLayout({
  header,
  footer,
  children,
  contentContainerStyle,
  scrollStyle,
  keyboardVerticalOffset = 0,
}: FormScreenLayoutProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        {header}
        <ScrollView
          style={[styles.flex, scrollStyle]}
          contentContainerStyle={[
            styles.scrollContent,
            footer ? styles.scrollContentWithFooter : null,
            contentContainerStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  scrollContentWithFooter: { paddingBottom: 24 },
  footer: { borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#FFFFFF' },
});

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { notificationService } from '../services/notificationService';

export function NotificationTest() {
  const testLocalNotification = async () => {
    try {
      await notificationService.sendLocalNotification(
        'Test Notification',
        'This is a test notification from the app!',
        { type: 'test' }
      );
      console.log('Local notification sent successfully');
    } catch (error) {
      console.error('Error sending local notification:', error);
    }
  };

  const testPermissions = async () => {
    try {
      const status = await notificationService.getPermissionsStatus();
      console.log('Notification permissions status:', status);
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notification Test</Text>
      <TouchableOpacity style={styles.button} onPress={testLocalNotification}>
        <Text style={styles.buttonText}>Send Test Notification</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={testPermissions}>
        <Text style={styles.buttonText}>Check Permissions</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f0f0f0',
    margin: 16,
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#2563EB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '600',
  },
}); 
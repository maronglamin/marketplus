import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

class NotificationSound {
  private sound: Audio.Sound | null = null;

  /**
   * Initialize the notification sound
   */
  async initialize() {
    try {
      // Load a simple notification sound
      // For now, we'll use a system sound, but you can replace this with a custom audio file
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav' },
        { shouldPlay: false }
      );
      this.sound = sound;
    } catch (error) {
      console.error('Failed to load notification sound:', error);
    }
  }

  /**
   * Play notification sound and haptic feedback
   */
  async playNotification() {
    try {
      // Play haptic feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Play sound if available
      if (this.sound) {
        await this.sound.replayAsync();
      }
    } catch (error) {
      console.error('Failed to play notification:', error);
    }
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    if (this.sound) {
      await this.sound.unloadAsync();
      this.sound = null;
    }
  }
}

export const notificationSound = new NotificationSound(); 
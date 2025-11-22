import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

class NotificationSound {
  private sound: Audio.Sound | null = null;
  private initialized = false;
  private loading = false;
  private loadPromise: Promise<void> | null = null;

  /**
   * Initialize the notification sound
   */
  async initialize() {
    try {
      if (this.initialized || this.loading) return;
      this.loading = true;

      // Ensure audio plays even in silent mode and doesn’t duck
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });

      await this.ensureLoadedSound();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to load notification sound:', error);
    } finally {
      this.loading = false;
    }
  }

  /**
   * Attempt to load a sound from a list of sources with retry and timeout.
   */
  private async ensureLoadedSound() {
    if (this.sound) return;
    if (this.loadPromise) {
      await this.loadPromise;
      return;
    }

    const sources = [
      // Primary
      { uri: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav' },
      // Fallbacks
      { uri: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg' },
      { uri: 'https://www.soundjay.com/button/sounds/button-16.mp3' },
    ];

    const createWithTimeout = (src: { uri: string }, ms: number) => {
      return Promise.race([
        Audio.Sound.createAsync(src, { shouldPlay: false, isMuted: false, volume: 1.0 }, true /* downloadFirst */),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Sound load timeout')), ms)),
      ]) as Promise<{ sound: Audio.Sound }>;
    };

    let lastError: any = null;
    this.loadPromise = (async () => {
      for (const src of sources) {
        try {
          const { sound } = await createWithTimeout(src, 6000);
          this.sound = sound;
          // Pre-warm by setting status explicitly at full volume
          await this.sound.setStatusAsync({ volume: 1.0, isMuted: false, shouldPlay: false, positionMillis: 0 });
          return;
        } catch (e) {
          lastError = e;
        }
      }
      throw lastError || new Error('Unable to load any notification sound source');
    })();
    try {
      await this.loadPromise;
    } finally {
      this.loadPromise = null;
    }
  }

  /**
   * Play notification sound and haptic feedback
   */
  async playNotification() {
    try {
      // Always ensure loaded before play to avoid "sound is not loaded"
      if (!this.initialized || !this.sound) {
        await this.initialize();
      }
      await this.ensureLoadedSound();

      // Play haptic feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Play sound if available
      if (this.sound) {
        // Make sure volume is at 100% for the sound instance
        await this.sound.setStatusAsync({ volume: 1.0, isMuted: false });
        // Reset position to start and play
        await this.sound.setPositionAsync(0);
        const status = await this.sound.getStatusAsync();
        if ((status as any)?.isLoaded !== true) {
          // Reload if somehow unloaded
          await this.ensureLoadedSound();
        }
        await this.sound.playAsync();
      } else {
        // Attempt loading once more and retry playback
        await this.ensureLoadedSound();
        if (this.sound) {
          await this.sound.setStatusAsync({ volume: 1.0, isMuted: false });
          await this.sound.setPositionAsync(0);
          await this.sound.playAsync();
        }
      }
    } catch (error) {
      console.error('Failed to play notification:', error);
      // Last-chance attempt: reinitialize and try a different source
      try {
        // Dispose and re-create
        await this.cleanup();
        this.initialized = false;
        await this.initialize();
        if (this.sound) {
          await this.sound.setStatusAsync({ volume: 1.0, isMuted: false });
          await this.sound.setPositionAsync(0);
          await this.sound.playAsync();
        }
      } catch (e) {
        console.error('Notification fallback attempt failed:', e);
      }
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
    this.initialized = false;
    this.loadPromise = null;
  }
}

export const notificationSound = new NotificationSound(); 
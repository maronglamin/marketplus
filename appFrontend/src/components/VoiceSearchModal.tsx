import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = {
  visible: boolean;
  onClose: () => void;
  onResult: (text: string | null) => void;
};

export function VoiceSearchModal({ visible, onClose, onResult }: Props) {
  const PERM_CACHE_KEY = 'voiceMicPermissionGranted';
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [canAskPermission, setCanAskPermission] = useState<boolean>(true);
  const recognitionRef = useRef<any | null>(null);

  const stopAll = useCallback(() => {
    try { recognitionRef.current?.stop?.(); } catch {}
    try { recognitionRef.current?.destroy?.(); } catch {}
    try { recognitionRef.current?.removeAllListeners?.(); } catch {}
    recognitionRef.current = null;
    setIsListening(false);
    setIsRequestingPermission(false);
  }, []);

  const startWebSpeech = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyWindow = (typeof window !== 'undefined' ? (window as any) : undefined);
    const SpeechRecognition = anyWindow?.SpeechRecognition || anyWindow?.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setUnavailableReason('Voice recognition is not supported in this browser.');
      setIsListening(false);
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => {
        stopAll();
        setErrorMessage('Could not start voice recognition. Please try again.');
      };
      recognition.onresult = (event: any) => {
        const transcript = event?.results?.[0]?.[0]?.transcript ?? '';
        const text = String(transcript || '').trim();
        stopAll();
        onResult(text || null);
        onClose();
      };
      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      stopAll();
      setErrorMessage('Could not start voice recognition. Please try again.');
    }
  }, [onClose, onResult, stopAll]);

  const ensureMicPermission = useCallback(async () => {
    setUnavailableReason(null);
    setErrorMessage(null);
    try {
      const current = await Audio.getPermissionsAsync();
      setPermissionGranted(current.status === 'granted');
      setCanAskPermission(!!current.canAskAgain);
      if (current.status !== 'granted') return false;
      return true;
    } catch {
      // If we cannot read permission, proceed to request
      return false;
    }
  }, []);

  const requestMicPermission = useCallback(async () => {
    setIsRequestingPermission(true);
    try {
      const perm = await Audio.requestPermissionsAsync();
      setPermissionGranted(perm.status === 'granted');
      setCanAskPermission(!!perm.canAskAgain);
      if (perm.status === 'granted') {
        try { await AsyncStorage.setItem(PERM_CACHE_KEY, '1'); } catch {}
      }
      return perm.status === 'granted';
    } catch {
      setErrorMessage('Could not request microphone permission.');
      return false;
    } finally {
      setIsRequestingPermission(false);
    }
  }, []);

  const startNativeVoice = useCallback(async () => {
    // Block when running under Expo Go which can't load custom native modules
    try {
      if (Constants?.appOwnership === 'expo') {
        setUnavailableReason('Running under Expo Go. Install a development build (expo-dev-client) and rebuild to enable voice.');
        return;
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let Voice: any = null;
    try {
      // Prefer direct require when module is installed
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('@react-native-voice/voice');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Voice = (mod as any)?.default ?? mod ?? null;
    } catch {
      try {
        // Fallback to dynamic require
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        const dynamicRequire = (eval as unknown as (code: string) => unknown)('require') as unknown as (name: string) => unknown;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mod: any = dynamicRequire?.('@react-native-voice/voice');
        Voice = mod?.default ?? mod ?? null;
      } catch {
        Voice = null;
      }
    }
    if (!Voice || typeof Voice.start !== 'function') {
      setUnavailableReason('Voice module is not linked. Rebuild a development client after installing @react-native-voice/voice.');
      return;
    }
    try { await Voice.destroy?.(); } catch {}
    try { Voice.removeAllListeners?.(); } catch {}
    Voice.onSpeechStart = () => setIsListening(true);
    Voice.onSpeechEnd = () => setIsListening(false);
    Voice.onSpeechError = () => {
      stopAll();
      setErrorMessage('Could not start voice recognition. Please try again.');
    };
    Voice.onSpeechResults = (e: any) => {
      const first = e?.value?.[0] ?? '';
      const text = String(first || '').trim();
      stopAll();
      onResult(text || null);
      onClose();
    };
    recognitionRef.current = Voice;
    try {
      await Voice.start('en-US');
    } catch {
      stopAll();
      // If start failed, assume permission may be missing; clear cache so we show rationale next time
      try { await AsyncStorage.setItem(PERM_CACHE_KEY, '0'); } catch {}
      setErrorMessage('Could not start voice recognition. Please try again.');
    }
  }, [onClose, onResult, stopAll]);

  useEffect(() => {
    if (!visible) return;
    setUnavailableReason(null);
    setErrorMessage(null);
    if (Platform.OS === 'web') {
      startWebSpeech();
      return;
    }
    // Native: check mic permission first and show rationale if needed
    (async () => {
      // If user has granted before, start immediately and rely on OS to enforce
      let cachedGranted = false;
      try {
        cachedGranted = (await AsyncStorage.getItem(PERM_CACHE_KEY)) === '1';
      } catch {}
      if (cachedGranted) {
        setPermissionGranted(true);
        startNativeVoice();
        return;
      }
      const hasPerm = await ensureMicPermission();
      if (hasPerm) {
        try { await AsyncStorage.setItem(PERM_CACHE_KEY, '1'); } catch {}
        startNativeVoice();
      } else {
        // Show rationale; user must tap Allow to proceed
      }
    })();
    // Cleanup on unmount or hide
    return () => {
      stopAll();
    };
  }, [visible, startWebSpeech, startNativeVoice, stopAll, ensureMicPermission]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, width: '88%', maxWidth: 480 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <View style={{ backgroundColor: '#FEE2E2', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="mic" size={18} color="#DC2626" />
            </View>
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>Voice Search</Text>
              <Text style={{ marginTop: 2, fontSize: 12, color: '#6B7280' }}>
                Speak your query. We listen only while this dialog shows “Listening…”.
              </Text>
            </View>
          </View>
          <View style={{ height: 1, backgroundColor: '#F3F4F6', marginVertical: 8 }} />
          <View style={{ alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6 }}>
            {unavailableReason ? (
              <View style={{ width: '100%' }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <Ionicons name="alert-circle-outline" size={16} color="#B45309" />
                  <Text style={{ marginLeft: 6, color: '#92400E', fontWeight: '600' }}>Voice is unavailable</Text>
                </View>
                <Text style={{ marginTop: 6, color: '#374151', textAlign: 'left' }}>{unavailableReason}</Text>
                <Text style={{ marginTop: 10, color: '#6B7280', fontSize: 12 }}>
                  You can continue by typing your search in the next screen.
                </Text>
              </View>
            ) : errorMessage ? (
              <View style={{ width: '100%' }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <Ionicons name="warning-outline" size={16} color="#B91C1C" />
                  <Text style={{ marginLeft: 6, color: '#991B1B', fontWeight: '600' }}>We couldn’t start listening</Text>
                </View>
                <Text style={{ marginTop: 6, color: '#374151', textAlign: 'left' }}>{errorMessage}</Text>
                <Text style={{ marginTop: 10, color: '#6B7280', fontSize: 12 }}>
                  Please try again, then speak clearly near the microphone.
                </Text>
              </View>
            ) : (Platform.OS !== 'web' && permissionGranted === false) ? (
              <View style={{ width: '100%' }}>
                <Text style={{ color: '#111827', marginBottom: 8, fontWeight: '600' }}>
                  Allow microphone to use voice search
                </Text>
                <View style={{ marginLeft: 2, marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 }}>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#16A34A" />
                    <Text style={{ marginLeft: 6, color: '#374151' }}>Convert your speech to text to fill the search box</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 }}>
                    <Ionicons name="time-outline" size={16} color="#0EA5E9" />
                    <Text style={{ marginLeft: 6, color: '#374151' }}>We only listen while you see “Listening…”</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                    <Ionicons name="shield-checkmark-outline" size={16} color="#64748B" />
                    <Text style={{ marginLeft: 6, color: '#374151' }}>No audio is stored on the device or our servers</Text>
                  </View>
                </View>
                <Text style={{ color: '#6B7280', marginBottom: 12 }}>
                  You can change this anytime in your device’s settings.
                </Text>
              </View>
            ) : isRequestingPermission ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#EF4444" />
                <Text style={{ marginLeft: 8, color: '#374151' }}>Requesting microphone permission…</Text>
              </View>
            ) : isListening ? (
              <View style={{ alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#DC2626' }} />
                  <Text style={{ marginLeft: 8, color: '#991B1B', fontWeight: '600' }}>Listening…</Text>
                </View>
                <Text style={{ color: '#6B7280', fontSize: 12 }}>
                  Try saying something like “Electronics” or “My recent rides”
                </Text>
              </View>
            ) : (
              <Text style={{ color: '#6B7280' }}>Preparing…</Text>
            )}
          </View>
          <View style={{ height: 1, backgroundColor: '#F3F4F6', marginVertical: 8 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            {(unavailableReason || errorMessage) ? (
              <TouchableOpacity
                onPress={() => {
                  setUnavailableReason(null);
                  setErrorMessage(null);
                  if (Platform.OS === 'web') {
                    startWebSpeech();
                  } else {
                    startNativeVoice();
                  }
                }}
                style={{ paddingHorizontal: 14, paddingVertical: 10 }}
              >
                <Text style={{ color: '#2563EB', fontWeight: '700' }}>Try Again</Text>
              </TouchableOpacity>
            ) : (Platform.OS !== 'web' && permissionGranted === false) ? (
              <TouchableOpacity
                onPress={async () => {
                  const granted = await requestMicPermission();
                  if (granted) {
                    startNativeVoice();
                  } else if (!canAskPermission) {
                    setErrorMessage('Microphone permission is blocked by the system. Please enable it in device settings to continue.');
                  }
                }}
                style={{ paddingHorizontal: 14, paddingVertical: 10 }}
              >
                <Text style={{ color: '#2563EB', fontWeight: '700' }}>Allow Microphone</Text>
              </TouchableOpacity>
            ) : <View />}
            <TouchableOpacity
              onPress={() => {
                stopAll();
                onClose();
              }}
              style={{ paddingHorizontal: 14, paddingVertical: 10 }}
            >
              <Text style={{ color: '#6B7280', fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}



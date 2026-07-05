import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { HomeServicesStackParamList } from '../../navigation/HomeServicesNavigator';
import { homeServicesApi, type ServiceBookingMessage } from '../../services/homeServicesApi';
import { useAuth } from '../../contexts/AuthContext';

type Nav = NativeStackNavigationProp<HomeServicesStackParamList, 'ServiceBookingChat'>;
type Route = RouteProp<HomeServicesStackParamList, 'ServiceBookingChat'>;

export function ServiceBookingChat() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { bookingId } = route.params;
  const { user } = useAuth();
  const listRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<ServiceBookingMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  const loadMessages = useCallback(async () => {
    try {
      const data = await homeServicesApi.getMessages(bookingId);
      setMessages(data);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useFocusEffect(
    useCallback(() => {
      loadMessages();
    }, [loadMessages])
  );

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed || sending) return;

    try {
      setSending(true);
      const message = await homeServicesApi.sendMessage(bookingId, trimmed);
      setMessages((prev) => [...prev, message]);
      setContent('');
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      // keep draft on failure
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: ServiceBookingMessage }) => {
    const isMine = item.senderId === user?.id;
    const senderName = item.sender
      ? `${item.sender.firstName} ${item.sender.lastName}`.trim()
      : item.senderType;

    return (
      <View style={[styles.messageBubble, isMine ? styles.myMessage : styles.theirMessage]}>
        {!isMine && <Text style={styles.senderName}>{senderName}</Text>}
        <Text style={[styles.messageText, isMine && styles.myMessageText]}>{item.content}</Text>
        <Text style={[styles.messageTime, isMine && styles.myMessageTime]}>
          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Service Chat</Text>
            <Text style={styles.headerSubtitle}>Message your provider</Text>
          </View>
        </View>

        <KeyboardAvoidingView
          style={styles.chatArea}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {loading ? (
            <ActivityIndicator size="large" color="#0EA5E9" style={styles.loader} />
          ) : messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No messages yet. Start the conversation!</Text>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessage}
              contentContainerStyle={styles.messageList}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
              showsVerticalScrollIndicator={false}
            />
          )}

          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              value={content}
              onChangeText={setContent}
              placeholder="Type a message..."
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!content.trim() || sending) && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!content.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: { padding: 4, marginRight: 8 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  headerSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  chatArea: { flex: 1 },
  loader: { marginTop: 60 },
  messageList: { padding: 16, paddingBottom: 8 },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#0EA5E9',
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  senderName: { fontSize: 11, fontWeight: '600', color: '#6B7280', marginBottom: 4 },
  messageText: { fontSize: 15, color: '#1F2937', lineHeight: 20 },
  myMessageText: { color: '#FFFFFF' },
  messageTime: { fontSize: 10, color: '#9CA3AF', marginTop: 4, alignSelf: 'flex-end' },
  myMessageTime: { color: '#E0F2FE' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { fontSize: 14, color: '#6B7280', marginTop: 12, textAlign: 'center' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    backgroundColor: '#F9FAFB',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0EA5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { opacity: 0.5 },
});

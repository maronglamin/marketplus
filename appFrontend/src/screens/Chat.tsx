import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';

type RootStackParamList = {
  Home: undefined;
  Chat: undefined;
};

type ChatScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Chat'>;

export function Chat() {
  const navigation = useNavigation<ChatScreenNavigationProp>();
  const [message, setMessage] = useState('');

  const chat = {
    user: {
      name: 'Sarah Johnson',
      avatar:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&auto=format&fit=crop&w=256&q=80',
      online: true,
    },
    messages: [
      {
        id: '1',
        sender: 'user',
        content: 'Hi! I\'m interested in the wireless headphones.',
        timestamp: '10:30 AM',
      },
      {
        id: '2',
        sender: 'other',
        content: 'Hello! Great choice. They\'re currently in stock. Would you like to know more about the features?',
        timestamp: '10:31 AM',
      },
      {
        id: '3',
        sender: 'user',
        content: 'Yes, please. What\'s the battery life?',
        timestamp: '10:32 AM',
      },
      {
        id: '4',
        sender: 'other',
        content: 'The battery life is 30 hours with active noise cancellation, and 40 hours without it. They also support fast charging - 10 minutes of charging gives you 5 hours of playback.',
        timestamp: '10:33 AM',
      },
    ],
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      // Handle sending message
      console.log('Sending message:', message);
      setMessage('');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.userInfo}>
          <Image
            source={{ uri: chat.user.avatar }}
            style={styles.avatar}
          />
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{chat.user.name}</Text>
            <Text style={styles.userStatus}>
              {chat.user.online ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.messagesContainer}>
        {chat.messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageContainer,
              message.sender === 'user' ? styles.userMessage : styles.otherMessage,
            ]}
          >
            <View
              style={[
                styles.messageBubble,
                message.sender === 'user' ? styles.userBubble : styles.otherBubble,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  message.sender === 'user' ? styles.userMessageText : styles.otherMessageText,
                ]}
              >
                {message.content}
              </Text>
              <Text
                style={[
                  styles.timestamp,
                  message.sender === 'user' ? styles.userTimestamp : styles.otherTimestamp,
                ]}
              >
                {message.timestamp}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.inputButton}>
          <Ionicons name="attach" size={24} color="#6B7280" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.inputButton}>
          <Ionicons name="image" size={24} color="#6B7280" />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder="Type a message..."
          placeholderTextColor="#9CA3AF"
        />
        <TouchableOpacity style={styles.inputButton}>
          <Ionicons name="happy" size={24} color="#6B7280" />
        </TouchableOpacity>
        <Button
          label="Send"
          onPress={handleSendMessage}
          icon={<Ionicons name="send" size={20} color="#FFFFFF" />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userDetails: {
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  userStatus: {
    fontSize: 14,
    color: '#6B7280',
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '70%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#2563EB',
  },
  otherBubble: {
    backgroundColor: '#FFFFFF',
  },
  messageText: {
    fontSize: 16,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#111827',
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
  },
  userTimestamp: {
    color: '#93C5FD',
  },
  otherTimestamp: {
    color: '#6B7280',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  inputButton: {
    padding: 8,
  },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    marginHorizontal: 8,
    fontSize: 16,
  },
}); 
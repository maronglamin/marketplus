import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Send } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { homeServicesApi, type ServiceBookingMessage } from '../../api/homeServicesApi';

export function ServiceBookingChat() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { user } = useAuth();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ServiceBookingMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  const loadMessages = useCallback(async () => {
    if (!bookingId) return;
    try {
      const data = await homeServicesApi.getMessages(bookingId);
      setMessages(data);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 10000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || sending || !bookingId) return;
    try {
      setSending(true);
      const message = await homeServicesApi.sendMessage(bookingId, trimmed);
      setMessages((prev) => [...prev, message]);
      setContent('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white min-h-full flex flex-col">
      <PageHeader title="Service Chat" subtitle="Message your provider" backTo={`/home-services/bookings/${bookingId}`} />

      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[50vh]">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-gray-500 py-12">No messages yet. Start the conversation!</p>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderId === user?.id;
            const senderName = msg.sender
              ? `${msg.sender.firstName} ${msg.sender.lastName}`.trim()
              : msg.senderType;
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${isMine ? 'bg-sky-500 text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm'}`}>
                  {!isMine && <p className="text-xs font-semibold text-gray-500 mb-1">{senderName}</p>}
                  <p className="text-sm">{msg.content}</p>
                  <p className={`text-[10px] mt-1 text-right ${isMine ? 'text-sky-100' : 'text-gray-400'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-gray-100 flex gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type a message..."
          maxLength={1000}
          className="flex-1 px-4 py-2 border border-gray-200 rounded-full bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
        <button
          type="submit"
          disabled={!content.trim() || sending}
          className="w-11 h-11 rounded-full bg-sky-500 text-white flex items-center justify-center disabled:opacity-50 hover:bg-sky-600"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

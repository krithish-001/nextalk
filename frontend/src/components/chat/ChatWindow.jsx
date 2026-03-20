import React, { useEffect, useRef, useState, useCallback } from 'react';
import useChatStore from '../../store/useChatStore';
import useAuthStore from '../../store/useAuthStore';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import Avatar from '../ui/Avatar';
import { formatLastSeen } from '../../utils/helpers';
import { getSocket } from '../../utils/socket';

const ChatWindow = () => {
  const { user } = useAuthStore();
  const {
    activeConversation,
    messages,
    messagesLoading,
    hasMoreMessages,
    fetchMessages,
    loadMoreMessages,
    typingUsers,
    onlineUsers,
    markConversationRead,
  } = useChatStore();

  const bottomRef     = useRef(null);
  const scrollRef     = useRef(null);
  const prevScrollH   = useRef(0);
  const [atBottom, setAtBottom] = useState(true);

  // Fetch messages when conversation changes
  useEffect(() => {
    if (!activeConversation) return;
    fetchMessages(activeConversation._id, 1);
    markConversationRead(activeConversation._id);
    getSocket()?.emit('message:read', { conversationId: activeConversation._id });
  }, [activeConversation?._id]);

  // Auto-scroll to bottom on new messages (only if user is at bottom)
  useEffect(() => {
    if (atBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // On load-more: preserve scroll position
  useEffect(() => {
    if (!messagesLoading && scrollRef.current) {
      const newScrollH = scrollRef.current.scrollHeight;
      scrollRef.current.scrollTop = newScrollH - prevScrollH.current;
    }
  }, [messagesLoading]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAtBottom(fromBottom < 80);

    // Load more when near top
    if (el.scrollTop < 80 && hasMoreMessages && !messagesLoading) {
      prevScrollH.current = el.scrollHeight;
      loadMoreMessages();
    }
  }, [hasMoreMessages, messagesLoading]);

  if (!activeConversation) return <EmptyState />;

  const other     = activeConversation.participants?.find((p) => p._id !== user._id);
  const isOnline  = onlineUsers.has(other?._id) || other?.isOnline;
  const typing    = typingUsers[activeConversation._id] || [];
  const isTyping  = typing.some((t) => t.userId !== user._id);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/5 glass flex-shrink-0">
        <Avatar src={other?.avatar} username={other?.username} isOnline={isOnline} size="md" />
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-white text-sm truncate">{other?.username}</h2>
          <p className="text-xs text-white/40">
            {isTyping
              ? <span className="text-primary-400 animate-pulse">typing...</span>
              : isOnline
              ? <span className="text-primary-400">Online</span>
              : `Last seen ${formatLastSeen(other?.lastSeen)}`}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <HeaderBtn title="Search messages">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </HeaderBtn>
        </div>
      </div>

      {/* ── Messages area ────────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
        style={{ background: 'radial-gradient(ellipse at top, #111118 0%, #0a0a0f 100%)' }}
      >
        {/* Load more spinner */}
        {messagesLoading && messages.length > 0 && (
          <div className="flex justify-center py-3">
            <Spinner />
          </div>
        )}

        {/* Initial load */}
        {messagesLoading && messages.length === 0 ? (
          <MessageSkeleton />
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-surface-200 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">👋</span>
            </div>
            <p className="text-white/50 text-sm font-medium">Say hello to {other?.username}!</p>
            <p className="text-white/20 text-xs mt-1">This is the start of your conversation</p>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <MessageBubble
                key={msg._id || msg.tempId}
                message={msg}
                prevMessage={messages[idx - 1]}
                isOwn={msg.sender?._id === user._id || msg.sender === user._id}
              />
            ))}
            {/* Typing indicator */}
            {isTyping && (
              <div className="flex items-end gap-2 animate-fade-in">
                <Avatar src={other?.avatar} username={other?.username} size="xs" />
                <div className="bubble-received py-3 px-4">
                  <div className="flex gap-1 items-center">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce-dot typing-dot"
                        style={{ animationDelay: `${i * 0.16}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ────────────────────────────────────────────────────────── */}
      <MessageInput conversationId={activeConversation._id} />

      {/* Scroll-to-bottom FAB */}
      {!atBottom && (
        <button
          onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="absolute bottom-24 right-6 w-9 h-9 bg-primary-500 rounded-full flex items-center justify-center shadow-lg hover:bg-primary-400 transition-colors animate-fade-in"
        >
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}
    </div>
  );
};

const HeaderBtn = ({ children, title, onClick }) => (
  <button
    title={title}
    onClick={onClick}
    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
  >
    {children}
  </button>
);

const Spinner = () => (
  <svg className="animate-spin w-5 h-5 text-primary-500" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
  </svg>
);

const MessageSkeleton = () => (
  <div className="space-y-4 animate-pulse px-2 py-4">
    {[80, 60, 90, 50, 70].map((w, i) => (
      <div key={i} className={`flex ${i % 2 === 0 ? '' : 'justify-end'}`}>
        <div className={`h-9 bg-white/5 rounded-2xl`} style={{ width: `${w}%`, maxWidth: 320 }} />
      </div>
    ))}
  </div>
);

const EmptyState = () => (
  <div className="flex-1 flex flex-col items-center justify-center bg-surface-50 text-center px-6">
    <div className="w-20 h-20 bg-primary-500/10 rounded-full flex items-center justify-center mb-5 ring-1 ring-primary-500/20">
      <span className="text-4xl">⚡</span>
    </div>
    <h2 className="text-xl font-semibold text-white mb-2">NexTalk</h2>
    <p className="text-white/30 text-sm max-w-xs leading-relaxed">
      Select a conversation from the sidebar, or start a new one from the People tab.
    </p>
  </div>
);

export default ChatWindow;

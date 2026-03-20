import { useEffect } from 'react';
import { getSocket } from '../utils/socket';
import useChatStore from '../store/useChatStore';
import useAuthStore from '../store/useAuthStore';
import toast from 'react-hot-toast';

/**
 * Global socket event listener.
 * Mount once at the app root level after authentication.
 */
const useSocket = () => {
  const { user } = useAuthStore();
  const {
    addMessage,
    deleteMessage,
    updateConversationLastMessage,
    setUserOnline,
    setUserOffline,
    setTyping,
    clearTyping,
    activeConversation,
    markConversationRead,
  } = useChatStore();

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user) return;

    // ── New message received ─────────────────────────────────────────────────
    const onNewMessage = (message) => {
      addMessage(message);
      updateConversationLastMessage(
        message.conversationId,
        message,
        // Only increment unread if this conversation is not currently open
        activeConversation?._id !== message.conversationId ? undefined : 0
      );

      // If message is in active conversation, mark as read immediately
      if (activeConversation?._id === message.conversationId) {
        socket.emit('message:read', { conversationId: message.conversationId });
      } else if (message.sender?._id !== user._id) {
        // Show toast notification for new messages in other convos
        toast(
          `${message.sender?.username}: ${
            message.isDeleted ? 'Deleted message' : message.content?.slice(0, 40) || '📎 Attachment'
          }`,
          {
            icon: '💬',
            duration: 3000,
            style: {
              background: '#1c1c28',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              fontSize: '13px',
            },
          }
        );
      }
    };

    // ── Message deleted ──────────────────────────────────────────────────────
    const onMessageDeleted = ({ messageId }) => {
      deleteMessage(messageId);
    };

    // ── Read receipt ─────────────────────────────────────────────────────────
    const onMessageRead = ({ conversationId }) => {
      updateConversationLastMessage(conversationId, undefined, 0);
    };

    // ── Conversation updated (from another participant's action) ─────────────
    const onConversationUpdated = ({ conversationId, lastMessage, unreadCount }) => {
      updateConversationLastMessage(conversationId, lastMessage, unreadCount);
    };

    // ── User online / offline ────────────────────────────────────────────────
    const onUserOnline  = ({ userId }) => setUserOnline(userId);
    const onUserOffline = ({ userId, lastSeen }) => setUserOffline(userId, lastSeen);

    // ── Typing ───────────────────────────────────────────────────────────────
    const onTypingStart = ({ userId, username, conversationId }) => {
      if (userId !== user._id) setTyping(conversationId, userId, username);
    };
    const onTypingStop  = ({ userId, conversationId }) => {
      clearTyping(conversationId, userId);
    };

    // Attach listeners
    socket.on('message:new',             onNewMessage);
    socket.on('message:deleted',         onMessageDeleted);
    socket.on('message:read',            onMessageRead);
    socket.on('conversation:updated',    onConversationUpdated);
    socket.on('user:online',             onUserOnline);
    socket.on('user:offline',            onUserOffline);
    socket.on('typing:start',            onTypingStart);
    socket.on('typing:stop',             onTypingStop);

    return () => {
      socket.off('message:new',          onNewMessage);
      socket.off('message:deleted',      onMessageDeleted);
      socket.off('message:read',         onMessageRead);
      socket.off('conversation:updated', onConversationUpdated);
      socket.off('user:online',          onUserOnline);
      socket.off('user:offline',         onUserOffline);
      socket.off('typing:start',         onTypingStart);
      socket.off('typing:stop',          onTypingStop);
    };
  }, [user, activeConversation]);
};

export default useSocket;

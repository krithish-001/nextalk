import { create } from 'zustand';
import api from '../utils/api';

const useChatStore = create((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  users: [],
  typingUsers: {},        // { conversationId: [{ userId, username }] }
  onlineUsers: new Set(),
  messagesLoading: false,
  conversationsLoading: false,
  hasMoreMessages: false,
  messagePage: 1,
  searchQuery: '',

  // ─── Conversations ──────────────────────────────────────────────────────────

  fetchConversations: async () => {
    set({ conversationsLoading: true });
    try {
      const { data } = await api.get('/conversations');
      set({ conversations: data.conversations, conversationsLoading: false });
    } catch (_) {
      set({ conversationsLoading: false });
    }
  },

  openConversation: async (participantId) => {
    try {
      const { data } = await api.post('/conversations', { participantId });
      const conv = data.conversation;

      // Upsert into conversations list
      set((state) => {
        const exists = state.conversations.find((c) => c._id === conv._id);
        return {
          conversations: exists
            ? state.conversations.map((c) => (c._id === conv._id ? conv : c))
            : [conv, ...state.conversations],
          activeConversation: conv,
          messages: [],
          messagePage: 1,
        };
      });

      return conv;
    } catch (err) {
      console.error('openConversation error:', err);
    }
  },

  setActiveConversation: (conversation) => {
    set({ activeConversation: conversation, messages: [], messagePage: 1 });
  },

  // ─── Messages ───────────────────────────────────────────────────────────────

  fetchMessages: async (conversationId, page = 1) => {
    set({ messagesLoading: true });
    try {
      const { data } = await api.get(`/conversations/${conversationId}/messages?page=${page}&limit=30`);
      set((state) => ({
        messages: page === 1 ? data.messages : [...data.messages, ...state.messages],
        hasMoreMessages: data.pagination.hasMore,
        messagePage: page,
        messagesLoading: false,
      }));
    } catch (_) {
      set({ messagesLoading: false });
    }
  },

  loadMoreMessages: async () => {
    const { activeConversation, messagePage, hasMoreMessages } = get();
    if (!hasMoreMessages || !activeConversation) return;
    await get().fetchMessages(activeConversation._id, messagePage + 1);
  },

  addMessage: (message) => {
    set((state) => {
      // Replace optimistic message if tempId matches
      const exists = state.messages.find(
        (m) => m._id === message._id || (message.tempId && m.tempId === message.tempId)
      );
      if (exists) {
        return {
          messages: state.messages.map((m) =>
            m._id === message._id || m.tempId === message.tempId ? message : m
          ),
        };
      }
      return { messages: [...state.messages, message] };
    });
  },

  addOptimisticMessage: (message) => {
    set((state) => ({ messages: [...state.messages, message] }));
  },

  deleteMessage: (messageId) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m._id === messageId
          ? { ...m, content: 'This message was deleted', isDeleted: true }
          : m
      ),
    }));
  },

  // ─── Conversation sidebar updates ──────────────────────────────────────────

  updateConversationLastMessage: (conversationId, lastMessage, unreadCount) => {
    set((state) => ({
      conversations: state.conversations
        .map((c) =>
          c._id === conversationId
            ? { ...c, lastMessage, unreadCount: unreadCount ?? c.unreadCount, updatedAt: new Date() }
            : c
        )
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
    }));
  },

  markConversationRead: async (conversationId) => {
    try {
      await api.put(`/conversations/${conversationId}/read`);
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c._id === conversationId ? { ...c, unreadCount: 0 } : c
        ),
      }));
    } catch (_) {}
  },

  // ─── Users ──────────────────────────────────────────────────────────────────

  fetchUsers: async (search = '') => {
    try {
      const { data } = await api.get(`/users?search=${search}`);
      set({ users: data.users, searchQuery: search });
    } catch (_) {}
  },

  // ─── Online status ──────────────────────────────────────────────────────────

  setUserOnline: (userId) => {
    set((state) => {
      const next = new Set(state.onlineUsers);
      next.add(userId);
      return { onlineUsers: next };
    });
    // Update participant status in conversations
    set((state) => ({
      conversations: state.conversations.map((c) => ({
        ...c,
        participants: c.participants?.map((p) =>
          p._id === userId ? { ...p, isOnline: true } : p
        ),
      })),
    }));
  },

  setUserOffline: (userId, lastSeen) => {
    set((state) => {
      const next = new Set(state.onlineUsers);
      next.delete(userId);
      return { onlineUsers: next };
    });
    set((state) => ({
      conversations: state.conversations.map((c) => ({
        ...c,
        participants: c.participants?.map((p) =>
          p._id === userId ? { ...p, isOnline: false, lastSeen } : p
        ),
      })),
    }));
  },

  // ─── Typing ─────────────────────────────────────────────────────────────────

  setTyping: (conversationId, userId, username) => {
    set((state) => {
      const current = state.typingUsers[conversationId] || [];
      const exists = current.find((u) => u.userId === userId);
      if (exists) return {};
      return {
        typingUsers: {
          ...state.typingUsers,
          [conversationId]: [...current, { userId, username }],
        },
      };
    });
  },

  clearTyping: (conversationId, userId) => {
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [conversationId]: (state.typingUsers[conversationId] || []).filter(
          (u) => u.userId !== userId
        ),
      },
    }));
  },
}));

export default useChatStore;

import React, { useEffect, useState, useCallback } from 'react';
import useChatStore from '../../store/useChatStore';
import useAuthStore from '../../store/useAuthStore';
import Avatar from '../ui/Avatar';
import { formatConversationDate, truncate } from '../../utils/helpers';
import { getSocket } from '../../utils/socket';

const Sidebar = () => {
  const { user, logout }  = useAuthStore();
  const {
    conversations, conversationsLoading, fetchConversations,
    users, fetchUsers,
    activeConversation, setActiveConversation, openConversation,
    onlineUsers,
  } = useChatStore();

  const [tab,    setTab]    = useState('chats');   // 'chats' | 'people'
  const [search, setSearch] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null);

  useEffect(() => {
    fetchConversations();
    fetchUsers();
  }, []);

  // Debounced user search
  const handleSearch = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(searchTimeout);
    setSearchTimeout(setTimeout(() => fetchUsers(val), 300));
  };

  const handleSelectConversation = (conv) => {
    setActiveConversation(conv);
    // Join socket room + mark as read
    const socket = getSocket();
    socket?.emit('conversation:join', { conversationId: conv._id });
    socket?.emit('message:read',      { conversationId: conv._id });
  };

  const handleStartChat = async (participantId) => {
    const conv = await openConversation(participantId);
    if (conv) {
      setTab('chats');
      const socket = getSocket();
      socket?.emit('conversation:join', { conversationId: conv._id });
    }
  };

  const getOtherParticipant = (conv) =>
    conv.participants?.find((p) => p._id !== user._id);

  return (
    <aside className="w-80 flex-shrink-0 glass border-r border-white/5 flex flex-col h-full">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white">⚡ NexTalk</span>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h5a2 2 0 012 2v1" />
            </svg>
          </button>
        </div>

        {/* Current user pill */}
        <div className="flex items-center gap-3 bg-white/5 rounded-xl p-2.5">
          <Avatar src={user?.avatar} username={user?.username} isOnline size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.username}</p>
            <p className="text-xs text-primary-400">Online</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            placeholder="Search users..."
            className="input-base pl-9 py-2 text-xs"
          />
        </div>

        {/* Tabs */}
        <div className="flex mt-3 bg-surface-200 rounded-xl p-1">
          {['chats', 'people'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                tab === t
                  ? 'bg-primary-500 text-white shadow'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {tab === 'chats' ? (
          conversationsLoading ? (
            <SidebarSkeleton />
          ) : conversations.length === 0 ? (
            <EmptyState message="No conversations yet" sub="Start chatting from the People tab" />
          ) : (
            conversations.map((conv) => {
              const other    = getOtherParticipant(conv);
              const isActive = activeConversation?._id === conv._id;
              const isOnline = other && (onlineUsers.has(other._id) || other.isOnline);
              const unread   = conv.unreadCount || 0;

              return (
                <div
                  key={conv._id}
                  onClick={() => handleSelectConversation(conv)}
                  className={`sidebar-item ${isActive ? 'active' : ''}`}
                >
                  <Avatar src={other?.avatar} username={other?.username} isOnline={isOnline} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white truncate">{other?.username}</span>
                      {conv.lastMessage && (
                        <span className="text-[10px] text-white/30 ml-2 flex-shrink-0">
                          {formatConversationDate(conv.updatedAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className={`text-xs truncate ${unread > 0 ? 'text-white/70 font-medium' : 'text-white/30'}`}>
                        {conv.lastMessage?.isDeleted
                          ? '🗑 Message deleted'
                          : conv.lastMessage?.content
                          ? truncate(conv.lastMessage.content, 35)
                          : conv.lastMessage?.attachment
                          ? '📎 Attachment'
                          : 'Start a conversation'}
                      </span>
                      {unread > 0 && (
                        <span className="ml-2 flex-shrink-0 bg-primary-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                          {unread > 9 ? '9+' : unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )
        ) : (
          users.length === 0 ? (
            <EmptyState message="No users found" sub={search ? 'Try a different search' : 'No other users registered'} />
          ) : (
            users.map((u) => {
              const isOnline = onlineUsers.has(u._id) || u.isOnline;
              return (
                <div key={u._id} onClick={() => handleStartChat(u._id)} className="sidebar-item">
                  <Avatar src={u.avatar} username={u.username} isOnline={isOnline} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{u.username}</p>
                    <p className="text-xs text-white/30 truncate">{isOnline ? '🟢 Online' : u.email}</p>
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 text-primary-400 text-xs font-medium">
                    Chat
                  </button>
                </div>
              );
            })
          )
        )}
      </div>
    </aside>
  );
};

const EmptyState = ({ message, sub }) => (
  <div className="flex flex-col items-center justify-center h-40 text-center px-4">
    <p className="text-white/40 text-sm font-medium">{message}</p>
    <p className="text-white/20 text-xs mt-1">{sub}</p>
  </div>
);

const SidebarSkeleton = () =>
  Array.from({ length: 5 }).map((_, i) => (
    <div key={i} className="flex items-center gap-3 px-3 py-3 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-white/5" />
      <div className="flex-1">
        <div className="h-3 bg-white/5 rounded w-1/2 mb-2" />
        <div className="h-2 bg-white/5 rounded w-3/4" />
      </div>
    </div>
  ));

export default Sidebar;

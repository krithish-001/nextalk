import React, { useEffect } from 'react';
import Sidebar from '../components/chat/Sidebar';
import ChatWindow from '../components/chat/ChatWindow';
import useSocket from '../hooks/useSocket';
import { initSocket } from '../utils/socket';
import useAuthStore from '../store/useAuthStore';

const ChatPage = () => {
  const { token } = useAuthStore();

  // Ensure socket is connected (may already be from login)
  useEffect(() => {
    if (token) initSocket(token);
  }, [token]);

  // Register all global socket event handlers
  useSocket();

  return (
    <div className="flex h-full w-full overflow-hidden bg-surface-0">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <ChatWindow />
      </main>
    </div>
  );
};

export default ChatPage;

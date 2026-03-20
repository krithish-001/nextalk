import React, { useState, useRef, useCallback, useEffect } from 'react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { getSocket } from '../../utils/socket';
import useChatStore from '../../store/useChatStore';
import useAuthStore from '../../store/useAuthStore';
import { formatFileSize } from '../../utils/helpers';
import { v4 as uuidv4 } from 'uuid';
import api from '../../utils/api';

const TYPING_DEBOUNCE = 1500; // ms

const MessageInput = ({ conversationId }) => {
  const { user }        = useAuthStore();
  const { addOptimisticMessage, addMessage } = useChatStore();

  const [text,         setText]        = useState('');
  const [showEmoji,    setShowEmoji]   = useState(false);
  const [attachment,   setAttachment]  = useState(null); // { file, preview, type }
  const [isSending,    setIsSending]   = useState(false);
  const [isTyping,     setIsTyping]    = useState(false);

  const inputRef       = useRef(null);
  const fileRef        = useRef(null);
  const typingTimer    = useRef(null);
  const emojiRef       = useRef(null);

  // ── Close emoji picker on outside click ─────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Typing indicator helpers ─────────────────────────────────────────────
  const startTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      getSocket()?.emit('typing:start', { conversationId });
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      setIsTyping(false);
      getSocket()?.emit('typing:stop', { conversationId });
    }, TYPING_DEBOUNCE);
  }, [isTyping, conversationId]);

  const stopTyping = useCallback(() => {
    clearTimeout(typingTimer.current);
    if (isTyping) {
      setIsTyping(false);
      getSocket()?.emit('typing:stop', { conversationId });
    }
  }, [isTyping, conversationId]);

  // ── Text change ──────────────────────────────────────────────────────────
  const handleTextChange = (e) => {
    setText(e.target.value);
    if (e.target.value) startTyping(); else stopTyping();
    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  // ── Emoji ────────────────────────────────────────────────────────────────
  const handleEmojiSelect = (emoji) => {
    setText((prev) => prev + emoji.native);
    inputRef.current?.focus();
  };

  // ── File selection ───────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const preview = isImage ? URL.createObjectURL(file) : null;

    setAttachment({ file, preview, type: isImage ? 'image' : 'file' });
    e.target.value = '';
  };

  const removeAttachment = () => {
    if (attachment?.preview) URL.revokeObjectURL(attachment.preview);
    setAttachment(null);
  };

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed && !attachment) return;
    if (isSending) return;

    stopTyping();
    setIsSending(true);

    const tempId = uuidv4();

    // Optimistic message (text only — files go through REST)
    if (!attachment) {
      const optimistic = {
        _id: tempId,
        tempId,
        conversationId,
        sender: { _id: user._id, username: user.username, avatar: user.avatar },
        content: trimmed,
        messageType: 'text',
        createdAt: new Date().toISOString(),
        readBy: [],
        _pending: true,
      };
      addOptimisticMessage(optimistic);
      setText('');
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }

      // Send via socket
      getSocket()?.emit('message:send', { conversationId, content: trimmed, tempId }, (res) => {
        if (res?.error) {
          // Remove optimistic on error
          console.error('Send error:', res.error);
        }
      });

    } else {
      // File upload via REST API
      const formData = new FormData();
      formData.append('conversationId', conversationId);
      if (trimmed) formData.append('content', trimmed);
      formData.append('attachment', attachment.file);

      setText('');
      setAttachment(null);

      try {
        const { data: res } = await api.post('/messages', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        addMessage(res.message);
      } catch (err) {
        console.error('File send error:', err);
      }
    }

    setIsSending(false);
    inputRef.current?.focus();
  };

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="px-4 py-3 border-t border-white/5 bg-surface-50 flex-shrink-0">
      {/* Attachment preview */}
      {attachment && (
        <div className="mb-2 flex items-center gap-3 bg-surface-200 rounded-xl p-2.5 animate-fade-in">
          {attachment.type === 'image' ? (
            <img src={attachment.preview} alt="preview" className="w-12 h-12 rounded-lg object-cover" />
          ) : (
            <div className="w-12 h-12 bg-surface-300 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/80 font-medium truncate">{attachment.file.name}</p>
            <p className="text-[10px] text-white/30">{formatFileSize(attachment.file.size)}</p>
          </div>
          <button onClick={removeAttachment} className="w-6 h-6 rounded-full bg-white/10 hover:bg-red-500/30 flex items-center justify-center text-white/50 hover:text-red-400 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        {/* Emoji button */}
        <div className="relative" ref={emojiRef}>
          <InputBtn onClick={() => setShowEmoji((s) => !s)} title="Emoji" active={showEmoji}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </InputBtn>
          {showEmoji && (
            <div className="absolute bottom-12 left-0 z-50 animate-fade-in shadow-2xl rounded-2xl overflow-hidden">
              <Picker
                data={data}
                onEmojiSelect={handleEmojiSelect}
                theme="dark"
                previewPosition="none"
                skinTonePosition="none"
                maxFrequentRows={1}
              />
            </div>
          )}
        </div>

        {/* File attachment button */}
        <InputBtn onClick={() => fileRef.current?.click()} title="Attach file">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </InputBtn>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept="image/*,.pdf,.txt"
          onChange={handleFileChange}
        />

        {/* Text input */}
        <textarea
          ref={inputRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Shift+Enter for new line)"
          rows={1}
          className="flex-1 bg-surface-200 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25
                     focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/20
                     resize-none transition-all duration-200 leading-relaxed"
          style={{ minHeight: 44, maxHeight: 120 }}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={isSending || (!text.trim() && !attachment)}
          className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl
                     bg-primary-500 hover:bg-primary-400
                     disabled:opacity-30 disabled:cursor-not-allowed
                     transition-all duration-200 shadow-lg shadow-primary-900/30"
        >
          {isSending ? (
            <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
            </svg>
          ) : (
            <svg className="w-4 h-4 text-white translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </div>

      <p className="text-[10px] text-white/15 text-center mt-2">Enter to send · Shift+Enter for new line</p>
    </div>
  );
};

const InputBtn = ({ children, onClick, title, active }) => (
  <button
    onClick={onClick}
    title={title}
    className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl transition-colors
      ${active ? 'bg-primary-500/20 text-primary-400' : 'text-white/30 hover:text-white hover:bg-white/10'}`}
  >
    {children}
  </button>
);

export default MessageInput;

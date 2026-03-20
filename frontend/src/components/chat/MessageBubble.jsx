import React, { useState } from 'react';
import Avatar from '../ui/Avatar';
import { formatMessageTime } from '../../utils/helpers';
import useChatStore from '../../store/useChatStore';
import { getSocket } from '../../utils/socket';

const MessageBubble = ({ message, prevMessage, isOwn }) => {
  const { deleteMessage, activeConversation } = useChatStore();
  const [showMenu, setShowMenu] = useState(false);

  // Group consecutive messages from same sender
  const prevSender = prevMessage?.sender?._id || prevMessage?.sender;
  const thisSender = message.sender?._id || message.sender;
  const isGrouped  = prevSender === thisSender;

  // Date divider logic
  const prevDate = prevMessage ? new Date(prevMessage.createdAt).toDateString() : null;
  const thisDate = new Date(message.createdAt).toDateString();
  const showDate = prevDate !== thisDate;

  const isRead    = message.readBy?.length > 0;
  const isPending = message._pending;

  const handleDelete = () => {
    const socket = getSocket();
    socket?.emit('message:delete', {
      messageId: message._id,
      conversationId: activeConversation._id,
    });
    setShowMenu(false);
  };

  return (
    <>
      {/* ── Date divider ─────────────────────────────────────────────────── */}
      {showDate && (
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-white/5" />
          <span className="text-[10px] text-white/25 font-medium px-2">
            {new Date(message.createdAt).toLocaleDateString('en-US', {
              weekday: 'short', month: 'short', day: 'numeric',
            })}
          </span>
          <div className="flex-1 h-px bg-white/5" />
        </div>
      )}

      {/* ── Message row ──────────────────────────────────────────────────── */}
      <div
        className={`flex items-end gap-2 msg-appear group ${isOwn ? 'flex-row-reverse' : ''} ${isGrouped ? 'mt-0.5' : 'mt-3'}`}
        onMouseLeave={() => setShowMenu(false)}
      >
        {/* Avatar (only for received, first in group) */}
        {!isOwn && (
          <div className="flex-shrink-0 w-7">
            {!isGrouped && (
              <Avatar src={message.sender?.avatar} username={message.sender?.username} size="xs" />
            )}
          </div>
        )}

        {/* Bubble + meta */}
        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[75%]`}>
          {/* Sender name for received messages */}
          {!isOwn && !isGrouped && (
            <span className="text-[11px] text-white/40 mb-1 ml-1 font-medium">
              {message.sender?.username}
            </span>
          )}

          {/* Reply context */}
          {message.replyTo && (
            <div className={`text-xs px-3 py-1.5 rounded-xl mb-1 border-l-2 border-primary-400 bg-white/5 max-w-full ${isOwn ? 'mr-1' : 'ml-1'}`}>
              <span className="text-primary-400 font-semibold text-[11px] block mb-0.5">
                {message.replyTo.sender?.username || 'User'}
              </span>
              <span className="text-white/50 line-clamp-1">
                {message.replyTo.content || '📎 Attachment'}
              </span>
            </div>
          )}

          {/* Main bubble */}
          <div className="relative" onMouseEnter={() => !isPending && setShowMenu(true)}>
            <div className={isOwn ? 'bubble-sent' : 'bubble-received'}>
              {/* Deleted message */}
              {message.isDeleted ? (
                <span className="text-white/30 italic text-sm flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Message deleted
                </span>
              ) : (
                <>
                  {/* Image attachment */}
                  {message.attachment?.type === 'image' && (
                    <a href={message.attachment.url} target="_blank" rel="noreferrer" className="block mb-2">
                      <img
                        src={message.attachment.url}
                        alt="attachment"
                        className="rounded-xl max-w-xs max-h-64 object-cover cursor-zoom-in"
                      />
                    </a>
                  )}

                  {/* File attachment */}
                  {message.attachment?.type === 'file' && (
                    <a
                      href={message.attachment.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2.5 bg-black/20 rounded-lg px-3 py-2 mb-2 hover:bg-black/30 transition-colors"
                    >
                      <svg className="w-6 h-6 text-primary-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm text-white/80 truncate max-w-[160px]">{message.attachment.name}</span>
                    </a>
                  )}

                  {/* Text content */}
                  {message.content && (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                  )}
                </>
              )}

              {/* Timestamp + status */}
              <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <span className="text-[10px] text-white/30">
                  {formatMessageTime(message.createdAt)}
                </span>
                {isOwn && !message.isDeleted && (
                  <ReadStatus isPending={isPending} isRead={isRead} />
                )}
              </div>
            </div>

            {/* Context menu */}
            {showMenu && !message.isDeleted && isOwn && (
              <div className="absolute top-0 right-full mr-2 bg-surface-300 border border-white/10 rounded-xl shadow-xl overflow-hidden z-10 animate-fade-in">
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-4 py-2.5 text-xs text-red-400 hover:bg-red-400/10 transition-colors w-full whitespace-nowrap"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

const ReadStatus = ({ isPending, isRead }) => {
  if (isPending) {
    return (
      <svg className="w-3 h-3 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }
  if (isRead) {
    // Double tick (blue-ish)
    return (
      <svg className="w-3.5 h-3.5 text-primary-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.5 12.75l4 4 9-9" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2 12.75l4 4" opacity="0.5" />
      </svg>
    );
  }
  // Single tick (sent)
  return (
    <svg className="w-3.5 h-3.5 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.5 12.75l4 4 9-9" />
    </svg>
  );
};

export default MessageBubble;

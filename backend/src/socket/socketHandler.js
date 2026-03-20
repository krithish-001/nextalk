const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const { cache } = require('../config/redis');
const logger = require('../utils/logger');

// Map of userId -> Set of socketIds (user can have multiple tabs open)
const userSocketMap = new Map();

/**
 * Get all socket IDs for a given user
 */
const getUserSockets = (userId) => {
  return userSocketMap.get(userId.toString()) || new Set();
};

/**
 * Emit event to all sockets of a specific user
 */
const emitToUser = (io, userId, event, data) => {
  const sockets = getUserSockets(userId);
  sockets.forEach((socketId) => {
    io.to(socketId).emit(event, data);
  });
};

/**
 * Initialize all socket event handlers
 */
const initSocketHandlers = (io) => {
  io.on('connection', async (socket) => {
    const user = socket.user;
    const userId = user._id.toString();

    logger.info(`Socket connected: ${user.username} (${socket.id})`);

    // ─── Register socket for this user ───────────────────────────────────────
    if (!userSocketMap.has(userId)) {
      userSocketMap.set(userId, new Set());
    }
    userSocketMap.get(userId).add(socket.id);

    // ─── Mark user as online ──────────────────────────────────────────────────
    await User.findByIdAndUpdate(userId, { isOnline: true });
    await cache.sadd('online_users', userId);

    // Broadcast online status to all connected clients
    io.emit('user:online', { userId, isOnline: true });

    // ─── Join user's conversation rooms ──────────────────────────────────────
    const conversations = await Conversation.find({ participants: userId }).select('_id');
    conversations.forEach((conv) => {
      socket.join(conv._id.toString());
    });

    // ─── Send Message ─────────────────────────────────────────────────────────
    socket.on('message:send', async (data, callback) => {
      try {
        const { conversationId, content, replyTo, tempId } = data;

        if (!content?.trim() && !data.attachment) {
          return callback?.({ error: 'Message content is required' });
        }

        // Verify user is in conversation
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: userId,
        });

        if (!conversation) {
          return callback?.({ error: 'Not authorized for this conversation' });
        }

        // Create and save message
        const message = await Message.create({
          conversationId,
          sender: userId,
          content: content?.trim(),
          replyTo: replyTo || null,
          messageType: 'text',
        });

        await message.populate('sender', 'username avatar');
        if (replyTo) await message.populate('replyTo', 'content sender');

        // Update conversation's lastMessage & unread counts for other participants
        const otherParticipants = conversation.participants.filter(
          (p) => p.toString() !== userId
        );

        const unreadUpdates = {};
        otherParticipants.forEach((pid) => {
          const current = conversation.unreadCounts?.get(pid.toString()) || 0;
          unreadUpdates[pid.toString()] = current + 1;
        });

        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: message._id,
          updatedAt: new Date(),
          $set: Object.keys(unreadUpdates).reduce((acc, key) => {
            acc[`unreadCounts.${key}`] = unreadUpdates[key];
            return acc;
          }, {}),
        });

        const messageData = {
          ...message.toObject(),
          tempId, // Send back tempId so client can replace optimistic message
        };

        // Broadcast message to all sockets in the conversation room
        io.to(conversationId).emit('message:new', messageData);

        // Send notification to offline participants
        otherParticipants.forEach((participantId) => {
          const pid = participantId.toString();
          const isOnline = userSocketMap.has(pid) && userSocketMap.get(pid).size > 0;

          if (isOnline) {
            // Emit conversation update for sidebar refresh
            emitToUser(io, pid, 'conversation:updated', {
              conversationId,
              lastMessage: message,
              unreadCount: unreadUpdates[pid] || 0,
            });
          }
        });

        callback?.({ success: true, message: messageData });
      } catch (error) {
        logger.error(`message:send error: ${error.message}`);
        callback?.({ error: 'Failed to send message' });
      }
    });

    // ─── Typing Indicators ────────────────────────────────────────────────────
    socket.on('typing:start', ({ conversationId }) => {
      socket.to(conversationId).emit('typing:start', {
        userId,
        username: user.username,
        conversationId,
      });
    });

    socket.on('typing:stop', ({ conversationId }) => {
      socket.to(conversationId).emit('typing:stop', {
        userId,
        conversationId,
      });
    });

    // ─── Mark Messages as Read ────────────────────────────────────────────────
    socket.on('message:read', async ({ conversationId }) => {
      try {
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: userId,
        });

        if (!conversation) return;

        // Reset unread count for this user
        await Conversation.findByIdAndUpdate(conversationId, {
          [`unreadCounts.${userId}`]: 0,
        });

        // Mark unread messages as read
        const updated = await Message.updateMany(
          {
            conversationId,
            sender: { $ne: userId },
            'readBy.user': { $ne: userId },
          },
          { $push: { readBy: { user: userId, readAt: new Date() } } }
        );

        if (updated.modifiedCount > 0) {
          // Notify sender that messages were read
          socket.to(conversationId).emit('message:read', {
            conversationId,
            readBy: userId,
            readAt: new Date(),
          });
        }
      } catch (error) {
        logger.error(`message:read error: ${error.message}`);
      }
    });

    // ─── Join a new conversation room ─────────────────────────────────────────
    socket.on('conversation:join', ({ conversationId }) => {
      socket.join(conversationId);
    });

    // ─── Delete Message ───────────────────────────────────────────────────────
    socket.on('message:delete', async ({ messageId, conversationId }, callback) => {
      try {
        const message = await Message.findOne({ _id: messageId, sender: userId });

        if (!message) {
          return callback?.({ error: 'Message not found or unauthorized' });
        }

        message.isDeleted = true;
        message.content = 'This message was deleted';
        message.deletedAt = new Date();
        await message.save();

        io.to(conversationId).emit('message:deleted', { messageId, conversationId });
        callback?.({ success: true });
      } catch (error) {
        logger.error(`message:delete error: ${error.message}`);
        callback?.({ error: 'Failed to delete message' });
      }
    });

    // ─── Disconnect ───────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      logger.info(`Socket disconnected: ${user.username} (${socket.id})`);

      // Remove this socket from user's set
      const sockets = userSocketMap.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          // All tabs closed — user is truly offline
          userSocketMap.delete(userId);
          await cache.srem('online_users', userId);
          await User.findByIdAndUpdate(userId, {
            isOnline: false,
            lastSeen: new Date(),
          });
          io.emit('user:offline', { userId, lastSeen: new Date() });
        }
      }
    });
  });
};

module.exports = { initSocketHandlers, emitToUser, getUserSockets };

const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * @route   POST /api/conversations
 * @desc    Create or get existing 1-on-1 conversation
 * @access  Private
 */
const createOrGetConversation = async (req, res) => {
  const { participantId } = req.body;

  if (!participantId) {
    return res.status(400).json({
      success: false,
      message: 'Participant ID is required',
    });
  }

  if (participantId === req.user._id.toString()) {
    return res.status(400).json({
      success: false,
      message: 'Cannot create conversation with yourself',
    });
  }

  try {
    // Check if participant exists
    const participant = await User.findById(participantId);
    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check for existing conversation between these two users
    let conversation = await Conversation.findOne({
      isGroup: false,
      participants: {
        $all: [req.user._id, participantId],
        $size: 2,
      },
    })
      .populate('participants', 'username email avatar isOnline lastSeen')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'username avatar' },
      });

    if (conversation) {
      return res.status(200).json({
        success: true,
        conversation,
        isNew: false,
      });
    }

    // Create new conversation
    conversation = await Conversation.create({
      participants: [req.user._id, participantId],
      isGroup: false,
    });

    await conversation.populate('participants', 'username email avatar isOnline lastSeen');

    res.status(201).json({
      success: true,
      conversation,
      isNew: true,
    });
  } catch (error) {
    logger.error(`CreateConversation error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @route   GET /api/conversations
 * @desc    Get all conversations for current user
 * @access  Private
 */
const getMyConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate('participants', 'username email avatar isOnline lastSeen')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'username avatar' },
      })
      .sort({ updatedAt: -1 });

    // Add unread count for current user to each conversation
    const conversationsWithUnread = conversations.map((conv) => {
      const convObj = conv.toObject();
      convObj.unreadCount = conv.unreadCounts?.get(req.user._id.toString()) || 0;
      return convObj;
    });

    res.status(200).json({
      success: true,
      conversations: conversationsWithUnread,
    });
  } catch (error) {
    logger.error(`GetConversations error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @route   GET /api/conversations/:id/messages
 * @desc    Get paginated messages for a conversation
 * @access  Private
 */
const getMessages = async (req, res) => {
  const { page = 1, limit = 30 } = req.query;

  try {
    // Verify user is part of the conversation
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this conversation',
      });
    }

    const skip = (page - 1) * limit;

    const messages = await Message.find({
      conversationId: req.params.id,
      isDeleted: false,
    })
      .populate('sender', 'username avatar')
      .populate('replyTo', 'content sender')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Message.countDocuments({
      conversationId: req.params.id,
      isDeleted: false,
    });

    // Return in chronological order
    res.status(200).json({
      success: true,
      messages: messages.reverse(),
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        hasMore: skip + messages.length < total,
      },
    });
  } catch (error) {
    logger.error(`GetMessages error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @route   PUT /api/conversations/:id/read
 * @desc    Mark all messages as read in a conversation
 * @access  Private
 */
const markAsRead = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Reset unread count for current user
    conversation.unreadCounts.set(req.user._id.toString(), 0);
    await conversation.save();

    // Mark messages as read
    await Message.updateMany(
      {
        conversationId: req.params.id,
        sender: { $ne: req.user._id },
        'readBy.user': { $ne: req.user._id },
      },
      {
        $push: { readBy: { user: req.user._id, readAt: new Date() } },
      }
    );

    res.status(200).json({ success: true, message: 'Messages marked as read' });
  } catch (error) {
    logger.error(`MarkAsRead error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  createOrGetConversation,
  getMyConversations,
  getMessages,
  markAsRead,
};

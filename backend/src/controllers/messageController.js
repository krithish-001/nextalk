const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const cloudinary = require('cloudinary').v2;
const logger = require('../utils/logger');

/**
 * @route   POST /api/messages
 * @desc    Send a message (REST fallback, main sending is via socket)
 * @access  Private
 */
const sendMessage = async (req, res) => {
  const { conversationId, content, replyTo } = req.body;

  if (!content && !req.file) {
    return res.status(400).json({
      success: false,
      message: 'Message content or attachment is required',
    });
  }

  try {
    // Verify user is in conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to send message in this conversation',
      });
    }

    let attachment = null;

    // Handle file upload
    if (req.file) {
      try {
        const isImage = req.file.mimetype.startsWith('image/');
        const result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: 'chatapp/attachments',
              resource_type: isImage ? 'image' : 'raw',
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          stream.end(req.file.buffer);
        });

        attachment = {
          url: result.secure_url,
          publicId: result.public_id,
          type: isImage ? 'image' : 'file',
          name: req.file.originalname,
          size: req.file.size,
        };
      } catch (uploadError) {
        logger.warn(`Attachment upload failed: ${uploadError.message}`);
      }
    }

    const message = await Message.create({
      conversationId,
      sender: req.user._id,
      content,
      attachment,
      messageType: attachment?.type === 'image' ? 'image' : attachment ? 'file' : 'text',
      replyTo: replyTo || null,
    });

    await message.populate('sender', 'username avatar');
    if (replyTo) await message.populate('replyTo', 'content sender');

    // Update conversation's lastMessage and unread counts
    const otherParticipants = conversation.participants.filter(
      (p) => p.toString() !== req.user._id.toString()
    );

    const unreadUpdates = {};
    otherParticipants.forEach((participantId) => {
      const current = conversation.unreadCounts.get(participantId.toString()) || 0;
      unreadUpdates[participantId.toString()] = current + 1;
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      $set: { unreadCounts: { ...Object.fromEntries(conversation.unreadCounts), ...unreadUpdates } },
    });

    res.status(201).json({ success: true, message });
  } catch (error) {
    logger.error(`SendMessage error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error sending message' });
  }
};

/**
 * @route   DELETE /api/messages/:id
 * @desc    Delete a message (soft delete)
 * @access  Private
 */
const deleteMessage = async (req, res) => {
  try {
    const message = await Message.findOne({
      _id: req.params.id,
      sender: req.user._id,
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found or not authorized',
      });
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.content = 'This message was deleted';
    await message.save();

    res.status(200).json({ success: true, message: 'Message deleted' });
  } catch (error) {
    logger.error(`DeleteMessage error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { sendMessage, deleteMessage };

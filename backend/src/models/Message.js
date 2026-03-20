const mongoose = require('mongoose');

/**
 * Message Schema
 * Stores individual messages within conversations
 */
const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      trim: true,
      maxlength: [5000, 'Message cannot exceed 5000 characters'],
    },
    // File/image attachment support
    attachment: {
      url: String,
      publicId: String,
      type: {
        type: String,
        enum: ['image', 'file', 'audio'],
      },
      name: String,
      size: Number,
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'file', 'system'],
      default: 'text',
    },
    // Read receipts - tracks which users have read the message
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
    // For reply threading (optional)
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient message fetching by conversation
messageSchema.index({ conversationId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);

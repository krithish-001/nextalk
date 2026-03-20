const mongoose = require('mongoose');

/**
 * Conversation Schema
 * Represents a chat session between two or more users
 */
const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    isGroup: {
      type: Boolean,
      default: false,
    },
    groupName: {
      type: String,
      trim: true,
      maxlength: [50, 'Group name cannot exceed 50 characters'],
    },
    groupAvatar: {
      type: String,
      default: null,
    },
    groupAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    // Track unread counts per participant
    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Ensure unique 1-on-1 conversations (not for groups)
conversationSchema.index({ participants: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);

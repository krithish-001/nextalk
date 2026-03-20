const express = require('express');
const {
  createOrGetConversation,
  getMyConversations,
  getMessages,
  markAsRead,
} = require('../controllers/conversationController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

/**
 * @route   POST /api/conversations
 * @desc    Create or get 1-on-1 conversation
 * @access  Private
 */
router.post('/', createOrGetConversation);

/**
 * @route   GET /api/conversations
 * @desc    Get all conversations for current user
 * @access  Private
 */
router.get('/', getMyConversations);

/**
 * @route   GET /api/conversations/:id/messages
 * @desc    Get paginated messages for a conversation
 * @access  Private
 */
router.get('/:id/messages', getMessages);

/**
 * @route   PUT /api/conversations/:id/read
 * @desc    Mark conversation as read
 * @access  Private
 */
router.put('/:id/read', markAsRead);

module.exports = router;

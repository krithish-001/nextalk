const express = require('express');
const { sendMessage, deleteMessage } = require('../controllers/messageController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { messageLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.use(protect);

/**
 * @route   POST /api/messages
 * @desc    Send a message (with optional file attachment)
 * @access  Private
 */
router.post('/', messageLimiter, upload.single('attachment'), sendMessage);

/**
 * @route   DELETE /api/messages/:id
 * @desc    Delete a message (soft delete)
 * @access  Private
 */
router.delete('/:id', deleteMessage);

module.exports = router;

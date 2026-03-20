const express = require('express');
const { getUsers, getUserById, updateProfile } = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// All routes require authentication
router.use(protect);

/**
 * @route   GET /api/users
 * @desc    Get all users (with optional search query)
 * @access  Private
 */
router.get('/', getUsers);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private
 */
router.get('/:id', getUserById);

/**
 * @route   PUT /api/users/profile
 * @desc    Update profile (with optional avatar upload)
 * @access  Private
 */
router.put('/profile', upload.single('avatar'), updateProfile);

module.exports = router;

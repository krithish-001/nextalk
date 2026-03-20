const User = require('../models/User');
const cloudinary = require('cloudinary').v2;
const logger = require('../utils/logger');

/**
 * @route   GET /api/users
 * @desc    Get all users (for search/sidebar) except current user
 * @access  Private
 */
const getUsers = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;

    const query = { _id: { $ne: req.user._id } };

    // Search by username or email
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const users = await User.find(query)
      .select('username email avatar isOnline lastSeen bio')
      .sort({ isOnline: -1, username: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      users,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error(`GetUsers error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error fetching users',
    });
  }
};

/**
 * @route   GET /api/users/:id
 * @desc    Get single user by ID
 * @access  Private
 */
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      'username email avatar isOnline lastSeen bio'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    logger.error(`GetUserById error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
const updateProfile = async (req, res) => {
  try {
    const { username, bio } = req.body;
    const updates = {};

    if (username) {
      // Check username uniqueness
      const existing = await User.findOne({
        username,
        _id: { $ne: req.user._id },
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Username already taken',
        });
      }
      updates.username = username;
    }

    if (bio !== undefined) updates.bio = bio;

    // Handle avatar upload if file provided
    if (req.file) {
      try {
        // Delete old avatar if exists
        if (req.user.avatarPublicId) {
          await cloudinary.uploader.destroy(req.user.avatarPublicId);
        }

        // Upload new avatar to Cloudinary
        const result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: 'chatapp/avatars',
              transformation: [{ width: 200, height: 200, crop: 'fill' }],
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          stream.end(req.file.buffer);
        });

        updates.avatar = result.secure_url;
        updates.avatarPublicId = result.public_id;
      } catch (uploadError) {
        logger.warn(`Avatar upload failed: ${uploadError.message}`);
        // Continue without avatar update
      }
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: user.toPublicJSON(),
    });
  } catch (error) {
    logger.error(`UpdateProfile error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error updating profile' });
  }
};

module.exports = { getUsers, getUserById, updateProfile };

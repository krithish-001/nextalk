const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Auth routes rate limiter (stricter)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 auth requests per windowMs
  message: {
    success: false,
    message: 'Too many login attempts, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Message rate limiter - prevent spam
 */
const messageLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 5, // max 5 messages per second per IP
  message: {
    success: false,
    message: 'You are sending messages too fast. Please slow down.',
  },
});

module.exports = { apiLimiter, authLimiter, messageLimiter };

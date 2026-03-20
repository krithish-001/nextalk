const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Connect to MongoDB with retry logic
 */
const connectDB = async () => {
  const maxRetries = 5;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      logger.info(`MongoDB Connected: ${conn.connection.host}`);
      return;
    } catch (error) {
      retries++;
      logger.error(`MongoDB connection attempt ${retries} failed: ${error.message}`);

      if (retries === maxRetries) {
        logger.error('Max retries reached. Exiting...');
        process.exit(1);
      }

      // Wait 5 seconds before retrying
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
};

module.exports = connectDB;

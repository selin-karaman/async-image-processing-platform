import 'dotenv/config';
import mongoose from 'mongoose';
import { app } from './app';
import { logger } from './services/logger-service';
import { initializeRabbitMQ } from './services/rabbitmq-service';

const PORT = process.env.PORT || 4000;

/**
 * The application needs to be started in this way for enabling Jest tests.
 */
const start = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI environment variable is required.');
  }

  // Connect to MongoDB with retries
  let mongoConnected = false;
  const mongoRetries = 10;
  const mongoDelayMs = 5000;
  for (let attempt = 1; attempt <= mongoRetries; attempt++) {
    try {
      logger.info(`Connecting to MongoDB (attempt ${attempt}/${mongoRetries})...`);
      await mongoose.connect(process.env.MONGO_URI);
      logger.info('Successfully connected to MongoDB.');
      mongoConnected = true;
      break;
    } catch (error) {
      logger.error(`Failed to connect to MongoDB (attempt ${attempt}):`, error);
      if (attempt === mongoRetries) {
        throw new Error(`MongoDB connection failed after ${mongoRetries} attempts.`);
      }
      await new Promise((resolve) => setTimeout(resolve, mongoDelayMs));
    }
  }

  // Initialize RabbitMQ
  await initializeRabbitMQ();

  app.listen(PORT, () => {
    logger.info(`Initialization successful -> Listening on port ${PORT}!`);
  });
};

start();

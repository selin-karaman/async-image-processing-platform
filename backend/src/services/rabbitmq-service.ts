import amqp, { Channel, ChannelModel } from 'amqplib';
import { logger } from './logger-service';

let connection: ChannelModel;
let channel: Channel;

const QUEUE_NAME = 'image-resize';

export const initializeRabbitMQ = async (retryCount = 10, delayMs = 5000): Promise<void> => {
  const uri = process.env.RABBITMQ_URI;
  if (!uri) {
    logger.warn('RABBITMQ_URI is not defined. RabbitMQ service is disabled.');
    return;
  }

  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      logger.info(`Connecting to RabbitMQ (attempt ${attempt}/${retryCount})...`);
      connection = await amqp.connect(uri);
      channel = await connection.createChannel();
      await channel.assertQueue(QUEUE_NAME, { durable: true });
      logger.info('Successfully connected to RabbitMQ and asserted queue.');

      connection.on('error', (err) => {
        logger.error('RabbitMQ connection error:', err);
      });
      connection.on('close', () => {
        logger.warn('RabbitMQ connection closed. Attempting reconnect...');
        initializeRabbitMQ(retryCount, delayMs);
      });

      return;
    } catch (error) {
      logger.error(`Failed to connect to RabbitMQ (attempt ${attempt}):`, error);
      if (attempt === retryCount) {
        throw new Error(`RabbitMQ connection failed after ${retryCount} attempts.`);
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
};

export const publishToQueue = async (queue: string, message: any): Promise<boolean> => {
  if (!channel) {
    logger.warn(`RabbitMQ channel not initialized. Message not sent: ${JSON.stringify(message)}`);
    return false;
  }
  try {
    const success = channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
      persistent: true,
    });
    if (success) {
      logger.info(`Message successfully published to queue ${queue}`);
    } else {
      logger.error(`Failed to publish message to queue ${queue}`);
    }
    return success;
  } catch (error) {
    logger.error('Error publishing to queue:', error);
    return false;
  }
};

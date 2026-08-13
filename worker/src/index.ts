import 'dotenv/config';
import mongoose from 'mongoose';
import amqp, { Channel, ChannelModel } from 'amqplib';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import Jimp from 'jimp';

// Validate Env variables
const requiredEnvs = ['MONGO_URI', 'RABBITMQ_URI', 'ENDPOINT', 'BUCKET', 'ACCESS_KEY_ID', 'SECRET_ACCESS_KEY'];
for (const env of requiredEnvs) {
  if (!process.env[env]) {
    console.error(`Error: Environment variable ${env} is required.`);
    process.exit(1);
  }
}

// Define Image schema to match backend
const imageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    key: { type: String, required: true },
    size: { type: Number, required: true },
    url: { type: String, required: true },
    thumbnailUrl: { type: String },
    status: { type: String, required: true, default: 'pending' },
  },
  { timestamps: true }
);
const Image = mongoose.model('Image', imageSchema);

// Configure S3 Client
const s3 = new S3Client({
  endpoint: process.env.ENDPOINT,
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID!,
    secretAccessKey: process.env.SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

// Helper function to read stream to buffer
const streamToBuffer = async (stream: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];
    stream.on('data', (chunk: any) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
};

const QUEUE_NAME = 'image-resize';

const start = async () => {
  // Connect to MongoDB
  const mongoRetries = 10;
  const mongoDelay = 5000;
  for (let attempt = 1; attempt <= mongoRetries; attempt++) {
    try {
      console.log(`Connecting to MongoDB (attempt ${attempt}/${mongoRetries})...`);
      await mongoose.connect(process.env.MONGO_URI!);
      console.log('Successfully connected to MongoDB.');
      break;
    } catch (error) {
      console.error(`Failed to connect to MongoDB (attempt ${attempt}):`, error);
      if (attempt === mongoRetries) {
        process.exit(1);
      }
      await new Promise((resolve) => setTimeout(resolve, mongoDelay));
    }
  }

  // Connect to RabbitMQ
  let connection: ChannelModel | null = null;
  let channel: Channel | null = null;
  const rabbitRetries = 10;
  const rabbitDelay = 5000;
  for (let attempt = 1; attempt <= rabbitRetries; attempt++) {
    try {
      console.log(`Connecting to RabbitMQ (attempt ${attempt}/${rabbitRetries})...`);
      connection = await amqp.connect(process.env.RABBITMQ_URI!);
      channel = await connection.createChannel();
      await channel.assertQueue(QUEUE_NAME, { durable: true });
      console.log('Successfully connected to RabbitMQ and asserted queue.');
      break;
    } catch (error) {
      console.error(`Failed to connect to RabbitMQ (attempt ${attempt}):`, error);
      if (attempt === rabbitRetries) {
        process.exit(1);
      }
      await new Promise((resolve) => setTimeout(resolve, rabbitDelay));
    }
  }

  if (!channel || !connection) {
    console.error('RabbitMQ channel/connection initialization failed.');
    process.exit(1);
  }

  // Process RabbitMQ queue
  console.log(`Waiting for messages in queue: ${QUEUE_NAME}...`);
  channel.consume(QUEUE_NAME, async (msg) => {
    if (!msg) return;

    let messageData;
    try {
      messageData = JSON.parse(msg.content.toString());
      console.log('Received message:', messageData);
    } catch (err) {
      console.error('Failed to parse queue message JSON:', err);
      channel!.ack(msg);
      return;
    }

    const { id, key, bucket } = messageData;
    if (!id || !key || !bucket) {
      console.error('Message missing required fields: id, key, bucket.');
      channel!.ack(msg);
      return;
    }

    try {
      // 1. Fetch image from MongoDB
      const imageDoc = await Image.findById(id);
      if (!imageDoc) {
        console.warn(`Image document with ID ${id} not found in database. Skipping.`);
        channel!.ack(msg);
        return;
      }

      if (imageDoc.status === 'processed') {
        console.log(`Image with ID ${id} is already processed. Skipping.`);
        channel!.ack(msg);
        return;
      }

      // 2. Fetch original image from MinIO
      console.log(`Fetching image from S3: bucket=${bucket}, key=${key}`);
      const s3Response = await s3.send(new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }));

      if (!s3Response.Body) {
        throw new Error('S3 response body is empty.');
      }

      const buffer = await streamToBuffer(s3Response.Body);

      // 3. Resize image to 150x150 using Jimp
      console.log('Resizing image to 150x150...');
      const jimpImage = await Jimp.read(buffer);
      
      let mimeType: string = Jimp.MIME_PNG;
      if (key.toLowerCase().endsWith('.jpg') || key.toLowerCase().endsWith('.jpeg')) {
        mimeType = Jimp.MIME_JPEG;
      }

      const resizedBuffer = await jimpImage
        .resize(150, 150)
        .getBufferAsync(mimeType);

      // 4. Upload thumbnail back to MinIO
      const thumbnailKey = `thumbnail-${key}`;
      console.log(`Uploading thumbnail to S3: key=${thumbnailKey}`);
      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: thumbnailKey,
        Body: resizedBuffer,
        ContentType: mimeType,
      }));

      // 5. Update status and URL in MongoDB
      const originalUrl = imageDoc.url as string;
      const thumbnailUrl = originalUrl.replace(imageDoc.key as string, thumbnailKey);

      imageDoc.thumbnailUrl = thumbnailUrl;
      imageDoc.status = 'processed';
      await imageDoc.save();

      console.log(`Successfully processed image: ${id}. Thumbnail URL: ${thumbnailUrl}`);
      channel!.ack(msg);
    } catch (error) {
      console.error(`Error processing image message (ID: ${id}):`, error);
      // Nack and don't re-queue to prevent infinite loops for corrupted files.
      // (Could potentially be re-queued with a limit, but for this exercise nack with requeue: false is safest).
      channel!.nack(msg, false, false);
    }
  });

  // Handle termination signals
  const shutdown = async () => {
    console.log('Shutting down worker gracefully...');
    try {
      if (channel) await channel.close();
      if (connection) await connection.close();
      await mongoose.disconnect();
      console.log('Graceful shutdown completed.');
      process.exit(0);
    } catch (err) {
      console.error('Error during shutdown:', err);
      process.exit(1);
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

start().catch((err) => {
  console.error('Worker failed to start:', err);
  process.exit(1);
});

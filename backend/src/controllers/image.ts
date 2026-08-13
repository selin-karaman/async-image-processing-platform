import { Request, Response } from 'express';
import { FileNotFoundError } from '../errors/file-not-found-error';
import { logger } from '../services/logger-service';
import { Image } from '../models/image';
import { publishToQueue } from '../services/rabbitmq-service';

const uploadImage = async (req: Request, res: Response) => {
  if (!req.files) {
    throw new FileNotFoundError();
  }

  logger.info(JSON.stringify(req.files));

  const files = (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) as Express.MulterS3.File[];
  const savedFiles = [];

  for (const file of files) {
    // 1. Save metadata to MongoDB
    const image = Image.build({
      name: file.originalname,
      key: file.key,
      size: file.size,
      url: file.location,
      status: 'pending',
    });
    await image.save();

    // 2. Publish to RabbitMQ
    await publishToQueue('image-resize', {
      id: image.id,
      key: file.key,
      bucket: file.bucket,
    });

    savedFiles.push(image);
  }

  res.send({ uploadedFiles: savedFiles });
};

export { uploadImage };

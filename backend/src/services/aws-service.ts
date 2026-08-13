import { Request } from 'express';
import multer, { FileFilterCallback } from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import path from 'path';
import shortid from 'shortid';

if (!process.env.ENDPOINT || !process.env.BUCKET || !process.env.ACCESS_KEY_ID || !process.env.SECRET_ACCESS_KEY) {
  throw new Error(
    'Make sure ENDPOINT, BUCKET, ACCESS_KEY_ID, and SECRET_ACCESS_KEY environment variables are defined.'
  );
}

export const s3 = new S3Client({
  endpoint: process.env.ENDPOINT,
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

const storage = multerS3({
  s3,
  bucket: process.env.BUCKET,
  contentType: multerS3.AUTO_CONTENT_TYPE,
  metadata: (_req, file, cb) => {
    cb(null, { fieldName: file.fieldname });
  },
  key: (_req, file, cb) => {
    cb(null, shortid.generate() + '-' + file.originalname);
  },
});

const fileFilter = (req: Request, file: Express.MulterS3.File, cb: FileFilterCallback) => {
  const filetypes = /jpeg|jpg|png/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Error: Allow images only of extensions jpeg|jpg|png !'));
  }
};

const limits = { fileSize: 1024 * 1024 * 50 };

const upload = multer({
  storage,
  limits,
  fileFilter,
});

export { upload };

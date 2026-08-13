import express from 'express';
import { uploadImage } from '../controllers/image';
import { upload } from '../services/aws-service';

const router = express.Router();

router.post('/upload', upload.array('image', 10), uploadImage);

export { router };

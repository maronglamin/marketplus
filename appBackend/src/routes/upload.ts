import { Router, Request } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

const router = Router();

// Ensure upload directory exists at project root (stable across dev/prod)
const uploadDir = path.join(process.cwd(), 'uploads/products');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for memory storage to handle compression
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit (align with rider uploads)
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Upload endpoint with image compression
router.post('/', upload.single('file'), async (req: Request & { file?: Express.Multer.File }, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Generate unique filename
    const fileExtension = path.extname(req.file.originalname);
    const filename = `${uuidv4()}${fileExtension}`;
    const outputPath = path.join(uploadDir, filename);

    // Compress and resize image
    await sharp(req.file.buffer)
      .resize(1600, 1600, { // Increased max dimensions for product images
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ // Convert to JPEG for better compression
        quality: 85, // Slightly higher quality for product images
        progressive: true,
        chromaSubsampling: '4:4:4'
      })
      .toFile(outputPath);

    // Generate the URL for the uploaded file
    const fileUrl = `/uploads/products/${filename}`;
    
    res.json({ url: fileUrl });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

export default router; 
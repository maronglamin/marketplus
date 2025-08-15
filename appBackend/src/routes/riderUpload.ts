import { Router, Request } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

const router = Router();

// Ensure rider upload directory exists
const uploadDir = path.join(__dirname, '../../uploads/riders/files');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for memory storage to handle compression
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit for documents
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    // Accept image files and PDFs for rider documents
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only image files and PDFs are allowed'));
    }
  },
});

// Upload endpoint for rider documents
router.post('/', upload.single('file'), async (req: Request & { file?: Express.Multer.File }, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: 'No file uploaded' 
      });
    }

    const { documentType } = req.body;
    
    if (!documentType) {
      return res.status(400).json({ 
        success: false,
        error: 'Document type is required' 
      });
    }

    // Generate unique filename with document type prefix
    const fileExtension = path.extname(req.file.originalname);
    const filename = `${documentType}_${uuidv4()}${fileExtension}`;
    const outputPath = path.join(uploadDir, filename);

    let fileSize = req.file.size;
    let mimeType = req.file.mimetype;

    // Process image files with compression
    if (req.file.mimetype.startsWith('image/')) {
      await sharp(req.file.buffer)
        .resize(1200, 1200, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({
          quality: 80,
          progressive: true,
          chromaSubsampling: '4:4:4'
        })
        .toFile(outputPath);
      
      // Update file info after compression
      const stats = fs.statSync(outputPath);
      fileSize = stats.size;
      mimeType = 'image/jpeg';
    } else {
      // For PDFs, save directly
      fs.writeFileSync(outputPath, req.file.buffer);
    }

    // Generate the URL for the uploaded file
    const fileUrl = `/uploads/riders/files/${filename}`;
    
    res.json({ 
      success: true,
      data: {
        fileName: filename,
        fileUrl: fileUrl,
        fileSize: fileSize,
        mimeType: mimeType,
        originalName: req.file.originalname
      }
    });
  } catch (error) {
    console.error('Error uploading rider document:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to upload file' 
    });
  }
});

// Upload multiple files endpoint
router.post('/multiple', upload.array('files', 10), async (req: Request, res) => {
  const files = req.files as Express.Multer.File[];
  try {
    if (!files || files.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'No files uploaded' 
      });
    }

    const { documentType } = req.body;
    
    if (!documentType) {
      return res.status(400).json({ 
        success: false,
        error: 'Document type is required' 
      });
    }

    const uploadedFiles = [];

    for (const file of files) {
      // Generate unique filename with document type prefix
      const fileExtension = path.extname(file.originalname);
      const filename = `${documentType}_${uuidv4()}${fileExtension}`;
      const outputPath = path.join(uploadDir, filename);

      let fileSize = file.size;
      let mimeType = file.mimetype;

      // Process image files with compression
      if (file.mimetype.startsWith('image/')) {
        await sharp(file.buffer)
          .resize(1200, 1200, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({
            quality: 80,
            progressive: true,
            chromaSubsampling: '4:4:4'
          })
          .toFile(outputPath);
        
        // Update file info after compression
        const stats = fs.statSync(outputPath);
        fileSize = stats.size;
        mimeType = 'image/jpeg';
      } else {
        // For PDFs, save directly
        fs.writeFileSync(outputPath, file.buffer);
      }

      // Generate the URL for the uploaded file
      const fileUrl = `/uploads/riders/files/${filename}`;
      
      uploadedFiles.push({
        fileName: filename,
        fileUrl: fileUrl,
        fileSize: fileSize,
        mimeType: mimeType,
        originalName: file.originalname
      });
    }

    res.json({ 
      success: true,
      data: uploadedFiles
    });
  } catch (error) {
    console.error('Error uploading multiple rider documents:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to upload files' 
    });
  }
});

// Delete file endpoint
router.delete('/:filename', (req: Request, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(uploadDir, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ 
        success: true,
        message: 'File deleted successfully' 
      });
    } else {
      res.status(404).json({ 
        success: false,
        error: 'File not found' 
      });
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete file' 
    });
  }
});

export default router; 
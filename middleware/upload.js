const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype)) {
    cb(new Error('Invalid file type'));
    return;
  }
  cb(null, true);
};

// Configure upload
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// Middleware to upload to Cloudinary
const uploadToCloudinary = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const buffer = req.file.buffer;
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream({
        resource_type: 'auto',
        folder: 'comix'
      }, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }).end(buffer);
    });

    req.file.cloudinaryUrl = result.secure_url;
    req.file.cloudinaryId = result.public_id;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  upload,
  uploadToCloudinary
};

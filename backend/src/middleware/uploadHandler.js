const multer = require('multer');

const storage = multer.memoryStorage();

const ALLOWED_MIMETYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIMETYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WEBP images or PDF files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = upload;

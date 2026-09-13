const multer = require('multer');

// Configure multer to use memory storage
const storage = multer.memoryStorage();

// Not a broad "image/*" match — that would also accept image/svg+xml, and
// SVGs can embed <script>. documents.service.js verifies real file content
// via magic bytes too, since Content-Type here is client-supplied.
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
    fileSize: 5 * 1024 * 1024, // 5MB max (though frontend compresses to ~300KB)
  },
});

module.exports = upload;

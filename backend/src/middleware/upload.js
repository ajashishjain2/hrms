const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const createStorage = (subDir) => multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.env.UPLOAD_PATH || './uploads', subDir);
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
});

const imageFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  if (allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

const documentFilter = (req, file, cb) => {
  const allowed = /pdf|doc|docx|jpeg|jpg|png/;
  if (allowed.test(path.extname(file.originalname).toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error('Allowed: PDF, DOC, DOCX, Images'));
  }
};

const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024;

const uploadPhoto = multer({
  storage: createStorage('photos'),
  fileFilter: imageFilter,
  limits: { fileSize: maxSize }
}).single('photo');

const uploadDocument = multer({
  storage: createStorage('documents'),
  fileFilter: documentFilter,
  limits: { fileSize: maxSize }
}).single('document');

const uploadSelfie = multer({
  storage: createStorage('selfies'),
  fileFilter: imageFilter,
  limits: { fileSize: maxSize }
}).single('selfie');

const uploadResume = multer({
  storage: createStorage('documents'),
  fileFilter: documentFilter,
  limits: { fileSize: maxSize }
}).single('resume');

module.exports = { uploadPhoto, uploadDocument, uploadSelfie, uploadResume };

/**
 * middleware/upload.js
 * Gestion des uploads avec Multer
 */
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

// ── Avatars ──────────────────────────────────────────────────
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/avatars');
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar_${req.user.id}_${Date.now()}${ext}`);
  }
});

const avatarFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Seules les images sont autorisées (jpg, png, webp, gif)'), false);
};

const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: avatarFilter,
  limits: { fileSize: (parseInt(process.env.UPLOAD_LIMIT_MB) || 5) * 1024 * 1024 }
}).single('avatar');

// ── Pièces jointes ───────────────────────────────────────────
const attachmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/attachments');
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `attach_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  }
});

const uploadAttachment = multer({
  storage: attachmentStorage,
  limits: { fileSize: (parseInt(process.env.UPLOAD_LIMIT_MB) || 5) * 1024 * 1024 }
}).single('file');

module.exports = { uploadAvatar, uploadAttachment };

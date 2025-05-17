const express = require('express');
const router = express.Router();
const db = require('../db/mysql');
const authenticate = require('../middleware/auth');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const multer = require('multer');

const { encryptFile } = require('../utils/encrypt');
const { decryptFile } = require('../utils/decrypt');

// Setup multer for file uploads
const uploadDir = path.join(__dirname, '../uploads');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '_' + file.originalname);
  },
});
const upload = multer({ storage });

// ✅ Route: Upload a file (with encryption)
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    const userId = req.user.id;
    const file = req.file;

    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const iv = crypto.randomBytes(16);
    const encryptedPath = path.join('uploads', `enc_${Date.now()}_${file.originalname}`);

    // Encrypt and save
    await encryptFile(file.path, encryptedPath, iv);

    // Remove original unencrypted file
    await fs.unlink(file.path);

    // Store metadata in DB
    await db.execute(
      'INSERT INTO files (user_id, filename, mime_type, size, iv) VALUES (?, ?, ?, ?, ?)',
      [userId, encryptedPath, file.mimetype, file.size, iv.toString('hex')]
    );

    res.json({ message: 'File uploaded successfully' });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// ✅ Route: List files for logged-in user (with size and upload time)
router.get('/', authenticate, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT id, filename, size, mime_type AS mimeType, created_at AS uploadedAt 
       FROM files 
       WHERE user_id = ?`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve files' });
  }
});

// ✅ Route: Download & Decrypt a file by ID
router.get('/:id', authenticate, async (req, res) => {
  const fileId = req.params.id;
  const userId = req.user.id;

  try {
    const [rows] = await db.execute(
      'SELECT filename, iv FROM files WHERE id = ? AND user_id = ?',
      [fileId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const { filename, iv } = rows[0];

    const encryptedPath = path.resolve(filename);
    const decryptedPath = path.resolve('downloads', `dec_${path.basename(filename)}`);

    await decryptFile(encryptedPath, decryptedPath, iv);

    res.download(decryptedPath, (err) => {
      if (err) {
        console.error('Download error:', err);
        return res.status(500).json({ error: 'Failed to send file' });
      }

      // Delete decrypted file after sending
      fs.unlink(decryptedPath).catch(err => {
        console.error('Error deleting decrypted file:', err);
      });
    });
  } catch (err) {
    console.error('Error in download route:', err);
    res.status(500).json({ error: 'Decryption failed' });
  }
});

// ✅ Route: Delete a file by ID
router.delete('/:id', authenticate, async (req, res) => {
  const fileId = req.params.id;
  const userId = req.user.id;

  try {
    const [rows] = await db.execute(
      'SELECT filename FROM files WHERE id = ? AND user_id = ?',
      [fileId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'File not found or unauthorized' });
    }

    const filePath = path.resolve(rows[0].filename);

    try {
      await fs.unlink(filePath);
    } catch (err) {
      console.error('Error deleting file from disk:', err);
      return res.status(500).json({ error: 'Failed to delete file from disk' });
    }

    await db.execute('DELETE FROM files WHERE id = ? AND user_id = ?', [fileId, userId]);

    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    console.error('Error deleting file:', err);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

module.exports = router;

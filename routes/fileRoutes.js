const express = require('express');
const router = express.Router();
const db = require('../db/mysql');
const authenticate = require('../middleware/auth');

const path = require('path');
const fs = require('fs').promises; // promise-based fs
const { decryptFile } = require('../utils/decrypt'); // Make sure this file exists

// ✅ Route: List files for logged-in user
router.get('/', authenticate, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, filename, created_at FROM files WHERE user_id = ?',
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

// ✅ Route: Delete a file by ID (with DB + file cleanup)
router.delete('/:id', authenticate, async (req, res) => {
  const fileId = req.params.id;
  const userId = req.user.id;

  try {
    // 1. Get file info for this user
    const [rows] = await db.execute(
      'SELECT filename FROM files WHERE id = ? AND user_id = ?',
      [fileId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'File not found or unauthorized' });
    }

    const filePath = path.resolve(rows[0].filename);

    // 2. Delete file from disk
    try {
      await fs.unlink(filePath);
    } catch (err) {
      console.error('Error deleting file from disk:', err);
      return res.status(500).json({ error: 'Failed to delete file from disk' });
    }

    // 3. Delete DB record
    await db.execute('DELETE FROM files WHERE id = ? AND user_id = ?', [fileId, userId]);

    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    console.error('Error deleting file:', err);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

module.exports = router;

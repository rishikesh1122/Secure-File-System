const authenticate = require('../middleware/auth');
const express = require('express');

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { encryptFile } = require('../utils/encrypt');
const db = require('../db/mysql'); // assumes db connection exists

const router = express.Router();

const upload = multer({ dest: 'uploads/' });

router.post('/', authenticate, upload.single('file'), async (req, res) => {
    const userId = req.user.id; // assuming JWT middleware sets req.user
    const originalPath = req.file.path;
    const encryptedPath = path.join('uploads', `enc_${req.file.filename}`);

    try {
        const { iv } = await encryptFile(originalPath, encryptedPath);
        fs.unlinkSync(originalPath); // remove original unencrypted file

        // Save file info in DB
        await db.execute(
            'INSERT INTO files (user_id, filename, iv) VALUES (?, ?, ?)',
            [userId, encryptedPath, iv]
        );

        res.json({ message: 'File uploaded and encrypted successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Encryption failed' });
    }
});

module.exports = router;

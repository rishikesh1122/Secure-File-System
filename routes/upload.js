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
    const userId = req.user.id;
    const originalPath = req.file.path;
    const encryptedPath = path.join('uploads', `enc_${req.file.filename}`);

    const { size, mimetype } = req.file; // ✅ new: extract size & mime type

    try {
        const { iv } = await encryptFile(originalPath, encryptedPath);
        fs.unlinkSync(originalPath); // ✅ delete unencrypted original

        // ✅ Save full metadata into DB
        await db.execute(
            'INSERT INTO files (user_id, filename, size, mime_type, iv) VALUES (?, ?, ?, ?, ?)',
            [userId, encryptedPath, size, mimetype, iv]
        );

        res.json({ message: 'File uploaded and encrypted successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Encryption failed' });
    }
});


module.exports = router;

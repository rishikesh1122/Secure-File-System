// encrypt.js
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const algorithm = 'aes-256-cbc';
const key = crypto.scryptSync(process.env.ENCRYPTION_SECRET, 'salt', 32);
const IV_LENGTH = 16;

function encryptFile(inputPath, outputPath) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const input = fs.createReadStream(inputPath);
    const output = fs.createWriteStream(outputPath);

    input.pipe(cipher).pipe(output);

    return new Promise((resolve, reject) => {
        output.on('finish', () => resolve({ iv: iv.toString('hex') }));
        output.on('error', reject);
    });
}

module.exports = { encryptFile };


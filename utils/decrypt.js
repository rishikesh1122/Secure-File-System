const fs = require('fs');
const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config();

const algorithm = 'aes-256-cbc';
const key = crypto.scryptSync(process.env.ENCRYPTION_SECRET, 'salt', 32);

function decryptFile(inputPath, outputPath, iv) {
  return new Promise((resolve, reject) => {
    const ivBuffer = Buffer.from(iv, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, ivBuffer);

    const input = fs.createReadStream(inputPath);
    const output = fs.createWriteStream(outputPath);

    input.pipe(decipher).pipe(output);

    output.on('finish', () => resolve());
    output.on('error', reject);
  });
}

module.exports = { decryptFile };

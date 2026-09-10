const fs = require('fs');
const path = require('path');

const srcPath = 'C:\\Users\\NoFace\\.gemini\\antigravity-ide\\brain\\1581e7fd-1e84-4763-9885-7087716832f9\\.user_uploaded\\uploaded_media_1789054567834.img';
const outDir = path.join(__dirname, '..', 'public', 'sounds');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const uploadedDir = 'C:\\Users\\NoFace\\.gemini\\antigravity-ide\\brain\\1581e7fd-1e84-4763-9885-7087716832f9\\.user_uploaded';
fs.readdirSync(uploadedDir).forEach(file => {
  const fpath = path.join(uploadedDir, file);
  const buf = fs.readFileSync(fpath);
  const hex = buf.subarray(0, 16).toString('hex');
  console.log('FILE:', file, 'Size:', buf.length, 'Hex:', hex);
});


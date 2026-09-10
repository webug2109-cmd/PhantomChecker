const { spawnSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');

const uploadedDir = 'C:\\Users\\NoFace\\.gemini\\antigravity-ide\\brain\\1581e7fd-1e84-4763-9885-7087716832f9\\.user_uploaded';

// Convert each to a temp WAV in scratch folder
const scratchDir = 'C:\\Users\\NoFace\\.gemini\\antigravity-ide\\brain\\1581e7fd-1e84-4763-9885-7087716832f9\\scratch';
if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

fs.readdirSync(uploadedDir).forEach(f => {
  const wavPath = path.join(scratchDir, f.replace('.img', '.wav'));
  spawnSync(ffmpeg, ['-y', '-i', path.join(uploadedDir, f), '-ar', '44100', '-ac', '1', wavPath]);
  console.log(`Converted ${f} -> ${wavPath}, size: ${fs.statSync(wavPath).size}`);
});

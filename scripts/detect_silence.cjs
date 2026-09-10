const { spawnSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');

const uploadedDir = 'C:\\Users\\NoFace\\.gemini\\antigravity-ide\\brain\\1581e7fd-1e84-4763-9885-7087716832f9\\.user_uploaded';
const files = fs.readdirSync(uploadedDir);

files.forEach(file => {
  const fpath = path.join(uploadedDir, file);
  console.log(`\n=== ANALYZING: ${file} ===`);
  const res = spawnSync(ffmpeg, [
    '-i', fpath,
    '-af', 'silencedetect=noise=-30dB:d=0.3',
    '-f', 'null', '-'
  ], { encoding: 'utf-8' });

  // Filter output for silence_start and silence_end
  const lines = res.stderr.split('\n');
  lines.forEach(l => {
    if (l.includes('silence_start') || l.includes('silence_end') || l.includes('Duration:')) {
      console.log('  ', l.trim());
    }
  });
});

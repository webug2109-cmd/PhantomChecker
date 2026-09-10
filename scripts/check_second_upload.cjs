const fs = require('fs');
const path = require('path');

const filePath = 'C:\\Users\\NoFace\\.gemini\\antigravity-ide\\brain\\1581e7fd-1e84-4763-9885-7087716832f9\\scratch\\uploaded_media_1789054470270.wav';
const buf = fs.readFileSync(filePath);
const samples = new Int16Array(buf.buffer, buf.byteOffset + 44, (buf.length - 44) / 2);
const sr = 44100;
const step = Math.floor(sr * 0.1); // 100ms

for (let i = 0; i < samples.length; i += step) {
  let sum = 0;
  for (let j = 0; j < step && i + j < samples.length; j++) sum += samples[i + j] * samples[i + j];
  const rms = Math.round(Math.sqrt(sum / step));
  const sec = (i / sr).toFixed(2);
  if (rms > 500) {
    console.log(sec.padStart(5, ' ') + 's | ' + rms.toString().padStart(5, ' ') + ' | ' + '#'.repeat(Math.min(45, Math.floor(rms / 250))));
  }
}

const fs = require('fs');
const path = require('path');

function analyzeWav(filePath) {
  const buf = fs.readFileSync(filePath);
  // WAV header is 44 bytes
  const samples = new Int16Array(buf.buffer, buf.byteOffset + 44, (buf.length - 44) / 2);
  const sampleRate = 44100;
  const frameSize = Math.floor(sampleRate * 0.05); // 50ms frame
  
  const frames = [];
  for (let i = 0; i < samples.length; i += frameSize) {
    let sumSquares = 0;
    const end = Math.min(i + frameSize, samples.length);
    for (let j = i; j < end; j++) {
      sumSquares += samples[j] * samples[j];
    }
    const rms = Math.sqrt(sumSquares / (end - i));
    const time = (i / sampleRate).toFixed(2);
    frames.push({ time: parseFloat(time), rms });
  }

  // Find segments where rms > threshold (e.g. 500)
  const threshold = 400;
  const segments = [];
  let inSegment = false;
  let segStart = 0;
  let silenceFrames = 0;

  for (let f = 0; f < frames.length; f++) {
    if (frames[f].rms > threshold) {
      if (!inSegment) {
        inSegment = true;
        segStart = Math.max(0, frames[f].time - 0.08); // small lead-in
      }
      silenceFrames = 0;
    } else {
      if (inSegment) {
        silenceFrames++;
        if (silenceFrames > 8) { // 400ms silence = segment ended
          const segEnd = frames[f - silenceFrames].time + 0.15; // small lead-out
          segments.push({ start: segStart, end: segEnd, duration: +(segEnd - segStart).toFixed(2) });
          inSegment = false;
          silenceFrames = 0;
        }
      }
    }
  }
  if (inSegment) {
    const segEnd = frames[frames.length - 1].time;
    segments.push({ start: segStart, end: segEnd, duration: +(segEnd - segStart).toFixed(2) });
  }
  return segments;
}

console.log('SEGMENTS IN uploaded_media_1789054416825.wav:');
console.log(analyzeWav('C:\\Users\\NoFace\\.gemini\\antigravity-ide\\brain\\1581e7fd-1e84-4763-9885-7087716832f9\\scratch\\uploaded_media_1789054416825.wav'));

console.log('\nSEGMENTS IN uploaded_media_1789054567834.wav (Latest soundboard):');
console.log(analyzeWav('C:\\Users\\NoFace\\.gemini\\antigravity-ide\\brain\\1581e7fd-1e84-4763-9885-7087716832f9\\scratch\\uploaded_media_1789054567834.wav'));

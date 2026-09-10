const fs = require('fs');
const path = require('path');

const sampleRate = 44100;
const duration = 0.45; // Short 450ms, tight dry snap
const totalSamples = Math.floor(sampleRate * duration);
const samples = new Float32Array(totalSamples);

// 1. Sharp Dry Mechanical Crack (0 - 5ms) - zero echo
for (let i = 0; i < Math.floor(sampleRate * 0.006); i++) {
  const t = i / sampleRate;
  const env = Math.exp(-t * 1200);
  const noise = (Math.random() * 2 - 1);
  samples[i] += noise * env * 2.0;
}

// 2. Direct Gunpowder Muzzle Snap (0 - 45ms) - dry
for (let i = 0; i < Math.floor(sampleRate * 0.05); i++) {
  const t = i / sampleRate;
  const env = Math.sin((i / (sampleRate * 0.05)) * Math.PI) * Math.exp(-t * 80);
  const noise = (Math.random() * 2 - 1);
  samples[i] += noise * env * 1.5;
}

// 3. Dry Punchy Sub-Bass (Muzzle Thump 0 - 90ms) - drops from 160Hz to 35Hz
for (let i = 0; i < Math.floor(sampleRate * 0.12); i++) {
  const t = i / sampleRate;
  const phase = 2 * Math.PI * (35 * t + (160 - 35) * (1 - Math.exp(-t * 45)) / 45);
  const env = Math.exp(-t * 30);
  samples[i] += Math.sin(phase) * env * 1.5;
}

// 4. Soft clip (Zero reverb / delay)
for (let i = 0; i < totalSamples; i++) {
  samples[i] = Math.tanh(samples[i] * 1.6);
}

// Normalize to peak 0.98
let maxPeak = 0;
for (let i = 0; i < totalSamples; i++) {
  const abs = Math.abs(samples[i]);
  if (abs > maxPeak) maxPeak = abs;
}
const norm = maxPeak > 0 ? (0.98 / maxPeak) : 1;

// 16-bit Mono WAV
const dataLength = totalSamples * 2;
const buffer = Buffer.alloc(44 + dataLength);
buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + dataLength, 4);
buffer.write('WAVE', 8);
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(1, 22); // mono
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate * 2, 28);
buffer.writeUInt16LE(2, 32);
buffer.writeUInt16LE(16, 34);
buffer.write('data', 36);
buffer.writeUInt32LE(dataLength, 40);

let offset = 44;
for (let i = 0; i < totalSamples; i++) {
  const intVal = Math.max(-32768, Math.min(32767, Math.floor(samples[i] * norm * 32767)));
  buffer.writeInt16LE(intVal, offset);
  offset += 2;
}

const outPath = path.join(__dirname, '..', 'public', 'sounds', 'gunshot.wav');
fs.writeFileSync(outPath, buffer);
console.log(`Saved 100% DRY gunshot: ${outPath} (${buffer.length} bytes)`);

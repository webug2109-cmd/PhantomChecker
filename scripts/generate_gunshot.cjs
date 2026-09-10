const fs = require('fs');
const path = require('path');

const sampleRate = 44100;
const duration = 1.1; // 1.1 seconds total duration
const totalSamples = Math.floor(sampleRate * duration);
const samples = new Float32Array(totalSamples);

// 1. Initial Supersonic Bullet Crack (0 - 8ms)
for (let i = 0; i < Math.floor(sampleRate * 0.008); i++) {
  const t = i / sampleRate;
  const env = Math.exp(-t * 900); // very steep decay
  const noise = (Math.random() * 2 - 1);
  samples[i] += noise * env * 1.8;
}

// 2. Gunpowder Muzzle Explosion Burst (1ms - 80ms)
for (let i = 0; i < Math.floor(sampleRate * 0.09); i++) {
  const t = i / sampleRate;
  const env = Math.sin((i / (sampleRate * 0.09)) * Math.PI) * Math.exp(-t * 40);
  const noise = (Math.random() * 2 - 1) * 1.4;
  samples[i] += noise * env;
}

// 3. Heavy Sub-Bass Kinetic Punch (Muzzle Boom 4ms - 180ms)
// Pitch drops from 220Hz down to 28Hz
for (let i = Math.floor(sampleRate * 0.002); i < Math.floor(sampleRate * 0.22); i++) {
  const t = (i - sampleRate * 0.002) / sampleRate;
  const freq = 28 + (220 - 28) * Math.exp(-t * 32);
  const phase = 2 * Math.PI * (28 * t + (220 - 28) * (1 - Math.exp(-t * 32)) / 32);
  const env = Math.exp(-t * 18);
  const sub = Math.sin(phase) * env * 1.6;
  samples[i] += sub;
}

// 4. Multi-tap ballistic room reflections / tail reverberation
const delayTaps = [
  { delayMs: 18, gain: 0.45, filter: 0.8 },
  { delayMs: 38, gain: 0.38, filter: 0.7 },
  { delayMs: 65, gain: 0.30, filter: 0.6 },
  { delayMs: 110, gain: 0.24, filter: 0.5 },
  { delayMs: 175, gain: 0.18, filter: 0.4 },
  { delayMs: 260, gain: 0.12, filter: 0.35 },
  { delayMs: 380, gain: 0.08, filter: 0.3 },
  { delayMs: 520, gain: 0.05, filter: 0.25 }
];

const wet = new Float32Array(totalSamples);
for (const tap of delayTaps) {
  const delaySamples = Math.floor(sampleRate * (tap.delayMs / 1000));
  let prevVal = 0;
  for (let i = delaySamples; i < totalSamples; i++) {
    // Lowpass filter the echoes
    const src = samples[i - delaySamples];
    prevVal = prevVal * (1 - tap.filter) + src * tap.filter;
    wet[i] += prevVal * tap.gain;
  }
}

// Mix dry + wet
for (let i = 0; i < totalSamples; i++) {
  samples[i] += wet[i];
  // Tube / Tape saturation (soft clipping tanh)
  samples[i] = Math.tanh(samples[i] * 1.4);
}

// Find peak & normalize
let maxPeak = 0;
for (let i = 0; i < totalSamples; i++) {
  const abs = Math.abs(samples[i]);
  if (abs > maxPeak) maxPeak = abs;
}

const normFactor = maxPeak > 0 ? (0.98 / maxPeak) : 1.0;

// Convert to 16-bit PCM WAV (Stereo for spatial width)
const numChannels = 2;
const byteRate = sampleRate * numChannels * 2;
const blockAlign = numChannels * 2;
const dataLength = totalSamples * blockAlign;
const buffer = Buffer.alloc(44 + dataLength);

// WAV Header
buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + dataLength, 4);
buffer.write('WAVE', 8);
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16); // PCM header size
buffer.writeUInt16LE(1, 20);  // Format = PCM
buffer.writeUInt16LE(numChannels, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(byteRate, 28);
buffer.writeUInt16LE(blockAlign, 32);
buffer.writeUInt16LE(16, 34); // Bits per sample
buffer.write('data', 36);
buffer.writeUInt32LE(dataLength, 40);

let offset = 44;
for (let i = 0; i < totalSamples; i++) {
  // Left channel slightly drier, Right channel slightly delayed for binaural spatial width
  const sL = samples[i] * normFactor;
  const sR = (i > 15 ? samples[i - 15] : samples[i]) * normFactor;

  const intL = Math.max(-32768, Math.min(32767, Math.floor(sL * 32767)));
  const intR = Math.max(-32768, Math.min(32767, Math.floor(sR * 32767)));

  buffer.writeInt16LE(intL, offset);
  buffer.writeInt16LE(intR, offset + 2);
  offset += 4;
}

const outPath = path.join(__dirname, '..', 'public', 'sounds', 'gunshot.wav');
fs.writeFileSync(outPath, buffer);
console.log(`Successfully generated studio gunshot: ${outPath} (${buffer.length} bytes)`);
